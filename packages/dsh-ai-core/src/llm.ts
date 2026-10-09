import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { AiError, type AiErrorCode } from './errors.ts'
import { AiService } from './service.ts'

/**
 * Controls of one model request beyond what DSH's own request carries. Every field is optional and absent means
 * the server's own default. They are set on a model, on a route, or by a policy, and the most specific wins.
 */
export interface LlmSampling {
  temperature?: number | undefined
  topP?: number | undefined
  topK?: number | undefined
  minP?: number | undefined
  frequencyPenalty?: number | undefined
  presencePenalty?: number | undefined
  repetitionPenalty?: number | undefined
  seed?: number | undefined
  stop?: readonly string[] | undefined
  /** The most tokens one request may produce. */
  maxTokens?: number | undefined
  /** Whether and which tool the model must call; `required` makes it answer with a call instead of prose. */
  toolChoice?: 'auto' | 'none' | 'required' | { name: string } | undefined
  /** Further top-level fields of the request body, for what an endpoint accepts beyond the OpenAI API. */
  body?: Readonly<Record<string, unknown>> | undefined
}

/** One thinking level a model offers, with the request fields that select it on this endpoint. */
export interface LlmReasoningLevel {
  id: string
  name: string
  body: Readonly<Record<string, unknown>>
}

/** One model of a route, as its owner describes it. */
export interface LlmModelSpec {
  id: string
  name: string
  description?: string
  /** What the model can read and the route accepts; text only when absent. */
  inputs?: readonly ('text' | 'image')[]
  /** Combined size of request and answer, in tokens. */
  contextWindow?: number
  /** The output limit used when a request sets none. */
  maxTokens?: number
  reasoning?: { levels: readonly LlmReasoningLevel[]; default?: string }
  sampling?: LlmSampling
}

/** A named way to reach models: what DSH calls a provider and a chat selects with `provider/model`. */
export interface LlmRouteSpec {
  id: string
  name: string
  models: readonly LlmModelSpec[]
  sampling?: LlmSampling
}

/** One model request as the service gets it: DSH's request, the route and model it names, and the controls that apply to it. */
export interface LlmCall {
  options: GenerateOptions
  route: LlmRouteSpec
  /** Absent for a model id the route does not list (DSH routes any id). */
  model: LlmModelSpec | undefined
  /** The model's, the route's and the policies' controls, merged; what `options` itself sets is already in. */
  sampling: LlmSampling
  /** Headers that identify the harness to the endpoint; every request must carry them. */
  headers: Readonly<Record<string, string>>
}

/**
 * Decides controls for a request from what is known about it: the session, the purpose, the tools, the route. A consumer that knows
 * what a request is for (a story's characters think differently from its narrator) registers one.
 * It answers only what it wants to change; the answers of all policies are merged in registration order.
 */
export type LlmPolicy = (request: { options: GenerateOptions; route: string; model: string }) => LlmSampling | undefined

/** The failure classes DSH's retry and compaction act on. */
export const LLM_FAILURE_CODES = ['AUTH', 'RATE_LIMIT', 'SERVER', 'TIMEOUT', 'TRANSPORT', 'INVALID_REQUEST', 'CONTEXT_WINDOW_EXCEEDED', 'QUOTA', 'EMPTY_RESPONSE', 'ABORTED', 'UNSUPPORTED_CONTENT'] as const
export type LlmFailureCode = (typeof LLM_FAILURE_CODES)[number]

const AI_CODE: Record<LlmFailureCode, AiErrorCode> = {
  AUTH: 'rejected', QUOTA: 'rejected', INVALID_REQUEST: 'rejected', CONTEXT_WINDOW_EXCEEDED: 'rejected', UNSUPPORTED_CONTENT: 'unsupported',
  RATE_LIMIT: 'unavailable', SERVER: 'unavailable', TIMEOUT: 'unavailable', TRANSPORT: 'unavailable', EMPTY_RESPONSE: 'unavailable',
  ABORTED: 'cancelled',
}

/** What a failed model request tells whoever decides whether to try again. */
export interface LlmFailureFacts {
  status?: number
  retryAfterMs?: number
  requestId?: string
}

/** A model request that failed, classified the way DSH classifies them. */
export class LlmRequestError extends AiError {
  constructor(readonly failure: LlmFailureCode, message: string, readonly facts: LlmFailureFacts = {}, options?: ErrorOptions) {
    super(AI_CODE[failure], message, options)
    this.name = 'LlmRequestError'
  }
}

/** A provider's language models: the routes it serves and the streaming of a request to one of them. */
export abstract class LlmService extends AiService {
  readonly capability = 'llm' as const

  /** The model of a route is the one a request names, so a service has none of its own. */
  get model(): string { return '' }

  /** The routes the service serves now. Read on each use, so an edited configuration applies at once. */
  abstract routes(): readonly LlmRouteSpec[]

  /**
   * Streams the answer to one request in DSH's chunk vocabulary: blocks with deltas and their ends, usage, and one finish.
   * @throws {LlmRequestError} when the request fails.
   */
  abstract stream(call: LlmCall): AsyncIterable<StreamChunk>

  /** The models the endpoint of a route says it has, for choosing which to add. */
  async discover(_route: string, _signal?: AbortSignal): Promise<LlmModelSpec[]> { return [] }
}
