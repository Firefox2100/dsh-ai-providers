import type { BuiltInLocaleId } from '@deepseek-ai/dsh-client-locale/client'

export type ProviderLocaleId = BuiltInLocaleId | 'ja' | 'es' | 'fr' | 'de' | 'ru' | 'pt'

/**
 * A feature's copy for every locale the web UI ships. Typing it as a full
 * record makes a missing translation a compile error.
 */
export type Dictionaries<Key extends string> = Record<ProviderLocaleId, Record<Key, string>>
