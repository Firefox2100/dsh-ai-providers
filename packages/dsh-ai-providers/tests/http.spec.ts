import { AI_API_ROUTES, AiError } from '@dsh-ai-providers/core'
import { LlmRoutes } from '../src/host/llm.ts'
import { Context } from '@deepseek-ai/cordis'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApiHandler, registerApi, probeDecision, probeLlm, probeEmbedding, probeImage, probeRerank, probeStt, probeTts, type ApiReply, type ApiRequest } from '../src/host/http.ts'
import { AiProviders } from '../src/host/registry.ts'
import { AiServices } from '../src/host/services.ts'
import { FakeDecision, FakeEmbedding, FakeImage, FakeLlm, FakeRerank, FakeStt, FakeTts, providerOf } from './support.ts'

let ctx: Context
let registry: AiProviders
let services: AiServices
let service: FakeEmbedding
let ranker: FakeRerank
let decider: FakeDecision
let reranking: string
let deciding: string
let selected: string
let speaking: string
let listening: string
let drawing: string
let stored: Map<string, string>
let handler: ReturnType<typeof createApiHandler>

beforeEach(() => {
  ctx = new Context()
  registry = new AiProviders(ctx)
  selected = 'fake'
  reranking = 'ranks'
  deciding = 'decides'
  speaking = ''
  listening = ''
  drawing = ''
  services = new AiServices(ctx, registry, {
    embedding: { get: () => selected }, rerank: { get: () => reranking },
    tts: { get: () => speaking }, stt: { get: () => listening }, image: { get: () => drawing }, decision: { get: () => deciding }, holdSeconds: { get: () => 300 },
  } as never)
  service = new FakeEmbedding()
  ranker = new FakeRerank()
  decider = new FakeDecision()
  registry.register(providerOf('fake', service))
  registry.register(providerOf('ranks', undefined, ranker))
  registry.register(providerOf('decides', undefined, undefined, undefined, undefined, decider))
  registry.register(providerOf('plain', undefined))
  stored = new Map()
  const credentials = {
    describe: (ref: string) => Promise.resolve({ configured: stored.has(ref), writable: ref !== 'LOCKED', ...(stored.has(ref) ? { source: 'file' } : {}) }),
    set: (ref: string, value: string) => (ref === 'LOCKED' ? Promise.reject(new Error('shadowed by the environment')) : Promise.resolve(void stored.set(ref, value))),
    unset: (ref: string) => Promise.resolve(void stored.delete(ref)),
  }
  handler = createApiHandler({ registry, services, llm: new LlmRoutes(ctx, registry, () => undefined), models: () => undefined, credentials: () => credentials as never })
})

async function call(method: string, path: string, body?: unknown, type = 'application/json'): Promise<{ status: number; body: unknown; headers: Record<string, string> }> {
  const chunks = body === undefined ? [] : [new TextEncoder().encode(JSON.stringify(body))]
  const req: ApiRequest = {
    method,
    url: `/ai-api${path}`,
    headers: { 'content-type': type },
    async *[Symbol.asyncIterator]() { for (const chunk of chunks) yield chunk },
  }
  const headers: Record<string, string> = {}
  let status = 0
  let text = ''
  const res: ApiReply = {
    statusCode: 200, headersSent: false,
    setHeader: (name: string, value: string) => { headers[name.toLowerCase()] = String(value) },
    end: (chunk?: string) => { status = res.statusCode; text = chunk ?? '' },
    destroy: () => undefined,
  }
  await handler(req, res)
  return { status, body: text === '' ? undefined : JSON.parse(text), headers }
}

async function callText(text: string): Promise<{ status: number; body: unknown }> {
  const chunks = [new TextEncoder().encode(text)]
  const req: ApiRequest = {
    method: 'POST',
    url: `/ai-api${AI_API_ROUTES.credentials}`,
    headers: { 'content-type': 'application/json' },
    async *[Symbol.asyncIterator]() { for (const chunk of chunks) yield chunk },
  }
  let status = 0
  let answer = ''
  const res: ApiReply = {
    statusCode: 200, headersSent: false,
    setHeader: () => undefined,
    end: (chunk?: string) => { status = res.statusCode; answer = chunk ?? '' },
    destroy: () => undefined,
  }
  await handler(req, res)
  return { status, body: answer === '' ? undefined : JSON.parse(answer) }
}

