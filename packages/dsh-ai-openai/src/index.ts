import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares `ctx.aiProviders` (from the main plugin) and `ctx.credentials`.
import type {} from 'dsh-ai-core'
import type {} from '@deepseek-ai/dsh-credentials'
import type { RequestOption } from 'dsh-ai-core'
import { Config } from './config.ts'
import { OpenAiEmbeddingService } from './embedding.ts'
import { OpenAiTtsService } from './tts.ts'
import { OpenAiSttService } from './stt.ts'
import { OpenAiImageGenerationService } from './image.ts'
import { ENTRY_ID, PROVIDER_ID } from './ids.ts'
import { resolveConnection } from './connection.ts'

export { Config } from './config.ts'
export { OpenAiEmbeddingService, type OpenAiEmbedOptions } from './embedding.ts'
export { OpenAiTtsService, type OpenAiSpeechFormat, type OpenAiTtsOptions } from './tts.ts'
export { OpenAiSttService, type OpenAiLiveSttOptions } from './stt.ts'
export { OpenAiImageGenerationService, type OpenAiImageFormat, type OpenAiImageOptions } from './image.ts'
export { ENTRY_ID, PROVIDER_ID } from './ids.ts'
export const name = 'dsh-ai-openai'

/**
 * What can be set per request, beyond the options every provider has: described here so that whatever
 * keeps session settings can offer it. The number of dimensions shapes the vectors a session stores and
 * compares, so it has to be chosen before the first request.
 */
export const EMBEDDING_REQUEST_OPTIONS: readonly RequestOption[] = [
  {
    key: 'dimensions',
    type: 'integer',
    label: { en: 'Vector dimensions', zh: '向量维度' },
    description: { en: 'Shorter vectors, for models that can shorten theirs (such as text-embedding-3). Leave empty to use the provider\'s setting. Vectors of different sizes cannot be compared, so choose before the first request.', zh: '缩短向量长度，适用于支持缩短的模型（如 text-embedding-3）。留空则使用提供方的设置。不同长度的向量无法比较，请在第一次请求前选定。' },
    min: 1,
    atStart: true,
  },
  {
    key: 'user',
    type: 'string',
    label: { en: 'User tag', zh: '用户标识' },
    description: { en: 'An identifier the API uses to watch for abuse; not needed for a local server.', zh: '接口用来识别滥用的标识；本地服务不需要。' },
  },
]

export const TTS_REQUEST_OPTIONS: readonly RequestOption[] = [
  { key: 'voice', type: 'string', label: { en: 'Voice', zh: '声音' }, description: { en: 'The provider voice id; leave empty to use the profile default.', zh: '提供方的声音标识；留空则使用配置默认值。' } },
  { key: 'responseFormat', type: 'string', label: { en: 'Audio format', zh: '音频格式' }, description: { en: 'OpenAI-compatible format: mp3, opus, aac, flac, wav or pcm.', zh: 'OpenAI 兼容格式：mp3、opus、aac、flac、wav 或 pcm。' } },
  { key: 'speed', type: 'number', label: { en: 'Speed', zh: '语速' }, description: { en: 'Speaking speed from 0.25 to 4.', zh: '语速，范围为 0.25 到 4。' }, min: 0.25, max: 4 },
  { key: 'instructions', type: 'string', label: { en: 'Instructions', zh: '指令' }, description: { en: 'How the model should speak the text, when the selected model supports it.', zh: '所选模型支持时，说明应如何朗读文本。' } },
  { key: 'user', type: 'string', label: { en: 'User tag', zh: '用户标识' }, description: { en: 'An identifier the API uses to watch for abuse.', zh: '接口用来识别滥用的标识。' } },
]

export const STT_REQUEST_OPTIONS: readonly RequestOption[] = [
  { key: 'language', type: 'string', label: { en: 'Language', zh: '语言' }, description: { en: 'ISO-639-1 input language, when known.', zh: '已知时填写输入语言的 ISO-639-1 代码。' } },
  { key: 'prompt', type: 'string', label: { en: 'Transcription prompt', zh: '转录提示' }, description: { en: 'Vocabulary or style guidance for the transcription model.', zh: '给转录模型的词汇或风格提示。' } },
]

export const IMAGE_REQUEST_OPTIONS: readonly RequestOption[] = [
  { key: 'size', type: 'string', label: { en: 'Image size', zh: '图像尺寸' }, description: { en: 'Provider-supported size such as 1024x1024.', zh: '提供方支持的尺寸，例如 1024x1024。' } },
  { key: 'quality', type: 'string', label: { en: 'Quality', zh: '质量' }, description: { en: 'Provider-supported quality such as auto, low, medium or high.', zh: '提供方支持的质量，例如 auto、low、medium 或 high。' } },
  { key: 'style', type: 'string', label: { en: 'Style', zh: '风格' }, description: { en: 'A provider-specific style such as vivid or natural.', zh: '提供方特有的风格，例如 vivid 或 natural。' } },
  { key: 'background', type: 'string', label: { en: 'Background', zh: '背景' }, description: { en: 'auto, opaque or transparent when supported.', zh: '支持时可选 auto、opaque 或 transparent。' } },
  { key: 'outputFormat', type: 'string', label: { en: 'Output format', zh: '输出格式' }, description: { en: 'png, jpeg or webp.', zh: 'png、jpeg 或 webp。' } },
  { key: 'outputCompression', type: 'integer', label: { en: 'Compression', zh: '压缩' }, description: { en: 'Output compression from 0 to 100.', zh: '输出压缩率，范围 0 到 100。' }, min: 0, max: 100 },
  { key: 'user', type: 'string', label: { en: 'User tag', zh: '用户标识' } },
]

/** Waits for the main plugin, so a profile without it loads this one without registering anything. */
export const inject = ['aiProviders']

export function apply(ctx: Context, config: Config): void {
  ctx.effect(() => ctx.aiProviders.register({
    id: PROVIDER_ID,
    label: 'OpenAI-compatible',
    configEntryId: ENTRY_ID,
    capabilities: {
      embedding: () => new OpenAiEmbeddingService({ config, connection: () => resolveConnection(config, 'embedding'), credentials: () => ctx.get('credentials') }),
      tts: () => new OpenAiTtsService({ config, connection: () => resolveConnection(config, 'tts'), credentials: () => ctx.get('credentials') }),
      stt: () => new OpenAiSttService({ config, connection: () => resolveConnection(config, 'stt'), credentials: () => ctx.get('credentials') }),
      image: () => new OpenAiImageGenerationService({ config, connection: () => resolveConnection(config, 'image'), credentials: () => ctx.get('credentials') }),
    },
    requestOptions: { embedding: EMBEDDING_REQUEST_OPTIONS, tts: TTS_REQUEST_OPTIONS, stt: STT_REQUEST_OPTIONS, image: IMAGE_REQUEST_OPTIONS },
  }), 'dsh-ai-openai: provider')
}
