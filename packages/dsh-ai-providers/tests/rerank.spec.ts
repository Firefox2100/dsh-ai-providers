import { AiError } from 'dsh-ai-core'
import { beforeEach, describe, expect, it } from 'vitest'
import { ConfiguredRerank } from '../src/host/rerank.ts'
import { FakeRerank, providerOf } from './support.ts'
import { AiProviders } from '../src/host/registry.ts'
import { Context } from '@deepseek-ai/cordis'

let service: FakeRerank
let selected: string
let rerank: ConfiguredRerank

beforeEach(() => {
  const registry = new AiProviders(new Context())
  service = new FakeRerank()
  registry.register(providerOf('ranks', undefined, service))
  selected = 'ranks'
  rerank = new ConfiguredRerank({ selected: () => selected, registry })
})

const failure = async (run: () => Promise<unknown>): Promise<string> => {
  try { await run() } catch (error) { return error instanceof AiError ? `${error.code}: ${error.message}` : String(error) }
  return 'did not fail'
}

describe('the configured rerank service', () => {
  it('names the provider and model it stands for, or none', () => {
    expect([rerank.provider, rerank.model, rerank.capability]).toEqual(['ranks', 'rank-1', 'rerank'])
    selected = ''
    expect([rerank.provider, rerank.model]).toEqual(['none', 'none'])
  })

  it('scores the documents through the selected provider, best first, with the options it was given', async () => {
    const { results } = await rerank.rerank('the red fox', ['a blue bird', 'the red fox ran', 'a fox'], { topN: 2 })
    expect(results.map(entry => entry.index)).toEqual([1, 2])
    expect(service.calls[0]?.options).toEqual({ topN: 2 })
  })

  it('gives nothing for no documents without asking the provider, and refuses an empty query or a bad topN', async () => {
    expect((await rerank.rerank('q', [])).results).toEqual([])
    expect(service.calls).toEqual([])
    expect(await failure(() => rerank.rerank('  ', ['a']))).toBe('invalid-input: the query is empty')
    expect(await failure(() => rerank.rerank('q', ['a'], { topN: 0 }))).toMatch(/invalid-input/)
  })

  it('says when there is no provider, and when the caller already cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    expect(await failure(() => rerank.rerank('q', ['a'], { signal: controller.signal }))).toBe('cancelled: cancelled')
    selected = ''
    expect(await failure(() => rerank.rerank('q', ['a']))).toMatch(/not-configured/)
  })

  it('does not pass on an answer that scores a document twice, one that was not given, or with a score that is no number', async () => {
    service.answer = { results: [{ index: 0, score: 0.5 }, { index: 0, score: 0.4 }], model: 'm' }
    expect(await failure(() => rerank.rerank('q', ['a', 'b']))).toMatch(/unavailable: .*twice/)
    service.answer = { results: [{ index: 5, score: 0.5 }], model: 'm' }
    expect(await failure(() => rerank.rerank('q', ['a', 'b']))).toMatch(/unavailable/)
    service.answer = { results: [{ index: 0, score: Number.NaN }], model: 'm' }
    expect(await failure(() => rerank.rerank('q', ['a']))).toMatch(/not a number/)
  })

  it('puts the best first even when the provider answers in another order, and cuts to topN itself', async () => {
    service.answer = { results: [{ index: 0, score: 0.1 }, { index: 2, score: 0.9 }, { index: 1, score: 0.5 }], model: 'm' }
    expect((await rerank.rerank('q', ['a', 'b', 'c'])).results.map(entry => entry.index)).toEqual([2, 1, 0])
    expect((await rerank.rerank('q', ['a', 'b', 'c'], { topN: 1 })).results.map(entry => entry.index)).toEqual([2])
  })
})