describe('the API', () => {
  it('answers only the routes and methods it serves', async () => {
    expect((await call('GET', '/nothing')).status).toBe(404)
    const wrong = await call('DELETE', '/capabilities')
    expect([wrong.status, wrong.headers['allow']]).toEqual([405, 'GET'])
  })

  it('lists what can supply each capability, which one is selected and whether it is on the context', async () => {
    const { body } = await call('GET', '/capabilities')
    expect(body).toEqual({ capabilities: [
      { capability: 'embedding', providers: [{ id: 'fake', label: 'FAKE', configEntryId: 'ai-fake' }], selected: 'fake', available: true },
      { capability: 'rerank', providers: [{ id: 'ranks', label: 'RANKS', configEntryId: 'ai-ranks' }], selected: 'ranks', available: true },
      { capability: 'tts', providers: [], available: false },
      { capability: 'stt', providers: [], available: false },
      { capability: 'image', providers: [], available: false },
      { capability: 'decision', providers: [{ id: 'decides', label: 'DECIDES', configEntryId: 'ai-decides' }], selected: 'decides', available: true },
    ] })
    registry.register({ ...providerOf('tuned', service), requestOptions: { embedding: [{ key: 'dimensions', type: 'integer', label: 'Dimensions', min: 1, atStart: true }] } })
    const listed = ((await call('GET', '/capabilities')).body as { capabilities: { providers: { id: string; requestOptions?: unknown }[] }[] }).capabilities[0]!.providers
    expect(listed.find(provider => provider.id === 'tuned')?.requestOptions).toEqual([{ key: 'dimensions', type: 'integer', label: 'Dimensions', min: 1, atStart: true }])
    expect(listed.find(provider => provider.id === 'fake')).not.toHaveProperty('requestOptions')
  })

  it('says whether a credential is configured, never its value, and stores and removes one', async () => {
    expect((await call('GET', '/credentials?ref=OPENAI_API_KEY')).body).toEqual({ ref: 'OPENAI_API_KEY', configured: false, writable: true })
    const set = await call('POST', '/credentials', { ref: 'OPENAI_API_KEY', value: 'sk-secret' })
    expect(set.body).toEqual({ ref: 'OPENAI_API_KEY', configured: true, writable: true, source: 'file' })
    expect(JSON.stringify(set.body)).not.toContain('sk-secret')
    expect(stored.get('OPENAI_API_KEY')).toBe('sk-secret')
    expect(((await call('POST', '/credentials', { ref: 'OPENAI_API_KEY', value: '' })).body as { configured: boolean }).configured).toBe(false)
  })

  it('refuses a credential that is not a reference, a value that is not text, one the store cannot take, and a profile without the service', async () => {
    expect((await call('GET', '/credentials?ref=not%20valid')).status).toBe(400)
    expect((await call('GET', '/credentials')).status).toBe(400)
    expect((await call('POST', '/credentials', { ref: 'OK_KEY', value: 5 })).status).toBe(400)
    expect((await call('POST', '/credentials', { ref: 'LOCKED', value: 'x' })).status).toBe(409)
    expect((await call('POST', '/credentials', {}, 'text/plain')).status).toBe(415)
    const none = createApiHandler({ registry, services, llm: new LlmRoutes(ctx, registry, () => undefined), models: () => undefined, credentials: () => undefined })
    handler = none
    expect((await call('GET', '/credentials?ref=OK_KEY')).status).toBe(503)
  })

  it('says so when nothing is selected for a capability, or when the profile has no model service', async () => {
    const nothing = { ok: false, code: 'not-configured', messageKey: 'noProvider' }
    selected = ''
    reranking = ''
    deciding = ''
    expect(await probeEmbedding(services, registry)).toMatchObject(nothing)
    expect(await probeRerank(services, registry)).toMatchObject(nothing)
    expect(await probeDecision(services, registry)).toMatchObject(nothing)
    expect(await probeLlm(undefined, 'route', 'model')).toMatchObject({ ok: false, code: 'not-configured', messageKey: 'noModelService' })
  })

  it('tests the selected embedding provider itself and reports what a user would see', async () => {
    const ok = (await call('POST', '/probe?capability=embedding')).body as { ok: boolean; dimensions: number; provider: string }
    expect([ok.ok, ok.dimensions, ok.provider]).toEqual([true, 2, 'fake'])
    service.failWith = Object.assign(new Error('bad key'), { name: 'AiError', code: 'rejected' })
    expect(await probeEmbedding(services, registry)).toMatchObject({ ok: false, code: 'internal' })
    service.failWith = new AiError('rejected', 'the key was refused')
    expect(await probeEmbedding(services, registry)).toMatchObject({ ok: false, code: 'rejected', message: 'the key was refused' })
    expect((await call('POST', '/probe?capability=speech')).status).toBe(400)
  })
})

