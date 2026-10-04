import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Context } from '@deepseek-ai/cordis'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApiHandler, probeEmbedding, probeRerank } from '../src/host/http.ts'
import { AiProviders } from '../src/host/registry.ts'
import { AiServices } from '../src/host/services.ts'
import { FakeEmbedding, FakeRerank, providerOf } from './support.ts'

let ctx: Context
let registry: AiProviders
let services: AiServices
let service: FakeEmbedding
let ranker: FakeRerank
let reranking: string
let selected: string
let rejection: 401 | 403 | undefined
let stored: Map<string, string>
let handler: ReturnType<typeof createApiHandler>

beforeEach(() => {
  ctx = new Context()
  registry = new AiProviders(ctx)
  selected = 'fake'
  reranking = 'ranks'
  services = new AiServices(ctx, registry, { embedding: { get: () => selected }, rerank: { get: () => reranking }, holdSeconds: { get: () => 300 } } as never)
  service = new FakeEmbedding()
  ranker = new FakeRerank()
  registry.register(providerOf('fake', service))
  registry.register(providerOf('ranks', undefined, ranker))
  registry.register(providerOf('plain', undefined))
  rejection = undefined
  stored = new Map()
  const credentials = {
    describe: (ref: string) => Promise.resolve({ configured: stored.has(ref), writable: ref !== 'LOCKED', ...(stored.has(ref) ? { source: 'file' } : {}) }),
    set: (ref: string, value: string) => (ref === 'LOCKED' ? Promise.reject(new Error('shadowed by the environment')) : Promise.resolve(void stored.set(ref, value))),
    unset: (ref: string) => Promise.resolve(void stored.delete(ref)),
  }
  handler = createApiHandler({ registry, services, connection: { requestRejection: () => rejection }, credentials: () => credentials as never })
})

async function call(method: string, path: string, body?: unknown, type = 'application/json'): Promise<{ status: number; body: unknown; headers: Record<string, string> }> {
  const req = Object.assign(Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]), { method, url: `/ai-api${path}`, headers: { 'content-type': type } }) as unknown as IncomingMessage
  const headers: Record<string, string> = {}
  let status = 0
  let text = ''
  const res = {
    statusCode: 200, headersSent: false,
    setHeader: (name: string, value: string) => { headers[name.toLowerCase()] = String(value) },
    end: (chunk?: string) => { status = (res as { statusCode: number }).statusCode; text = chunk ?? '' },
    destroy: () => undefined,
  } as unknown as ServerResponse
  await handler(req, res)
  return { status, body: text === '' ? undefined : JSON.parse(text), headers }
}

