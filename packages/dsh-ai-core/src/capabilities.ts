import type { EmbeddingService } from './embedding.ts'

/**
 * The service each capability is offered as. Adding a capability is adding a line here, a
 * service class beside `EmbeddingService`, and its name in {@link SERVICE_NAMES}.
 */
export interface CapabilityServices {
  embedding: EmbeddingService
}

export type Capability = keyof CapabilityServices

/** Every capability, in the order a settings UI lists them. */
export const CAPABILITIES = ['embedding'] as const satisfies readonly Capability[]

/** The name of the service that offers each capability on the Cordis context (`ctx.embeddings`). */
export const SERVICE_NAMES = { embedding: 'embeddings' } as const satisfies Record<Capability, string>

/** The id of a provider's entry in the `ai.provider` slot of the settings UI. */
export const providerSlotId = (capability: Capability, providerId: string): string => `${capability}:${providerId}`

/** The provider and capability an entry of the `ai.provider` slot stands for, or `undefined` for an id that is not one. */
export function parseProviderSlotId(id: string): { capability: Capability; providerId: string } | undefined {
  const at = id.indexOf(':')
  const capability = id.slice(0, at)
  return at > 0 && (CAPABILITIES as readonly string[]).includes(capability) ? { capability: capability as Capability, providerId: id.slice(at + 1) } : undefined
}
