import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** Which provider supplies each capability, and how long a vector prepared ahead waits to be retrieved. Each field is edited in the settings UI. */
export interface Config {
  /** The id of the provider that supplies embedding; empty for none. */
  embedding: Volatile<string>
  /** How long a vector prepared with `prefetch` waits to be retrieved before it is dropped, in seconds. */
  holdSeconds: Volatile<number>
}

export const Config = z.object({
  embedding: z.string().default('').volatile(),
  holdSeconds: z.natural().default(300).volatile(),
})
