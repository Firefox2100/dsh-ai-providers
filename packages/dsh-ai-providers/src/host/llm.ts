import type { Context } from '@deepseek-ai/cordis'
import { LlmAdapter, LlmError, ProviderRequestId, attributionHeaders, resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import type { AdapterRegistrationHandle, DirectoryRegistrationHandle, GenerateOptions, LlmConfigurableProvider, LlmDiscoveredModel, LlmModelDiscoveryRequest, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, PreparedAdapterCall, ResolvedRetryPolicy, StreamChunk } from '@deepseek-ai/dsh-llm'
import { LlmRequestError, type AiProvider, type LlmCall, type LlmModelSpec, type LlmRouteSpec, type LlmSampling, type LlmService } from '@dsh-ai-providers/core'
import type { AiProviders } from './registry.ts'
import type { RequestGate } from './gate.ts'

export interface RouteOwner {
  provider: AiProvider
  service: LlmService
  route: LlmRouteSpec
}

/** The sampling fields of a request that DSH itself sets, which win over what a route, a model or a policy says. */
function requested(options: GenerateOptions, model: LlmModelSpec | undefined): LlmSampling {
  return {
    ...options.temperature === undefined ? {} : { temperature: options.temperature },
    // DSH fills in the model's own output limit when the caller asks for none: that is a default, not a request.
    ...options.maxTokens === undefined || options.maxTokens === model?.maxTokens ? {} : { maxTokens: options.maxTokens },
    ...options.stop === undefined ? {} : { stop: options.stop },
  }
}

/** Later answers win, field by field; `body` fields are merged rather than replaced. */
export function mergeSampling(...layers: readonly (LlmSampling | undefined)[]): LlmSampling {
  const merged: Record<string, unknown> = {}
  for (const layer of layers) {
    if (layer === undefined) continue
    for (const [key, value] of Object.entries(layer)) {
      if (value === undefined) continue
      merged[key] = key === 'body' ? { ...(merged[key] as object | undefined), ...(value as object) } : value
    }
  }
  return merged as LlmSampling
}

/**
 * DSH's view of every route of every provider that offers language models: one adapter, whose routes are
 * whatever the providers' services serve now. A request is handed to the service of the route with the controls
 * that apply to it; the service only has to speak its endpoint's wire.
 */
export class AiLlmAdapter extends LlmAdapter {
  constructor(private readonly registry: AiProviders, private readonly gate?: RequestGate) { super() }

  /** The routes served now, with who serves them. */
  owners(): RouteOwner[] {
    return this.registry.llmProviders().flatMap(provider => {
      const service = provider.llm!()
      return service.routes().map(route => ({ provider, service, route }))
    })
  }

  private ownerOf(routeId: string): RouteOwner {
    const owner = this.owners().find(candidate => candidate.route.id === routeId)
    if (owner === undefined) throw new LlmError(`no language model route "${routeId}" is configured`, 'NO_ADAPTER')
    return owner
  }

  override providerInfo(provider: string): LlmProviderInfo {
    return { id: provider, name: this.ownerOf(provider).route.name }
  }

  override listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    const { route } = this.ownerOf(provider)
    return Promise.resolve(route.models.map(model => ({
      provider, id: model.id, name: model.name,
      ...model.description === undefined ? {} : { description: model.description },
      inputModalities: model.inputs ?? ['text'],
    })))
  }

  override resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    const { route } = this.ownerOf(provider)
    return Promise.resolve(resolved(provider, route.models.find(candidate => candidate.id === model), model))
  }

  /** The retry policy DSH captures when the route is registered; absent means DSH's defaults. */
  override providerRetryPolicy(provider: string): ResolvedRetryPolicy | undefined {
    const { route } = this.ownerOf(provider)
    return route.retry === undefined ? undefined : resolveRetryPolicy(route.retry, `language model route "${route.id}": retry`)
  }

  /** The model facts and the request that follows come from one reading of the routes, so an edit between the two cannot mix them. */
  override prepareCall(provider: string, model: string): Promise<PreparedAdapterCall> {
    const owner = this.ownerOf(provider)
    return Promise.resolve({
      model: resolved(provider, owner.route.models.find(candidate => candidate.id === model), model),
      stream: options => this.streamFrom(owner, options),
    })
  }

  override stream(options: GenerateOptions): AsyncGenerator<StreamChunk> {
    return this.streamFrom(this.ownerOf(options.provider), options)
  }

  private async * streamFrom({ service, route }: RouteOwner, options: GenerateOptions): AsyncGenerator<StreamChunk> {
    const model = route.models.find(candidate => candidate.id === options.model)
    const answers = this.registry.policies().map(policy => policy({ options, route: route.id, model: options.model }))
    const priority = answers.map(answer => answer?.priority).findLast(found => found !== undefined)
    const policies = answers.map((answer) => { if (answer === undefined) return undefined; const { priority: _priority, ...sampling } = answer; return sampling })
    const call: LlmCall = { options, route, model, sampling: mergeSampling(route.sampling, model?.sampling, ...policies, requested(options, model)), headers: attributionHeaders() }
    try {
      // The route is held for the whole stream: the model is generating until its last chunk.
      yield * (this.gate === undefined ? service.stream(call) : this.gate.stream({ capability: 'llm', route: route.id, priority, signal: options.signal }, () => service.stream(call)))
    } catch (error) {
      if (error instanceof LlmRequestError) {
        const { status, retryAfterMs, requestId } = error.facts
        throw new LlmError(error.message, error.failure, {
          cause: error,
          ...status === undefined ? {} : { status },
          ...retryAfterMs === undefined ? {} : { providerRetryAfterMs: retryAfterMs },
          ...requestId === undefined ? {} : { requestId: ProviderRequestId(requestId) },
        })
      }
      throw error
    }
  }
}

