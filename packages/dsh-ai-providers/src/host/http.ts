import type { Context } from '@deepseek-ai/cordis'
import { credentialRef, type CredentialRef } from '@deepseek-ai/dsh-credentials'
// Type-only: declares `ctx.credentials`, and `ctx.connection` with the shared `/api` channel.
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-client-connection'
import { AI_API_CHANNEL, AI_API_PATH, AI_API_ROUTES, AiError, CAPABILITIES, type CapabilitiesPayload, type ConcurrencyPayload, type CredentialsPayload, type LlmDiscoverPayload, type LlmPayload, type LlmProbeResult, type ProbeResult } from '@dsh-ai-providers/core'
import type { LlmRoutes } from './llm.ts'
import type { AiProviders } from './registry.ts'
import type { AiServices } from './services.ts'

/**
 * The request facts the API reads. DSH's Connection carrier hands the handler a Fetch `Request`; the adapter below
 * presents it in this shape, and the tests build one directly.
 */
export interface ApiRequest {
  readonly method?: string
  readonly url?: string
  readonly headers: Readonly<Record<string, string | string[] | undefined>>
  [Symbol.asyncIterator](): AsyncIterator<Uint8Array>
}

/** What a handler writes back; the adapter finishes it into a Fetch `Response`. */
export interface ApiReply {
  statusCode: number
  headersSent: boolean
  setHeader(name: string, value: string): void
  end(body?: string): void
  destroy(): void
}

const MAX_BODY_BYTES = 16 * 1024

class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

function send(res: ApiReply, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

async function readBody(req: ApiRequest): Promise<Record<string, unknown>> {
  const type = String(req.headers['content-type'] ?? '').split(';', 1)[0]?.trim().toLowerCase()
  if (type !== 'application/json') throw new HttpError(415, 'content-type must be application/json')
  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'request body is too large')
    chunks.push(chunk)
  }
  let body: unknown
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new HttpError(400, 'request body is not valid JSON') }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new HttpError(400, 'request body must be a JSON object')
  return body as Record<string, unknown>
}

function referenceOf(value: unknown): CredentialRef {
  if (typeof value !== 'string') throw new HttpError(400, '"ref" is required')
  try { return credentialRef(value) } catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'not a credential reference') }
}

export interface ApiDeps {
  registry: AiProviders
  services: AiServices
  llm: LlmRoutes
  /** DSH's model service, looked up on use. */
  models: () => Context['llm'] | undefined
  /** The credentials service, looked up on use: a profile without it cannot store keys. */
  credentials: () => Context['credentials'] | undefined
}

