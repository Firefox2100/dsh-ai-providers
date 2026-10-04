import type { Capability } from './capabilities.ts'
import type { RequestOption } from './options.ts'
import type { AiErrorCode } from './errors.ts'

/**
 * The browser API of the main plugin, which the UI of the main plugin and of every vendor plugin
 * uses. Paths are relative to the prefix, and the browser calls them with relative URLs so that a
 * mounted deployment works.
 */
export const AI_API_PREFIX = 'ai-api'

/** One provider as the settings UI shows it. */
export interface ProviderSummary {
  id: string
  label: string
  /** The profile entry whose form configures the provider. */
  configEntryId?: string
  /** What can be set per request to it for the capability, for whatever keeps its own session configuration. */
  requestOptions?: RequestOption[]
}

/** One capability as the settings UI shows it: what can supply it, and which one the profile chose. */
export interface CapabilityState {
  capability: Capability
  providers: ProviderSummary[]
  /** The id of the selected provider; absent when none is, or when the selected one is not loaded. */
  selected?: string
  /** Whether the service is on the context right now. */
  available: boolean
}

/** `GET /ai-api/capabilities` */
export interface CapabilitiesPayload {
  capabilities: CapabilityState[]
}

/** What the credentials service says about one reference, never its value. */
export interface CredentialStatus {
  ref: string
  configured: boolean
  /** Whether a value can be stored for it from here. */
  writable: boolean
  /** Where the value comes from (the environment, the private store). */
  source?: string
}

/** `GET /ai-api/credentials?ref=NAME` */
export type CredentialsPayload = CredentialStatus

/** `PUT /ai-api/credentials` with `{ ref, value }`; an empty value removes the stored one. */
export interface CredentialWrite {
  ref: string
  value: string
}

/** `POST /ai-api/probe?capability=embedding|rerank`: whether the configured service works, as the user would see it. */
export type ProbeResult =
  | { ok: true; provider: string; model: string; milliseconds: number; /** For embedding: how many dimensions its vectors have. */ dimensions?: number }
  | { ok: false; code: AiErrorCode | 'internal'; message: string }

/** The paths of the API. */
export const AI_API_ROUTES = {
  capabilities: '/capabilities',
  credentials: '/credentials',
  probe: '/probe',
} as const
