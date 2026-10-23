import type {RetryPolicyConfig, StreamChunk} from '@deepseek-ai/dsh-llm'
import type {CredentialProvider} from '@deepseek-ai/dsh-credentials'
import {AiError, LlmRequestError, LlmService, type LlmCall, type LlmEndpointDraft, type LlmModelSpec, type LlmRouteSpec, type LlmSampling} from '@dsh-ai-providers/core'
import type {AnthropicLlmModelConfig, AnthropicLlmRouteConfig, AnthropicSamplingConfig, Config} from '../config.ts'
import {connectionHeaders, validateConnection, type AnthropicConnection} from '../connection.ts'
import {PROVIDER_ID} from '../ids.ts'
import {httpError} from './errors.ts'
import {wireBody} from './serialize.ts'
import {sseData} from './sse.ts'
import {translate} from './translate.ts'

interface AttachmentReader {readImage(ref: never, signal?: AbortSignal): Promise<{data: Uint8Array; ref: {mediaType: string}}>}
export interface AnthropicLlmDeps {config: Config; credentials: () => Pick<CredentialProvider, 'resolve'> | undefined; attachments?: () => AttachmentReader | undefined; fetch?: typeof fetch}
const sampling = (value: AnthropicSamplingConfig | undefined): LlmSampling | undefined => value
const modelSpec = (model: AnthropicLlmModelConfig): LlmModelSpec => ({id: model.id, name: model.name, inputs: model.vision === true ? ['text', 'image'] : ['text'], ...(model.contextWindow === undefined ? {} : {contextWindow: model.contextWindow}), ...(model.maxTokens === undefined ? {} : {maxTokens: model.maxTokens}), ...(model.reasoningLevels === undefined || model.reasoningLevels.length === 0 ? {} : {reasoning: {levels: model.reasoningLevels, ...(model.defaultReasoning === undefined ? {} : {default: model.defaultReasoning})}}), ...(model.sampling === undefined ? {} : {sampling: sampling(model.sampling)!})})
const addressOf = (connection: {baseUrl: string} | undefined): string | undefined => {
  let address = connection?.baseUrl.trim()
  while (address?.endsWith('/')) address = address.slice(0, -1)
  return address === undefined || address === '' ? undefined : address
}
const routeSpec = (route: AnthropicLlmRouteConfig, baseUrl: string | undefined): LlmRouteSpec => ({id: route.id, name: route.name, models: route.models.map(modelSpec), ...(route.sampling === undefined ? {} : {sampling: sampling(route.sampling)!}), ...(baseUrl === undefined ? {} : {baseUrl}), ...(route.retry === undefined ? {} : {retry: route.retry as RetryPolicyConfig})})