/** The handler for the routes below `/api/ai-api`; the Connection carrier authenticates before it is reached. */
export function createApiHandler(deps: ApiDeps): (req: ApiRequest, res: ApiReply) => Promise<void> {
  const { registry, services } = deps
  const needCredentials = (): Context['credentials'] => {
    const credentials = deps.credentials()
    if (credentials === undefined) throw new HttpError(503, 'this profile has no credentials service, so keys cannot be stored from here')
    return credentials
  }

  const routes: Record<string, Partial<Record<string, (req: ApiRequest, res: ApiReply, url: URL) => Promise<void>>>> = {
    [AI_API_ROUTES.capabilities]: {
      GET: async (_req, res) => {
        const payload: CapabilitiesPayload = {
          capabilities: CAPABILITIES.map((capability) => {
            const selected = services.selected(capability)
            const providers = registry.list(capability).map(({ id, label, configEntryId, requestOptions }) => ({
              id, label,
              ...(configEntryId === undefined ? {} : { configEntryId }),
              ...(requestOptions?.[capability] === undefined ? {} : { requestOptions: [...requestOptions[capability]] }),
            }))
            return {
              capability,
              providers,
              ...(providers.some(provider => provider.id === selected) ? { selected } : {}),
              available: services.available(capability),
            }
          }),
        }
        send(res, 200, payload)
      },
    },
    [AI_API_ROUTES.credentials]: {
      GET: async (_req, res, url) => {
        const ref = referenceOf(url.searchParams.get('ref'))
        const info = await needCredentials().describe(ref)
        const payload: CredentialsPayload = { ref, configured: info.configured, writable: info.writable, ...(info.source === undefined ? {} : { source: info.source }) }
        send(res, 200, payload)
      },
      POST: async (req, res) => {
        const body = await readBody(req)
        const ref = referenceOf(body['ref'])
        if (typeof body['value'] !== 'string') throw new HttpError(400, '"value" must be a string')
        const credentials = needCredentials()
        try {
          if (body['value'] === '') await credentials.unset(ref)
          else await credentials.set(ref, body['value'])
        } catch (error) {
          throw new HttpError(409, error instanceof Error ? error.message : 'the credential could not be stored')
        }
        const info = await credentials.describe(ref)
        const payload: CredentialsPayload = { ref, configured: info.configured, writable: info.writable, ...(info.source === undefined ? {} : { source: info.source }) }
        send(res, 200, payload)
      },
    },
    [AI_API_ROUTES.llm]: {
      GET: async (_req, res) => {
        const payload: LlmPayload = {
          routes: deps.llm.routes.owners().map(({ provider, route }) => {
            const state = deps.llm.state(route.id)
            return {
              provider: provider.id, providerLabel: provider.label, id: route.id, name: route.name,
              models: route.models.map(model => ({ id: model.id, name: model.name, ...model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow }, ...model.maxTokens === undefined ? {} : { maxTokens: model.maxTokens } })),
              active: state.active, ...state.problem === undefined ? {} : { problem: state.problem },
            }
          }),
        }
        send(res, 200, payload)
      },
    },
    [AI_API_ROUTES.llmProbe]: {
      POST: async (_req, res, url) => {
        const route = url.searchParams.get('route') ?? ''
        const model = url.searchParams.get('model') ?? ''
        if (route === '' || model === '') throw new HttpError(400, '"route" and "model" are required')
        send(res, 200, await probeLlm(deps.models(), route, model))
      },
    },
    [AI_API_ROUTES.llmDiscover]: {
      GET: async (_req, res, url) => {
        const owner = deps.llm.routes.owners().find(candidate => candidate.provider.id === url.searchParams.get('provider') && candidate.route.id === url.searchParams.get('route'))
        if (owner === undefined) throw new HttpError(404, 'there is no such route')
        let found
        try { found = await owner.service.discover(owner.route.id) }
        catch (error) { throw new HttpError(502, error instanceof Error ? error.message : String(error)) }
        const payload: LlmDiscoverPayload = { models: found.map(model => ({ id: model.id, name: model.name, ...model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow }, ...model.maxTokens === undefined ? {} : { maxTokens: model.maxTokens }, ...model.inputs === undefined ? {} : { inputs: [...model.inputs] }, ...model.reasoning === undefined ? {} : { reasoning: { levels: model.reasoning.levels.map(level => ({ id: level.id, name: level.name, body: { ...level.body } })), ...model.reasoning.default === undefined ? {} : { default: model.reasoning.default } } } })) }
        send(res, 200, payload)
      },
    },
    [AI_API_ROUTES.concurrency]: {
      GET: async (_req, res) => {
        const payload: ConcurrencyPayload = {
          limits: registry.gate?.status() ?? [],
          routes: deps.llm.routes.owners().map(({ route }) => ({ id: route.id, name: route.name })),
        }
        send(res, 200, payload)
      },
    },
    [AI_API_ROUTES.probe]: {
      POST: async (_req, res, url) => {
        const capability = url.searchParams.get('capability')
        if (capability !== 'embedding' && capability !== 'rerank' && capability !== 'tts' && capability !== 'stt' && capability !== 'image' && capability !== 'decision') throw new HttpError(400, 'unknown capability')
        send(res, 200, capability === 'embedding' ? await probeEmbedding(services, registry) : capability === 'rerank' ? await probeRerank(services, registry) : capability === 'tts' ? await probeTts(services, registry) : capability === 'stt' ? await probeStt(services, registry) : capability === 'image' ? await probeImage(services, registry) : await probeDecision(services, registry))
      },
    },
  }

  return async (req: ApiRequest, res: ApiReply) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const methods = routes[url.pathname.slice(`/${AI_API_PATH}`.length) || '/']
    if (methods === undefined) return send(res, 404, { message: 'not found' })
    const route = methods[req.method ?? '']
    if (route === undefined) {
      res.setHeader('allow', Object.keys(methods).join(', '))
      return send(res, 405, { message: 'method not allowed' })
    }
    try {
      await route(req, res, url)
    } catch (error) {
      if (res.headersSent) res.destroy()
      else if (error instanceof HttpError) send(res, error.status, { message: error.message })
      else send(res, 500, { message: error instanceof Error ? error.message : 'internal error' })
    }
  }
}

