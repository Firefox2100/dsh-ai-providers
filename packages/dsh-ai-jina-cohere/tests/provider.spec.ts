import { Context } from '@deepseek-ai/cordis'
import { AiProviders } from 'dsh-ai-providers'
import { RerankService } from 'dsh-ai-core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as plugin from '../src/index.ts'

let ctx: Context
const settle = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 40))

beforeEach(() => { ctx = new Context() })
afterEach(async () => { await ctx.fiber.dispose() })

describe('the provider', () => {
  it('registers itself with the main plugin once that is there, offering reranking only, and leaves when it is unloaded', async () => {
    const fiber = ctx.plugin(plugin as never, {} as never) as unknown as { dispose(): void }
    await settle()
    expect(ctx.get('aiProviders')).toBeUndefined()
    new AiProviders(ctx)
    await settle()
    expect(ctx.aiProviders.list().map(provider => provider.id)).toEqual(['jina-cohere'])
    expect(ctx.aiProviders.get('jina-cohere')).toMatchObject({ label: 'Jina / Cohere (rerank API)', configEntryId: 'ai-jina-cohere' })
    expect(ctx.aiProviders.list('embedding')).toEqual([])
    const service = ctx.aiProviders.get('jina-cohere')!.capabilities.rerank!()
    expect(service).toBeInstanceOf(RerankService)
    expect([service.provider, service.model]).toEqual(['jina-cohere', 'jina-reranker-v2-base-multilingual'])
    fiber.dispose()
    await settle()
    expect(ctx.aiProviders.list()).toEqual([])
  })

  it('has a configuration of defaults a profile can override, all editable in settings', () => {
    const parse = plugin.Config as unknown as (value: unknown) => Record<string, { get(): unknown }>
    expect(Object.fromEntries(Object.entries(parse({})).map(([key, field]) => [key, field.get()]))).toEqual({
      baseUrl: 'https://api.jina.ai/v1', apiKeyEnv: 'JINA_API_KEY', rerankModel: 'jina-reranker-v2-base-multilingual', timeoutMs: 60_000,
    })
  })
})
