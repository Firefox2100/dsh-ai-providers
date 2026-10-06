import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** Which provider supplies each capability, and how long a vector prepared ahead waits to be retrieved. Each field is edited in the settings UI. */
export interface Config {
  /** The id of the provider that supplies embedding; empty for none. */
  embedding: Volatile<string>
  /** The id of the provider that supplies reranking; empty for none. */
  rerank: Volatile<string>
  /** The id of the provider that supplies text-to-speech; empty for none. */
  tts: Volatile<string>
  /** The id of the provider that supplies speech-to-text; empty for none. */
  stt: Volatile<string>
  /** The id of the provider that supplies image generation; empty for none. */
  image: Volatile<string>
  /** How long a vector prepared with `prefetch` waits to be retrieved before it is dropped, in seconds. */
  holdSeconds: Volatile<number>
}

export const Config = z.object({
  embedding: z.string().default('').volatile(),
  rerank: z.string().default('').volatile(),
  tts: z.string().default('').volatile(),
  stt: z.string().default('').volatile(),
  image: z.string().default('').volatile(),
  holdSeconds: z.natural().default(300).volatile(),
})
