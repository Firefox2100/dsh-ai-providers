import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { credentialRef, type CredentialRef } from '@deepseek-ai/dsh-credentials'
// Type-only: declares `ctx.webServer` and `ctx.credentials`.
import type {} from '@deepseek-ai/dsh-host-webserver'
import { AI_API_PREFIX, AI_API_ROUTES, AiError, CAPABILITIES, type CapabilitiesPayload, type CredentialsPayload, type ProbeResult } from 'dsh-ai-core'
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
    [AI_API_ROUTES.probe]: {
      POST: async (_req, res, url) => {
        if (url.searchParams.get('capability') !== 'embedding') throw new HttpError(400, 'only "embedding" can be tested so far')
        const result = await probeEmbedding(services, registry)
        send(res, 200, result)
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

/** Mount the API once the web server and its authentication are available; profiles without them skip it. */
export function registerApi(ctx: Context, deps: Omit<ApiDeps, 'connection' | 'credentials'>): void {
  ctx.inject(['webServer', 'connection'], (webCtx) => {
    // The connection package is browser-side, so its service is typed locally.
    const connection = Reflect.get(webCtx, 'connection') as ApiConnection
    const handler = createApiHandler({ ...deps, connection, credentials: () => ctx.get('credentials') })
    webCtx.effect(() => webCtx.webServer.register({ kind: 'prefix', path: `/${AI_API_PREFIX}`, handler }), 'dsh-ai-providers: http api')
  })
}
