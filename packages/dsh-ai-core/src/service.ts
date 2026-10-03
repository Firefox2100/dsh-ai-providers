import type { Capability } from './capabilities.ts'

/** What every AI service says about itself. */
export interface ServiceIdentity {
  /** The id of the provider that implements it, as registered. */
  provider: string
  /** The model it uses, as the provider names it. */
  model: string
}

/** The base of every capability's service class. */
export abstract class AiService implements ServiceIdentity {
  abstract readonly capability: Capability
  abstract readonly provider: string
  abstract readonly model: string
}

/** Options every service call takes. */
export interface CallOptions {
  /** Cancels the call; the service throws an `AiError` with code `cancelled`. */
  signal?: AbortSignal
}