export class AnthropicLlmService extends LlmService {
  readonly provider = PROVIDER_ID
  private readonly send: typeof fetch
  constructor(private readonly deps: AnthropicLlmDeps) { super(); this.send = deps.fetch ?? fetch }
  routes(): readonly LlmRouteSpec[] { const connections = this.deps.config.connections.get(); return this.deps.config.llmRoutes.get().map(route => routeSpec(route, addressOf(connections.find(item => item.id === route.connection)))) }
  private configOf(id: string): {route: AnthropicLlmRouteConfig; connection: AnthropicConnection} {
    const route = this.deps.config.llmRoutes.get().find(item => item.id === id)
    if (!route) throw new AiError('not-configured', `there is no language model route "${id}"`)
    const connection = this.deps.config.connections.get().find(item => item.id === route.connection)
    if (!connection) throw new AiError('not-configured', `the route "${route.name}" uses a connection that does not exist`)
    return {route, connection: validateConnection(connection)}
  }
  override async discover(routeId: string, signal?: AbortSignal): Promise<LlmModelSpec[]> {
    const {connection} = this.configOf(routeId)
    return this.models(connection.baseUrl, await connectionHeaders(connection, this.deps.credentials), signal)
  }
  override async interrogate(draft: LlmEndpointDraft, signal?: AbortSignal): Promise<LlmModelSpec[]> {
    const {baseUrl} = validateConnection({id: 'draft', name: 'the endpoint', baseUrl: draft.baseUrl, apiKeyRef: ''})
    return this.models(baseUrl, draft.apiKey === undefined || draft.apiKey === '' ? {} : {'x-api-key': draft.apiKey}, signal)
  }
  private async models(baseUrl: string, headers: Record<string, string>, signal?: AbortSignal): Promise<LlmModelSpec[]> {
    const timeout = AbortSignal.timeout(15_000)
    let response: Response
    try { response = await this.send(`${baseUrl}/models?limit=100`, {headers: {...headers, 'anthropic-version': this.deps.config.anthropicVersion.get()}, signal: signal ? AbortSignal.any([signal, timeout]) : timeout}) }
    catch (error) { throw new AiError(signal?.aborted ? 'cancelled' : 'unavailable', `${baseUrl} could not be reached`, {cause: error}) }
    if (!response.ok) throw httpError(response, await response.json().catch(() => undefined))
    const body = await response.json() as {data?: unknown}
    return Array.isArray(body.data) ? body.data.flatMap((value): LlmModelSpec[] => {
      if (typeof value !== 'object' || value === null) return []
      const row = value as Record<string, unknown>
      return typeof row['id'] === 'string' ? [{id: row['id'], name: typeof row['display_name'] === 'string' ? row['display_name'] : row['id'], inputs: ['text', 'image']}] : []
    }) : []
  }
  stream(call: LlmCall): AsyncIterable<StreamChunk> { return this.generate(call) }
  private async* generate(call: LlmCall): AsyncGenerator<StreamChunk> {
    const {route, connection} = this.configOf(call.options.provider)
    const controller = new AbortController()
    const signal = call.options.signal ? AbortSignal.any([call.options.signal, controller.signal]) : controller.signal
    const idle = Math.max(1, this.deps.config.llmIdleTimeoutMs.get())
    let timedOut = false
    let timer: ReturnType<typeof setTimeout>
    const pulse = () => { clearTimeout(timer); timer = setTimeout(() => {timedOut = true; controller.abort()}, idle) }
    pulse()
    try {
      let response: Response
      try {
        const body = await wireBody(call, async ref => {
          const stored = await this.deps.attachments?.()?.readImage(ref as never, signal)
          if (stored === undefined) throw new LlmRequestError('UNSUPPORTED_CONTENT', 'this deployment has no attachment service for image input')
          return {data: stored.data, mediaType: stored.ref.mediaType}
        })
        response = await this.send(`${connection.baseUrl}/messages`, {method: 'POST', signal, redirect: 'error', headers: {...route.headers, ...call.headers, ...await connectionHeaders(connection, this.deps.credentials), 'anthropic-version': this.deps.config.anthropicVersion.get(), 'content-type': 'application/json', accept: 'text/event-stream'}, body: JSON.stringify(body)})
      }
      catch (error) { throw this.failed(error, call, timedOut, idle, connection.baseUrl) }
      if (!response.ok) throw httpError(response, await response.json().catch(() => undefined))
      if (!response.body) throw new LlmRequestError('EMPTY_RESPONSE', 'the endpoint answered without a body', {status: response.status})
      try { yield* translate(sseData(response.body, pulse, signal)) } catch (error) { throw this.failed(error, call, timedOut, idle, connection.baseUrl) }
    } finally { clearTimeout(timer!); controller.abort() }
  }
  private failed(error: unknown, call: LlmCall, timedOut: boolean, idle: number, baseUrl: string): unknown {
    if (error instanceof LlmRequestError) return error
    if (call.options.signal?.aborted) return new LlmRequestError('ABORTED', 'the request was cancelled', {}, {cause: error})
    if (timedOut) return new LlmRequestError('TIMEOUT', `${baseUrl} was silent for ${Math.round(idle / 1000)} seconds`, {}, {cause: error})
    return new LlmRequestError('TRANSPORT', `${baseUrl} could not be reached or the connection dropped`, {}, {cause: error})
  }
}
