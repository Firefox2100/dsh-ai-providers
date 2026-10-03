import type { Capability, CapabilityServices } from './capabilities.ts'
import type { RequestOption } from './options.ts'

/**
 * A vendor's offer of one capability. The service reads the vendor's configuration when it is
 * called, so a change in settings applies without creating it again.
 */
export type ServiceFactory<C extends Capability> = () => CapabilityServices[C]

/** What a vendor plugin registers: who it is and which capabilities it can supply. */
export interface AiProvider {
  /** Unique and stable: it is what a profile stores to select this provider. */
  id: string
  /** What a settings UI calls it. */
  label: string
  /**
   * The profile entry id of the vendor plugin's configuration, whose volatile fields the
   * settings UI shows as this provider's form.
   */
  configEntryId?: string
  capabilities: { [C in Capability]?: ServiceFactory<C> }
  /** What can be set per request for each capability the provider offers, beyond the options every provider has. */
  requestOptions?: { [C in Capability]?: readonly RequestOption[] }
}

/** Where vendor plugins register, offered by the main plugin as `ctx.aiProviders`. */
export interface AiProviderRegistry {
  /**
   * @returns what removes the registration again.
   * @throws {Error} when the id is already registered.
   */
  register(provider: AiProvider): () => void
  get(id: string): AiProvider | undefined
  /** The registered providers, in registration order; only those that offer the capability when one is given. */
  list(capability?: Capability): AiProvider[]
}
