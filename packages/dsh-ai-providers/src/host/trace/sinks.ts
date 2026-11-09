import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { ScoreRecord, SpanRecord, TraceItem, TraceSink } from './tracer.ts'

/** One line per span or score in a file per day, for reading with ordinary tools and for benchmarks that need no server. */
export class JsonlSink implements TraceSink {
  readonly name = 'JSONL'
  constructor(private readonly directory: () => string, private readonly now: () => number = Date.now) {}

  async write(items: readonly TraceItem[]): Promise<void> {
    const directory = this.directory()
    await mkdir(directory, { recursive: true })
    const day = new Date(this.now()).toISOString().slice(0, 10)
    await appendFile(join(directory, `trace-${day}.jsonl`), items.map(item => JSON.stringify(item)).join('\n') + '\n')
  }
}

type Fetch = typeof fetch

export interface LangfuseOptions {
  host: () => string
  /** The keys, read when a batch is sent so a change in the credential store applies without a restart. */
  keys: () => Promise<{ publicKey: string; secretKey: string } | undefined>
  fetch?: Fetch
  environment?: () => string
}

type Attribute = { key: string; value: Record<string, unknown> }

const attribute = (key: string, value: unknown): Attribute | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return { key, value: { stringValue: value } }
  if (typeof value === 'boolean') return { key, value: { boolValue: value } }
  if (typeof value === 'number') return { key, value: Number.isInteger(value) ? { intValue: String(value) } : { doubleValue: value } }
  if (Array.isArray(value)) return { key, value: { arrayValue: { values: value.map(entry => ({ stringValue: String(entry) })) } } }
  return { key, value: { stringValue: JSON.stringify(value) } }
}

const nanos = (ms: number): string => `${Math.round(ms)}000000`
const OTEL_STATUS_ERROR = 2
const withoutTrailingSlashes = (value: string): string => {
  let end = value.length
  while (end > 0 && value[end - 1] === '/') end -= 1
  return value.slice(0, end)
}

/** A span as OpenTelemetry carries it, with the attributes Langfuse reads its fields from. */
export function otlpSpan(span: SpanRecord, environment: string | undefined): Record<string, unknown> {
  const attributes: Attribute[] = []
  const add = (key: string, value: unknown): void => { const made = attribute(key, value); if (made !== undefined) attributes.push(made) }
  add('langfuse.trace.name', span.trace.name)
  add('langfuse.session.id', span.trace.sessionId)
  add('langfuse.user.id', span.trace.userId)
  add('langfuse.trace.tags', span.trace.tags === undefined ? undefined : [...span.trace.tags])
  add('langfuse.environment', environment)
  add('langfuse.observation.type', span.kind)
  add('langfuse.observation.input', span.input)
  add('langfuse.observation.output', span.output)
  if (span.parentId === undefined) { add('langfuse.trace.input', span.input); add('langfuse.trace.output', span.output) }
  add('langfuse.observation.metadata.wire', span.wire)
  add('langfuse.observation.model.name', span.model)
  add('langfuse.observation.model.parameters', span.modelParameters)
  add('langfuse.observation.usage_details', span.usage)
  if (span.firstTokenMs !== undefined) add('langfuse.observation.completion_start_time', new Date(span.firstTokenMs).toISOString())
  add('langfuse.observation.level', span.level)
  add('langfuse.observation.status_message', span.statusMessage)
  for (const [key, value] of Object.entries(span.metadata)) add(`langfuse.observation.metadata.${key}`, typeof value === 'string' ? value : JSON.stringify(value))
  return {
    traceId: span.traceId, spanId: span.spanId, ...span.parentId === undefined ? {} : { parentSpanId: span.parentId },
    name: span.name, kind: 1, startTimeUnixNano: nanos(span.startMs), endTimeUnixNano: nanos(span.endMs), attributes,
    ...span.level === 'ERROR' ? { status: { code: OTEL_STATUS_ERROR, message: span.statusMessage ?? '' } } : {},
  }
}

/** Sends spans to a Langfuse server over OpenTelemetry's HTTP/JSON protocol, and scores through its scores API. */
export class LangfuseSink implements TraceSink {
  readonly name = 'Langfuse'
  private readonly send: Fetch
  constructor(private readonly options: LangfuseOptions) { this.send = options.fetch ?? fetch }

  async write(items: readonly TraceItem[]): Promise<void> {
    const keys = await this.options.keys()
    if (keys === undefined) throw new Error('the Langfuse keys are not set')
    const base = withoutTrailingSlashes(this.options.host())
    const authorization = `Basic ${Buffer.from(`${keys.publicKey}:${keys.secretKey}`).toString('base64')}`
    const spans = items.flatMap(item => item.type === 'span' ? [item.span] : [])
    if (spans.length > 0) {
      const environment = this.options.environment?.()
      const response = await this.send(`${base}/api/public/otel/v1/traces`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization, 'x-langfuse-ingestion-version': '4' },
        body: JSON.stringify({ resourceSpans: [{ resource: { attributes: [{ key: 'service.name', value: { stringValue: 'dsh' } }] }, scopeSpans: [{ scope: { name: 'dsh-ai-providers' }, spans: spans.map(span => otlpSpan(span, environment)) }] }] }),
      })
      if (!response.ok) throw new Error(`Langfuse answered ${response.status} to the spans: ${(await response.text()).slice(0, 200)}`)
    }
    for (const item of items) {
      if (item.type !== 'score') continue
      await this.score(base, authorization, item.score)
    }
  }

  private async score(base: string, authorization: string, score: ScoreRecord): Promise<void> {
    const dataType = typeof score.value === 'number' ? 'NUMERIC' : typeof score.value === 'boolean' ? 'BOOLEAN' : 'CATEGORICAL'
    const response = await this.send(`${base}/api/public/scores`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization },
      body: JSON.stringify({ traceId: score.traceId, ...score.spanId === undefined ? {} : { observationId: score.spanId }, name: score.name, value: typeof score.value === 'boolean' ? (score.value ? 1 : 0) : score.value, dataType, ...score.comment === undefined ? {} : { comment: score.comment } }),
    })
    if (!response.ok) throw new Error(`Langfuse answered ${response.status} to a score: ${(await response.text()).slice(0, 200)}`)
  }
}
