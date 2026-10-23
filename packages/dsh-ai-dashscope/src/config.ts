import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { LlmSampling } from '@dsh-ai-providers/core'

export interface DashScopeConnectionConfig {
  id: string
  name: string
  /** The API root including its version, such as `https://dashscope.aliyuncs.com/api/v1`. */
  baseUrl: string
  apiKeyRef: string
}

/**
 * The controls of a chat request: the fields every provider has under the names of `LlmSampling`, then DashScope's own,
 * named as its API names them in camelCase. DashScope has no `minP` or frequency penalty, so those are ignored. Its `body` goes
 * into the request's `parameters` object, where every one of these controls lives.
 */
export interface DashScopeSampling extends LlmSampling {
  /** Whether a hybrid model thinks (`enable_thinking`). */
  enableThinking?: boolean | undefined
  /** The most tokens the model may think with (`thinking_budget`). */
  thinkingBudget?: number | undefined
  /** How hard a model thinks, for the models that take levels: `low`, `medium`, `high`, `max` or `xhigh` (`reasoning_effort`). */
  reasoningEffort?: string | undefined
  /** Whether earlier reasoning is sent back to the model (`preserve_thinking`). */
  preserveThinking?: boolean | undefined
  /** Whether the model may search the web (`enable_search`). */
  enableSearch?: boolean | undefined
  /** How it searches: `forced_search`, `search_strategy`, `enable_source`, `enable_citation` and others (`search_options`). */
  searchOptions?: Readonly<Record<string, unknown>> | undefined
  /** Whether the model may run code (`enable_code_interpreter`). */
  enableCodeInterpreter?: boolean | undefined
  /** Whether several tools may be called in one turn (`parallel_tool_calls`). */
  parallelToolCalls?: boolean | undefined
  /** Whether the arguments of a large tool call stream as they are written (`tool_stream`). */
  toolStream?: boolean | undefined
  /** `{ "type": "json_object" }` or a `json_schema` format (`response_format`). */
  responseFormat?: Readonly<Record<string, unknown>> | undefined
  /** Lets vision models read images at up to 16384 tokens each (`vl_high_resolution_images`). */
  vlHighResolutionImages?: boolean | undefined
  /** The fewest and most pixels an image is scaled to (`min_pixels`, `max_pixels`), and the most for all frames of a video (`total_pixels`). */
  minPixels?: number | undefined
  maxPixels?: number | undefined
  totalPixels?: number | undefined
}

export interface DashScopeReasoningLevelConfig {
  id: string
  name: string
  /** The request parameters that select this level, such as `{ "enable_thinking": true, "thinking_budget": 4000 }`. */
  body: Readonly<Record<string, unknown>>
}

export interface DashScopeLlmModelConfig {
  id: string
  name: string
  contextWindow?: number | undefined
  maxTokens?: number | undefined
  vision?: boolean | undefined
  reasoningLevels?: readonly DashScopeReasoningLevelConfig[] | undefined
  defaultReasoning?: string | undefined
  sampling?: DashScopeSampling | undefined
}

export interface DashScopeRetryConfig {
  mode: 'normal' | 'always'
  maxRetries?: number | undefined
  retryableCodes?: readonly string[] | undefined
  backoff?: { initialDelayMs?: number | undefined; maxDelayMs?: number | undefined; jitterRatio?: number | undefined } | undefined
}

export interface DashScopeLlmRouteConfig {
  id: string
  name: string
  /** The id of one of the connections. */
  connection: string
  models: readonly DashScopeLlmModelConfig[]
  sampling?: DashScopeSampling | undefined
  headers?: Readonly<Record<string, string>> | undefined
  /** How DSH retries a failed request of this route; DSH's defaults when absent. */
  retry?: DashScopeRetryConfig | undefined
}

