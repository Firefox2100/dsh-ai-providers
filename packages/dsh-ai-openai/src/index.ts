import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares `ctx.aiProviders` (from the main plugin) and `ctx.credentials`.
import type {} from 'dsh-ai-core'
import type {} from '@deepseek-ai/dsh-credentials'
import type { RequestOption } from 'dsh-ai-core'
import { Config } from './config.ts'
import { OpenAiEmbeddingService } from './embedding.ts'
import { ENTRY_ID, PROVIDER_ID } from './ids.ts'

export { Config } from './config.ts'
export { OpenAiEmbeddingService, type OpenAiEmbedOptions } from './embedding.ts'
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

/** Waits for the main plugin, so a profile without it loads this one without registering anything. */
export const inject = ['aiProviders']

export function apply(ctx: Context, config: Config): void {
  ctx.effect(() => ctx.aiProviders.register({
    id: PROVIDER_ID,
    label: 'OpenAI-compatible',
    configEntryId: ENTRY_ID,
    capabilities: { embedding: () => new OpenAiEmbeddingService({ config, credentials: () => ctx.get('credentials') }) },
    requestOptions: { embedding: EMBEDDING_REQUEST_OPTIONS },
  }), 'dsh-ai-openai: provider')
}
