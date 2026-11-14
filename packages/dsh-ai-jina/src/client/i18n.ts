import type { BuiltInLocaleId } from '@deepseek-ai/dsh-client-locale/client'

/**
 * A feature's copy for every locale the web UI ships. Typing it as a full
 * record makes a missing translation a compile error.
 */
type ProviderLocaleId = BuiltInLocaleId | 'ja' | 'es' | 'fr' | 'de' | 'ru' | 'pt'

export type Dictionaries<Key extends string> = Record<ProviderLocaleId, Record<Key, string>>