/** Room enough for a reasoning model to think and still answer; a local model that thinks at length would otherwise spend a small limit before the first word. */
const PROBE_MAX_TOKENS = 1024

/** Ask a model a short question through DSH's own model service, as a chat would, and report what it answered and how fast. */
export async function probeLlm(llm: Context['llm'] | undefined, route: string, model: string): Promise<LlmProbeResult> {
  if (llm === undefined) return { ok: false, code: 'not-configured', message: 'this profile has no model service' }
  const started = performance.now()
  let text = ''
  let reasoned = false
  let outputTokens: number | undefined
  try {
    for await (const chunk of llm.stream({ provider: route, model, messages: [{ role: 'user', content: [{ type: 'text', text: 'Reply with the single word: ready' }] }], maxTokens: PROBE_MAX_TOKENS, signal: AbortSignal.timeout(120_000) })) {
      if (chunk.type === 'text-delta') text += chunk.text
      else if (chunk.type === 'reasoning-delta') reasoned = true
      else if (chunk.type === 'usage') outputTokens = chunk.usage.outputTokens
      else if (chunk.type === 'finish' && (chunk.reason.kind === 'error' || chunk.reason.kind === 'aborted')) return { ok: false, code: chunk.reason.failure.code, message: chunk.reason.failure.message }
    }
  } catch (error) {
    return { ok: false, code: error instanceof AiError ? error.code : 'internal', message: error instanceof Error ? error.message : String(error) }
  }
  if (text.trim() === '') {
    return { ok: false, code: 'empty', message: reasoned ? `the model reasoned but wrote no answer within ${PROBE_MAX_TOKENS} tokens; raise the route's output limit, or lower its reasoning level` : 'the model answered with no text' }
  }
  return { ok: true, route, model, milliseconds: Math.round(performance.now() - started), ...outputTokens === undefined ? {} : { outputTokens }, text: text.trim() }
}

/** Embed one text through the selected provider itself, past the cache, and report it as the user would meet it. */
export async function probeEmbedding(services: AiServices, registry: AiProviders): Promise<ProbeResult> {
  const id = services.selected('embedding')
  const factory = id === '' ? undefined : registry.get(id)?.capabilities.embedding
  if (factory === undefined) return { ok: false, code: 'not-configured', message: 'no embedding provider is selected, or the selected one is not loaded' }
  const started = performance.now()
  try {
    const service = factory()
    const answer = await service.embed(['The quick brown fox jumps over the lazy dog.'], { inputType: 'document' })
    return { ok: true, provider: service.provider, model: answer.model, dimensions: answer.dimensions, milliseconds: Math.round(performance.now() - started) }
  } catch (error) {
    if (error instanceof AiError) return { ok: false, code: error.code, message: error.message }
    return { ok: false, code: 'internal', message: error instanceof Error ? error.message : String(error) }
  }
}

/** Rerank a few sentences through the selected provider and report it as the user would meet it; the one about the fox must come first. */
export async function probeRerank(services: AiServices, registry: AiProviders): Promise<ProbeResult> {
  const id = services.selected('rerank')
  const factory = id === '' ? undefined : registry.get(id)?.capabilities.rerank
  if (factory === undefined) return { ok: false, code: 'not-configured', message: 'no rerank provider is selected, or the selected one is not loaded' }
  const started = performance.now()
  try {
    const service = factory()
    const documents = ['The stock market closed higher on Tuesday.', 'A quick brown fox jumped over the lazy dog.', 'Recipes for a good tomato soup.']
    const answer = await service.rerank('Which sentence is about a fox?', documents, { topN: 3 })
    if (answer.results[0]?.index !== 1) return { ok: false, code: 'unavailable', message: `${service.provider} ranked the sentences oddly: it did not put the one about the fox first` }
    return { ok: true, provider: service.provider, model: answer.model, milliseconds: Math.round(performance.now() - started) }
  } catch (error) {
    if (error instanceof AiError) return { ok: false, code: error.code, message: error.message }
    return { ok: false, code: 'internal', message: error instanceof Error ? error.message : String(error) }
  }
}

