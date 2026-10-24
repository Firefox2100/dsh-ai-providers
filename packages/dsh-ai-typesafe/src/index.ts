import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares `ctx.aiProviders` (from the main plugin) and `ctx.credentials`.
import type {} from '@dsh-ai-providers/core'
import type {} from '@deepseek-ai/dsh-credentials'
import { SystemOneApiService } from '@dsh-ai-providers/systemone'
import { Config } from './config.ts'
import { resolveConnection } from './connection.ts'
import { ENTRY_ID, PROVIDER_ID } from './ids.ts'

export { Config } from './config.ts'
export type { TypeSafeConnectionConfig } from './config.ts'
export { resolveConnection } from './connection.ts'
export { ENTRY_ID, PROVIDER_ID } from './ids.ts'
export const name = '@dsh-ai-providers/typesafe'

/** Waits for the main plugin, so a profile without it loads this one without registering anything. */
export const inject = ['aiProviders']

/** The header with which TypeSafe's API offers its longer context window. */
const LONG_CONTEXT = { 'TypeSafe-Danger-Zone-Long-Context': 'true' }

export function apply(ctx: Context, config: Config): void {
  ctx.effect(() => ctx.aiProviders.register({
    id: PROVIDER_ID,
    label: 'TypeSafe',
    configEntryId: ENTRY_ID,
    capabilities: {
      decision: () => new SystemOneApiService({
        config, provider: PROVIDER_ID,
        connection: () => resolveConnection(config),
        credentials: () => ctx.get('credentials'),
        headers: () => (config.longContext.get() ? LONG_CONTEXT : {}),
      }),
    },
  }), 'dsh-ai-typesafe: provider')
}
