import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { credentialRef, type CredentialRef } from '@deepseek-ai/dsh-credentials'
// Type-only: declares `ctx.webServer` and `ctx.credentials`.
import type {} from '@deepseek-ai/dsh-host-webserver'
import { AI_API_PREFIX, AI_API_ROUTES, AiError, CAPABILITIES, type CapabilitiesPayload, type CredentialsPayload, type LlmDiscoverPayload, type LlmPayload, type LlmProbeResult, type ProbeResult } from 'dsh-ai-core'
import type { LlmRoutes } from './llm.ts'
import type { AiProviders } from './registry.ts'
import type { AiServices } from './services.ts'

/** The slice of DSH's connection service this API relies on for browser authentication. */
export interface ApiConnection {
  requestRejection(request: { readonly headers: IncomingMessage['headers'] }): 401 | 403 | undefined
}

const MAX_BODY_BYTES = 16 * 1024

class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

function send(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const type = String(req.headers['content-type'] ?? '').split(';', 1)[0]?.trim().toLowerCase()
  if (type !== 'application/json') throw new HttpError(415, 'content-type must be application/json')
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'request body is too large')
    chunks.push(chunk as Buffer)
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
  connection: ApiConnection
  /** The credentials service, looked up on use: a profile without it cannot store keys. */
  credentials: () => Context['credentials'] | undefined
}

/** The handler mounted at `/ai-api`. */
export function createApiHandler(deps: ApiDeps): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const { registry, services } = deps
  const needCredentials = (): Context['credentials'] => {
    const credentials = deps.credentials()
    if (credentials === undefined) throw new HttpError(503, 'this profile has no credentials service, so keys cannot be stored from here')
    return credentials
  }

  const routes: Record<string, Partial<Record<string, (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<void>>>> = {
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
      PUT: async (req, res) => {
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
        const payload: LlmDiscoverPayload = { models: found.map(model => ({ id: model.id, name: model.name, ...model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow }, ...model.maxTokens === undefined ? {} : { maxTokens: model.maxTokens } })) }
        send(res, 200, payload)
      },
    },
    [AI_API_ROUTES.probe]: {
      POST: async (_req, res, url) => {
        const capability = url.searchParams.get('capability')
        if (capability !== 'embedding' && capability !== 'rerank' && capability !== 'tts' && capability !== 'stt' && capability !== 'image') throw new HttpError(400, 'unknown capability')
        send(res, 200, capability === 'embedding' ? await probeEmbedding(services, registry) : capability === 'rerank' ? await probeRerank(services, registry) : capability === 'tts' ? await probeTts(services, registry) : capability === 'stt' ? await probeStt(services, registry) : await probeImage(services, registry))
      },
    },
  }

  return async (req, res) => {
    const rejection = deps.connection.requestRejection(req)
    if (rejection !== undefined) {
      res.statusCode = rejection
      res.end()
      return
    }
    const url = new URL(req.url ?? '/', 'http://localhost')
    const methods = routes[url.pathname.slice(`/${AI_API_PREFIX}`.length) || '/']
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

/** Ask a model a short question through DSH's own model service, as a chat would, and report what it answered and how fast. */
export async function probeLlm(llm: Context['llm'] | undefined, route: string, model: string): Promise<LlmProbeResult> {
  if (llm === undefined) return { ok: false, code: 'not-configured', message: 'this profile has no model service' }
  const started = performance.now()
  let text = ''
  let outputTokens: number | undefined
  try {
    for await (const chunk of llm.stream({ provider: route, model, messages: [{ role: 'user', content: [{ type: 'text', text: 'Reply with the single word: ready' }] }], maxTokens: 64, signal: AbortSignal.timeout(120_000) })) {
      if (chunk.type === 'text-delta') text += chunk.text
      else if (chunk.type === 'usage') outputTokens = chunk.usage.outputTokens
      else if (chunk.type === 'finish' && (chunk.reason.kind === 'error' || chunk.reason.kind === 'aborted')) return { ok: false, code: chunk.reason.failure.code, message: chunk.reason.failure.message }
    }
  } catch (error) {
    return { ok: false, code: error instanceof AiError ? error.code : 'internal', message: error instanceof Error ? error.message : String(error) }
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

/** Mount the API once the web server and its authentication are available; profiles without them skip it. */
export function registerApi(ctx: Context, deps: Omit<ApiDeps, 'connection' | 'credentials' | 'models'>): void {
  ctx.inject(['webServer', 'connection'], (webCtx) => {
    // The connection package is browser-side, so its service is typed locally.
    const connection = Reflect.get(webCtx, 'connection') as ApiConnection
    const handler = createApiHandler({ ...deps, connection, credentials: () => ctx.get('credentials'), models: () => ctx.get('llm') })
    webCtx.effect(() => webCtx.webServer.register({ kind: 'prefix', path: `/${AI_API_PREFIX}`, handler }), 'dsh-ai-providers: http api')
  })
}