/** Start a short synthesis and read its stream, so the probe checks the audio body as well as the response headers. */
export async function probeTts(services: AiServices, registry: AiProviders): Promise<ProbeResult> {
  const id = services.selected('tts')
  const factory = id === '' ? undefined : registry.get(id)?.capabilities.tts
  if (factory === undefined) return { ok: false, code: 'not-configured', message: 'no text-to-speech provider is selected, or the selected one is not loaded' }
  const started = performance.now()
  try {
    const service = factory()
    const answer = await service.synthesize('The quick brown fox jumps over the lazy dog.')
    const reader = answer.audio.getReader()
    let bytes = 0
    while (true) {
      const part = await reader.read()
      if (part.done) break
      bytes += part.value.byteLength
    }
    if (bytes === 0) return { ok: false, code: 'unavailable', message: `${service.provider} returned empty audio` }
    return { ok: true, provider: service.provider, model: answer.model, milliseconds: Math.round(performance.now() - started) }
  } catch (error) {
    if (error instanceof AiError) return { ok: false, code: error.code, message: error.message }
    return { ok: false, code: 'internal', message: error instanceof Error ? error.message : String(error) }
  }
}

function silentWav(): Uint8Array {
  const samples = 4000
  const bytes = new ArrayBuffer(44 + samples * 2)
  const view = new DataView(bytes)
  const text = (at: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i)) }
  text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 16000, true)
  view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, samples * 2, true)
  return new Uint8Array(bytes)
}

export async function probeStt(services: AiServices, registry: AiProviders): Promise<ProbeResult> {
  const id = services.selected('stt')
  const factory = id === '' ? undefined : registry.get(id)?.capabilities.stt
  if (factory === undefined) return { ok: false, code: 'not-configured', message: 'no speech-to-text provider is selected, or the selected one is not loaded' }
  const started = performance.now()
  try {
    const service = factory()
    await service.transcribe({ audio: silentWav(), language: 'auto' }, new AbortController().signal)
    return { ok: true, provider: service.provider, model: service.model, milliseconds: Math.round(performance.now() - started) }
  } catch (error) {
    if (error instanceof AiError) return { ok: false, code: error.code, message: error.message }
    return { ok: false, code: 'internal', message: error instanceof Error ? error.message : String(error) }
  }
}

export async function probeImage(services: AiServices, registry: AiProviders): Promise<ProbeResult> {
  const id = services.selected('image')
  const factory = id === '' ? undefined : registry.get(id)?.capabilities.image
  if (factory === undefined) return { ok: false, code: 'not-configured', message: 'no image generation provider is selected, or the selected one is not loaded' }
  const started = performance.now()
  try {
    const service = factory()
    const answer = await service.generate('A small red circle centered on a plain white background.')
    if (answer.images[0]?.data.size === 0) return { ok: false, code: 'unavailable', message: `${service.provider} returned no image data` }
    return { ok: true, provider: service.provider, model: answer.model, milliseconds: Math.round(performance.now() - started) }
  } catch (error) {
    if (error instanceof AiError) return { ok: false, code: error.code, message: error.message }
    return { ok: false, code: 'internal', message: error instanceof Error ? error.message : String(error) }
  }
}

