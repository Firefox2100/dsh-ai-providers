import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares the `loader/volatile-update` event.
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type { Capability } from 'dsh-ai-core'
import type { Config } from './config.ts'
import { ConfiguredEmbedding } from './embedding.ts'
import type { AiProviders } from './registry.ts'

/**
 * Puts the configured services on the context. `ctx.embeddings` is there while the profile
 * selects a provider that is loaded and offers embedding, and gone otherwise; it follows both
 * the selection (edited in settings) and the providers coming and going, so a consumer that
 * looks it up when it needs it always finds what is current.
 */
export class AiServices {
  readonly embedding: ConfiguredEmbedding

  constructor(private readonly ctx: Context, private readonly registry: AiProviders, private readonly config: Config) {
    ctx.provide('embeddings')
    this.embedding = new ConfiguredEmbedding({
      selected: () => config.embedding.get(),
      registry,
      holdMs: () => config.holdSeconds.get() * 1000,
    })
    this.sync()
    ctx.effect(() => registry.subscribe(() => { this.sync() }), 'dsh-ai-providers: providers changed')
    ctx.on('loader/volatile-update', () => { this.sync() })
  }

  /** The provider chosen for a capability; empty for none. */
  selected(capability: Capability): string {
    return capability === 'embedding' ? this.config.embedding.get() : ''
  }

  /** Whether the service of a capability is on the context now. */
  available(capability: Capability): boolean {
    return capability === 'embedding' && this.ctx.get('embeddings') !== undefined
  }

  private sync(): void {
    const selected = this.config.embedding.get()
    const offered = selected !== '' && this.registry.get(selected)?.capabilities.embedding !== undefined
    const present = this.ctx.get('embeddings') !== undefined
    if (offered && !present) this.ctx.set('embeddings', this.embedding)
    else if (!offered && present) this.ctx.set('embeddings', undefined as never)
  }
}
