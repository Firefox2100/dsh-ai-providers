import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { LlmSampling } from '@dsh-ai-providers/core'

export interface CohereConnectionConfig {
  id: string
  name: string
  /** The API root including its version, such as `https://api.cohere.com/v2`. */
  baseUrl: string
  apiKeyRef: string
}

/**
 * The controls of a chat request: the fields every provider has under the names of `LlmSampling`, then
 * Cohere's own, named as its API names them in camelCase. Cohere has no `minP` or repetition penalty, so those are ignored.
 */
export interface CohereSampling extends LlmSampling {
  /** Whether the model thinks (`thinking.type`), for the models that can. */
  thinking?: 'enabled' | 'disabled' | undefined
  /** The most tokens the model may think with (`thinking.token_budget`). */
  thinkingBudget?: number | undefined
  /** How strictly the model refuses unsafe content (`safety_mode`). */
  safetyMode?: 'CONTEXTUAL' | 'STRICT' | 'OFF' | undefined
  /** Whether the model must follow the parameter schema of its tools exactly (`strict_tools`). */
  strictTools?: boolean | undefined
  /** How the model cites documents (`citation_options.mode`). */
  citationMode?: 'ENABLED' | 'DISABLED' | 'FAST' | 'ACCURATE' | 'OFF' | undefined
  /** `{ "type": "json_object", "json_schema": {...} }` to make the answer JSON (`response_format`). */
  responseFormat?: Readonly<Record<string, unknown>> | undefined
  /** Where the request stands in Cohere's queue (`priority`); lower runs first. */
  priority?: number | undefined
}

export interface CohereReasoningLevelConfig {
  id: string
  name: string
  /** The request fields that select this level, such as `{ "thinking": { "type": "enabled", "token_budget": 4000 } }`. */
  body: Readonly<Record<string, unknown>>
}

export interface CohereLlmModelConfig {
  id: string
  name: string
  contextWindow?: number | undefined
  maxTokens?: number | undefined
  vision?: boolean | undefined
  reasoningLevels?: readonly CohereReasoningLevelConfig[] | undefined
  defaultReasoning?: string | undefined
  sampling?: CohereSampling | undefined
}

export interface CohereRetryConfig {
  mode: 'normal' | 'always'
  maxRetries?: number | undefined
  retryableCodes?: readonly string[] | undefined
  backoff?: { initialDelayMs?: number | undefined; maxDelayMs?: number | undefined; jitterRatio?: number | undefined } | undefined
}

export interface CohereLlmRouteConfig {
  id: string
  name: string
  /** The id of one of the connections. */
  connection: string
  models: readonly CohereLlmModelConfig[]
  sampling?: CohereSampling | undefined
  headers?: Readonly<Record<string, string>> | undefined
  /** How DSH retries a failed request of this route; DSH's defaults when absent. */
  retry?: CohereRetryConfig | undefined
}

export interface Config {
  connections: Volatile<CohereConnectionConfig[]>
  rerankConnection: Volatile<string>
  rerankModel: Volatile<string>
  /** The most tokens of a document the model reads (`max_tokens_per_doc`); 0 leaves it to the model. */
  rerankMaxTokensPerDoc: Volatile<number>
  embeddingConnection: Volatile<string>
  embeddingModel: Volatile<string>
  /** Vectors of this many dimensions, for models that can shorten theirs; 0 leaves it to the model. */
  embeddingDimensions: Volatile<number>
  /** What happens to a text longer than the model's input: cut to fit, or refused. */
  embeddingOverflow: Volatile<'truncate' | 'error'>
  /** The most texts sent in one request; Cohere accepts 96 at most. */
  batchSize: Volatile<number>
  /** How long a rerank or embedding request may take, in milliseconds. */
  timeoutMs: Volatile<number>
  llmRoutes: Volatile<CohereLlmRouteConfig[]>
  /** How long a model's answer may stay silent before it is given up, in milliseconds. */
  llmIdleTimeoutMs: Volatile<number>
}

function samplingSchema() {
  return z.object({
    temperature: z.number().min(0).max(1),
    topP: z.number().min(0.01).max(0.99),
    topK: z.natural(),
    minP: z.number().min(0).max(1),
    frequencyPenalty: z.number().min(0).max(1),
    presencePenalty: z.number().min(0).max(1),
    repetitionPenalty: z.number().min(0),
    seed: z.natural(),
    stop: z.array(z.string()),
    maxTokens: z.natural(),
    toolChoice: z.union(['auto', 'none', 'required'] as const),
    body: z.dict(z.any()),
    thinking: z.union(['enabled', 'disabled'] as const),
    thinkingBudget: z.natural(),
    safetyMode: z.union(['CONTEXTUAL', 'STRICT', 'OFF'] as const),
    strictTools: z.boolean(),
    citationMode: z.union(['ENABLED', 'DISABLED', 'FAST', 'ACCURATE', 'OFF'] as const),
    // Free-form: the schema would fill in an empty object, which Cohere reads as a format.
    responseFormat: z.any(),
    priority: z.natural(),
  })
}

export const Config = z.object({
  connections: z.array(z.object({
    id: z.string().required(),
    name: z.string().required(),
    baseUrl: z.string().required(),
    apiKeyRef: z.string().default(''),
  })).default([{ id: 'cohere', name: 'Cohere', baseUrl: 'https://api.cohere.com/v2', apiKeyRef: 'COHERE_API_KEY' }]).volatile(),
  rerankConnection: z.string().default('cohere').volatile(),
  rerankModel: z.string().default('rerank-v3.5').volatile(),
  rerankMaxTokensPerDoc: z.natural().default(0).volatile(),
  embeddingConnection: z.string().default('cohere').volatile(),
  embeddingModel: z.string().default('embed-v4.0').volatile(),
  embeddingDimensions: z.natural().default(0).volatile(),
  embeddingOverflow: z.union(['truncate', 'error'] as const).default('truncate').volatile(),
  batchSize: z.natural().default(96).volatile(),
  timeoutMs: z.natural().default(60_000).volatile(),
  llmRoutes: z.array(z.object({
    id: z.string().required(),
    name: z.string().required(),
    connection: z.string().required(),
    models: z.array(z.object({
      id: z.string().required(),
      name: z.string().required(),
      contextWindow: z.natural(),
      maxTokens: z.natural(),
      vision: z.boolean(),
      reasoningLevels: z.array(z.object({ id: z.string().required(), name: z.string().required(), body: z.dict(z.any()).default({}) })),
      defaultReasoning: z.string(),
      sampling: samplingSchema(),
    })).default([]),
    sampling: samplingSchema(),
    headers: z.dict(z.string()),
    // Left free-form: the schema would fill in empty lists and zeros, which DSH's own policy check then reads as a policy.
    retry: z.any(),
  })).default([]).volatile(),
  llmIdleTimeoutMs: z.natural().default(300_000).volatile(),
})
