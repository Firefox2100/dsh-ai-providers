import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

export interface TypeSafeConnectionConfig {
  id: string
  name: string
  /** The API root, such as `https://api.typesafe.ai/v1`; any server that copies the System One API works too. */
  baseUrl: string
  apiKeyRef: string
}

/** How to reach TypeSafe's decision API. Every field is edited in the settings UI and read on each call. */
export interface Config {
  connections: Volatile<TypeSafeConnectionConfig[]>
  decisionConnection: Volatile<string>
  /** The decision model, as the API names it: an alias such as `jev-latest`, or a pinned version such as `jev-1.14.0`. */
  decisionModel: Volatile<string>
  /** Whether to ask for the longer context window, which TypeSafe offers behind a request header. */
  longContext: Volatile<boolean>
  /** How long a request may take before it is given up, in milliseconds. */
  timeoutMs: Volatile<number>
}

export const Config = z.object({
  connections: z.array(z.object({
    id: z.string().required(), name: z.string().required(), baseUrl: z.string().required(), apiKeyRef: z.string().default(''),
  })).default([{ id: 'typesafe', name: 'TypeSafe', baseUrl: 'https://api.typesafe.ai/v1', apiKeyRef: 'TYPESAFE_API_KEY' }]).volatile(),
  decisionConnection: z.string().default('typesafe').volatile(),
  decisionModel: z.string().default('jev-latest').volatile(),
  longContext: z.boolean().default(false).volatile(),
  timeoutMs: z.natural().default(30_000).volatile(),
})
