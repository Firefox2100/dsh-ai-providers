import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

export interface JinaConnectionConfig {
  id: string
  name: string
  /** The API root, such as `https://api.jina.ai/v1`; any server that copies the Jina or Cohere rerank API works too. */
  baseUrl: string
  apiKeyRef: string
}

/** How to reach Jina's APIs. Every field is edited in the settings UI and read on each call. */
export interface Config {
  connections: Volatile<JinaConnectionConfig[]>
  rerankConnection: Volatile<string>
  /** The rerank model, as the API names it. */
  rerankModel: Volatile<string>
  embeddingConnection: Volatile<string>
  /** The embedding model, as the API names it. */
  embeddingModel: Volatile<string>
  /** Vectors of this many dimensions, for models that can shorten theirs; 0 leaves it to the model. */
  embeddingDimensions: Volatile<number>
  /** What happens to a text longer than the model's input: cut to fit, or refused. */
  embeddingOverflow: Volatile<'truncate' | 'error'>
  /** The most texts sent in one request; more are sent in several. */
  batchSize: Volatile<number>
  /** How long a request may take before it is given up, in milliseconds. */
  timeoutMs: Volatile<number>
}

export const Config = z.object({
  connections: z.array(z.object({
    id: z.string().required(), name: z.string().required(), baseUrl: z.string().required(), apiKeyRef: z.string().default(''),
  })).default([{ id: 'jina', name: 'Jina AI', baseUrl: 'https://api.jina.ai/v1', apiKeyRef: 'JINA_API_KEY' }]).volatile(),
  rerankConnection: z.string().default('jina').volatile(),
  rerankModel: z.string().default('jina-reranker-v2-base-multilingual').volatile(),
  embeddingConnection: z.string().default('jina').volatile(),
  embeddingModel: z.string().default('jina-embeddings-v3').volatile(),
  embeddingDimensions: z.natural().default(0).volatile(),
  embeddingOverflow: z.union(['truncate', 'error'] as const).default('truncate').volatile(),
  batchSize: z.natural().default(64).volatile(),
  timeoutMs: z.natural().default(60_000).volatile(),
})
