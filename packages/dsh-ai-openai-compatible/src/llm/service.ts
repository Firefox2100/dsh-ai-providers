import type { RetryPolicyConfig, StreamChunk } from '@deepseek-ai/dsh-llm'
import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, LlmRequestError, LlmService, readJson, type LlmCall, type LlmEndpointDraft, type LlmModelSpec, type LlmRouteSpec, type LlmSampling } from '@dsh-ai-providers/core'
import type { Config, OpenAiLlmModelConfig, OpenAiLlmRouteConfig, OpenAiSamplingConfig } from '../config.ts'
import { connectionHeaders, validateConnection, type OpenAiConnection } from '../connection.ts'
import { httpError } from './errors.ts'
import { imageRefsOf, wireBody, type WireImages } from './serialize.ts'
import { sseData } from './sse.ts'
import { translate } from './translate.ts'

/** What of DSH's attachment service a request needs: the stored bytes of a picture a message cites. */
export interface ImageReader {
  readImage(ref: never, signal?: AbortSignal): Promise<{ ref: { mediaType: string }; data: Uint8Array }>
}

export interface OpenAiLlmDeps {
  config: Config
  provider?: string
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  /** The attachment service, when there is one: without it, or for a model not declared as able to see (`vision`), pictures are told to the model as text. */
  images?: () => ImageReader | undefined
  fetch?: typeof fetch
}

const sampling = (config: OpenAiSamplingConfig | undefined): LlmSampling | undefined => config === undefined ? undefined : config

function modelSpec(model: OpenAiLlmModelConfig): LlmModelSpec {
  return {
    id: model.id,
    name: model.name,
    inputs: model.vision === true ? ['text', 'image'] : ['text'],
    ...model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow },
    ...model.maxTokens === undefined ? {} : { maxTokens: model.maxTokens },
    ...model.reasoningLevels === undefined || model.reasoningLevels.length === 0 ? {} : {
      reasoning: { levels: model.reasoningLevels, ...model.defaultReasoning === undefined ? {} : { default: model.defaultReasoning } },
    },
    ...model.systemInHistory === true ? { systemPromptUpdate: 'in-history' as const } : {},
    ...model.sampling === undefined ? {} : { sampling: sampling(model.sampling)! },
  }
}

function routeSpec(route: OpenAiLlmRouteConfig, baseUrl: string | undefined): LlmRouteSpec {
  return {
    id: route.id, name: route.name, models: route.models.map(modelSpec),
    ...route.sampling === undefined ? {} : { sampling: sampling(route.sampling)! },
    ...baseUrl === undefined ? {} : { baseUrl },
    ...route.retry === undefined ? {} : { retry: route.retry as RetryPolicyConfig },
  }
}

/** The address a route's connection names, read without judging it: a bad address is reported when a request needs it. */
const addressOf = (connection: { baseUrl: string } | undefined): string | undefined => {
  const address = connection?.baseUrl.trim().replace(/\/+$/, '')
  return address === undefined || address === '' ? undefined : address
}

/** Language models behind an OpenAI-compatible `chat/completions` endpoint: the routes of the configuration, each through one of its connections. */
export class OpenAiLlmService extends LlmService {
  readonly provider: string
  private readonly send: typeof fetch

  constructor(private readonly deps: OpenAiLlmDeps) {
    super()
    this.provider = deps.provider ?? 'openai'
    this.send = deps.fetch ?? fetch
  }

  routes(): readonly LlmRouteSpec[] {
    const connections = this.deps.config.connections.get()
    return this.deps.config.llmRoutes.get().map(route => routeSpec(route, addressOf(connections.find(candidate => candidate.id === route.connection))))
  }

  private configOf(routeId: string): { route: OpenAiLlmRouteConfig; connection: OpenAiConnection } {
    const route = this.deps.config.llmRoutes.get().find(candidate => candidate.id === routeId)
    if (route === undefined) throw new AiError('not-configured', `there is no language model route "${routeId}"`)
    const found = this.deps.config.connections.get().find(candidate => candidate.id === route.connection)
    if (found === undefined) throw new AiError('not-configured', `the route "${route.name}" uses the connection "${route.connection}", which does not exist`)
    return { route, connection: validateConnection(found) }
  }

  override async discover(routeId: string, signal?: AbortSignal): Promise<LlmModelSpec[]> {
    const { connection } = this.configOf(routeId)
    return this.models(connection.baseUrl, await connectionHeaders(connection, this.deps.credentials), signal)
  }

  override async interrogate(draft: LlmEndpointDraft, signal?: AbortSignal): Promise<LlmModelSpec[]> {
    const { baseUrl } = validateConnection({ id: 'draft', name: 'the endpoint', baseUrl: draft.baseUrl, apiKeyRef: '' })
    return this.models(baseUrl, draft.apiKey === undefined || draft.apiKey === '' ? {} : { authorization: `Bearer ${draft.apiKey}` }, signal)
  }

