import { describe, expect, it } from 'vitest'
import { ConfiguredEmbedding } from '../src/host/embedding.ts'
import { AiProviders } from '../src/host/registry.ts'
import { Context } from '@deepseek-ai/cordis'
import { FakeEmbedding, providerOf } from './support.ts'

function setup(selected = 'fake', holdMs = 60_000) {
  const registry = new AiProviders(new Context())
  const service = new FakeEmbedding()
  registry.register(providerOf('fake', service))
  const choice = { selected }
  const hold = { ms: holdMs }
  const embedding = new ConfiguredEmbedding({ selected: () => choice.selected, registry, holdMs: () => hold.ms })
  return { embedding, service, registry, choice, hold }
}

describe('the configured embedding', () => {
  it('answers with vectors that are ready, in the order of the texts, from the selected provider', async () => {
    const { embedding, service } = setup()
    const answer = await embedding.embed(['aa', 'b', 'cccc'])
    expect(answer).toEqual({ vectors: [[2, 1], [1, 1], [4, 1]], model: 'fake-1', dimensions: 2 })
    expect(service.calls).toHaveLength(1)
    expect([embedding.provider, embedding.model]).toEqual(['fake', 'fake-1'])
  })

  it('keeps nothing for good: persisting is for whoever stores the vectors, so asking again asks the provider again', async () => {
    const { embedding, service } = setup()
    await embedding.embed(['aa'])
    await embedding.embed(['aa'])
    expect(service.calls).toHaveLength(2)
    expect(embedding.waiting).toBe(0)
  })

  it('does not ask twice for the same text, in one call or in two at the same time, and sends the rest in one call', async () => {
    const { embedding, service } = setup()
    service.delay = 20
    const [first, second] = await Promise.all([embedding.embed(['x', 'x', 'yy']), embedding.embed(['yy', 'zzz'])])
    expect(first.vectors).toEqual([[1, 1], [1, 1], [2, 1]])
    expect(second.vectors).toEqual([[2, 1], [3, 1]])
    expect(service.calls.flatMap(call => call.texts).sort()).toEqual(['x', 'yy', 'zzz'])
    expect(service.calls).toHaveLength(2)
  })

  it('prepares what a prefetch asks for, and hands it over to the embed that retrieves it, once', async () => {
    const { embedding, service } = setup()
    service.delay = 10
    embedding.prefetch(['aa', 'bb'])
    expect(service.calls).toHaveLength(1)
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(embedding.waiting).toBe(2)
    expect((await embedding.embed(['bb', 'aa'])).vectors).toEqual([[2, 1], [2, 1]])
    expect(service.calls).toHaveLength(1)
    expect(embedding.waiting).toBe(0)
    await embedding.embed(['aa'])
    expect(service.calls).toHaveLength(2)
  })

  it('lets an embed that comes while the prefetch is still running share it, and not keep what it took', async () => {
    const { embedding, service } = setup()
    service.delay = 20
    embedding.prefetch(['aa'])
    const answer = await embedding.embed(['aa'])
    expect(answer.vectors).toEqual([[2, 1]])
    expect(service.calls).toHaveLength(1)
    expect(embedding.waiting).toBe(0)
  })

  it('does not ask for what is already being prepared, and drops what nobody retrieved in time', async () => {
    const { embedding, service, hold } = setup('fake', 20)
    embedding.prefetch(['aa'])
    embedding.prefetch(['aa'])
    expect(service.calls).toHaveLength(1)
    await new Promise(resolve => setTimeout(resolve, 5))
    expect(embedding.waiting).toBe(1)
    await new Promise(resolve => setTimeout(resolve, 40))
    expect(embedding.waiting).toBe(0)
    await embedding.embed(['aa'])
    expect(service.calls).toHaveLength(2)
    hold.ms = 60_000
  })

  it('does not let a failed prefetch be heard of, and asks again on the next embed', async () => {
    const { embedding, service } = setup()
    service.failWith = new Error('down')
    embedding.prefetch(['a'])
    await new Promise(resolve => setTimeout(resolve, 5))
    service.failWith = undefined
    expect(embedding.waiting).toBe(0)
    expect((await embedding.embed(['a'])).vectors).toEqual([[1, 1]])
    expect(service.calls).toHaveLength(2)
  })

  it('keeps vectors apart by model and by the options of the request, but not by who is cancelling', async () => {
    const { embedding, service } = setup()
    embedding.prefetch(['a'])
    service.model = 'fake-2'
    embedding.prefetch(['a'])
    embedding.prefetch(['a'], { inputType: 'query' })
    embedding.prefetch(['a'], { inputType: 'query', signal: new AbortController().signal })
    await new Promise(resolve => setTimeout(resolve, 5))
    expect(service.calls).toHaveLength(3)
    expect(embedding.waiting).toBe(3)
  })

  it('passes the options of the request on to the provider, without the signal', async () => {
    const { embedding, service } = setup()
    await embedding.embed(['a'], { inputType: 'query', signal: new AbortController().signal })
    expect(service.calls[0]?.options).toEqual({ inputType: 'query' })
  })

  it('says so when no provider is selected or the selected one is gone, and follows a change of selection', async () => {
    const { embedding, registry, choice } = setup('')
    await expect(embedding.embed(['a'])).rejects.toMatchObject({ code: 'not-configured' })
    embedding.prefetch(['a'])
    choice.selected = 'ghost'
    await expect(embedding.embed(['a'])).rejects.toMatchObject({ code: 'not-configured' })
    const other = new FakeEmbedding()
    registry.register(providerOf('other', other))
    choice.selected = 'other'
    await embedding.embed(['a'])
    expect(other.calls).toHaveLength(1)
    expect(embedding.provider).toBe('other')
  })

  it('passes the provider\'s own error on, and does not keep a failure', async () => {
    const { embedding, service } = setup()
    service.failWith = Object.assign(new Error('bad key'), { code: 'rejected' })
    await expect(embedding.embed(['a'])).rejects.toThrow('bad key')
    service.failWith = undefined
    expect((await embedding.embed(['a'])).vectors).toEqual([[1, 1]])
  })

  it('stops waiting when the caller is cancelled, without stopping what others wait for', async () => {
    const { embedding, service } = setup()
    service.delay = 30
    const controller = new AbortController()
    const waiting = embedding.embed(['a'], { signal: controller.signal })
    const other = embedding.embed(['a'])
    controller.abort()
    await expect(waiting).rejects.toMatchObject({ code: 'cancelled' })
    expect((await other).vectors).toEqual([[1, 1]])
    await expect(embedding.embed(['b'], { signal: controller.signal })).rejects.toMatchObject({ code: 'cancelled' })
  })

  it('refuses an answer with the wrong number of vectors', async () => {
    const { embedding, service } = setup()
    service.embed = () => Promise.resolve({ vectors: [[1]], model: 'm', dimensions: 1 })
    await expect(embedding.embed(['a', 'b'])).rejects.toMatchObject({ code: 'unavailable' })
  })
})
