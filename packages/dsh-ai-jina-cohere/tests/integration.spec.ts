import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Context } from '@deepseek-ai/cordis'
import * as providers from 'dsh-ai-providers'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as vendor from '../src/index.ts'

/** The two plugins and a consumer in one context, against a server that counts what it is asked. */
let server: Server
let requests: { model: string; query: string; documents: string[]; top_n?: number }[]
let ctx: Context
let selection: { value: string }
const settle = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 60))

beforeEach(async () => {
  requests = []
  server = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(chunk as Buffer))
    req.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { model: string; query: string; documents: string[]; top_n?: number }
      requests.push(body)
      res.setHeader('content-type', 'application/json')
      const words = new Set(body.query.toLowerCase().split(/\W+/))
      const results = body.documents.map((document, index) => ({ index, relevance_score: document.toLowerCase().split(/\W+/).filter(word => words.has(word)).length / 10 })).sort((a, b) => b.relevance_score - a.relevance_score)
      res.end(JSON.stringify({ model: body.model, results: results.slice(0, body.top_n ?? results.length) }))
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  ctx = new Context()
  selection = { value: 'jina-cohere' }
  const vendorConfig = { baseUrl: { get: () => `http://127.0.0.1:${port}/v1` }, apiKeyEnv: { get: () => '' }, rerankModel: { get: () => 'bge-reranker' }, timeoutMs: { get: () => 2000 } }
  ctx.plugin({ name: 'vendor', inject: vendor.inject, apply: (scope: Context) => { vendor.apply(scope, vendorConfig as never) } } as never, {} as never)
  await settle()
  ctx.plugin({ name: 'main', apply: (scope: Context) => { providers.apply(scope, { embedding: { get: () => '' }, rerank: { get: () => selection.value }, tts: { get: () => '' }, stt: { get: () => '' }, image: { get: () => '' }, holdSeconds: { get: () => 300 } } as never) } } as never, {} as never)
  await settle()
})
afterEach(async () => {
  await ctx.fiber.dispose()
  await new Promise(resolve => server.close(resolve))
})

describe('a consumer of the rerank service', () => {
  it('finds it on the context, and gets the documents scored best first without knowing which provider is behind it', async () => {
    const service = ctx.get('rerankers')!
    expect(service).toBeDefined()
    expect(ctx.get('embeddings')).toBeUndefined()
    const answer = await service.rerank('the red fox', ['a blue bird', 'the red fox ran home', 'a fox'])
    expect(answer.results.map(entry => entry.index)).toEqual([1, 2, 0])
    expect(answer.model).toBe('bge-reranker')
  })

  it('passes topN on, and does not keep anything between calls', async () => {
    const service = ctx.get('rerankers')!
    expect((await service.rerank('fox', ['a fox', 'a dog'], { topN: 1 })).results).toHaveLength(1)
    await service.rerank('fox', ['a fox', 'a dog'], { topN: 1 })
    expect(requests.map(request => request.top_n)).toEqual([1, 1])
  })

  it('goes away when the selection is cleared, and carries a failure of the server as a typed error', async () => {
    const service = ctx.get('rerankers')!
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
    await expect(service.rerank('q', ['a'])).rejects.toMatchObject({ name: 'AiError', code: 'unavailable' })
    server = createServer()
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    expect(ctx.aiProviders.list('rerank').map(provider => provider.id)).toEqual(['jina-cohere'])
  })
})
