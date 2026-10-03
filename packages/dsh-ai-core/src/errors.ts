/** Why an AI service could not do what it was asked. */
export const AI_ERROR_CODES = [
  /** No provider is selected for the capability, or the selected one is not loaded. */
  'not-configured',
  /** The provider could not be reached or failed on its side. */
  'unavailable',
  /** The provider refused the request: bad credentials, quota, a model it does not have. */
  'rejected',
  /** The input cannot be sent as it is: empty, too long, the wrong shape. */
  'invalid-input',
  /** The provider does not offer what was asked, such as a dimension count it cannot produce. */
  'unsupported',
  /** The caller cancelled. */
  'cancelled',
] as const

export type AiErrorCode = (typeof AI_ERROR_CODES)[number]

/** The one error type of every AI service, so a caller can tell what to do without knowing the vendor. */
export class AiError extends Error {
  constructor(readonly code: AiErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AiError'
  }
}
