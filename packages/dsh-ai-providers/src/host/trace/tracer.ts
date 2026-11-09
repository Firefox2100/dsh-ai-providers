import { AsyncLocalStorage } from 'node:async_hooks'
import { randomBytes } from 'node:crypto'
import type { AiTracer, SpanHandle, SpanKind, SpanRef, SpanResult, SpanStart } from '@dsh-ai-providers/core'

export interface TraceInfo { name: string; sessionId?: string; userId?: string; tags?: readonly string[] }

/** One finished span, as the sinks receive it. Inputs and outputs are already captured: JSON text, shortened and redacted as configured. */
export interface SpanRecord {
  traceId: string
  spanId: string
  parentId?: string
  name: string
  kind: SpanKind
  startMs: number
  endMs: number
  trace: TraceInfo
  input?: string
  output?: string
  wire?: string
  metadata: Record<string, unknown>
  model?: string
  modelParameters?: Record<string, unknown>
  usage?: Record<string, number>
  firstTokenMs?: number
  level?: NonNullable<SpanResult['level']>
  statusMessage?: string
}

export interface ScoreRecord { traceId: string; spanId?: string; name: string; value: number | string | boolean; comment?: string; atMs: number }

export type TraceItem = { type: 'span'; span: SpanRecord } | { type: 'score'; score: ScoreRecord }

export interface TraceSink {
  readonly name: string
  write(items: readonly TraceItem[]): Promise<void>
}

export interface TracerOptions {
  enabled: () => boolean
  sinks: () => readonly TraceSink[]
  /** What a text is cut to when only a summary is captured; 0 captures it whole. */
  summaryChars: () => number
  /** Patterns whose matches are replaced before anything is stored. */
  redact: () => readonly RegExp[]
  /** Whether the exact request bodies of language-model calls are kept. */
  wire?: () => boolean
  onProblem: (message: string) => void
  flushMs?: number
  now?: () => number
}

const BATCH = 50
const MAX_TRACES = 500

const id = (bytes: number): string => randomBytes(bytes).toString('hex')

/** JSON text of anything a call carries; bytes are never kept, only their size. */
export function jsonOf(value: unknown): string {
  const seen = new WeakSet<object>()
  return JSON.stringify(value, (_key, entry: unknown) => {
    if (entry instanceof Uint8Array) return `<${entry.byteLength} bytes>`
    if (entry instanceof Blob) return `<${entry.size} bytes>`
    if (typeof entry === 'bigint') return entry.toString()
    if (entry instanceof Error) return { name: entry.name, message: entry.message }
    if (typeof entry === 'object' && entry !== null) {
      if (seen.has(entry)) return '<circular>'
      seen.add(entry)
    }
    return entry
  }) ?? 'null'
}

interface Open {
  ref: SpanRef
  parentId?: string
  start: SpanStart
  startMs: number
  trace: TraceInfo
  result: SpanResult
  ended: boolean
}

/**
 * Records spans of the calls that pass through the provider plugin and of the work the plugins around it name. The spans of one run nest
 * through the async context; code the context does not reach (an agent DSH runs on its own) names its parent through `link`. Finished
 * spans are queued and written by the sinks off the call's path: a sink that fails costs the record, never the call.
 */
export class Tracer implements AiTracer {
  private readonly context = new AsyncLocalStorage<SpanRef>()
  private readonly traces = new Map<string, { info: TraceInfo }>()
  private readonly links = new Map<string, SpanRef>()
  private queue: TraceItem[] = []
  private timer: ReturnType<typeof setTimeout> | undefined
  private flushing: Promise<void> = Promise.resolve()
  private readonly now: () => number

  constructor(private readonly options: TracerOptions) {
    this.now = options.now ?? Date.now
  }

  /** Whether anything is being recorded now. */
  get active(): boolean { return this.options.enabled() }

  current(): SpanRef | undefined {
    return this.options.enabled() ? this.context.getStore() : undefined
  }

  run<T>(start: SpanStart, work: (span: SpanHandle) => Promise<T>): Promise<T> {
    if (!this.options.enabled()) return work(NOTHING)
    const span = this.start(start)
    return this.context.run(span.ref, () => work(span)).then(
      (value) => { span.end(); return value },
      (error: unknown) => { span.end({ level: 'ERROR', statusMessage: error instanceof Error ? error.message : String(error) }); throw error },
    )
  }

