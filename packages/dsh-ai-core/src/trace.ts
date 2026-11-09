import type {} from '@deepseek-ai/cordis'

/** Where a span sits: enough to start a child of it from code the async context does not reach. */
export interface SpanRef {
  traceId: string
  spanId: string
}

/** `generation` is a language-model call; `event` has no duration. */
export type SpanKind = 'span' | 'generation' | 'event' | 'embedding' | 'agent' | 'tool'

export interface SpanStart {
  name: string
  kind?: SpanKind
  input?: unknown
  metadata?: Readonly<Record<string, unknown>>
  /** The model of a generation. */
  model?: string
  modelParameters?: Readonly<Record<string, unknown>>
  /** Starts a new trace instead of nesting under the current span; a trace carries the session, user and tags. */
  trace?: { name?: string; sessionId?: string; userId?: string; tags?: readonly string[] }
  /** The parent when the async context does not carry it. */
  parent?: SpanRef | undefined
}

export interface SpanResult {
  output?: unknown
  metadata?: Readonly<Record<string, unknown>>
  model?: string
  /** Token counts by kind, such as `input`, `output`, `total`. */
  usage?: Readonly<Record<string, number>>
  /** When the first part of an answer arrived. */
  firstTokenAt?: number
  level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR'
  statusMessage?: string
  /** The exact request body a provider put on the wire (the last attempt), kept apart from the input because it is large. */
  wire?: unknown
}

export interface SpanHandle {
  readonly ref: SpanRef
  /** Adds to what the span will record; later values win field by field. */
  update(result: SpanResult): void
  /** Ends the span once; a second call does nothing. */
  end(result?: SpanResult): void
}

/**
 * What `ctx.aiTrace` is: observability for every capability call and for the work around it. It exists only while capture is on,
 * so look it up with `ctx.get('aiTrace')`; without it nothing is recorded and nothing changes.
 */
export interface AiTracer {
  /** The span the running code belongs to, if its async context carries one. */
  current(): SpanRef | undefined
  /** Runs the work as a span nested under the current one (or `parent`); the span ends with the work, failing with it. */
  run<T>(start: SpanStart, work: (span: SpanHandle) => Promise<T>): Promise<T>
  /** A span ended by hand, for work that is not one call (a stream). It is not made current. */
  start(start: SpanStart): SpanHandle
  /** Makes a span current for the work, whose own calls nest under it. */
  within<T>(span: SpanRef, work: () => T): T
  /** Names the span that work done under a key belongs to, for code the async context does not reach (a session id is the key of an agent's calls). */
  link(key: string, span: SpanRef): () => void
  /** The span linked to a key, if any. */
  linked(key: string | undefined): SpanRef | undefined
  /** A judgement of a trace or one of its spans, such as a benchmark verdict. */
  score(target: SpanRef, score: { name: string; value: number | string | boolean; comment?: string }): void
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Observability, offered by the main plugin while capture is switched on. */
    aiTrace: AiTracer
  }
}
