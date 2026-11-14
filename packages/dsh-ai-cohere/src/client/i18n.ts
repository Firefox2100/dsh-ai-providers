import type {BuiltInLocaleId} from '@deepseek-ai/dsh-client-locale/client'
type ProviderLocaleId = BuiltInLocaleId | 'ja' | 'es' | 'fr' | 'de' | 'ru' | 'pt'
export type Dictionaries<Key extends string> = Record<ProviderLocaleId, Record<Key, string>>
