/** Text a vendor provides in the languages it knows: a plain string, or one string per locale id (`en`, `zh`, ...). */
export type LocalizedText = string | Readonly<Record<string, string>>

/** The text for a locale: its own, else English, else any. */
export function localized(text: LocalizedText, locale: string): string {
  if (typeof text === 'string') return text
  return text[locale] ?? text['en'] ?? Object.values(text)[0] ?? ''
}

/**
 * One setting of a single request to a provider, as the provider describes it. Whatever uses the
 * service per session (a chat, a project) can show these to its user, keep the values in its own
 * session configuration and pass them back in the options of the call, without knowing the vendor.
 * The base options (`signal`, `inputType`) are not described here: only what is the vendor's own.
 */
export interface RequestOption {
  /** The name in the options object of the call. */
  key: string
  type: 'integer' | 'number' | 'string' | 'boolean'
  label: LocalizedText
  description?: LocalizedText
  /** What the provider uses when the option is left out. */
  default?: number | string | boolean
  /** The bounds of a number. */
  min?: number
  max?: number
  /**
   * Whether the option has to be chosen before the first request of a session, because it shapes
   * what the first request produces and cannot change after: the number of dimensions of vectors
   * that are stored and compared later. A start dialog shows only these.
   */
  atStart?: boolean
}
