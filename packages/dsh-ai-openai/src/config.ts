import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

export interface OpenAiConnectionConfig {
  id: string
  name: string
  baseUrl: string
  apiKeyRef: string
}

/** The controls of requests, as a route, a model or a policy may set them; whatever is left out is the server's own default. */
export interface OpenAiSamplingConfig {
  readonly temperature?: number | undefined
  readonly topP?: number | undefined
  readonly topK?: number | undefined
  readonly minP?: number | undefined
  readonly frequencyPenalty?: number | undefined
  readonly presencePenalty?: number | undefined
  readonly repetitionPenalty?: number | undefined
  readonly seed?: number | undefined
  readonly stop?: readonly string[] | undefined
  readonly maxTokens?: number | undefined
  readonly toolChoice?: 'auto' | 'none' | 'required' | undefined
  /** Further top-level fields of the request body, for what the endpoint accepts beyond the OpenAI API. */
  readonly body?: Readonly<Record<string, unknown>> | undefined
}

export interface OpenAiReasoningLevelConfig {
  readonly id: string
  readonly name: string
  /** The request fields that select this level on this endpoint, such as `{ "reasoning_effort": "none" }`. */
  readonly body: Readonly<Record<string, unknown>>
}

export interface OpenAiLlmModelConfig {
  readonly id: string
  readonly name: string
  readonly contextWindow?: number | undefined
  /** The output limit used when nothing sets one. */
  readonly maxTokens?: number | undefined
  /** Whether the model reads images; text only when absent. */
  readonly vision?: boolean | undefined
  readonly reasoningLevels?: readonly OpenAiReasoningLevelConfig[] | undefined
  /** The id of the level used when the chat selects none. */
  readonly defaultReasoning?: string | undefined
  readonly sampling?: OpenAiSamplingConfig | undefined
}

/** A named way to reach language models: the route a chat selects with `route/model`. */
export interface OpenAiLlmRouteConfig {
  readonly id: string
  readonly name: string
  /** The id of one of the connections. */
  readonly connection: string
  readonly models: readonly OpenAiLlmModelConfig[]
  readonly sampling?: OpenAiSamplingConfig | undefined
  /** Whether the name of the output limit is `max_completion_tokens` (newer OpenAI models) rather than `max_tokens`. */
  readonly maxCompletionTokens?: boolean | undefined
  /** Send the reasoning of earlier answers back to the model. */
  readonly replayReasoning?: boolean | undefined
  /** Where the reasoning of a model is in its text when the endpoint does not separate it. */
  readonly reasoningTags?: 'none' | 'tags' | 'implicit' | undefined
  /** Headers added to every request, besides the key and the harness's own. */
  readonly headers?: Readonly<Record<string, string>> | undefined
}

/** How to reach an OpenAI-compatible API. Every field is edited in the settings UI and read on each call. */
export interface Config {
  /** Reusable OpenAI-compatible endpoints shared by every capability. */
  connections: Volatile<OpenAiConnectionConfig[]>
  embeddingConnection: Volatile<string>
  ttsConnection: Volatile<string>
  sttConnection: Volatile<string>
  imageConnection: Volatile<string>
  /** The embedding model, as the API names it. */
  embeddingModel: Volatile<string>
  /** Vectors of this many dimensions, for models that can shorten theirs; 0 leaves it to the model. */
  embeddingDimensions: Volatile<number>
  /** The text-to-speech model, as the API names it. */
  ttsModel: Volatile<string>
  /** The default voice sent to speech requests. */
  ttsVoice: Volatile<string>
  /** The default audio container or encoding. */
  ttsResponseFormat: Volatile<'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm'>
  /** The default speaking speed, from 0.25 to 4. */
  ttsSpeed: Volatile<number>
  /** Model for completed-file transcription. */
  sttModel: Volatile<string>
  /** Model used by Realtime live transcription sessions. */
  sttRealtimeModel: Volatile<string>
  imageModel: Volatile<string>
  imageSize: Volatile<string>
  imageQuality: Volatile<string>
  imageOutputFormat: Volatile<'png' | 'jpeg' | 'webp'>
  imageOutputCompression: Volatile<number>
  /** The language model routes this plugin serves to DSH. */
  llmRoutes: Volatile<OpenAiLlmRouteConfig[]>
  /** How long a model's answer may stay silent before it is given up, in milliseconds. */
  llmIdleTimeoutMs: Volatile<number>
  /** The most texts sent in one request; more are sent in several, one after another. */
  batchSize: Volatile<number>
  /** How long a request may take before it is given up, in milliseconds. */
  timeoutMs: Volatile<number>
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
  })
}

function routeSchema() {
  return z.object({
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
    maxCompletionTokens: z.boolean(),
    replayReasoning: z.boolean(),
    reasoningTags: z.union(['none', 'tags', 'implicit'] as const),
    headers: z.dict(z.string()),
  })
}

export const Config = z.object({
  connections: z.array(z.object({
    id: z.string().required(),
    name: z.string().required(),
    baseUrl: z.string().required(),
    apiKeyRef: z.string().default(''),
  })).default([{ id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKeyRef: 'OPENAI_API_KEY' }]).volatile(),
  embeddingConnection: z.string().default('openai').volatile(),
  ttsConnection: z.string().default('openai').volatile(),
  sttConnection: z.string().default('openai').volatile(),
  imageConnection: z.string().default('openai').volatile(),
  embeddingModel: z.string().default('text-embedding-3-small').volatile(),
  embeddingDimensions: z.natural().default(0).volatile(),
  ttsModel: z.string().default('gpt-4o-mini-tts').volatile(),
  ttsVoice: z.string().default('alloy').volatile(),
  ttsResponseFormat: z.union(['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'] as const).default('mp3').volatile(),
  ttsSpeed: z.number().default(1).volatile(),
  sttModel: z.string().default('whisper-1').volatile(),
  sttRealtimeModel: z.string().default('gpt-4o-mini-transcribe').volatile(),
  imageModel: z.string().default('gpt-image-1').volatile(),
  imageSize: z.string().default('1024x1024').volatile(),
  imageQuality: z.string().default('auto').volatile(),
  imageOutputFormat: z.union(['png', 'jpeg', 'webp'] as const).default('png').volatile(),
  imageOutputCompression: z.natural().default(100).volatile(),
  llmRoutes: z.array(routeSchema()).default([]).volatile(),
  llmIdleTimeoutMs: z.natural().default(300_000).volatile(),
  batchSize: z.natural().default(64).volatile(),
  timeoutMs: z.natural().default(60_000).volatile(),
})
