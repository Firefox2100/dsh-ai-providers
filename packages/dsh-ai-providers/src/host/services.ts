import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares the `loader/volatile-update` event.
import type {} from '@deepseek-ai/cordis-plugin-loader'
import { CAPABILITIES, SERVICE_NAMES, type Capability } from 'dsh-ai-core'
import type { Config } from './config.ts'
import { ConfiguredEmbedding } from './embedding.ts'
import { ConfiguredRerank } from './rerank.ts'
import type { AiProviders } from './registry.ts'

/**
 * Puts the configured services on the context. `ctx.embeddings` (and likewise `ctx.rerankers`) is
 * there while the profile selects a provider that is loaded and offers the capability, and gone otherwise; it follows both
 * the selection (edited in settings) and the providers coming and going, so a consumer that
 * looks it up when it needs it always finds what is current.
 */
export class AiServices {
  readonly embedding: ConfiguredEmbedding
  readonly rerank: ConfiguredRerank

  constructor(private readonly ctx: Context, private readonly registry: AiProviders, private readonly config: Config) {
    ctx.provide('embeddings')
    ctx.provide('rerankers')
    this.embedding = new ConfiguredEmbedding({
      selected: () => config.embedding.get(),
      registry,
      holdMs: () => config.holdSeconds.get() * 1000,
    })
    this.rerank = new ConfiguredRerank({ selected: () => config.rerank.get(), registry })
    this.sync()
    ctx.effect(() => registry.subscribe(() => { this.sync() }), 'dsh-ai-providers: providers changed')
    ctx.on('loader/volatile-update', () => { this.sync() })
  }

  /** The provider chosen for a capability; empty for none. */
  selected(capability: Capability): string {
    return this.config[capability === 'embedding' ? 'embedding' : 'rerank'].get()
  }

  /** Whether the service of a capability is on the context now. */
  available(capability: Capability): boolean {
    return this.ctx.get(SERVICE_NAMES[capability]) !== undefined
  }

  private sync(): void {
    for (const capability of CAPABILITIES) {
      const selected = this.selected(capability)
      const name = SERVICE_NAMES[capability]
      const offered = selected !== '' && this.registry.get(selected)?.capabilities[capability] !== undefined
      const present = this.ctx.get(name) !== undefined
      if (offered && !present) this.ctx.set(name, capability === 'embedding' ? this.embedding : this.rerank)
      else if (!offered && present) this.ctx.set(name, undefined as never)
    }
  }
}
