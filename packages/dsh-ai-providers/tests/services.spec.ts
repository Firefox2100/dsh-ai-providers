import { Context } from '@deepseek-ai/cordis'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as plugin from '../src/index.ts'
import { FakeEmbedding, FakeRerank, providerOf, settle } from './support.ts'

let ctx: Context
let selection: { value: string }
let reranking: { value: string }

/** The Config the plugin would get: live fields. */
const config = (embedding: string, rerank = '') => {
  selection = { value: embedding }
  reranking = { value: rerank }
  return { embedding: { get: () => selection.value }, rerank: { get: () => reranking.value }, holdSeconds: { get: () => 300 } }
}

beforeEach(() => { ctx = new Context() })

/** What the loader says when a setting is edited. */
const edited = (): void => { (ctx as unknown as { emit(name: string): void }).emit('loader/volatile-update') }
afterEach(async () => { await ctx.fiber.dispose() })

async function load(embedding: string, rerank = ''): Promise<void> {
  plugin.apply(ctx as never, config(embedding, rerank) as never)
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

describe('the rerank service on the context', () => {
  it('is there while a provider that offers reranking is selected and loaded, and follows the selection and the provider', async () => {
    await load('', 'fake')
    expect(ctx.get('rerankers')).toBeUndefined()
    const remove = ctx.aiProviders.register(providerOf('fake', undefined, new FakeRerank()))
    expect(ctx.rerankers).toBeInstanceOf(plugin.ConfiguredRerank)
    expect(ctx.get('embeddings')).toBeUndefined()
    expect((await ctx.rerankers.rerank('red fox', ['a blue bird', 'a red fox'])).results[0]).toEqual({ index: 1, score: 0.2 })
    remove()
    expect(ctx.get('rerankers')).toBeUndefined()
    ctx.aiProviders.register(providerOf('fake', undefined, new FakeRerank()))
    reranking.value = ''
    edited()
    expect(ctx.get('rerankers')).toBeUndefined()
  })

  it('is independent of embedding: each capability has its own selection', async () => {
    await load('fake', 'other')
    ctx.aiProviders.register(providerOf('fake', new FakeEmbedding()))
    ctx.aiProviders.register(providerOf('other', undefined, new FakeRerank()))
    expect(ctx.get('embeddings')).toBeDefined()
    expect(ctx.get('rerankers')).toBeDefined()
  })
})
