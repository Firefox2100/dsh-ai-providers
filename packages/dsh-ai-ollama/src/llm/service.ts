import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import { AiError, configuredLlmRoute, LlmRequestError, LlmService, ndjsonLines, streamLlmHttp, type LlmCall, type LlmEndpointDraft, type LlmModelControl, type LlmModelSpec, type LlmRouteSpec } from '@dsh-ai-providers/core'
import type { Config, OllamaLlmRouteConfig } from '../config.ts'
import { connectionHeaders, validateConnection, type OllamaConnection } from '../connection.ts'
import { PROVIDER_ID } from '../ids.ts'
import { OllamaModelControl } from './control.ts'
import { discoverModels } from './discovery.ts'
import { httpError } from './errors.ts'
import { wireBody } from './serialize.ts'
import { translate } from './translate.ts'

/** Reads a stored image of the conversation; absent when the deployment has no attachment service. */
export interface ImageReader {
  readImage(ref: never, signal?: AbortSignal): Promise<{ data: Uint8Array; ref: { mediaType: string } }>
}

export interface OllamaLlmDeps {
  config: Config
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  images?: () => ImageReader | undefined
  /** Replaceable for tests. */
  fetch?: typeof fetch
}

function addressOf(baseUrl: string | undefined): string | undefined {
  let trimmed = baseUrl?.trim()
  while (trimmed?.endsWith('/')) trimmed = trimmed.slice(0, -1)
  return trimmed === undefined || trimmed === '' ? undefined : trimmed
}

/** Language models from Ollama's native `POST /api/chat`. */
export class OllamaLlmService extends LlmService {
  readonly provider = PROVIDER_ID
  override readonly modelControl: LlmModelControl
  private readonly send: typeof fetch

  constructor(private readonly deps: OllamaLlmDeps) {
    super()
    this.send = deps.fetch ?? fetch
    this.modelControl = new OllamaModelControl({
      credentials: deps.credentials,
      ...deps.fetch === undefined ? {} : { fetch: deps.fetch },
      route: (id) => {
        const { route, connection } = this.configOf(id)
        return { connection, keepAlive: route.sampling?.keepAlive }
      },
    })
  }

  routes(): readonly LlmRouteSpec[] {
    const connections = this.deps.config.connections.get()
    return this.deps.config.llmRoutes.get().map(route => configuredLlmRoute(route, addressOf(connections.find(item => item.id === route.connection)?.baseUrl)))
  }

  private configOf(id: string): { route: OllamaLlmRouteConfig; connection: OllamaConnection } {
    const route = this.deps.config.llmRoutes.get().find(item => item.id === id)
    if (route === undefined) throw new AiError('not-configured', `there is no language model route "${id}"`)
    const connection = this.deps.config.connections.get().find(item => item.id === route.connection)
    if (connection === undefined) throw new AiError('not-configured', `the route "${route.name}" uses a connection that does not exist`)
    return { route, connection: validateConnection(connection) }
  }

  override async discover(routeId: string, signal?: AbortSignal): Promise<LlmModelSpec[]> {
    const { connection } = this.configOf(routeId)
    return discoverModels(this.send, connection.apiUrl, await connectionHeaders(connection, this.deps.credentials), signal)
  }

  override async interrogate(draft: LlmEndpointDraft, signal?: AbortSignal): Promise<LlmModelSpec[]> {
    const connection = validateConnection({ id: 'draft', name: 'the endpoint', baseUrl: draft.baseUrl, apiKeyRef: '' })
    return discoverModels(this.send, connection.apiUrl, draft.apiKey === undefined || draft.apiKey === '' ? {} : { authorization: `Bearer ${draft.apiKey}` }, signal)
  }

  stream(call: LlmCall): AsyncIterable<StreamChunk> { return this.generate(call) }

  private async * generate(call: LlmCall): AsyncGenerator<StreamChunk> {
    const { route, connection } = this.configOf(call.options.provider)
    yield* streamLlmHttp({
      signal: call.options.signal,
      idleMs: this.deps.config.llmIdleTimeoutMs.get(),
      url: connection.apiUrl,
      request: async (signal) => {
        const body = await wireBody(call, async (ref) => {
          const stored = await this.deps.images?.()?.readImage(ref as never, signal)
          if (stored === undefined) throw new LlmRequestError('UNSUPPORTED_CONTENT', 'this deployment has no attachment service for image input')
          return { data: stored.data }
        })
        return this.send(`${connection.apiUrl}/chat`, {
          method: 'POST',
          signal,
          redirect: 'error',
          headers: { ...route.headers, ...call.headers, ...await connectionHeaders(connection, this.deps.credentials), 'content-type': 'application/json', accept: 'application/x-ndjson' },
          body: JSON.stringify(body),
        })
      },
      responseError: async response => httpError(response, await response.json().catch(() => undefined)),
      translate: (body, pulse, signal) => translate(ndjsonLines(body, pulse, signal)),
    })
  }

}