function resolved(provider: string, model: LlmModelSpec | undefined, id: string): LlmResolvedModelInfo {
  return {
    provider, id, name: model?.name ?? id,
    ...model?.description === undefined ? {} : { description: model.description },
    inputModalities: model?.inputs ?? ['text'],
    ...model?.contextWindow === undefined ? {} : { context: { contextWindow: model.contextWindow } },
    ...model?.maxTokens === undefined ? {} : { defaultMaxTokens: model.maxTokens },
    ...model?.systemPromptUpdate === undefined ? {} : { systemPromptUpdate: model.systemPromptUpdate },
    ...model?.reasoning === undefined ? {} : {
      reasoning: {
        efforts: model.reasoning.levels.map(level => ({ id: level.id as never, name: level.name })),
        ...model.reasoning.default === undefined ? {} : { defaultEffort: model.reasoning.default as never },
      },
    },
  }
}

/** What the settings UI says about each route: served to DSH, or why not. */
export interface RouteState { active: boolean; problem?: string }

/**
 * Keeps DSH's adapter registry in step with the routes of the providers: a route is registered when a provider serves it
 * and withdrawn when it stops. A route another adapter already holds is reported, not registered.
 */
export class LlmRoutes {
  private readonly handles = new Map<string, AdapterRegistrationHandle>()
  private readonly problems = new Map<string, string>()
  private readonly discoveries = new Map<string, () => void>()
  private readonly adapter: AiLlmAdapter
  private directory: DirectoryRegistrationHandle | undefined
  private directoryFacts = ''
  private directoryProblem = ''
  /** What DSH captured of each registered route that a later edit can change, to register the route again when it differs. */
  private readonly captured = new Map<string, string>()

  constructor(private readonly ctx: Context, private readonly registry: AiProviders, private readonly onProblem: (message: string) => void, gate?: RequestGate) {
    this.adapter = new AiLlmAdapter(registry, gate)
  }

  get routes(): AiLlmAdapter { return this.adapter }

  state(routeId: string): RouteState {
    const problem = this.problems.get(routeId)
    return { active: this.handles.has(routeId), ...problem === undefined ? {} : { problem } }
  }

