import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares `ctx.aiProviders` (from the main plugin) and `ctx.credentials`.
import type {} from '@dsh-ai-providers/core'
import type {} from '@deepseek-ai/dsh-credentials'
import { EMBEDDING_REQUEST_OPTIONS, EmbeddingApiService, RerankApiService } from '@dsh-ai-providers/jina-cohere'
import { Config } from './config.ts'
import { resolveConnection } from './connection.ts'
import { ENTRY_ID, PROVIDER_ID } from './ids.ts'
import { RERANK_REQUEST_OPTIONS, rerankBody, type CohereRerankOptions } from './rerank.ts'
import { CohereLlmService, type ImageReader } from './llm/service.ts'

export { Config } from './config.ts'
export type { CohereConnectionConfig, CohereLlmModelConfig, CohereLlmRouteConfig, CohereReasoningLevelConfig, CohereRetryConfig, CohereSampling } from './config.ts'
export { connectionHeaders, resolveConnection, validateConnection, type CohereConnection } from './connection.ts'
export { CohereLlmService } from './llm/service.ts'
export { wireBody, wireMessages } from './llm/serialize.ts'
export { translate } from './llm/translate.ts'
export { ENTRY_ID, PROVIDER_ID } from './ids.ts'
export { RERANK_REQUEST_OPTIONS, rerankBody, type CohereRerankOptions } from './rerank.ts'
export const name = '@dsh-ai-providers/cohere'

/** Waits for the main plugin, so a profile without it loads this one without registering anything. */
export const inject = ['aiProviders']

export function apply(ctx: Context, config: Config): void {
  ctx.effect(() => ctx.aiProviders.register({
    id: PROVIDER_ID,
    label: 'Cohere',
    configEntryId: ENTRY_ID,
    capabilities: {
      rerank: () => new RerankApiService<CohereRerankOptions>({
        config,
        provider: PROVIDER_ID,
        connection: () => resolveConnection(config, config.rerankConnection.get()),
        credentials: () => ctx.get('credentials'),
        returnDocuments: false,
        body: options => rerankBody(config.rerankMaxTokensPerDoc.get(), options),
      }),
      embedding: () => new EmbeddingApiService({
        config,
        provider: PROVIDER_ID,
        api: 'cohere',
        connection: () => resolveConnection(config, config.embeddingConnection.get()),
        credentials: () => ctx.get('credentials'),
      }),
    },
    llm: () => new CohereLlmService({ config, credentials: () => ctx.get('credentials'), images: () => (ctx as unknown as { get(name: 'attachments'): ImageReader | undefined }).get('attachments') }),
    requestOptions: { embedding: EMBEDDING_REQUEST_OPTIONS, rerank: RERANK_REQUEST_OPTIONS },
  }), 'dsh-ai-cohere: provider')
}
