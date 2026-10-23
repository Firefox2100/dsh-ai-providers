import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type { RetryPolicyConfig, StreamChunk } from '@deepseek-ai/dsh-llm'
import { AiError, LlmRequestError, LlmService, sseData, type LlmCall, type LlmEndpointDraft, type LlmModelSpec, type LlmRouteSpec } from '@dsh-ai-providers/core'
import type { CohereLlmModelConfig, CohereLlmRouteConfig, Config } from '../config.ts'
import { connectionHeaders, validateConnection, type CohereConnection } from '../connection.ts'
import { PROVIDER_ID } from '../ids.ts'
import { discoverModels } from './discovery.ts'
import { httpError } from './errors.ts'
import { wireBody } from './serialize.ts'
import { translate } from './translate.ts'

/** Reads a stored image of the conversation; absent when the deployment has no attachment service. */
export interface ImageReader {
  readImage(ref: never, signal?: AbortSignal): Promise<{ data: Uint8Array; ref: { mediaType: string } }>
}

export interface CohereLlmDeps {
  config: Pick<Config, 'connections' | 'llmRoutes' | 'llmIdleTimeoutMs'>
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  images?: () => ImageReader | undefined
  /** Replaceable for tests. */
  fetch?: typeof fetch
}

function modelSpec(model: CohereLlmModelConfig): LlmModelSpec {
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

function routeSpec(route: CohereLlmRouteConfig, baseUrl: string | undefined): LlmRouteSpec {
  return {
    id: route.id,
    name: route.name,
    models: route.models.map(modelSpec),
    ...route.sampling === undefined ? {} : { sampling: route.sampling },
    ...baseUrl === undefined ? {} : { baseUrl },
    ...route.retry === undefined ? {} : { retry: route.retry as RetryPolicyConfig },
  }
}

/** Language models from Cohere's native `POST /v2/chat`. */
export class CohereLlmService extends LlmService {
  readonly provider = PROVIDER_ID
  private readonly send: typeof fetch

  constructor(private readonly deps: CohereLlmDeps) {
    super()
    this.send = deps.fetch ?? fetch
  }

  routes(): readonly LlmRouteSpec[] {
    const connections = this.deps.config.connections.get()
    return this.deps.config.llmRoutes.get().map((route) => {
      const baseUrl = connections.find(item => item.id === route.connection)?.baseUrl.trim().replace(/\/+$/, '')
      return routeSpec(route, baseUrl === undefined || baseUrl === '' ? undefined : baseUrl)
    })
  }

  private configOf(id: string): { route: CohereLlmRouteConfig; connection: CohereConnection } {
    const route = this.deps.config.llmRoutes.get().find(item => item.id === id)
    if (route === undefined) throw new AiError('not-configured', `there is no language model route "${id}"`)
    const connection = this.deps.config.connections.get().find(item => item.id === route.connection)
    if (connection === undefined) throw new AiError('not-configured', `the route "${route.name}" uses a connection that does not exist`)
    return { route, connection: validateConnection(connection) }
  }

  override async discover(routeId: string, signal?: AbortSignal): Promise<LlmModelSpec[]> {
    const { connection } = this.configOf(routeId)
    return discoverModels(this.send, connection.baseUrl, await connectionHeaders(connection, this.deps.credentials), signal)
  }

  override async interrogate(draft: LlmEndpointDraft, signal?: AbortSignal): Promise<LlmModelSpec[]> {
    const connection = validateConnection({ id: 'draft', name: 'the endpoint', baseUrl: draft.baseUrl, apiKeyRef: '' })
    return discoverModels(this.send, connection.baseUrl, draft.apiKey === undefined || draft.apiKey === '' ? {} : { authorization: `Bearer ${draft.apiKey}` }, signal)
  }

  stream(call: LlmCall): AsyncIterable<StreamChunk> { return this.generate(call) }

  private async * generate(call: LlmCall): AsyncGenerator<StreamChunk> {
    const { route, connection } = this.configOf(call.options.provider)
    const controller = new AbortController()
    const signal = call.options.signal ? AbortSignal.any([call.options.signal, controller.signal]) : controller.signal
    const idle = Math.max(1, this.deps.config.llmIdleTimeoutMs.get())
    let timedOut = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const pulse = (): void => {
      clearTimeout(timer)
      timer = setTimeout(() => { timedOut = true; controller.abort() }, idle)
    }
    pulse()
    try {
      let response: Response
      try {
        const body = await wireBody(call, async (ref) => {
          const stored = await this.deps.images?.()?.readImage(ref as never, signal)
          if (stored === undefined) throw new LlmRequestError('UNSUPPORTED_CONTENT', 'this deployment has no attachment service for image input')
          return { data: stored.data, mediaType: stored.ref.mediaType }
        })
        response = await this.send(`${connection.baseUrl}/chat`, {
          method: 'POST',
          signal,
          redirect: 'error',
          headers: { ...route.headers, ...call.headers, ...await connectionHeaders(connection, this.deps.credentials), 'content-type': 'application/json', accept: 'text/event-stream' },
          body: JSON.stringify(body),
        })
      } catch (error) { throw this.failed(error, call, timedOut, idle, connection.baseUrl) }
      if (!response.ok) throw httpError(response, await response.json().catch(() => undefined))
      if (!response.body) throw new LlmRequestError('EMPTY_RESPONSE', 'the endpoint answered without a body', { status: response.status })
      try { yield * translate(sseData(response.body, pulse, signal)) } catch (error) { throw this.failed(error, call, timedOut, idle, connection.baseUrl) }
    } finally {
      clearTimeout(timer)
      controller.abort()
    }
  }

  private failed(error: unknown, call: LlmCall, timedOut: boolean, idle: number, url: string): unknown {
    if (error instanceof LlmRequestError || error instanceof AiError) return error
    if (call.options.signal?.aborted === true) return new LlmRequestError('ABORTED', 'the request was cancelled', {}, { cause: error })
    if (timedOut) return new LlmRequestError('TIMEOUT', `${url} was silent for ${Math.round(idle / 1000)} seconds`, {}, { cause: error })
    return new LlmRequestError('TRANSPORT', `${url} could not be reached or the connection dropped`, {}, { cause: error })
  }
}
