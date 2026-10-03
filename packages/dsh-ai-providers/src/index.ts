import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares `ctx.aiProviders` and `ctx.embeddings`.
import type {} from 'dsh-ai-core'
import { Config } from './host/config.ts'
import { registerApi } from './host/http.ts'
import { AiProviders } from './host/registry.ts'
import { AiServices } from './host/services.ts'

export { Config } from './host/config.ts'
export { AiProviders } from './host/registry.ts'
export { ConfiguredEmbedding } from './host/embedding.ts'
export { AiServices } from './host/services.ts'
export const name = 'dsh-ai-providers'

export function apply(ctx: Context, config: Config): void {
  const registry = new AiProviders(ctx)
  const services = new AiServices(ctx, registry, config)
  registerApi(ctx, { registry, services })
}
