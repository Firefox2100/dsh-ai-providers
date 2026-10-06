import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

export interface JinaCohereConnectionConfig {
  id: string
  name: string
  baseUrl: string
  apiKeyRef: string
}

/** How to reach a Jina- or Cohere-style rerank API. Every field is edited in the settings UI and read on each call. */
export interface Config {
  connections: Volatile<JinaCohereConnectionConfig[]>
  rerankConnection: Volatile<string>
  /** The rerank model, as the API names it. */
  rerankModel: Volatile<string>
  /** How long a request may take before it is given up, in milliseconds. */
  timeoutMs: Volatile<number>
}

export const Config = z.object({
  connections: z.array(z.object({
    id: z.string().required(), name: z.string().required(), baseUrl: z.string().required(), apiKeyRef: z.string().default(''),
  })).default([{ id: 'jina', name: 'Jina AI', baseUrl: 'https://api.jina.ai/v1', apiKeyRef: 'JINA_API_KEY' }]).volatile(),
  rerankConnection: z.string().default('jina').volatile(),
  rerankModel: z.string().default('jina-reranker-v2-base-multilingual').volatile(),
  timeoutMs: z.natural().default(60_000).volatile(),
})
