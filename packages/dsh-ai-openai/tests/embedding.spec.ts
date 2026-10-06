import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OpenAiEmbeddingService } from '../src/embedding.ts'

interface Seen { path: string; auth: string | undefined; body: { model: string; input: string[]; dimensions?: number; user?: string } }

let server: Server
let seen: Seen[]
let handler: (request: Seen, respond: (status: number, body: unknown, delay?: number) => void) => void
let settings: { baseUrl: string; apiKeyEnv: string; embeddingModel: string; embeddingDimensions: number; batchSize: number; timeoutMs: number }
let key: string | undefined

const field = <K extends keyof typeof settings>(name: K) => ({ get: () => settings[name] })
const service = () => new OpenAiEmbeddingService({
  config: { baseUrl: field('baseUrl'), apiKeyEnv: field('apiKeyEnv'), embeddingModel: field('embeddingModel'), embeddingDimensions: field('embeddingDimensions'), batchSize: field('batchSize'), timeoutMs: field('timeoutMs') } as never,
  connection: () => ({ baseUrl: settings.baseUrl.replace(/\/+$/, ''), apiKeyRef: settings.apiKeyEnv }),
  credentials: () => ({ resolve: () => Promise.resolve(key === undefined ? undefined : { value: key, source: 'file' }) }) as never,
})

/** Answers with [text length, position in the request] for each text, in reverse order, as a server may. */
const vectors = (input: string[]) => input.map((text, index) => ({ index, embedding: [text.length, index] })).reverse()
const ok = (request: Seen, respond: (status: number, body: unknown) => void): void => {
  respond(200, { data: vectors(request.body.input), model: request.body.model, usage: { total_tokens: request.body.input.length * 2 } })
}

beforeEach(async () => {
  seen = []
  key = 'sk-test'
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
  settings = { baseUrl: `http://127.0.0.1:${port}/v1/`, apiKeyEnv: 'OPENAI_API_KEY', embeddingModel: 'bge-m3', embeddingDimensions: 0, batchSize: 2, timeoutMs: 2000 }
})
afterEach(async () => { await new Promise(resolve => server.close(resolve)) })

describe('the request', () => {
  it('posts the texts to {baseUrl}/embeddings with the key and the model, and returns the vectors in the order of the texts', async () => {
    const answer = await service().embed(['aa', 'b'])
    expect(seen).toEqual([{ path: '/v1/embeddings', auth: 'Bearer sk-test', body: { model: 'bge-m3', input: ['aa', 'b'] } }])
    expect(answer).toEqual({ vectors: [[2, 0], [1, 1]], model: 'bge-m3', dimensions: 2, tokens: 4 })
  })

  it('splits what does not fit one request into several, and puts them back together', async () => {
    const answer = await service().embed(['a', 'bb', 'ccc', 'dddd', 'eeeee'])
    expect(seen.map(request => request.body.input)).toEqual([['a', 'bb'], ['ccc', 'dddd'], ['eeeee']])
    expect(answer.vectors.map(vector => vector[0])).toEqual([1, 2, 3, 4, 5])
    expect(answer.tokens).toBe(10)
  })

  it('sends the dimensions of the configuration, or of the request when it asks for its own, and the user', async () => {
    settings.embeddingDimensions = 256
    await service().embed(['a'])
    await service().embed(['a'], { dimensions: 64, user: 'u1' })
    expect(seen.map(request => [request.body.dimensions, request.body.user])).toEqual([[256, undefined], [64, 'u1']])
  })

  it('reads the configuration and the key on each call, so a change in settings applies at once', async () => {
    const embedding = service()
    await embedding.embed(['a'])
    settings.embeddingModel = 'other'
    key = 'sk-new'
    await embedding.embed(['a'])
    expect(seen.map(request => [request.body.model, request.auth])).toEqual([['bge-m3', 'Bearer sk-test'], ['other', 'Bearer sk-new']])
    expect(embedding.model).toBe('other')
  })

  it('sends no authorization when there is no key, which a local server may not need', async () => {
    key = undefined
    await service().embed(['a'])
    expect(seen[0]?.auth).toBeUndefined()
    settings.apiKeyEnv = ''
    key = 'sk'
    await service().embed(['a'])
    expect(seen[1]?.auth).toBeUndefined()
  })

  it('answers with the model the server says it used', async () => {
    handler = (request, respond) => { respond(200, { data: vectors(request.body.input), model: 'bge-m3-q8' }) }
    expect(await service().embed(['a'])).toEqual({ vectors: [[1, 0]], model: 'bge-m3-q8', dimensions: 2 })
  })
})

describe('what goes wrong', () => {
  const expectCode = (promise: Promise<unknown>, code: string, message?: RegExp) => expect(promise).rejects.toMatchObject({ name: 'AiError', code, ...(message === undefined ? {} : { message: expect.stringMatching(message) }) })

  it('is an invalid input before anything is sent, for an empty text', async () => {
    await expectCode(service().embed(['fine', '  ']), 'invalid-input', /text 2 is empty/)
    expect(seen).toEqual([])
  })

  it('is not configured without a model', async () => {
    settings.embeddingModel = ''
    await expectCode(service().embed(['a']), 'not-configured', /model/)
  })

  it('is rejected for bad credentials or a request the API refuses, with what the API said', async () => {
    handler = (_request, respond) => { respond(401, { error: { message: 'Incorrect API key provided' } }) }
    await expectCode(service().embed(['a']), 'rejected', /credentials.*Incorrect API key provided/)
    handler = (_request, respond) => { respond(404, { error: { message: 'model "x" not found' } }) }
    await expectCode(service().embed(['a']), 'rejected', /model "x" not found/)
  })

  it('is unavailable when the API is limiting, failing, unreachable, too slow or answering nonsense', async () => {
    handler = (_request, respond) => { respond(429, { error: { message: 'slow down' } }) }
    await expectCode(service().embed(['a']), 'unavailable', /limiting.*slow down/)
    handler = (_request, respond) => { respond(503, 'oops') }
    await expectCode(service().embed(['a']), 'unavailable', /failed \(503/)
    handler = (request, respond) => { respond(200, { data: vectors(request.body.input).slice(1) }) }
    await expectCode(service().embed(['a']), 'unavailable', /0 embeddings for 1 texts/)
    handler = (_request, respond) => { respond(200, { data: [{ index: 0, embedding: ['x'] }] }) }
    await expectCode(service().embed(['a']), 'unavailable', /not a vector/)
    handler = (_request, respond) => { respond(200, ok, 300) }
    settings.timeoutMs = 50
    await expectCode(service().embed(['a']), 'unavailable', /did not answer within 50 ms/)
    settings.baseUrl = 'http://127.0.0.1:1/v1'
    await expectCode(service().embed(['a']), 'unavailable', /could not be reached/)
  })

  it('is cancelled when the caller cancels, before or during the request', async () => {
    const controller = new AbortController()
    controller.abort()
    await expectCode(service().embed(['a'], { signal: controller.signal }), 'cancelled')
    const later = new AbortController()
    handler = (_request, respond) => { respond(200, { data: [] }, 300) }
    const waiting = service().embed(['a'], { signal: later.signal })
    setTimeout(() => { later.abort() }, 20)
    await expectCode(waiting, 'cancelled')
  })
})
