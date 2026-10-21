import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-credentials'
import type {} from '@dsh-ai-providers/core'
import { OpenAiEmbeddingService, OpenAiSttService, OpenAiTtsService, resolveConnection } from '@dsh-ai-providers/openai-compatible'
import { Config } from './config.ts'
import { ENTRY_ID, PROVIDER_ID } from './ids.ts'
import { LocalAiImageGenerationService } from './image.ts'
import { LocalAiRerankService } from './rerank.ts'
import { LocalAiLlmService } from './llm.ts'

export { Config } from './config.ts'
export { LocalAiRerankService } from './rerank.ts'
export { LocalAiImageGenerationService, type LocalAiImageOptions } from './image.ts'
export { LocalAiLlmService, type LocalAiLlmDeps } from './llm.ts'
export { ENTRY_ID, PROVIDER_ID } from './ids.ts'
export const name = '@dsh-ai-providers/localai'

export const inject = ['aiProviders']

export function apply(ctx: Context, config: Config): void {
  const credentials = () => ctx.get('credentials')
  const common = { config, credentials, provider: PROVIDER_ID }
  ctx.effect(() => ctx.aiProviders.register({
    id: PROVIDER_ID,
    label: 'LocalAI',
    configEntryId: ENTRY_ID,
    capabilities: {
      embedding: () => new OpenAiEmbeddingService({ ...common, connection: () => resolveConnection(config, 'embedding'), body: () => config.embeddingBody.get() }),
      rerank: () => new LocalAiRerankService({ config, credentials }),
      tts: () => new OpenAiTtsService({ ...common, connection: () => resolveConnection(config, 'tts'), body: () => config.ttsBody.get() }),
      stt: () => new OpenAiSttService({ ...common, connection: () => resolveConnection(config, 'stt') }) as OpenAiSttService,
      image: () => new LocalAiImageGenerationService({ config, credentials, connection: () => resolveConnection(config, 'image') }),
    },
    llm: () => new LocalAiLlmService({ ...common, images: () => (ctx as unknown as { get(name: 'attachments'): never }).get('attachments') }),
    requestOptions: {
      embedding: [{ key: 'dimensions', type: 'integer', label: { en: 'Vector dimensions', zh: '向量维度' }, min: 1, atStart: true }],
      tts: [{ key: 'voice', type: 'string', label: { en: 'Voice', zh: '声音' } }, { key: 'speed', type: 'number', label: { en: 'Speed', zh: '语速' }, min: 0.25, max: 4 }],
      stt: [{ key: 'language', type: 'string', label: { en: 'Language', zh: '语言' } }, { key: 'prompt', type: 'string', label: { en: 'Prompt', zh: '提示' } }],
      image: [{ key: 'size', type: 'string', label: { en: 'Image size', zh: '图像尺寸' } }, { key: 'steps', type: 'integer', label: { en: 'Sampling steps', zh: '采样步数' }, min: 1 }],
    },
  }), 'dsh-ai-localai: provider')
}
