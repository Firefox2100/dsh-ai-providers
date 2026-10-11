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
  abstract readonly capability: Capability | 'llm'
  abstract readonly provider: string
  abstract readonly model: string
}

/** Who is waiting for a call: a person (foreground, the default) or work that can wait behind them (background, such as a memory index being filled). */
export type RequestPriority = 'foreground' | 'background'

/** Options every service call takes. */
export interface CallOptions {
  /** Where the call stands when the resource it needs is shared and busy; foreground calls go first. */
  priority?: RequestPriority
  /** Cancels the call; the service throws an `AiError` with code `cancelled`. */
  signal?: AbortSignal
}