describe('the API', () => {
  it('is for those the connection lets in', async () => {
    rejection = 401
    expect((await call('GET', '/capabilities')).status).toBe(401)
    rejection = undefined
    expect((await call('GET', '/nothing')).status).toBe(404)
    const wrong = await call('DELETE', '/capabilities')
    expect([wrong.status, wrong.headers['allow']]).toEqual([405, 'GET'])
  })

  it('lists what can supply each capability, which one is selected and whether it is on the context', async () => {
    const { body } = await call('GET', '/capabilities')
    expect(body).toEqual({ capabilities: [
      { capability: 'embedding', providers: [{ id: 'fake', label: 'FAKE', configEntryId: 'ai-fake' }], selected: 'fake', available: true },
      { capability: 'rerank', providers: [{ id: 'ranks', label: 'RANKS', configEntryId: 'ai-ranks' }], selected: 'ranks', available: true },
    ] })
    registry.register({ ...providerOf('tuned', service), requestOptions: { embedding: [{ key: 'dimensions', type: 'integer', label: 'Dimensions', min: 1, atStart: true }] } })
    const listed = ((await call('GET', '/capabilities')).body as { capabilities: { providers: { id: string; requestOptions?: unknown }[] }[] }).capabilities[0]!.providers
    expect(listed.find(provider => provider.id === 'tuned')?.requestOptions).toEqual([{ key: 'dimensions', type: 'integer', label: 'Dimensions', min: 1, atStart: true }])
    expect(listed.find(provider => provider.id === 'fake')).not.toHaveProperty('requestOptions')
    selected = 'plain'
    ;(ctx as unknown as { emit(name: string): void }).emit('loader/volatile-update')
    expect(((await call('GET', '/capabilities')).body as { capabilities: { selected?: string }[] }).capabilities[0]).not.toHaveProperty('selected')
    selected = ''
    ;(ctx as unknown as { emit(name: string): void }).emit('loader/volatile-update')
    expect(((await call('GET', '/capabilities')).body as { capabilities: { available: boolean }[] }).capabilities[0]?.available).toBe(false)
  })

  it('says whether a credential is configured, never its value, and stores and removes one', async () => {
    expect((await call('GET', '/credentials?ref=OPENAI_API_KEY')).body).toEqual({ ref: 'OPENAI_API_KEY', configured: false, writable: true })
    const set = await call('PUT', '/credentials', { ref: 'OPENAI_API_KEY', value: 'sk-secret' })
    expect(set.body).toEqual({ ref: 'OPENAI_API_KEY', configured: true, writable: true, source: 'file' })
    expect(JSON.stringify(set.body)).not.toContain('sk-secret')
    expect(stored.get('OPENAI_API_KEY')).toBe('sk-secret')
    expect(((await call('PUT', '/credentials', { ref: 'OPENAI_API_KEY', value: '' })).body as { configured: boolean }).configured).toBe(false)
  })

  it('refuses a credential that is not a reference, a value that is not text, one the store cannot take, and a profile without the service', async () => {
    expect((await call('GET', '/credentials?ref=not%20valid')).status).toBe(400)
    expect((await call('GET', '/credentials')).status).toBe(400)
    expect((await call('PUT', '/credentials', { ref: 'OK_KEY', value: 5 })).status).toBe(400)
    expect((await call('PUT', '/credentials', { ref: 'LOCKED', value: 'x' })).status).toBe(409)
    expect((await call('PUT', '/credentials', {}, 'text/plain')).status).toBe(415)
    const none = createApiHandler({ registry, services, connection: { requestRejection: () => undefined }, credentials: () => undefined })
    handler = none
    expect((await call('GET', '/credentials?ref=OK_KEY')).status).toBe(503)
  })

  it('tests the selected embedding provider itself and reports what a user would see', async () => {
    const ok = (await call('POST', '/probe?capability=embedding')).body as { ok: boolean; dimensions: number; provider: string }
    expect([ok.ok, ok.dimensions, ok.provider]).toEqual([true, 2, 'fake'])
    service.failWith = Object.assign(new Error('bad key'), { name: 'AiError', code: 'rejected' })
    expect(await probeEmbedding(services, registry)).toMatchObject({ ok: false, code: 'internal' })
    expect((await call('POST', '/probe?capability=speech')).status).toBe(400)
    selected = ''
    expect((await call('POST', '/probe?capability=embedding')).body).toMatchObject({ ok: false, code: 'not-configured' })
  })
})

describe('testing the rerank provider', () => {
  it('ranks a few sentences through it and reports what a user would see', async () => {
    const ok = (await call('POST', '/probe?capability=rerank')).body as { ok: boolean; provider: string; model: string }
    expect([ok.ok, ok.provider, ok.model]).toEqual([true, 'fake', 'rank-1'])
    expect(ranker.calls[0]?.query).toMatch(/fox/)
  })

  it('says so when the provider ranks the wrong sentence first, when it fails, and when none is selected', async () => {
    ranker.answer = { results: [{ index: 0, score: 0.9 }, { index: 1, score: 0.1 }], model: 'rank-1' }
    expect(await probeRerank(services, registry)).toMatchObject({ ok: false, code: 'unavailable', message: expect.stringContaining('did not put the one about the fox first') })
    ranker.answer = undefined
    ranker.failWith = Object.assign(new Error('bad key'), { name: 'AiError' })
    expect(await probeRerank(services, registry)).toMatchObject({ ok: false, code: 'internal' })
    reranking = ''
    ;(ctx as unknown as { emit(name: string): void }).emit('loader/volatile-update')
    expect((await call('POST', '/probe?capability=rerank')).body).toMatchObject({ ok: false, code: 'not-configured' })
  })
})
