import type {BuiltInLocaleId} from '@deepseek-ai/dsh-client-locale/client'
export type Dictionaries<Key extends string> = Record<BuiltInLocaleId, Record<Key, string>>
