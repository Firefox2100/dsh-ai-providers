import { describe, expect, it, vi } from 'vitest'
import { LocalAiRerankService } from '../src/rerank.ts'

const field = <T>(value: T) => ({ get: () => value })
const config = {
  connections: field([{ id: 'local', name: 'LocalAI', baseUrl: 'http://local.test/v1/', apiKeyRef: '' }]),
  rerankConnection: field('local'), rerankModel: field('bge-reranker'), rerankBody: field({ instruction: 'judge relevance' }), timeoutMs: field(1000),
} as never

describe('LocalAI reranking', () => {
  it('uses the native rerank endpoint and preserves configured backend fields', async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ model: 'bge-reranker', results: [{ index: 1, relevance_score: 0.9 }, { index: 0, relevance_score: 0.2 }] }), { status: 200, headers: { 'content-type': 'application/json' } }))
    const service = new LocalAiRerankService({ config, credentials: () => undefined, fetch: send })
    expect(await service.rerank('best', ['one', 'two'], { topN: 1 })).toEqual({ model: 'bge-reranker', results: [{ index: 1, score: 0.9 }, { index: 0, score: 0.2 }] })
    expect(send).toHaveBeenCalledWith('http://local.test/v1/rerank', expect.objectContaining({ body: JSON.stringify({ instruction: 'judge relevance', model: 'bge-reranker', query: 'best', documents: ['one', 'two'], return_documents: false, top_n: 1 }) }))
  })

  it('reports invalid input through AiError', async () => {
    const service = new LocalAiRerankService({ config, credentials: () => undefined, fetch: vi.fn() })
    await expect(service.rerank('', ['one'])).rejects.toMatchObject({ name: 'AiError', code: 'invalid-input' })
  })
})
