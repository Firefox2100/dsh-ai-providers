import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares `ctx.aiProviders` (from the main plugin) and `ctx.credentials`.
import type {} from '@dsh-ai-providers/core'
import type {} from '@deepseek-ai/dsh-credentials'
import { Config } from './config.ts'
import { resolveConnection } from './connection.ts'
import { ENTRY_ID, PROVIDER_ID } from './ids.ts'
import { DashScopeEmbeddingService, EMBEDDING_REQUEST_OPTIONS } from './embedding.ts'
import { DashScopeImageService, IMAGE_REQUEST_OPTIONS } from './image.ts'
import { DashScopeRerankService, RERANK_REQUEST_OPTIONS } from './rerank.ts'
import { DashScopeSttService, STT_REQUEST_OPTIONS } from './stt.ts'
import { DashScopeTtsService, TTS_REQUEST_OPTIONS } from './tts.ts'
import { DashScopeLlmService, type ImageReader } from './llm/service.ts'

export { Config } from './config.ts'
export type { DashScopeConnectionConfig, DashScopeLlmModelConfig, DashScopeLlmRouteConfig, DashScopeReasoningLevelConfig, DashScopeRetryConfig, DashScopeSampling } from './config.ts'
export { connectionHeaders, resolveConnection, validateConnection, type DashScopeConnection } from './connection.ts'
export { DashScopeLlmService } from './llm/service.ts'
export { wireBody, wireMessages } from './llm/serialize.ts'
export { translate } from './llm/translate.ts'
export { ENTRY_ID, PROVIDER_ID } from './ids.ts'
export { DashScopeEmbeddingService, EMBEDDING_REQUEST_OPTIONS, embeddingParameters, type DashScopeEmbedOptions } from './embedding.ts'
export { DashScopeImageService, IMAGE_REQUEST_OPTIONS, type DashScopeImageOptions } from './image.ts'
export { DashScopeSttService, STT_REQUEST_OPTIONS, transcriptOf } from './stt.ts'
export { DashScopeTtsService, TTS_REQUEST_OPTIONS, inferenceSocketUrl, isCosyVoice, type DashScopeSpeechFormat, type DashScopeTtsOptions } from './tts.ts'
export { DashScopeRerankService, RERANK_REQUEST_OPTIONS, rerankParameters, type DashScopeRerankOptions } from './rerank.ts'
export const name = '@dsh-ai-providers/dashscope'

/** Waits for the main plugin, so a profile without it loads this one without registering anything. */
export const inject = ['aiProviders']

export function apply(ctx: Context, config: Config): void {
  ctx.effect(() => ctx.aiProviders.register({
    id: PROVIDER_ID,
    label: 'DashScope',
    configEntryId: ENTRY_ID,
    capabilities: {
      rerank: () => new DashScopeRerankService({ config, provider: PROVIDER_ID, connection: () => resolveConnection(config, config.rerankConnection.get()), credentials: () => ctx.get('credentials') }),
      embedding: () => new DashScopeEmbeddingService({ config, provider: PROVIDER_ID, connection: () => resolveConnection(config, config.embeddingConnection.get()), credentials: () => ctx.get('credentials') }),
      tts: () => new DashScopeTtsService({ config, provider: PROVIDER_ID, connection: () => resolveConnection(config, config.ttsConnection.get()), credentials: () => ctx.get('credentials') }),
      stt: () => new DashScopeSttService({ config, provider: PROVIDER_ID, connection: () => resolveConnection(config, config.sttConnection.get()), credentials: () => ctx.get('credentials') }),
      image: () => new DashScopeImageService({ config, provider: PROVIDER_ID, connection: () => resolveConnection(config, config.imageConnection.get()), credentials: () => ctx.get('credentials') }),
    },
    llm: () => new DashScopeLlmService({ config, credentials: () => ctx.get('credentials'), images: () => (ctx as unknown as { get(name: 'attachments'): ImageReader | undefined }).get('attachments') }),
    requestOptions: { embedding: EMBEDDING_REQUEST_OPTIONS, rerank: RERANK_REQUEST_OPTIONS, tts: TTS_REQUEST_OPTIONS, stt: STT_REQUEST_OPTIONS, image: IMAGE_REQUEST_OPTIONS },
  }), 'dsh-ai-dashscope: provider')
}
