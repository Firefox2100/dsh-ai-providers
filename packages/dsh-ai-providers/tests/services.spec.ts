import { Context } from '@deepseek-ai/cordis'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as plugin from '../src/index.ts'
import { FakeEmbedding, providerOf, settle } from './support.ts'

let ctx: Context
let selection: { value: string }

/** The Config the plugin would get: live fields. */
const config = (embedding: string) => {
  selection = { value: embedding }
  return { embedding: { get: () => selection.value }, holdSeconds: { get: () => 300 } }
}

beforeEach(() => { ctx = new Context() })

/** What the loader says when a setting is edited. */
const edited = (): void => { (ctx as unknown as { emit(name: string): void }).emit('loader/volatile-update') }
afterEach(async () => { await ctx.fiber.dispose() })

async function load(embedding: string): Promise<void> {
  plugin.apply(ctx as never, config(embedding) as never)
  await settle()
}

describe('the services on the context', () => {
  it('puts the registry on the context, and no embedding until a provider is selected and loaded', async () => {
    await load('fake')
    expect(ctx.aiProviders).toBeInstanceOf(plugin.AiProviders)
    expect(ctx.get('embeddings')).toBeUndefined()
    ctx.aiProviders.register(providerOf('fake', new FakeEmbedding()))
    expect(ctx.embeddings).toBeInstanceOf(plugin.ConfiguredEmbedding)
    expect((await ctx.embeddings.embed(['abc'])).vectors).toEqual([[3, 1]])
  })

  it('takes it away when the provider leaves, and gives it back when it returns', async () => {
    await load('fake')
    const remove = ctx.aiProviders.register(providerOf('fake', new FakeEmbedding()))
    expect(ctx.get('embeddings')).toBeDefined()
    remove()
    expect(ctx.get('embeddings')).toBeUndefined()
    ctx.aiProviders.register(providerOf('fake', new FakeEmbedding()))
    expect(ctx.get('embeddings')).toBeDefined()
  })

  it('has nothing for a provider that does not offer embedding, or when none is selected', async () => {
    await load('')
    ctx.aiProviders.register(providerOf('fake', new FakeEmbedding()))
    expect(ctx.get('embeddings')).toBeUndefined()
    ctx.aiProviders.register(providerOf('plain', undefined))
    selection.value = 'plain'
    edited()
    expect(ctx.get('embeddings')).toBeUndefined()
  })

  it('follows the selection when it is edited', async () => {
    await load('')
    ctx.aiProviders.register(providerOf('fake', new FakeEmbedding()))
    expect(ctx.get('embeddings')).toBeUndefined()
    selection.value = 'fake'
    edited()
    expect(ctx.get('embeddings')).toBeDefined()
    selection.value = ''
    edited()
    expect(ctx.get('embeddings')).toBeUndefined()
  })
})