/** Ask the selected provider two questions it can only answer one way, and report it as the user would meet it: a customer who was charged twice is angry and writes about billing. */
export async function probeDecision(services: AiServices, registry: AiProviders): Promise<ProbeResult> {
  const id = services.selected('decision')
  const factory = id === '' ? undefined : registry.get(id)?.capabilities.decision
  if (factory === undefined) return { ok: false, code: 'not-configured', message: 'no decision provider is selected, or the selected one is not loaded' }
  const started = performance.now()
  try {
    const service = factory()
    const answer = await service.decide('Customer: I was charged twice for the same order and nobody answers my emails. This is unacceptable.', {
      angry: { type: 'noul', instructions: 'The customer is angry.' },
      topic: { type: 'choice', instructions: 'What is the message about?', criteria: { billing: 'Being charged, refunds and payments.', shipping: 'Delivery of a parcel and where it is.', account: 'Signing in, passwords and profile settings.' } },
    } as const)
    if (answer.answers.topic.choice !== 'billing' || answer.answers.angry.probability < 0.5) return { ok: false, code: 'unavailable', message: `${service.provider} decided oddly: the customer charged twice and ignored was not found angry and writing about billing` }
    return { ok: true, provider: service.provider, model: answer.model, milliseconds: Math.round(performance.now() - started) }
  } catch (error) {
    if (error instanceof AiError) return { ok: false, code: error.code, message: error.message }
    return { ok: false, code: 'internal', message: error instanceof Error ? error.message : String(error) }
  }
}

/** The methods each route owns, as DSH's shared channel registers exact routes. `PUT` is not a carrier method, so a write is a `POST`. */
const API_ROUTE_METHODS: readonly (readonly [string, readonly ('GET' | 'HEAD' | 'POST')[]])[] = [
  [AI_API_ROUTES.capabilities, ['GET']],
  [AI_API_ROUTES.credentials, ['GET', 'POST']],
  [AI_API_ROUTES.llm, ['GET']],
  [AI_API_ROUTES.llmProbe, ['POST']],
  [AI_API_ROUTES.llmDiscover, ['GET']],
  [AI_API_ROUTES.concurrency, ['GET']],
  [AI_API_ROUTES.probe, ['POST']],
]

/**
 * Present one Fetch request to the node-style handler above, then finish what it wrote as a Response.
 * @param handle - the routed handler.
 * @returns the Fetch route DSH's Connection channel registers below `/api`.
 */
export function toFetchHandler(handle: (req: ApiRequest, res: ApiReply) => Promise<void>): (request: Request) => Promise<Response> {
  return async (request) => {
    const url = new URL(request.url)
    const written: Record<string, string> = {}
    let status = 200
    let body: string | undefined
    let written$: boolean = false
    const reply: ApiReply = {
      statusCode: 200,
      get headersSent() { return written$ },
      setHeader(name, value) { written[name.toLowerCase()] = value },
      end(value) { status = reply.statusCode; body = value; written$ = true },
      destroy() { written$ = true },
    }
    const stream = request.body
    const req: ApiRequest = {
      method: request.method,
      // The carrier strips `/api` itself, so the handler sees the path it would own on its own carrier.
      url: `${url.pathname.replace(new RegExp(`^${AI_API_CHANNEL}`), '')}${url.search}`,
      headers: Object.fromEntries(request.headers.entries()),
      async *[Symbol.asyncIterator]() {
        if (stream === null) return
        for await (const chunk of stream) yield chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk as ArrayBuffer)
      },
    }
    await handle(req, reply)
    if (body === undefined) return new Response(null, { status })
    return new Response(body, {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...written },
    })
  }
}

/**
 * Register the API on DSH's shared `/api` channel. Connection owns the Host/Origin fence, the browser credential and
 * the request body limit, and removes these routes with this plugin.
 */
export function registerApi(ctx: Context, deps: Omit<ApiDeps, 'credentials' | 'models'>): void {
  const handle = createApiHandler({ ...deps, credentials: () => ctx.get('credentials'), models: () => ctx.get('llm') })
  const fetch = toFetchHandler(handle)
  ctx.inject(['connection'], (webCtx) => {
    for (const [path, methods] of API_ROUTE_METHODS) {
      webCtx.effect(() => {
        const remove = webCtx.connection.fetch.register({ path: `/${AI_API_PATH}${path}`, methods: [...methods], requestBody: 'buffered', fetch })
        return () => { void remove() }
      }, `dsh-ai-providers: api ${path}`)
    }
  })
}
