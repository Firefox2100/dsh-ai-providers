import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

export interface OpenAiConnectionConfig {
  id: string
  name: string
  baseUrl: string
  apiKeyRef: string
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
  /** The most texts sent in one request; more are sent in several, one after another. */
  batchSize: Volatile<number>
  /** How long a request may take before it is given up, in milliseconds. */
  timeoutMs: Volatile<number>
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
  batchSize: z.natural().default(64).volatile(),
  timeoutMs: z.natural().default(60_000).volatile(),
})
