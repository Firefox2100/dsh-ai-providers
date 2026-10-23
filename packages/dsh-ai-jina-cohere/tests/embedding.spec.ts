import { describe, expect, it } from 'vitest'
import { EmbeddingApiService, type EmbeddingApiOptions } from '../src/index.ts'

interface Seen { url: string; auth: string | null; body: Record<string, unknown> }

const defaults = { embeddingModel: 'jina-embeddings-v3', embeddingDimensions: 0, embeddingOverflow: 'truncate', batchSize: 64, timeoutMs: 60_000 }
const settings = (patch: Record<string, unknown>) => Object.fromEntries(Object.entries({ ...defaults, ...patch }).map(([key, value]) => [key, { get: () => value }])) as never

const service = (patch: Record<string, unknown>, answer: (seen: Seen) => Response, seen: Seen[] = []) => {
  const fetcher = (async (url: string, init: RequestInit) => {
    const entry: Seen = { url, auth: new Headers(init.headers).get('authorization'), body: JSON.parse(init.body as string) as Record<string, unknown> }
    seen.push(entry)
    return answer(entry)
  }) as unknown as typeof fetch
  return new EmbeddingApiService({
    config: settings(patch),
    provider: patch['embeddingApi'] === 'cohere' ? 'cohere' : 'jina',
    api: patch['embeddingApi'] === 'cohere' ? 'cohere' : 'jina',
    connection: () => ({ baseUrl: 'http://embed.test/v1', apiKeyRef: 'KEY' }),
    credentials: () => ({ resolve: () => Promise.resolve({ value: 'secret', source: 'file' }) }) as never,
    fetch: fetcher,
  })
}

const jina = (seen: Seen) => Response.json({ model: seen.body['model'], data: (seen.body['input'] as string[]).map((_, index) => ({ index, embedding: [index, 1] })).reverse(), usage: { total_tokens: 9 } })
const cohere = (seen: Seen) => Response.json({ id: 'x', embeddings: { float: (seen.body['texts'] as string[]).map((_, index) => [index, 1]) }, meta: { billed_units: { input_tokens: 5 } } })

describe('Jina embeddings', () => {
  it('posts to /embeddings with the task chosen by input type, and puts the vectors back in order', async () => {
    const seen: Seen[] = []
    const result = await service({ embeddingDimensions: 256 }, jina, seen).embed(['a', 'b'], { inputType: 'query' })
    expect(seen[0]).toMatchObject({ url: 'http://embed.test/v1/embeddings', auth: 'Bearer secret', body: { model: 'jina-embeddings-v3', input: ['a', 'b'], task: 'retrieval.query', dimensions: 256, truncate: true, embedding_type: 'float' } })
    expect(result).toEqual({ vectors: [[0, 1], [1, 1]], model: 'jina-embeddings-v3', dimensions: 2, tokens: 9 })
  })

  it('sends no task without a choice, lets a task option win, and refuses over-long texts when asked', async () => {
    const seen: Seen[] = []
    const embedder = service({}, jina, seen)
    await embedder.embed(['a'])
    await embedder.embed(['a'], { inputType: 'document', task: 'text-matching', truncate: false })
    await embedder.embed(['a'], { inputType: 'document' })
    expect(seen[0]!.body['task']).toBeUndefined()
    expect(seen[1]!.body).toMatchObject({ task: 'text-matching', truncate: false })
    expect(seen[2]!.body['task']).toBe('retrieval.passage')
  })
})

describe('Cohere embeddings', () => {
  const options = { embeddingApi: 'cohere', embeddingModel: 'embed-v4.0' }

  it('posts to /embed with a required input_type, floats asked for, and reads embeddings.float', async () => {
    const seen: Seen[] = []
    const result = await service({ ...options, embeddingDimensions: 512 }, cohere, seen).embed(['a', 'b'], { inputType: 'query' })
    expect(seen[0]).toMatchObject({ url: 'http://embed.test/v1/embed', body: { model: 'embed-v4.0', texts: ['a', 'b'], input_type: 'search_query', embedding_types: ['float'], truncate: 'END', output_dimension: 512 } })
    expect(result).toEqual({ vectors: [[0, 1], [1, 1]], model: 'embed-v4.0', dimensions: 2, tokens: 5 })
  })

  it('treats texts as documents without a choice, maps truncate to NONE, and sends at most 96 texts per request', async () => {
    const seen: Seen[] = []
    const embedder = service({ ...options, batchSize: 500, embeddingOverflow: 'error' }, cohere, seen)
    const texts = Array.from({ length: 100 }, (_, index) => `t${index}`)
    const result = await embedder.embed(texts)
    expect(seen.map(entry => (entry.body['texts'] as string[]).length)).toEqual([96, 4])
    expect(seen[0]!.body).toMatchObject({ input_type: 'search_document', truncate: 'NONE' })
    expect(result.vectors).toHaveLength(100)
    await embedder.embed(['a'], { task: 'clustering' } satisfies EmbeddingApiOptions)
    expect(seen[2]!.body['input_type']).toBe('clustering')
  })
})

describe('failures', () => {
  it('refuses empty texts, a wrong number of vectors and a refusal from the server', async () => {
    await expect(service({}, jina).embed([' '])).rejects.toMatchObject({ code: 'invalid-input' })
    await expect(service({}, () => Response.json({ data: [] })).embed(['a'])).rejects.toMatchObject({ code: 'unavailable' })
    await expect(service({}, () => Response.json({ detail: 'bad key' }, { status: 401 })).embed(['a'])).rejects.toMatchObject({ code: 'rejected', message: expect.stringContaining('bad key') })
    await expect(service({ embeddingApi: 'cohere' }, () => Response.json({ message: 'invalid api token' }, { status: 401 })).embed(['a'])).rejects.toMatchObject({ code: 'rejected' })
  })
})
