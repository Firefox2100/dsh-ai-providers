import { Context } from '@deepseek-ai/cordis'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as plugin from '../src/index.ts'
import { FakeEmbedding, FakeRerank, FakeStt, FakeTts, providerOf, settle } from './support.ts'

let ctx: Context
let selection: Record<'embedding' | 'rerank' | 'tts' | 'stt' | 'image', string>
const config = (embedding: string, rerank = '', tts = '', stt = '') => {
  selection = { embedding, rerank, tts, stt, image: '' }
  const field = (key: keyof typeof selection) => ({ get: () => selection[key] })
  return { embedding: field('embedding'), rerank: field('rerank'), tts: field('tts'), stt: field('stt'), image: field('image'), holdSeconds: { get: () => 300 } }
}

beforeEach(() => { ctx = new Context() })

afterEach(async () => { await ctx.fiber.dispose() })

const edited = (): void => { (ctx as unknown as { emit(name: string): void }).emit('loader/volatile-update') }

async function load(embedding: string, rerank = '', tts = ''): Promise<void> {
  plugin.apply(ctx as never, config(embedding, rerank, tts) as never)
  await settle()
}

async function loadWithStt(stt: string): Promise<void> {
  plugin.apply(ctx as never, config('', '', '', stt) as never)
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
    expect(ctx.get('embeddings')).toBeUndefined()
  })

  it('follows a provider selection edited in settings', async () => {
    await load('')
    ctx.aiProviders.register(providerOf('fake', new FakeEmbedding()))
    expect(ctx.get('embeddings')).toBeUndefined()
    selection.embedding = 'fake'
    edited()
    expect(ctx.get('embeddings')).toBeDefined()
    selection.embedding = ''
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
    expect(ctx.get('rerankers')).toBeDefined()
  })

  it('is independent of embedding: each capability has its own selection', async () => {
    await load('fake', 'other')
    ctx.aiProviders.register(providerOf('fake', new FakeEmbedding()))
    ctx.aiProviders.register(providerOf('other', undefined, new FakeRerank()))
    expect(ctx.get('embeddings')).toBeDefined()
    expect(ctx.get('rerankers')).toBeDefined()
  })
})

describe('the text-to-speech service on the context', () => {
  it('streams through the selected provider and leaves independently', async () => {
    await load('', '', 'fake')
    expect(ctx.get('textToSpeech')).toBeUndefined()
    const remove = ctx.aiProviders.register(providerOf('fake', undefined, undefined, new FakeTts()))
    expect(ctx.textToSpeech).toBeInstanceOf(plugin.ConfiguredTts)
    const answer = await ctx.textToSpeech.synthesize('hello')
    expect(await new Response(answer.audio).text()).toBe('hello')
    expect([answer.model, answer.mediaType]).toEqual(['voice-1', 'audio/mpeg'])
    remove()
    expect(ctx.get('textToSpeech')).toBeUndefined()
  })

  it('rejects empty text at the facade boundary', async () => {
    await load('', '', 'fake')
    ctx.aiProviders.register(providerOf('fake', undefined, undefined, new FakeTts()))
    await expect(ctx.textToSpeech.synthesize(' ')).rejects.toMatchObject({ code: 'invalid-input' })
  })
})

describe('the speech-to-text service on the context', () => {
  it('does not expose API speech when disabled', async () => {
    await loadWithStt('')
    expect(ctx.get('apiSpeechToText')).toBeUndefined()
  })

  it('uses the selected completed-recording provider', async () => {
    await loadWithStt('fake')
    ctx.aiProviders.register(providerOf('fake', undefined, undefined, undefined, new FakeStt()))
    expect(ctx.apiSpeechToText.info.languages).toContain('auto')
    await expect(ctx.apiSpeechToText.transcribe({ audio: new Uint8Array(32_000), language: 'auto' }, new AbortController().signal)).resolves.toMatchObject({ text: 'heard', audioSeconds: 1 })
  })

  it('publishes realtime transcription separately only when the provider supports it', async () => {
    await loadWithStt('fake')
    const service = Object.assign(new FakeStt(), { startStreaming: async () => ({ events: { async *[Symbol.asyncIterator]() {} }, append: () => {}, commit: () => {}, close: () => {} }) })
    const remove = ctx.aiProviders.register(providerOf('fake', undefined, undefined, undefined, service))
    expect(ctx.get('streamingSpeechToText')).toBeDefined()
    remove()
    expect(ctx.get('streamingSpeechToText')).toBeUndefined()
  })

  it('registers the selected completed-recording provider with DSH Voice Input when its registry exists', async () => {
    const registered: unknown[] = []
    ctx.provide('speechToText')
    ctx.set('speechToText', { register: (provider: unknown) => { registered.push(provider); return async () => { registered.splice(registered.indexOf(provider), 1) } } } as never)
    await loadWithStt('fake')
    ctx.aiProviders.register(providerOf('fake', undefined, undefined, undefined, new FakeStt()))
    await settle()
    expect(registered).toHaveLength(1)
    const provider = registered[0] as { info: unknown; transcribe: unknown }
    expect(provider.info).toEqual({ ...ctx.apiSpeechToText.info })
    expect(typeof provider.transcribe).toBe('function')
  })
})