  start(start: SpanStart): SpanHandle {
    if (!this.options.enabled()) return NOTHING
    const parent = start.parent ?? this.context.getStore()
    const parentTrace = parent === undefined ? undefined : this.traces.get(parent.traceId)
    const fresh = parent === undefined || start.trace !== undefined
    const traceId = fresh ? id(16) : parent.traceId
    const info: TraceInfo = !fresh && parentTrace !== undefined ? parentTrace.info : { name: start.trace?.name ?? start.name, ...start.trace?.sessionId === undefined ? {} : { sessionId: start.trace.sessionId }, ...start.trace?.userId === undefined ? {} : { userId: start.trace.userId }, ...start.trace?.tags === undefined ? {} : { tags: start.trace.tags } }
    if (!this.traces.has(traceId)) {
      this.traces.set(traceId, { info })
      // Work may outlive the span that began its trace, so a trace is remembered for a while rather than until its root ends.
      if (this.traces.size > MAX_TRACES) this.traces.delete(this.traces.keys().next().value!)
    }
    const open: Open = { ref: { traceId, spanId: id(8) }, ...fresh || parent === undefined ? {} : { parentId: parent.spanId }, start, startMs: this.now(), trace: info, result: {}, ended: false }
    return {
      ref: open.ref,
      update: (result) => { if (!open.ended) open.result = { ...open.result, ...result, ...result.metadata === undefined ? {} : { metadata: { ...open.result.metadata, ...result.metadata } }, ...result.usage === undefined ? {} : { usage: { ...open.result.usage, ...result.usage } } } },
      end: (result) => {
        if (open.ended) return
        if (result !== undefined) open.result = { ...open.result, ...result, ...result.metadata === undefined ? {} : { metadata: { ...open.result.metadata, ...result.metadata } } }
        open.ended = true
        this.finish(open)
      },
    }
  }

  within<T>(span: SpanRef, work: () => T): T {
    return this.options.enabled() ? this.context.run(span, work) : work()
  }

  link(key: string, span: SpanRef): () => void {
    if (!this.options.enabled()) return () => undefined
    this.links.set(key, span)
    return () => { if (this.links.get(key) === span) this.links.delete(key) }
  }

  linked(key: string | undefined): SpanRef | undefined {
    return key === undefined || !this.options.enabled() ? undefined : this.links.get(key)
  }

  score(target: SpanRef, score: { name: string; value: number | string | boolean; comment?: string }): void {
    if (!this.options.enabled()) return
    this.enqueue({ type: 'score', score: { traceId: target.traceId, spanId: target.spanId, name: score.name, value: score.value, ...score.comment === undefined ? {} : { comment: score.comment }, atMs: this.now() } })
  }

  /** Writes what is queued; resolves when the sinks are done with it. */
  flush(): Promise<void> {
    if (this.timer !== undefined) { clearTimeout(this.timer); this.timer = undefined }
    const items = this.queue
    this.queue = []
    if (items.length === 0) return this.flushing
    this.flushing = this.flushing.then(async () => {
      for (const sink of this.options.sinks()) {
        try { await sink.write(items) } catch (error) { this.options.onProblem(`the ${sink.name} trace sink failed: ${error instanceof Error ? error.message : String(error)}`) }
      }
    })
    return this.flushing
  }

  private capture(value: unknown): string | undefined {
    if (value === undefined) return undefined
    let text = typeof value === 'string' ? value : jsonOf(value)
    // Redacted before it is cut, so a secret is never left half-visible at the edge.
    for (const pattern of this.options.redact()) text = text.replace(pattern, '[redacted]')
    const limit = this.options.summaryChars()
    if (limit > 0 && text.length > limit) text = `${text.slice(0, limit)}… (${text.length} characters)`
    return text
  }

  private finish(open: Open): void {
    const { start, result, ref } = open
    const metadata = { ...start.metadata, ...result.metadata }
    const input = this.capture(start.input)
    const output = this.capture(result.output)
    const wire = result.wire === undefined || this.options.wire?.() !== true ? undefined : this.capture(result.wire)
    const model = result.model ?? start.model
    const span: SpanRecord = {
      traceId: ref.traceId, spanId: ref.spanId, ...open.parentId === undefined ? {} : { parentId: open.parentId },
      name: start.name, kind: start.kind ?? (model === undefined ? 'span' : 'generation'),
      startMs: open.startMs, endMs: Math.max(this.now(), open.startMs), trace: open.trace, metadata,
      ...input === undefined ? {} : { input }, ...output === undefined ? {} : { output }, ...wire === undefined ? {} : { wire },
      ...model === undefined ? {} : { model }, ...start.modelParameters === undefined ? {} : { modelParameters: { ...start.modelParameters } },
      ...result.usage === undefined ? {} : { usage: { ...result.usage } }, ...result.firstTokenAt === undefined ? {} : { firstTokenMs: result.firstTokenAt },
      ...result.level === undefined ? {} : { level: result.level }, ...result.statusMessage === undefined ? {} : { statusMessage: result.statusMessage },
    }
    this.enqueue({ type: 'span', span })
  }

  private enqueue(item: TraceItem): void {
    this.queue.push(item)
    if (this.queue.length >= BATCH) { void this.flush(); return }
    if (this.timer === undefined) {
      this.timer = setTimeout(() => { this.timer = undefined; void this.flush() }, this.options.flushMs ?? 2000)
      this.timer.unref()
    }
  }
}

const NOTHING: SpanHandle = { ref: { traceId: '', spanId: '' }, update: () => undefined, end: () => undefined }