export interface Config {
  connections: Volatile<DashScopeConnectionConfig[]>
  rerankConnection: Volatile<string>
  rerankModel: Volatile<string>
  /** What the reranker is told about the task (`instruct`); empty leaves it to the model's default. */
  rerankInstruct: Volatile<string>
  embeddingConnection: Volatile<string>
  embeddingModel: Volatile<string>
  /** Vectors of this many dimensions, for models that can shorten theirs; 0 leaves it to the model. */
  embeddingDimensions: Volatile<number>
  /** What the embedding model is told about the task (`instruct`); empty leaves it to the model's default. */
  embeddingInstruct: Volatile<string>
  /** Which embedding API the model is served by: the text one, or the multimodal one (text is sent as `contents`). */
  embeddingEndpoint: Volatile<'text' | 'multimodal'>
  /** The most texts sent in one request; DashScope accepts 10 for most models, 20 for qwen3.7. */
  batchSize: Volatile<number>
  ttsConnection: Volatile<string>
  /** `qwen*-tts*` models are served over HTTP, `cosyvoice*` models over a WebSocket. */
  ttsModel: Volatile<string>
  ttsVoice: Volatile<string>
  /** The language of Qwen-TTS speech (`language_type`); `Auto` lets the model decide. */
  ttsLanguage: Volatile<string>
  /** The audio format of CosyVoice speech; Qwen-TTS always answers WAV. */
  ttsFormat: Volatile<'mp3' | 'wav' | 'pcm' | 'opus'>
  sttConnection: Volatile<string>
  sttModel: Volatile<string>
  /** Whether numbers and dates are written out in their usual form (`enable_itn`). */
  sttEnableItn: Volatile<boolean>
  imageConnection: Volatile<string>
  imageModel: Volatile<string>
  /** Image size as `width*height`; empty leaves it to the model. */
  imageSize: Volatile<string>
  /** Whether the model may rewrite the prompt (`prompt_extend`). */
  imagePromptExtend: Volatile<boolean>
  imageWatermark: Volatile<boolean>
  /** How long a non-chat request may take, in milliseconds. */
  timeoutMs: Volatile<number>
  llmRoutes: Volatile<DashScopeLlmRouteConfig[]>
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
    enableThinking: z.boolean(),
    thinkingBudget: z.natural(),
    reasoningEffort: z.string(),
    preserveThinking: z.boolean(),
    enableSearch: z.boolean(),
    // Free-form: the schema would fill in an empty object, which DashScope reads as search settings.
    searchOptions: z.any(),
    enableCodeInterpreter: z.boolean(),
    parallelToolCalls: z.boolean(),
    toolStream: z.boolean(),
    responseFormat: z.any(),
    vlHighResolutionImages: z.boolean(),
    minPixels: z.natural(),
    maxPixels: z.natural(),
    totalPixels: z.natural(),
  })
}

export const Config = z.object({
  connections: z.array(z.object({
    id: z.string().required(),
    name: z.string().required(),
    baseUrl: z.string().required(),
    apiKeyRef: z.string().default(''),
  })).default([{ id: 'dashscope', name: 'Alibaba Cloud DashScope', baseUrl: 'https://dashscope.aliyuncs.com/api/v1', apiKeyRef: 'DASHSCOPE_API_KEY' }]).volatile(),
  rerankConnection: z.string().default('dashscope').volatile(),
  rerankModel: z.string().default('qwen3-rerank').volatile(),
  rerankInstruct: z.string().default('').volatile(),
  embeddingConnection: z.string().default('dashscope').volatile(),
  embeddingModel: z.string().default('text-embedding-v4').volatile(),
  embeddingDimensions: z.natural().default(0).volatile(),
  embeddingInstruct: z.string().default('').volatile(),
  embeddingEndpoint: z.union(['text', 'multimodal'] as const).default('text').volatile(),
  batchSize: z.natural().default(10).volatile(),
  ttsConnection: z.string().default('dashscope').volatile(),
  ttsModel: z.string().default('qwen3-tts-flash').volatile(),
  ttsVoice: z.string().default('Cherry').volatile(),
  ttsLanguage: z.string().default('Auto').volatile(),
  ttsFormat: z.union(['mp3', 'wav', 'pcm', 'opus'] as const).default('mp3').volatile(),
  sttConnection: z.string().default('dashscope').volatile(),
  sttModel: z.string().default('qwen3-asr-flash').volatile(),
  sttEnableItn: z.boolean().default(false).volatile(),
  imageConnection: z.string().default('dashscope').volatile(),
  imageModel: z.string().default('qwen-image-2.0-pro').volatile(),
  imageSize: z.string().default('').volatile(),
  imagePromptExtend: z.boolean().default(true).volatile(),
  imageWatermark: z.boolean().default(false).volatile(),
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
