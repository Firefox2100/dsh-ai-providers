import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { LlmSampling } from '@dsh-ai-providers/core'

export interface OllamaConnectionConfig {
  id: string
  name: string
  /** The server's address, with or without the trailing `/api`. */
  baseUrl: string
  /** The credential name of a bearer token, for a hosted or proxied server; empty for a local one. */
  apiKeyRef: string
}

/**
 * The controls of a chat request: the fields every provider has under the names of `LlmSampling`, then
 * Ollama's own, named as its API names them in camelCase. Each is sent in the request's `options` unless noted.
 */
export interface OllamaSampling extends LlmSampling {
  /** Tokens of context the server allocates (`num_ctx`). When absent the server's own default applies, which is often far below the model's window. */
  numCtx?: number | undefined
  repeatLastN?: number | undefined
  typicalP?: number | undefined
  penalizeNewline?: boolean | undefined
  mirostat?: 0 | 1 | 2 | undefined
  mirostatTau?: number | undefined
  mirostatEta?: number | undefined
  numKeep?: number | undefined
  numBatch?: number | undefined
  numGpu?: number | undefined
  mainGpu?: number | undefined
  numThread?: number | undefined
  useMmap?: boolean | undefined
  /** Sent at the top level of the request: how long the model stays loaded after it, such as `5m`, `-1` (for ever) or `0` (unload at once). */
  keepAlive?: string | undefined
  /** Sent at the top level: whether the model thinks, or how much (`low`, `medium`, `high`) for the models that take a level. */
  think?: boolean | 'low' | 'medium' | 'high' | undefined
  /** Sent at the top level: `json` or a JSON schema the answer must follow. */
  format?: 'json' | Readonly<Record<string, unknown>> | undefined
}

export interface OllamaReasoningLevelConfig {
  id: string
  name: string
  /** The request fields that select this level, such as `{ "think": "high" }`. */
  body: Readonly<Record<string, unknown>>
}

export interface OllamaLlmModelConfig {
  id: string
  name: string
  contextWindow?: number | undefined
  maxTokens?: number | undefined
  vision?: boolean | undefined
  reasoningLevels?: readonly OllamaReasoningLevelConfig[] | undefined
  defaultReasoning?: string | undefined
  sampling?: OllamaSampling | undefined
}

export interface OllamaRetryConfig {
  mode: 'normal' | 'always'
  maxRetries?: number | undefined
  retryableCodes?: readonly string[] | undefined
  backoff?: { initialDelayMs?: number | undefined; maxDelayMs?: number | undefined; jitterRatio?: number | undefined } | undefined
}

export interface OllamaLlmRouteConfig {
  id: string
  name: string
  /** The id of one of the connections. */
  connection: string
  models: readonly OllamaLlmModelConfig[]
  sampling?: OllamaSampling | undefined
  headers?: Readonly<Record<string, string>> | undefined
  /** How DSH retries a failed request of this route; DSH's defaults when absent. */
  retry?: OllamaRetryConfig | undefined
}

export interface Config {
  connections: Volatile<OllamaConnectionConfig[]>
  embeddingConnection: Volatile<string>
  embeddingModel: Volatile<string>
  /** Vectors of this many dimensions, for models that can shorten theirs; 0 leaves it to the model. */
  embeddingDimensions: Volatile<number>
  /** The context the server allocates for embedding (`num_ctx`); 0 leaves it to the server. */
  embeddingNumCtx: Volatile<number>
  /** What happens to a text longer than the model's context: cut to fit, or refused. */
  embeddingOverflow: Volatile<'truncate' | 'error'>
  /** How long the embedding model stays loaded after a request; empty leaves it to the server. */
  embeddingKeepAlive: Volatile<string>
  batchSize: Volatile<number>
  /** How long an embedding request may take, in milliseconds. */
  timeoutMs: Volatile<number>
  llmRoutes: Volatile<OllamaLlmRouteConfig[]>
  /** How long a model's answer may stay silent before it is given up, in milliseconds. */
  llmIdleTimeoutMs: Volatile<number>
}

function samplingSchema() {
  return z.object({
    temperature: z.number().min(0).max(2),
    topP: z.number().min(0).max(1),
    topK: z.natural(),
    minP: z.number().min(0).max(1),
    frequencyPenalty: z.number().min(-2).max(2),
    presencePenalty: z.number().min(-2).max(2),
    repetitionPenalty: z.number().min(0),
    seed: z.natural(),
    stop: z.array(z.string()),
    maxTokens: z.natural(),
    toolChoice: z.union(['auto', 'none', 'required'] as const),
    body: z.dict(z.any()),
    numCtx: z.natural(),
    repeatLastN: z.number(),
    typicalP: z.number().min(0).max(1),
    penalizeNewline: z.boolean(),
    mirostat: z.union([0, 1, 2] as const),
    mirostatTau: z.number(),
    mirostatEta: z.number(),
    numKeep: z.natural(),
    numBatch: z.natural(),
    numGpu: z.number(),
    mainGpu: z.natural(),
    numThread: z.natural(),
    useMmap: z.boolean(),
    keepAlive: z.string(),
    think: z.union([z.boolean(), 'low', 'medium', 'high'] as const),
    // Free-form: `json` or a schema object.
    format: z.any(),
  })
}

export const Config = z.object({
  connections: z.array(z.object({
    id: z.string().required(),
    name: z.string().required(),
    baseUrl: z.string().required(),
    apiKeyRef: z.string().default(''),
  })).default([{ id: 'ollama', name: 'Ollama', baseUrl: 'http://localhost:11434', apiKeyRef: '' }]).volatile(),
  embeddingConnection: z.string().default('ollama').volatile(),
  embeddingModel: z.string().default('nomic-embed-text').volatile(),
  embeddingDimensions: z.natural().default(0).volatile(),
  embeddingNumCtx: z.natural().default(0).volatile(),
  embeddingOverflow: z.union(['truncate', 'error'] as const).default('truncate').volatile(),
  embeddingKeepAlive: z.string().default('').volatile(),
  batchSize: z.natural().default(64).volatile(),
  timeoutMs: z.natural().default(120_000).volatile(),
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
