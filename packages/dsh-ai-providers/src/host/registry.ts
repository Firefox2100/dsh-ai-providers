import { Service, type Context } from '@deepseek-ai/cordis'
import type { AiProvider, AiProviderRegistry, Capability, LlmPolicy } from 'dsh-ai-core'

/**
 * The registry vendor plugins register their providers in. A registration is an effect of the
 * vendor's own plugin, so unloading the vendor removes it.
 */
export class AiProviders extends Service implements AiProviderRegistry {
  private readonly providers = new Map<string, AiProvider>()
  private readonly listeners = new Set<() => void>()
  private readonly llmPolicies: LlmPolicy[] = []

  constructor(ctx: Context) {
    super(ctx, 'aiProviders')
  }

  register(provider: AiProvider): () => void {
    if (this.providers.has(provider.id)) throw new Error(`an AI provider with id "${provider.id}" is already registered`)
    this.providers.set(provider.id, provider)
    this.changed()
    return () => {
      if (this.providers.get(provider.id) !== provider) return
      this.providers.delete(provider.id)
      this.changed()
    }
  }

  policy(policy: LlmPolicy): () => void {
    this.llmPolicies.push(policy)
    return () => {
      const at = this.llmPolicies.indexOf(policy)
      if (at >= 0) this.llmPolicies.splice(at, 1)
    }
  }

  /** The policies for model requests, in registration order. */
  policies(): readonly LlmPolicy[] {
    return this.llmPolicies
  }

  /** The providers that offer language models. */
  llmProviders(): AiProvider[] {
    return [...this.providers.values()].filter(provider => provider.llm !== undefined)
  }

  get(id: string): AiProvider | undefined {
    return this.providers.get(id)
  }

  list(capability?: Capability): AiProvider[] {
    const all = [...this.providers.values()]
    return capability === undefined ? all : all.filter(provider => provider.capabilities[capability] !== undefined)
  }

  /** Told when a provider is registered or removed. @returns what stops it. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private changed(): void {
    for (const listener of this.listeners) listener()
  }
}
