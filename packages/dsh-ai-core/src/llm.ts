import type { GenerateOptions, RetryPolicyConfig, StreamChunk } from '@deepseek-ai/dsh-llm'
import { AiError, type AiErrorCode } from './errors.ts'
import { AiService, type RequestPriority } from './service.ts'

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
  /** Levels run from the least to the greatest effort: DSH picks the first for light work such as session titles. */
  reasoning?: { levels: readonly LlmReasoningLevel[]; default?: string }
  /** The model reads the latest system message at any position of the conversation as the whole system prompt; absent means only a leading one is read. */
  systemPromptUpdate?: 'in-history'
  sampling?: LlmSampling
}

/** Converts the model shape shared by provider configuration schemas into the runtime contract. */
export function configuredLlmModel(model: {
  id: string
  name: string
  vision?: boolean | undefined
  contextWindow?: number | undefined
  maxTokens?: number | undefined
  reasoningLevels?: readonly LlmReasoningLevel[] | undefined
  defaultReasoning?: string | undefined
  sampling?: LlmSampling | undefined
}): LlmModelSpec {
  return {
    id: model.id,
    name: model.name,
    inputs: model.vision === true ? ['text', 'image'] : ['text'],
    ...model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow },
    ...model.maxTokens === undefined ? {} : { maxTokens: model.maxTokens },
    ...model.reasoningLevels === undefined || model.reasoningLevels.length === 0 ? {} : { reasoning: { levels: model.reasoningLevels, ...model.defaultReasoning === undefined ? {} : { default: model.defaultReasoning } } },
    ...model.sampling === undefined ? {} : { sampling: model.sampling },
  }
}

/** A named way to reach models: what DSH calls a provider and a chat selects with `provider/model`. */
export interface LlmRouteSpec {
  id: string
  name: string
  models: readonly LlmModelSpec[]
  sampling?: LlmSampling
  /** The endpoint the route sends its requests to, when it has one fixed by its configuration. */
  baseUrl?: string
  /** How DSH retries a failed request of this route; absent means DSH's own defaults. */
  retry?: RetryPolicyConfig
}

/** Converts the route shape shared by provider configuration schemas into the runtime contract. */
export function configuredLlmRoute(route: {
  id: string
  name: string
  models: readonly Parameters<typeof configuredLlmModel>[0][]
  sampling?: LlmSampling | undefined
  retry?: object | undefined
}, baseUrl?: string): LlmRouteSpec {
  return {
    id: route.id,
    name: route.name,
    models: route.models.map(configuredLlmModel),
    ...route.sampling === undefined ? {} : { sampling: route.sampling },
    ...baseUrl === undefined ? {} : { baseUrl },
    ...route.retry === undefined ? {} : { retry: route.retry as RetryPolicyConfig },
  }
}

