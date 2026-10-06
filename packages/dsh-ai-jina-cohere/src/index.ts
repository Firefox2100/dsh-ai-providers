import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares `ctx.aiProviders` (from the main plugin) and `ctx.credentials`.
import type {} from 'dsh-ai-core'
import type {} from '@deepseek-ai/dsh-credentials'
import { Config } from './config.ts'
import { ENTRY_ID, PROVIDER_ID } from './ids.ts'
import { JinaCohereRerankService } from './rerank.ts'
import { resolveConnection } from './connection.ts'

export { Config } from './config.ts'
export { JinaCohereRerankService } from './rerank.ts'
export { ENTRY_ID, PROVIDER_ID } from './ids.ts'
export const name = 'dsh-ai-jina-cohere'

/** Waits for the main plugin, so a profile without it loads this one without registering anything. */
export const inject = ['aiProviders']

export function apply(ctx: Context, config: Config): void {
  ctx.effect(() => ctx.aiProviders.register({
    id: PROVIDER_ID,
    label: 'Jina / Cohere (rerank API)',
    configEntryId: ENTRY_ID,
    capabilities: { rerank: () => new JinaCohereRerankService({ config, connection: () => resolveConnection(config), credentials: () => ctx.get('credentials') }) },
  }), 'dsh-ai-jina-cohere: provider')
}
