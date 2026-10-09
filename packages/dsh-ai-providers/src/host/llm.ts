import type { Context } from '@deepseek-ai/cordis'
import { LlmAdapter, LlmError, ProviderRequestId, attributionHeaders } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, StreamChunk } from '@deepseek-ai/dsh-llm'
import { LlmRequestError, type AiProvider, type LlmCall, type LlmModelSpec, type LlmRouteSpec, type LlmSampling, type LlmService } from 'dsh-ai-core'
import type { AiProviders } from './registry.ts'

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
  constructor(private readonly registry: AiProviders) { super() }

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

  override async * stream(options: GenerateOptions): AsyncGenerator<StreamChunk> {
    const { service, route } = this.ownerOf(options.provider)
    const model = route.models.find(candidate => candidate.id === options.model)
    const policies = this.registry.policies().map(policy => policy({ options, route: route.id, model: options.model }))
    const call: LlmCall = { options, route, model, sampling: mergeSampling(route.sampling, model?.sampling, ...policies, requested(options, model)), headers: attributionHeaders() }
    try {
      yield * service.stream(call)
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
  private readonly handles = new Map<string, () => void>()
  private readonly problems = new Map<string, string>()
  private readonly adapter: AiLlmAdapter

  constructor(private readonly ctx: Context, registry: AiProviders, private readonly onProblem: (message: string) => void) {
    this.adapter = new AiLlmAdapter(registry)
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
    }
    for (const id of [...this.problems.keys()]) if (!wanted.has(id)) this.problems.delete(id)
    const llm = this.ctx.get('llm')
    if (llm === undefined) return
    for (const id of wanted) {
      if (this.handles.has(id)) continue
      try {
        this.handles.set(id, llm.registerAdapter([id], this.adapter))
        this.problems.delete(id)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (this.problems.get(id) !== message) this.onProblem(`language model route "${id}" is not served: ${message}`)
        this.problems.set(id, message)
      }
    }
  }

  dispose(): void {
    for (const dispose of this.handles.values()) dispose()
    this.handles.clear()
  }
}