/** An endpoint a surface is still editing: nothing stored yet, the key used for this one question only. */
export interface LlmEndpointDraft {
  baseUrl: string
  apiKey?: string
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

/** Maps failures shared by streaming HTTP transports while keeping provider response errors intact. */
export function llmTransportFailure(error: unknown, signal: AbortSignal | undefined, timedOut: boolean, idleMs: number, url: string): unknown {
  if (error instanceof LlmRequestError || error instanceof AiError) return error
  if (signal?.aborted === true) return new LlmRequestError('ABORTED', 'the request was cancelled', {}, { cause: error })
  if (timedOut) return new LlmRequestError('TIMEOUT', `${url} was silent for ${Math.round(idleMs / 1000)} seconds`, {}, { cause: error })
  return new LlmRequestError('TRANSPORT', `${url} could not be reached or the connection dropped`, {}, { cause: error })
}

export interface StreamingLlmHttpOptions {
  signal?: AbortSignal | undefined
  idleMs: number
  url: string
  request(signal: AbortSignal): Promise<Response>
  responseError(response: Response): Promise<LlmRequestError>
  translate(body: ReadableStream<Uint8Array>, pulse: () => void, signal: AbortSignal): AsyncIterable<StreamChunk>
}

/** Runs the timeout, cancellation and response lifecycle shared by streaming HTTP language-model transports. */
export async function* streamLlmHttp(options: StreamingLlmHttpOptions): AsyncGenerator<StreamChunk> {
  const controller = new AbortController()
  const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal
  const idle = Math.max(1, options.idleMs)
  let timedOut = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const pulse = (): void => {
    clearTimeout(timer)
    timer = setTimeout(() => { timedOut = true; controller.abort() }, idle)
  }
  pulse()
  try {
    let response: Response
    try { response = await options.request(signal) }
    catch (error) { throw llmTransportFailure(error, options.signal, timedOut, idle, options.url) }
    if (!response.ok) throw await options.responseError(response)
    if (!response.body) throw new LlmRequestError('EMPTY_RESPONSE', 'the endpoint answered without a body', { status: response.status })
    try { yield* options.translate(response.body, pulse, signal) }
    catch (error) { throw llmTransportFailure(error, options.signal, timedOut, idle, options.url) }
  } finally {
    clearTimeout(timer)
    controller.abort()
  }
}

/** One operation a provider offers for the resident process behind a language model. */
export type LlmModelOperation = 'status' | 'load' | 'unload'

/** Provider-neutral state of a model backend, when the provider can observe it. */
export interface LlmModelRuntimeStatus {
  state: 'uninitialized' | 'busy' | 'ready' | 'error' | 'unknown'
  /** Resident memory reported by the provider, in bytes. */
  memoryBytes?: number
}

/** Optional administrative operations of one provider's language-model routes. */
export interface LlmModelControl {
  readonly operations: readonly LlmModelOperation[]
  status?(route: string, model: string, signal?: AbortSignal): Promise<LlmModelRuntimeStatus>
  load?(route: string, model: string, signal?: AbortSignal): Promise<void>
  unload?(route: string, model: string, signal?: AbortSignal): Promise<void>
}

/** Route-based access to the optional model administration offered by providers. */
export interface AiModelControls {
  operations(route: string): readonly LlmModelOperation[]
  status(route: string, model: string, signal?: AbortSignal): Promise<LlmModelRuntimeStatus>
  load(route: string, model: string, signal?: AbortSignal): Promise<void>
  unload(route: string, model: string, signal?: AbortSignal): Promise<void>
}

/**
 * Decides controls for a request from what is known about it: the session, the purpose, the tools, the route. A consumer that knows
 * what a request is for (a story's characters think differently from its narrator) registers one.
 * It answers only what it wants to change; the answers of all policies are merged in registration order. `priority` says where the request stands when its route is busy.
 */
export type LlmPolicy = (request: { options: GenerateOptions; route: string; model: string }) => (LlmSampling & { priority?: RequestPriority }) | undefined

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

  /** Administrative model lifecycle, when this endpoint offers it. */
  readonly modelControl?: LlmModelControl

  /** The routes the service serves now. Read on each use, so an edited configuration applies at once. */
  abstract routes(): readonly LlmRouteSpec[]

  /**
   * Streams the answer to one request in DSH's chunk vocabulary: blocks with deltas and their ends, usage, and one finish.
   * @throws {LlmRequestError} when the request fails.
   */
  abstract stream(call: LlmCall): AsyncIterable<StreamChunk>

  /** The models the endpoint of a route says it has, for choosing which to add. */
  async discover(_route: string, _signal?: AbortSignal): Promise<LlmModelSpec[]> { return [] }

  /**
   * The models an endpoint that is not configured yet says it has.
   * @throws {AiError} `unsupported` when the service cannot ask an endpoint on its own.
   */
  async interrogate(_draft: LlmEndpointDraft, _signal?: AbortSignal): Promise<LlmModelSpec[]> {
    throw new AiError('unsupported', 'this provider cannot list the models of an endpoint that is not configured yet')
  }
}