describe('the routes the settings pages read', () => {
  it('answers with nothing to show on a profile where no route and no limit exists yet', async () => {
    expect((await call('GET', '/llm')).body).toEqual({ routes: [] })
    expect((await call('GET', '/concurrency')).body).toEqual({ limits: [], routes: [] })
  })

  it('refuses a model probe without a route and a model, and a discovery for a route nobody owns', async () => {
    expect((await call('POST', '/llm/probe')).status).toBe(400)
    expect((await call('POST', '/llm/probe?route=r1')).status).toBe(400)
    expect((await call('GET', '/llm/discover?provider=ghost&route=r1')).status).toBe(404)
  })

  it('lists the routes a provider serves with their models, and asks that provider to discover more', async () => {
    const talker = new FakeLlm()
    talker.routeList = [{ id: 'local', name: 'Local', models: [{ id: 'big', name: 'Big', contextWindow: 8192, maxTokens: 512 }] }]
    talker.discover = () => Promise.resolve([{ id: 'found', name: 'Found', contextWindow: 4096, inputs: ['text', 'image'] }])
    registry.register(providerOf('talks', undefined, undefined, undefined, undefined, undefined, undefined, talker))
    const listed = (await call('GET', '/llm')).body as { routes: Record<string, unknown>[] }
    expect(listed.routes).toEqual([{ provider: 'talks', providerLabel: 'TALKS', id: 'local', name: 'Local', models: [{ id: 'big', name: 'Big', contextWindow: 8192, maxTokens: 512 }], active: false }])
    expect((await call('GET', '/concurrency')).body).toEqual({ limits: [], routes: [{ id: 'local', name: 'Local' }] })
    const found = (await call('GET', '/llm/discover?provider=talks&route=local')).body as { models: { id: string }[] }
    expect(found.models).toMatchObject([{ id: 'found', name: 'Found', contextWindow: 4096, inputs: ['text', 'image'] }])
    expect((await call('POST', '/llm/probe?route=local&model=big')).body).toMatchObject({ ok: false, code: 'not-configured', messageKey: 'noModelService' })
  })
})

describe('reading a request body', () => {
  it('refuses a body that is not JSON, not an object, or larger than it accepts', async () => {
    expect((await callText('{')).status).toBe(400)
    expect((await callText('["a"]')).status).toBe(400)
    expect((await callText(JSON.stringify({ ref: 'OK_KEY', value: 'x'.repeat(16 * 1024) }))).status).toBe(413)
  })
})

describe('testing the rerank provider', () => {
  it('ranks a few sentences through it and reports what a user would see', async () => {
    const ok = (await call('POST', '/probe?capability=rerank')).body as { ok: boolean; provider: string; model: string }
    expect([ok.ok, ok.provider, ok.model]).toEqual([true, 'fake', 'rank-1'])
    expect(ranker.calls[0]?.query).toMatch(/fox/)
  })

  it('says so when the provider ranks the wrong sentence first or fails', async () => {
    ranker.answer = { results: [{ index: 0, score: 0.9 }, { index: 1, score: 0.1 }], model: 'rank-1' }
    expect(await probeRerank(services, registry)).toMatchObject({ ok: false, code: 'unavailable', messageKey: 'oddRanking', values: { provider: 'fake' } })
    ranker.answer = undefined
    ranker.failWith = Object.assign(new Error('bad key'), { name: 'AiError' })
    expect(await probeRerank(services, registry)).toMatchObject({ ok: false, code: 'internal' })
    ranker.failWith = new AiError('rejected', 'the key was refused')
    expect(await probeRerank(services, registry)).toMatchObject({ ok: false, code: 'rejected' })
  })
})

describe('testing the decision provider', () => {
  it('asks it two questions with one right answer and reports what a user would see', async () => {
    const ok = (await call('POST', '/probe?capability=decision')).body as { ok: boolean; provider: string; model: string }
    expect([ok.ok, ok.provider, ok.model]).toEqual([true, 'fake', 'decide-1'])
    expect(decider.calls[0]?.questions).toHaveProperty('topic')
  })

  it('says so when the provider decides oddly or fails', async () => {
    decider.noul = 0.1
    expect(await probeDecision(services, registry)).toMatchObject({ ok: false, code: 'unavailable', messageKey: 'oddDecision', values: { provider: 'fake' } })
    decider.failWith = Object.assign(new Error('no key'), { name: 'AiError' })
    expect(await probeDecision(services, registry)).toMatchObject({ ok: false, code: 'internal' })
    decider.failWith = new AiError('rejected', 'the key was refused')
    expect(await probeDecision(services, registry)).toMatchObject({ ok: false, code: 'rejected' })
  })
})

