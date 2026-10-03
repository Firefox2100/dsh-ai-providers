import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** How to reach an OpenAI-compatible API. Every field is edited in the settings UI and read on each call. */
export interface Config {
  /** The API root, such as `https://api.openai.com/v1` or a local server's `http://localhost:8081/v1`. */
  baseUrl: Volatile<string>
  /**
   * The name the API key is stored under (a credential reference, an environment-variable name). The key
   * itself is never in a profile: it is typed into the settings UI and kept by DSH's credentials service,
   * or supplied by the environment under this name.
   */
  apiKeyEnv: Volatile<string>
  /** The embedding model, as the API names it. */
  embeddingModel: Volatile<string>
  /** Vectors of this many dimensions, for models that can shorten theirs; 0 leaves it to the model. */
  embeddingDimensions: Volatile<number>
  /** The most texts sent in one request; more are sent in several, one after another. */
  batchSize: Volatile<number>
  /** How long a request may take before it is given up, in milliseconds. */
  timeoutMs: Volatile<number>
}

export const Config = z.object({
  baseUrl: z.string().default('https://api.openai.com/v1').volatile(),
  apiKeyEnv: z.string().default('OPENAI_API_KEY').volatile(),
  embeddingModel: z.string().default('text-embedding-3-small').volatile(),
  embeddingDimensions: z.natural().default(0).volatile(),
  batchSize: z.natural().default(64).volatile(),
  timeoutMs: z.natural().default(60_000).volatile(),
})
