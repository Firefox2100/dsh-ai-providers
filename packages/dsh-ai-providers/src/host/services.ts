import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares the `loader/volatile-update` event.
import type {} from '@deepseek-ai/cordis-plugin-loader'
import { CAPABILITIES, SERVICE_NAMES, type Capability } from '@dsh-ai-providers/core'
import type { Config } from './config.ts'
import { ConfiguredEmbedding } from './embedding.ts'
import { ConfiguredRerank } from './rerank.ts'
import { ConfiguredTts } from './tts.ts'
import { ConfiguredStt } from './stt.ts'
import { ConfiguredImageGeneration } from './image.ts'
import { ConfiguredDecision } from './decision.ts'
import type { AiProviders } from './registry.ts'
import type { RequestGate } from './gate.ts'
import type { Tracer } from './trace/tracer.ts'

/**
 * Puts the configured services on the context. `ctx.embeddings` (and likewise `ctx.rerankers`) is
 * there while the profile selects a provider that is loaded and offers the capability, and gone otherwise; it follows both
 * the selection (edited in settings) and the providers coming and going, so a consumer that
 * looks it up when it needs it always finds what is current.
 */
export class AiServices {
  readonly embedding: ConfiguredEmbedding
  readonly rerank: ConfiguredRerank
  readonly tts: ConfiguredTts
  readonly stt: ConfiguredStt
  readonly image: ConfiguredImageGeneration
  readonly decision: ConfiguredDecision
  /** What each capability's availability was at the last sync, so a change is the only thing that notifies dependents. */
  private readonly on: Partial<Record<Capability, boolean>> = {}
  private streamingOn = false

  constructor(private readonly ctx: Context, private readonly registry: AiProviders, private readonly config: Config, gate?: RequestGate, trace?: Tracer) {
    // Declared once for this plugin's lifetime, with the availability predicate Cordis needs: a dependent that injects a
    // capability only runs while a selected provider actually offers it. The value stays undefined while it does not, so
    // `ctx.get(name)` keeps its documented meaning for callers that look a service up directly.
    for (const capability of CAPABILITIES) ctx.reflect.provide(SERVICE_NAMES[capability], undefined, () => this.offered(capability))
    ctx.reflect.provide('streamingSpeechToText', undefined, () => this.streaming() !== undefined)
    this.embedding = new ConfiguredEmbedding({
      selected: () => config.embedding.get(),
      registry,
      holdMs: () => config.holdSeconds.get() * 1000,
      ...gate === undefined ? {} : { gate },
      ...trace === undefined ? {} : { trace },
    })
    this.rerank = new ConfiguredRerank({ selected: () => config.rerank.get(), registry, ...gate === undefined ? {} : { gate }, ...trace === undefined ? {} : { trace } })
    this.tts = new ConfiguredTts({ selected: () => config.tts.get(), registry, ...gate === undefined ? {} : { gate }, ...trace === undefined ? {} : { trace } })
    this.stt = new ConfiguredStt({ selected: () => config.stt.get(), registry, ...gate === undefined ? {} : { gate }, ...trace === undefined ? {} : { trace } })
    this.image = new ConfiguredImageGeneration({ selected: () => config.image.get(), registry, ...gate === undefined ? {} : { gate }, ...trace === undefined ? {} : { trace } })
    this.decision = new ConfiguredDecision({ selected: () => config.decision.get(), registry, ...gate === undefined ? {} : { gate }, ...trace === undefined ? {} : { trace } })
    this.sync()
    ctx.effect(() => registry.subscribe(() => { this.sync() }), 'dsh-ai-providers: providers changed')
    ctx.on('loader/volatile-update', () => { this.sync() })
  }

  /** The provider chosen for a capability; empty for none. */
  selected(capability: Capability): string {
    return this.config[capability].get()
  }

  /** Whether the service of a capability is on the context now. */
  available(capability: Capability): boolean {
    return this.offered(capability)
  }

  /** Whether a selected provider offers the capability and is loaded. */
  private offered(capability: Capability): boolean {
    const selected = this.selected(capability)
    return selected !== '' && this.registry.get(selected)?.capabilities[capability] !== undefined
  }

  /** The speech service when the selected provider can stream; `undefined` otherwise. */
  private streaming(): unknown {
    const stt = this.registry.get(this.selected('stt'))?.capabilities.stt?.()
    return stt !== undefined && typeof Reflect.get(stt, 'startStreaming') === 'function' ? this.stt : undefined
  }

  private sync(): void {
    const changed: string[] = []
    for (const capability of CAPABILITIES) {
      const name = SERVICE_NAMES[capability]
      const offered = this.offered(capability)
      const present = this.ctx.get(name) !== undefined
      if (offered && !present) this.ctx.reflect.set(name, this[capability])
      else if (!offered && present) this.ctx.reflect.set(name, undefined)
      if (offered !== this.on[capability]) { this.on[capability] = offered; changed.push(name) }
    }
    const streaming = this.streaming() !== undefined
    const streamingPresent = this.ctx.get('streamingSpeechToText') !== undefined
    if (streaming && !streamingPresent) this.ctx.reflect.set('streamingSpeechToText', this.stt)
    else if (!streaming && streamingPresent) this.ctx.reflect.set('streamingSpeechToText', undefined)
    if (streaming !== this.streamingOn) { this.streamingOn = streaming; changed.push('streamingSpeechToText') }
    // The predicate only matters when a dependent re-evaluates; tell it which names moved.
    if (changed.length > 0) this.ctx.reflect.notify(changed)
  }
}