describe('testing the speech providers', () => {
  it('says so when no text-to-speech provider is selected', async () => {
    expect(await probeTts(services, registry)).toMatchObject({ ok: false, code: 'not-configured', messageKey: 'noProvider' })
    expect((await call('POST', '/probe?capability=tts')).body).toMatchObject({ ok: false, code: 'not-configured', messageKey: 'noProvider' })
  })

  it('synthesizes a sentence and reads the whole stream, and says so when the provider answers with no audio', async () => {
    const voice = new FakeTts()
    registry.register(providerOf('speaks', undefined, undefined, voice))
    speaking = 'speaks'
    expect(await probeTts(services, registry)).toMatchObject({ ok: true, provider: 'fake', model: 'voice-1' })
    voice.silent = true
    expect(await probeTts(services, registry)).toMatchObject({ ok: false, code: 'unavailable', messageKey: 'emptyAudio', values: { provider: 'fake' } })
  })

  it('transcribes a second of silence, and says so when no speech-to-text provider is selected', async () => {
    expect(await probeStt(services, registry)).toMatchObject({ ok: false, code: 'not-configured', messageKey: 'noProvider' })
    registry.register(providerOf('listens', undefined, undefined, undefined, new FakeStt()))
    listening = 'listens'
    expect(await probeStt(services, registry)).toMatchObject({ ok: true, provider: 'fake', model: 'listen-1' })
  })
  it('passes a provider that refuses the request through with its own error code', async () => {
    const voice = new FakeTts()
    voice.failWith = new AiError('rejected', 'the key was refused')
    registry.register(providerOf('speaks', undefined, undefined, voice))
    speaking = 'speaks'
    expect(await probeTts(services, registry)).toMatchObject({ ok: false, code: 'rejected', message: 'the key was refused' })
    const ears = new FakeStt()
    ears.failWith = new AiError('unavailable', 'the endpoint is down')
    registry.register(providerOf('listens', undefined, undefined, undefined, ears))
    listening = 'listens'
    expect(await probeStt(services, registry)).toMatchObject({ ok: false, code: 'unavailable', message: 'the endpoint is down' })
  })
})

describe('testing the image provider', () => {
  it('says so when no image provider is selected', async () => {
    expect(await probeImage(services, registry)).toMatchObject({ ok: false, code: 'not-configured', messageKey: 'noProvider' })
  })

  it('draws a prompt, and says so when the provider answers with no picture or an empty one', async () => {
    const painter = new FakeImage()
    registry.register(providerOf('draws', undefined, undefined, undefined, undefined, undefined, painter))
    drawing = 'draws'
    expect(await probeImage(services, registry)).toMatchObject({ ok: true, provider: 'fake', model: 'draw-1' })
    painter.images = []
    expect(await probeImage(services, registry)).toMatchObject({ ok: false, code: 'unavailable', messageKey: 'emptyImage', values: { provider: 'fake' } })
    painter.images = [{ data: new Blob([]), mediaType: 'image/png' }]
    expect(await probeImage(services, registry)).toMatchObject({ ok: false, code: 'unavailable', messageKey: 'emptyImage' })
  })

  it('reports what a provider refuses as its own code, and anything else as an internal failure', async () => {
    const painter = new FakeImage()
    painter.failWith = new AiError('unsupported', 'no such model')
    registry.register(providerOf('draws', undefined, undefined, undefined, undefined, undefined, painter))
    drawing = 'draws'
    expect(await probeImage(services, registry)).toMatchObject({ ok: false, code: 'unsupported', message: 'no such model' })
    painter.failWith = new Error('no key')
    expect(await probeImage(services, registry)).toMatchObject({ ok: false, code: 'internal', message: 'no key' })
  })
})

describe('the language model probe', () => {
  const llm = (chunks: unknown[]) => ({ stream: async function * () { for (const chunk of chunks) yield chunk } }) as never

  it('reports the answer, and says so when a reasoning model spent its output without writing one', async () => {
    const answered = await probeLlm(llm([{ type: 'text-delta', index: 0, text: ' ready ' }, { type: 'usage', usage: { outputTokens: 3 } }]), 'route', 'model')
    expect(answered).toMatchObject({ ok: true, text: 'ready', outputTokens: 3 })
    const reasoned = await probeLlm(llm([{ type: 'reasoning-delta', index: 0, text: 'I need to say ready' }, { type: 'finish', reason: { kind: 'max-tokens' } }]), 'route', 'model')
    expect(reasoned).toMatchObject({ ok: false, code: 'empty', messageKey: 'reasonedWithoutAnswer', values: { tokens: 1024 } })
  })
})

describe('the routes on the shared channel', () => {
  it('are registered under their whole path, because the connection matches the request path exactly', () => {
    const paths: string[] = []
    const fake = {
      get: () => undefined,
      inject: (_: string[], run: (inner: unknown) => void) => {
        run({ effect: (make: () => unknown) => { make() }, connection: { fetch: { register: (route: { path: string }) => { paths.push(route.path); return () => undefined } } } })
      },
    }
    registerApi(fake as never, { registry, services } as never)
    expect(paths).toContain('/api/ai-api/credentials')
    expect(paths.every(path => path.startsWith('/api/ai-api/'))).toBe(true)
  })
})
