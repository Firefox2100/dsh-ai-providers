import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares `ctx.aiProviders` (from the main plugin) and `ctx.credentials`.
import type {} from '@dsh-ai-providers/core'
import type {} from '@deepseek-ai/dsh-credentials'
import { Config } from './config.ts'
import { resolveConnection } from './connection.ts'
import { EMBEDDING_REQUEST_OPTIONS, OllamaEmbeddingService } from './embedding.ts'
import { ENTRY_ID, PROVIDER_ID } from './ids.ts'
import { OllamaLlmService, type ImageReader } from './llm/service.ts'

export { Config } from './config.ts'
export type { OllamaConnectionConfig, OllamaLlmModelConfig, OllamaLlmRouteConfig, OllamaReasoningLevelConfig, OllamaRetryConfig, OllamaSampling } from './config.ts'
export { connectionHeaders, resolveConnection, validateConnection, type OllamaConnection } from './connection.ts'
export { EMBEDDING_REQUEST_OPTIONS, OllamaEmbeddingService, type OllamaEmbedOptions } from './embedding.ts'
export { OllamaLlmService } from './llm/service.ts'
export { OllamaModelControl } from './llm/control.ts'
export { wireBody, wireMessages, wireOptions } from './llm/serialize.ts'
export { translate } from './llm/translate.ts'
export { ENTRY_ID, PROVIDER_ID } from './ids.ts'
export const name = '@dsh-ai-providers/ollama'

/** Waits for the main plugin, so a profile without it loads this one without registering anything. */
export const inject = ['aiProviders']

export function apply(ctx: Context, config: Config): void {
  ctx.effect(() => ctx.aiProviders.register({
    id: PROVIDER_ID,
    label: 'Ollama',
    configEntryId: ENTRY_ID,
    capabilities: {
      embedding: () => new OllamaEmbeddingService({ config, connection: () => resolveConnection(config, config.embeddingConnection.get()), credentials: () => ctx.get('credentials') }),
    },
    llm: () => new OllamaLlmService({ config, credentials: () => ctx.get('credentials'), images: () => (ctx as unknown as { get(name: 'attachments'): ImageReader | undefined }).get('attachments') }),
    requestOptions: { embedding: EMBEDDING_REQUEST_OPTIONS },
  }), 'dsh-ai-ollama: provider')
}
