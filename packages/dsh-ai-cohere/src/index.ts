import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares `ctx.aiProviders` (from the main plugin) and `ctx.credentials`.
import type {} from '@dsh-ai-providers/core'
import type {} from '@deepseek-ai/dsh-credentials'
import { EMBEDDING_REQUEST_OPTIONS, JinaCohereEmbeddingService, JinaCohereRerankService } from '@dsh-ai-providers/jina-cohere'
import { Config } from './config.ts'
import { resolveConnection } from './connection.ts'
import { ENTRY_ID, PROVIDER_ID } from './ids.ts'
import { CohereLlmService, type ImageReader } from './llm/service.ts'

export { Config } from './config.ts'
export type { CohereConnectionConfig, CohereLlmModelConfig, CohereLlmRouteConfig, CohereReasoningLevelConfig, CohereRetryConfig, CohereSampling } from './config.ts'
export { connectionHeaders, resolveConnection, validateConnection, type CohereConnection } from './connection.ts'
export { CohereLlmService } from './llm/service.ts'
export { wireBody, wireMessages } from './llm/serialize.ts'
export { translate } from './llm/translate.ts'
export { ENTRY_ID, PROVIDER_ID } from './ids.ts'
export const name = '@dsh-ai-providers/cohere'

/** Waits for the main plugin, so a profile without it loads this one without registering anything. */
export const inject = ['aiProviders']

export function apply(ctx: Context, config: Config): void {
  ctx.effect(() => ctx.aiProviders.register({
    id: PROVIDER_ID,
    label: 'Cohere',
    configEntryId: ENTRY_ID,
    capabilities: {
      rerank: () => new JinaCohereRerankService({
        config,
        provider: PROVIDER_ID,
        connection: () => resolveConnection(config, config.rerankConnection.get()),
        credentials: () => ctx.get('credentials'),
        returnDocuments: false,
        body: () => config.rerankMaxTokensPerDoc.get() > 0 ? { max_tokens_per_doc: config.rerankMaxTokensPerDoc.get() } : {},
      }),
      embedding: () => new JinaCohereEmbeddingService({
        config,
        provider: PROVIDER_ID,
        api: 'cohere',
        connection: () => resolveConnection(config, config.embeddingConnection.get()),
        credentials: () => ctx.get('credentials'),
      }),
    },
    llm: () => new CohereLlmService({ config, credentials: () => ctx.get('credentials'), images: () => (ctx as unknown as { get(name: 'attachments'): ImageReader | undefined }).get('attachments') }),
    requestOptions: { embedding: EMBEDDING_REQUEST_OPTIONS },
  }), 'dsh-ai-cohere: provider')
}
