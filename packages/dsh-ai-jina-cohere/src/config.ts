import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** How to reach a Jina- or Cohere-style rerank API. Every field is edited in the settings UI and read on each call. */
export interface Config {
  /** The API root, such as `https://api.jina.ai/v1`, `https://api.cohere.com/v2` or a local server's `http://localhost:8081/v1`. */
  baseUrl: Volatile<string>
  /**
   * The name the API key is stored under (a credential reference, an environment-variable name). The key
   * itself is never in a profile: it is typed into the settings UI and kept by DSH's credentials service,
   * or supplied by the environment under this name.
   */
  apiKeyEnv: Volatile<string>
  /** The rerank model, as the API names it. */
  rerankModel: Volatile<string>
  /** How long a request may take before it is given up, in milliseconds. */
  timeoutMs: Volatile<number>
}

export const Config = z.object({
  baseUrl: z.string().default('https://api.jina.ai/v1').volatile(),
  apiKeyEnv: z.string().default('JINA_API_KEY').volatile(),
  rerankModel: z.string().default('jina-reranker-v2-base-multilingual').volatile(),
  timeoutMs: z.natural().default(60_000).volatile(),
})
