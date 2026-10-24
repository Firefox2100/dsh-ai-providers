import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import { AiError, configuredLlmRoute, LlmRequestError, LlmService, sseData, streamLlmHttp, type LlmCall, type LlmEndpointDraft, type LlmModelSpec, type LlmRouteSpec } from '@dsh-ai-providers/core'
import type { CohereLlmRouteConfig, Config } from '../config.ts'
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
      let baseUrl = connections.find(item => item.id === route.connection)?.baseUrl.trim()
      while (baseUrl?.endsWith('/')) baseUrl = baseUrl.slice(0, -1)
      return configuredLlmRoute(route, baseUrl === undefined || baseUrl === '' ? undefined : baseUrl)
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
    yield* streamLlmHttp({
      signal: call.options.signal,
      idleMs: this.deps.config.llmIdleTimeoutMs.get(),
      url: connection.baseUrl,
      request: async (signal) => {
        const body = await wireBody(call, async (ref) => {
          const stored = await this.deps.images?.()?.readImage(ref as never, signal)
          if (stored === undefined) throw new LlmRequestError('UNSUPPORTED_CONTENT', 'this deployment has no attachment service for image input')
          return { data: stored.data, mediaType: stored.ref.mediaType }
        })
        return this.send(`${connection.baseUrl}/chat`, {
          method: 'POST',
          signal,
          redirect: 'error',
          headers: { ...route.headers, ...call.headers, ...await connectionHeaders(connection, this.deps.credentials), 'content-type': 'application/json', accept: 'text/event-stream' },
          body: JSON.stringify(body),
        })
      },
      responseError: async response => httpError(response, await response.json().catch(() => undefined)),
      translate: (body, pulse, signal) => translate(sseData(body, pulse, signal)),
    })
  }

}
