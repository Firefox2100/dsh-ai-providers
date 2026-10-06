import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Context } from '@deepseek-ai/cordis'
import * as providers from 'dsh-ai-providers'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as openai from '../src/index.ts'

/** The two plugins and a consumer in one context, against a server that counts what it is asked. */
let server: Server
let requests: { model: string; input: string[] }[]
let ctx: Context
let selection: { value: string }
let model: { value: string }
const settle = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 60))

beforeEach(async () => {
  requests = []
  server = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(chunk as Buffer))
    req.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { model: string; input: string[] }
      requests.push(body)
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ data: body.input.map((text, index) => ({ index, embedding: [text.length, 1] })), model: body.model }))
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  ctx = new Context()
  selection = { value: 'openai' }
  model = { value: 'bge-m3' }
  const live = <T>(box: { value: T }) => ({ get: () => box.value })
  // The vendor is loaded first and waits for the main plugin, as it would in a profile.
  const vendorConfig = {
    baseUrl: { get: () => `http://127.0.0.1:${port}/v1` }, apiKeyEnv: { get: () => '' }, embeddingModel: live(model),
    embeddingDimensions: { get: () => 0 }, batchSize: { get: () => 64 }, timeoutMs: { get: () => 2000 },
  }
  // The plugins are applied with live fields in place of the profile's configuration.
  ctx.plugin({ name: 'vendor', inject: openai.inject, apply: (scope: Context) => { openai.apply(scope, vendorConfig as never) } } as never, {} as never)
  await settle()
  ctx.plugin({ name: 'main', apply: (scope: Context) => { providers.apply(scope, { embedding: live(selection), rerank: { get: () => '' }, tts: { get: () => '' }, stt: { get: () => '' }, image: { get: () => '' }, holdSeconds: { get: () => 300 } } as never) } } as never, {} as never)
  await settle()
})
afterEach(async () => {
  await ctx.fiber.dispose()
  await new Promise(resolve => server.close(resolve))
})

describe('a consumer of the embedding service', () => {
  it('finds it on the context, and gets vectors that are ready, without knowing which provider is behind it', async () => {
    const service = ctx.get('embeddings')!
    expect(service).toBeDefined()
    const answer = await service.embed(['hello', 'hi'])
    expect(answer).toEqual({ vectors: [[5, 1], [2, 1]], model: 'bge-m3', dimensions: 2 })
  })

  it('does not make the server compute a text twice at once, and hands over what was prepared ahead', async () => {
    const service = ctx.get('embeddings')!
    await Promise.all([service.embed(['a', 'bb']), service.embed(['bb', 'a'])])
    service.prefetch(['ccc'])
    await new Promise(resolve => setTimeout(resolve, 50))
    const before = requests.length
    expect((await service.embed(['ccc'])).vectors).toEqual([[3, 1]])
    expect(requests.length).toBe(before)
    expect(requests.map(request => request.input)).toEqual([['a', 'bb'], ['ccc']])
  })

  it('passes the options of a request to the vendor, which sends them', async () => {
    const service = ctx.get('embeddings')!
    await service.embed(['a'], { dimensions: 128 } as never)
    expect((requests[0] as { dimensions?: number }).dimensions).toBe(128)
  })

  it('follows a change of model in the provider\'s settings, because the cache is kept by model', async () => {
    const service = ctx.get('embeddings')!
    await service.embed(['a'])
    model.value = 'other'
    await service.embed(['a'])
    expect(requests.map(request => request.model)).toEqual(['bge-m3', 'other'])
  })

  it('is gone when the provider\'s plugin unloads, and carries the failure of the server as a typed error', async () => {
    const service = ctx.get('embeddings')!
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
    await expect(service.embed(['never seen'])).rejects.toMatchObject({ name: 'AiError', code: 'unavailable' })
    server = createServer()
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    expect(ctx.aiProviders.list('embedding').map(provider => provider.id)).toEqual(['openai'])
  })
})
