import type { EmbeddingService } from './embedding.ts'
import type { RerankService } from './rerank.ts'
import type { TtsService } from './tts.ts'
import type { SttService } from './stt.ts'
import type { ImageGenerationService } from './image.ts'

/**
 * The service each capability is offered as. Adding a capability is adding a line here, a
 * service class beside `EmbeddingService`, and its name in {@link SERVICE_NAMES}.
 */
export interface CapabilityServices {
  embedding: EmbeddingService
  rerank: RerankService
  tts: TtsService
  stt: SttService
  image: ImageGenerationService
}

export type Capability = keyof CapabilityServices

/** Every capability, in the order a settings UI lists them. */
export const CAPABILITIES = ['embedding', 'rerank', 'tts', 'stt', 'image'] as const satisfies readonly Capability[]

/** The name of the service that offers each capability on the Cordis context (`ctx.embeddings`, `ctx.rerankers`). */
export const SERVICE_NAMES = { embedding: 'embeddings', rerank: 'rerankers', tts: 'textToSpeech', stt: 'apiSpeechToText', image: 'imageGeneration' } as const satisfies Record<Capability, string>

/** The slot a capability's tab declares for its providers' configuration: a slot has one declarer, so each tab has its own. */
export type ProviderSlotName = `ai.provider.${Capability}`

export const providerSlotName = (capability: Capability): ProviderSlotName => `ai.provider.${capability}`

/** The id of a provider's entry in the slot of its capability (see {@link providerSlotName}). */
export const providerSlotId = (capability: Capability, providerId: string): string => `${capability}:${providerId}`

/** The provider and capability an entry of the `ai.provider` slot stands for, or `undefined` for an id that is not one. */
export function parseProviderSlotId(id: string): { capability: Capability; providerId: string } | undefined {
  const at = id.indexOf(':')
  const capability = id.slice(0, at)
  return at > 0 && (CAPABILITIES as readonly string[]).includes(capability) ? { capability: capability as Capability, providerId: id.slice(at + 1) } : undefined
}