  private async models(baseUrl: string, headers: Record<string, string>, signal?: AbortSignal): Promise<LlmModelSpec[]> {
    let response: Response
    try {
      response = await this.send(`${baseUrl}/models`, { headers, signal: signal === undefined ? AbortSignal.timeout(15_000) : AbortSignal.any([signal, AbortSignal.timeout(15_000)]) })
    } catch (error) {
      throw new AiError('unavailable', `${baseUrl} could not be reached: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    }
    if (!response.ok) throw new AiError('rejected', `the endpoint answered ${response.status} ${response.statusText}`.trim())
    const body = await readJson<{ data?: unknown; models?: unknown }>(response)
    const rows = Array.isArray(body?.data) ? body.data : Array.isArray(body?.models) ? body.models : []
    return rows.flatMap((row): LlmModelSpec[] => {
      if (typeof row === 'string') return [{ id: row, name: row }]
      if (typeof row !== 'object' || row === null) return []
      const fields = row as Record<string, unknown>
      const id = typeof fields['id'] === 'string' ? fields['id'] : undefined
      if (id === undefined) return []
      const window = [fields['context_window'], fields['context_length'], fields['max_model_len'], fields['n_ctx']].find((value): value is number => typeof value === 'number' && value > 0)
      return [{ id, name: typeof fields['name'] === 'string' ? fields['name'] : id, ...window === undefined ? {} : { contextWindow: window } }]
    })
  }

  stream(call: LlmCall): AsyncIterable<StreamChunk> {
    return this.generate(call)
  }

  private async * generate(call: LlmCall): AsyncGenerator<StreamChunk> {
    const { route, connection } = this.configOf(call.options.provider)
    const body = wireBody(call, { maxTokensField: route.maxCompletionTokens === true ? 'max_completion_tokens' : 'max_tokens', replayReasoning: route.replayReasoning === true }, await this.pictures(call))
    const consumer = new AbortController()
    const signal = call.options.signal === undefined ? consumer.signal : AbortSignal.any([consumer.signal, call.options.signal])
    const idleMs = Math.max(1, this.deps.config.llmIdleTimeoutMs.get())
    let timedOut = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const pulse = (): void => {
      clearTimeout(timer)
      timer = setTimeout(() => { timedOut = true; consumer.abort() }, idleMs)
    }
    pulse()
    try {
      let response: Response
      try {
        response = await this.send(`${connection.baseUrl}/chat/completions`, {
          method: 'POST', signal, redirect: 'error', body: JSON.stringify(body),
          headers: { ...route.headers, ...call.headers, 'content-type': 'application/json', accept: 'text/event-stream', ...await connectionHeaders(connection, this.deps.credentials) },
        })
      } catch (error) {
        throw this.failed(error, call, timedOut, idleMs, connection.baseUrl)
      }
      if (!response.ok) {
        const text = await response.text()
        let raw: unknown = text
        try { raw = JSON.parse(text) } catch { /* the status is what counts when the body is not JSON */ }
        throw httpError(response.status, response.statusText, raw, response.headers)
      }
      if (response.body === null) throw new LlmRequestError('EMPTY_RESPONSE', 'the endpoint answered without a body', { status: response.status })
      try {
        yield * translate(sseData(response.body, pulse, signal), route.reasoningTags ?? 'tags')
      } catch (error) {
        throw this.failed(error, call, timedOut, idleMs, connection.baseUrl)
      }
    } finally {
      clearTimeout(timer)
      consumer.abort()
    }
  }

  /** The pictures the request carries, read from the attachment service, for a model that is declared to see them. */
  private async pictures(call: LlmCall): Promise<WireImages> {
    const wanted = imageRefsOf(call.options)
    const reader = this.deps.images?.()
    if (wanted.length === 0 || reader === undefined || call.model?.inputs?.includes('image') !== true) return new Map()
    const found = new Map<string, string>()
    for (const message of call.options.messages) {
      if (message.role !== 'user' && message.role !== 'developer' && message.role !== 'tool') continue
      for (const block of message.content) {
        if (block.type !== 'image' || found.has(String(block.attachment.attachmentId))) continue
        const stored = await reader.readImage(block.attachment as never, call.options.signal)
        found.set(String(block.attachment.attachmentId), `data:${stored.ref.mediaType};base64,${Buffer.from(stored.data).toString('base64')}`)
      }
    }
    return found
  }

  private failed(error: unknown, call: LlmCall, timedOut: boolean, idleMs: number, baseUrl: string): unknown {
    if (error instanceof LlmRequestError) return error
    if (call.options.signal?.aborted === true) return new LlmRequestError('ABORTED', 'the request was cancelled', {}, { cause: error })
    if (timedOut) return new LlmRequestError('TIMEOUT', `${baseUrl} was silent for ${Math.round(idleMs / 1000)} seconds`, {}, { cause: error })
    return new LlmRequestError('TRANSPORT', `${baseUrl} could not be reached or the connection dropped: ${error instanceof Error ? error.message : String(error)}`, {}, { cause: error })
  }
}