  /** Registers the routes that are new and withdraws those that went. Call it when configuration or providers change. */
  sync(): void {
    const wanted = new Set<string>()
    let owners: RouteOwner[] = []
    try { owners = this.adapter.owners() } catch (error) { this.onProblem(`language model routes could not be read: ${error instanceof Error ? error.message : String(error)}`) }
    for (const { route } of owners) wanted.add(route.id)
    for (const [id, dispose] of this.handles) {
      if (wanted.has(id)) continue
      dispose()
      this.handles.delete(id)
      this.captured.delete(id)
    }
    for (const id of [...this.problems.keys()]) if (!wanted.has(id)) this.problems.delete(id)
    const llm = this.ctx.get('llm')
    if (llm === undefined) return
    for (const { route } of owners) {
      const id = route.id
      const retry = JSON.stringify(route.retry ?? null)
      try {
        const held = this.handles.get(id)
        if (held === undefined) this.handles.set(id, llm.registerAdapter([id], this.adapter))
        else if (this.captured.get(id) !== retry) held.replace([id])
        this.captured.set(id, retry)
        this.problems.delete(id)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (this.problems.get(id) !== message) this.onProblem(`language model route "${id}" is not served: ${message}`)
        this.problems.set(id, message)
      }
    }
    this.publishDirectory(llm, owners)
    this.offerDiscovery(llm)
  }

  /** Declares the routes to DSH's configuration surfaces: every route is one the configuration declared, at the endpoint of its connection. */
  private publishDirectory(llm: NonNullable<Context['llm']>, owners: readonly RouteOwner[]): void {
    const entries: LlmConfigurableProvider[] = owners.map(({ provider, route }) => ({
      provider: route.id, displayName: route.name, settingsNs: provider.configEntryId ?? provider.id, settingsPath: ['llmRoutes'], declared: true,
      ...route.baseUrl === undefined ? {} : { defaultBaseURL: route.baseUrl },
      ...this.problems.get(route.id) === undefined ? {} : { error: this.problems.get(route.id)! },
    }))
    const facts = JSON.stringify(entries)
    if (facts === this.directoryFacts) return
    try {
      if (this.directory !== undefined) this.directory.replace(entries)
      else if (entries.length > 0) this.directory = llm.registerConfigurableProviders(entries)
      this.directoryFacts = facts
      this.directoryProblem = ''
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (this.directoryProblem !== message) this.onProblem(`language model routes could not be listed for configuration: ${message}`)
      this.directoryProblem = message
    }
  }

  /** Lets DSH ask an endpoint for its models on behalf of each settings section that holds routes. */
  private offerDiscovery(llm: NonNullable<Context['llm']>): void {
    const namespaces = new Set(this.registry.llmProviders().map(provider => provider.configEntryId ?? provider.id))
    for (const [namespace, withdraw] of this.discoveries) {
      if (namespaces.has(namespace)) continue
      withdraw()
      this.discoveries.delete(namespace)
    }
    for (const namespace of namespaces) {
      if (this.discoveries.has(namespace)) continue
      try {
        this.discoveries.set(namespace, llm.registerModelDiscovery(namespace, (request, signal) => this.discover(namespace, request, signal)))
      } catch (error) {
        this.onProblem(`model discovery for "${namespace}" is not offered: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  /** A route that is configured answers with its own models; a draft endpoint is asked through the provider of the section. */
  private async discover(namespace: string, request: LlmModelDiscoveryRequest, signal?: AbortSignal): Promise<LlmDiscoveredModel[]> {
    const providers = this.registry.llmProviders().filter(provider => (provider.configEntryId ?? provider.id) === namespace)
    const known = request.provider === undefined ? undefined : this.adapter.owners().find(owner => owner.route.id === request.provider && providers.some(provider => provider.id === owner.provider.id))
    let models: readonly LlmModelSpec[]
    if (known !== undefined) models = known.route.models
    else if (request.baseURL !== undefined && request.baseURL !== '') {
      const service = providers.map(provider => provider.llm?.()).find(found => found !== undefined)
      if (service === undefined) throw new LlmError(`no provider of "${namespace}" serves language models`, 'NO_DISCOVERY')
      models = await service.interrogate({ baseUrl: request.baseURL, ...request.apiKey === undefined || request.apiKey === '' ? {} : { apiKey: request.apiKey } }, signal)
    } else throw new LlmError('model discovery needs a configured route or a baseURL', 'INVALID_DISCOVERY')
    return models.map(model => ({
      id: model.id, name: model.name,
      ...model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow },
      ...model.maxTokens === undefined ? {} : { maxTokens: model.maxTokens },
      inputModalities: model.inputs ?? ['text'],
    }))
  }

  dispose(): void {
    for (const dispose of this.handles.values()) dispose()
    this.handles.clear()
    this.captured.clear()
    for (const withdraw of this.discoveries.values()) withdraw()
    this.discoveries.clear()
    this.directory?.()
    this.directory = undefined
    this.directoryFacts = ''
  }
}
