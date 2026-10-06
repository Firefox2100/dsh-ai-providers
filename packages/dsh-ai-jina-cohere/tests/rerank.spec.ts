import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { JinaCohereRerankService } from '../src/rerank.ts'

interface Seen { path: string; auth: string | undefined; body: { model: string; query: string; documents: string[]; top_n?: number; return_documents?: boolean } }

let server: Server
let seen: Seen[]
let handler: (request: Seen, respond: (status: number, body: unknown, delay?: number) => void) => void
let settings: { baseUrl: string; apiKeyEnv: string; rerankModel: string; timeoutMs: number }
let key: string | undefined

const field = <K extends keyof typeof settings>(name: K) => ({ get: () => settings[name] })
const service = () => new JinaCohereRerankService({
  config: { baseUrl: field('baseUrl'), apiKeyEnv: field('apiKeyEnv'), rerankModel: field('rerankModel'), timeoutMs: field('timeoutMs') } as never,
  connection: () => ({ baseUrl: settings.baseUrl.replace(/\/+$/, ''), apiKeyRef: settings.apiKeyEnv }),
  credentials: () => ({ resolve: () => Promise.resolve(key === undefined ? undefined : { value: key, source: 'file' }) }) as never,
})

/** Scores each document by its length over 100, in the order of the documents, as a server may. */
const scored = (documents: string[]) => documents.map((document, index) => ({ index, relevance_score: document.length / 100 }))
const ok = (request: Seen, respond: (status: number, body: unknown) => void): void => {
  respond(200, { model: request.body.model, results: scored(request.body.documents).sort((a, b) => a.index - b.index), usage: { total_tokens: 7 } })
}

