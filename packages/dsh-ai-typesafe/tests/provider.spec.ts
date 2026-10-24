import { Context } from '@deepseek-ai/cordis'
import { AiProviders } from '@dsh-ai-providers/runtime'
import { DecisionService } from '@dsh-ai-providers/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as plugin from '../src/index.ts'

let ctx: Context
const settle = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 40))

beforeEach(() => { ctx = new Context() })
afterEach(async () => { await ctx.fiber.dispose() })

describe('the provider', () => {
  it('registers itself with the main plugin once that is there, offering decisions only, and leaves when it is unloaded', async () => {
    const fiber = ctx.plugin(plugin as never, {} as never) as unknown as { dispose(): void }
    await settle()
    expect(ctx.get('aiProviders')).toBeUndefined()
    new AiProviders(ctx)
    await settle()
    expect(ctx.aiProviders.list().map(provider => provider.id)).toEqual(['typesafe'])
    expect(ctx.aiProviders.get('typesafe')).toMatchObject({ label: 'TypeSafe', configEntryId: 'ai-typesafe' })
    expect(ctx.aiProviders.list('decision').map(provider => provider.id)).toEqual(['typesafe'])
    expect(ctx.aiProviders.list('embedding')).toEqual([])
    expect(ctx.aiProviders.list('rerank')).toEqual([])
    const service = ctx.aiProviders.get('typesafe')!.capabilities.decision!()
    expect(service).toBeInstanceOf(DecisionService)
    expect([service.provider, service.model]).toEqual(['typesafe', 'jev-latest'])
    fiber.dispose()
    await settle()
    expect(ctx.aiProviders.list()).toEqual([])
  })

  it('has a configuration of defaults a profile can override, all editable in settings', () => {
    const parse = plugin.Config as unknown as (value: unknown) => Record<string, { get(): unknown }>
    expect(Object.fromEntries(Object.entries(parse({})).map(([key, field]) => [key, field.get()]))).toEqual({
      connections: [{ id: 'typesafe', name: 'TypeSafe', baseUrl: 'https://api.typesafe.ai/v1', apiKeyRef: 'TYPESAFE_API_KEY' }],
      decisionConnection: 'typesafe', decisionModel: 'jev-latest', longContext: false, timeoutMs: 30_000,
    })
  })
})
