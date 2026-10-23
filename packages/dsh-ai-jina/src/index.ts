import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares `ctx.aiProviders` (from the main plugin) and `ctx.credentials`.
import type {} from '@dsh-ai-providers/core'
import type {} from '@deepseek-ai/dsh-credentials'
import { EMBEDDING_REQUEST_OPTIONS, EmbeddingApiService, RerankApiService } from '@dsh-ai-providers/jina-cohere'
import { Config } from './config.ts'
import { resolveConnection } from './connection.ts'
import { ENTRY_ID, PROVIDER_ID } from './ids.ts'

export { Config } from './config.ts'
export type { JinaConnectionConfig } from './config.ts'
export { resolveConnection } from './connection.ts'
export { ENTRY_ID, PROVIDER_ID } from './ids.ts'
export const name = '@dsh-ai-providers/jina'

/** Waits for the main plugin, so a profile without it loads this one without registering anything. */
export const inject = ['aiProviders']

export function apply(ctx: Context, config: Config): void {
  ctx.effect(() => ctx.aiProviders.register({
    id: PROVIDER_ID,
    label: 'Jina',
    configEntryId: ENTRY_ID,
    capabilities: {
      rerank: () => new RerankApiService({ config, provider: PROVIDER_ID, connection: () => resolveConnection(config, 'rerank'), credentials: () => ctx.get('credentials') }),
      embedding: () => new EmbeddingApiService({ config, provider: PROVIDER_ID, api: 'jina', connection: () => resolveConnection(config, 'embedding'), credentials: () => ctx.get('credentials') }),
    },
    requestOptions: { embedding: EMBEDDING_REQUEST_OPTIONS },
  }), 'dsh-ai-jina: provider')
}