beforeEach(async () => {
  seen = []
  key = 'jina-test'
  handler = ok
  server = createServer((req: IncomingMessage, res) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(chunk as Buffer))
    req.on('end', () => {
      const request: Seen = { path: req.url ?? '', auth: req.headers['authorization'], body: JSON.parse(Buffer.concat(chunks).toString('utf8')) }
      seen.push(request)
      handler(request, (status, body, delay = 0) => {
        setTimeout(() => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.end(typeof body === 'string' ? body : JSON.stringify(body)) }, delay)
      })
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  settings = { baseUrl: `http://127.0.0.1:${port}/v1/`, apiKeyEnv: 'JINA_API_KEY', rerankModel: 'bge-reranker-v2-m3', timeoutMs: 2000 }
})
afterEach(async () => { await new Promise(resolve => server.close(resolve)) })

describe('the request', () => {
  it('posts the query and documents to {baseUrl}/rerank with the key and the model, and gives the best first', async () => {
    const answer = await service().rerank('where', ['aa', 'bbbbbb', 'cccc'])
    expect(seen).toEqual([{ path: '/v1/rerank', auth: 'Bearer jina-test', body: { model: 'bge-reranker-v2-m3', query: 'where', documents: ['aa', 'bbbbbb', 'cccc'], return_documents: false } }])
    expect(answer).toEqual({ results: [{ index: 1, score: 0.06 }, { index: 2, score: 0.04 }, { index: 0, score: 0.02 }], model: 'bge-reranker-v2-m3', tokens: 7 })
  })

  it('asks for only the best few when told, and reads the Cohere way of counting tokens', async () => {
    handler = (request, respond) => { respond(200, { results: [{ index: 0, relevance_score: 0.9 }], meta: { tokens: { input_tokens: 12 } }, model: request.body.model }) }
    expect(await service().rerank('q', ['a', 'b'], { topN: 1 })).toEqual({ results: [{ index: 0, score: 0.9 }], model: 'bge-reranker-v2-m3', tokens: 12 })
    expect(seen[0]?.body.top_n).toBe(1)
  })

  it('maps raw scores outside 0 to 1 through a logistic function, which keeps their order', async () => {
    handler = (_request, respond) => { respond(200, { results: [{ index: 0, relevance_score: -4 }, { index: 1, relevance_score: 3 }, { index: 2, relevance_score: 0 }] }) }
    const { results } = await service().rerank('q', ['a', 'b', 'c'])
    expect(results.map(entry => entry.index)).toEqual([1, 2, 0])
    expect(results.every(entry => entry.score > 0 && entry.score < 1)).toBe(true)
    expect(results[1]?.score).toBeCloseTo(0.5)
  })

  it('reads a score named just score, and the model the server says it used', async () => {
    handler = (_request, respond) => { respond(200, { model: 'served-as', results: [{ index: 0, score: 0.3 }] }) }
    expect(await service().rerank('q', ['a'])).toEqual({ results: [{ index: 0, score: 0.3 }], model: 'served-as' })
  })

  it('reads the configuration and the key on each call, and sends no authorization without a key', async () => {
    const rerank = service()
    await rerank.rerank('q', ['a'])
    settings.rerankModel = 'other'
    key = undefined
    await rerank.rerank('q', ['a'])
    expect(seen.map(request => [request.body.model, request.auth])).toEqual([['bge-reranker-v2-m3', 'Bearer jina-test'], ['other', undefined]])
    expect(rerank.model).toBe('other')
  })

  it('does not call the server for no documents', async () => {
    expect(await service().rerank('q', [])).toEqual({ results: [], model: 'bge-reranker-v2-m3' })
    expect(seen).toEqual([])
  })
})

describe('what goes wrong', () => {
  const expectCode = (promise: Promise<unknown>, code: string, message?: RegExp) => expect(promise).rejects.toMatchObject({ name: 'AiError', code, ...(message === undefined ? {} : { message: expect.stringMatching(message) }) })

  it('is an invalid input before anything is sent, for an empty query or document', async () => {
    await expectCode(service().rerank(' ', ['a']), 'invalid-input', /query is empty/)
    await expectCode(service().rerank('q', ['fine', ' ']), 'invalid-input', /document 2 is empty/)
    expect(seen).toEqual([])
  })

  it('is not configured without a model', async () => {
    settings.rerankModel = ''
    await expectCode(service().rerank('q', ['a']), 'not-configured', /model/)
  })

  it('is rejected for bad credentials or a refused request, with what the API said in whichever field it says it', async () => {
    handler = (_request, respond) => { respond(401, { message: 'invalid api key' }) }
    await expectCode(service().rerank('q', ['a']), 'rejected', /credentials.*invalid api key/)
    handler = (_request, respond) => { respond(422, { detail: 'model not found' }) }
    await expectCode(service().rerank('q', ['a']), 'rejected', /model not found/)
    handler = (_request, respond) => { respond(400, { error: { message: 'too many documents' } }) }
    await expectCode(service().rerank('q', ['a']), 'rejected', /too many documents/)
  })

  it('is unavailable when the API is limiting, failing, unreachable, too slow or answering nonsense', async () => {
    handler = (_request, respond) => { respond(429, { message: 'slow down' }) }
    await expectCode(service().rerank('q', ['a']), 'unavailable', /limiting.*slow down/)
    handler = (_request, respond) => { respond(503, 'oops') }
    await expectCode(service().rerank('q', ['a']), 'unavailable', /failed \(503/)
    handler = (_request, respond) => { respond(200, { nothing: true }) }
    await expectCode(service().rerank('q', ['a']), 'unavailable', /without results/)
    handler = (_request, respond) => { respond(200, { results: [{ index: 'x', relevance_score: 1 }] }) }
    await expectCode(service().rerank('q', ['a']), 'unavailable', /no index and score/)
    handler = (_request, respond) => { respond(200, { results: [] }, 300) }
    settings.timeoutMs = 50
    await expectCode(service().rerank('q', ['a']), 'unavailable', /did not answer within 50 ms/)
    settings.baseUrl = 'http://127.0.0.1:1/v1'
    await expectCode(service().rerank('q', ['a']), 'unavailable', /could not be reached/)
  })

  it('is cancelled when the caller cancels, before or during the request', async () => {
    const controller = new AbortController()
    controller.abort()
    await expectCode(service().rerank('q', ['a'], { signal: controller.signal }), 'cancelled')
    const later = new AbortController()
    handler = (_request, respond) => { respond(200, { results: [] }, 300) }
    const waiting = service().rerank('q', ['a'], { signal: later.signal })
    setTimeout(() => { later.abort() }, 20)
    await expectCode(waiting, 'cancelled')
  })
})
