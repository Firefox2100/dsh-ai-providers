import { AiError } from './errors.ts'

/** The body of a response as JSON, or nothing when it is not. */
export async function readJson<T = Record<string, unknown>>(response: Response): Promise<T | undefined> {
  try { return await response.json() as T } catch { return undefined }
}

export interface JsonRequest {
  method?: 'GET' | 'POST'
  headers: Record<string, string>
  body?: unknown
}

/** Makes one bounded JSON request while preserving the provider's own error wording. */
export async function requestJson<T>(send: typeof fetch, url: string, init: JsonRequest, timeoutMs: number, messageOf: (body: unknown) => string, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(Math.max(1, timeoutMs))
  let response: Response
  try {
    response = await send(url, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      redirect: 'error',
      signal: signal === undefined ? timeout : AbortSignal.any([signal, timeout]),
      headers: init.body === undefined ? init.headers : { 'content-type': 'application/json', ...init.headers },
      ...init.body === undefined ? {} : { body: JSON.stringify(init.body) },
    })
  } catch (error) {
    if (signal?.aborted === true) throw new AiError('cancelled', 'cancelled', { cause: error })
    if (timeout.aborted) throw new AiError('unavailable', `${url} did not answer within ${timeoutMs} ms`, { cause: error })
    throw new AiError('unavailable', `${url} could not be reached: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }
  const body = await readJson<T>(response)
  if (!response.ok) {
    const said = messageOf(body)
    throw httpFailure(response, said === '' ? undefined : said)
  }
  if (body === undefined) throw new AiError('unavailable', `${url} answered with something that is not JSON`)
  return body
}

/**
 * What an HTTP failure means to a caller, whatever the server is: refused credentials or a refused
 * request will not get better by asking again, a limit or a failing server might.
 * @param said - what the server's own error message says, when it says.
 */
export function httpFailure(response: Pick<Response, 'status' | 'statusText'>, said?: string): AiError {
  const detail = said === undefined ? '' : `: ${said}`
  const what = `${response.status} ${response.statusText}`.trim()
  if (response.status === 401 || response.status === 403) return new AiError('rejected', `the API refused the credentials (${what})${detail}`)
  if (response.status === 429) return new AiError('unavailable', `the API is limiting requests (${what})${detail}`)
  if (response.status >= 500) return new AiError('unavailable', `the API failed (${what})${detail}`)
  return new AiError('rejected', `the API refused the request (${what})${detail}`)
}

/** A validated way to reach an API: its root with no trailing slashes, and the name of its credential, if any. */
export interface HttpConnection {
  baseUrl: string
  apiKeyRef: string
}

/**
 * Checks and normalizes a configured connection: trimmed, without trailing slashes, and HTTP or HTTPS only.
 * @param connection - the configured endpoint.
 * @returns its normalized root and credential name.
 * @throws {AiError} `not-configured` when there is no URL, it does not parse, or it is not HTTP(S).
 */
export function validateHttpConnection(connection: { name: string; baseUrl: string; apiKeyRef: string }): HttpConnection {
  const trimmed = connection.baseUrl.trim()
  let end = trimmed.length
  while (trimmed[end - 1] === '/') end -= 1
  const baseUrl = trimmed.slice(0, end)
  if (baseUrl === '') throw new AiError('not-configured', 'no base URL is configured')
  let url: URL
  try { url = new URL(baseUrl) } catch (error) { throw new AiError('not-configured', `the base URL for connection "${connection.name}" is invalid`, { cause: error }) }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new AiError('not-configured', `the base URL for connection "${connection.name}" must use HTTP or HTTPS`)
  return { baseUrl, apiKeyRef: connection.apiKeyRef.trim() }
}

/** How a provider authenticates a request: the header name and the value built from the stored credential. */
export interface CredentialHeader {
  /** Defaults to `authorization`. */
  name?: string
  /** Defaults to `Bearer <credential>`. */
  format?: (credential: string) => string
}

/**
 * The credential of a connection as request headers, read on use so an edited key applies to the next request.
 * @param connection - the validated connection.
 * @param resolve - reads the stored credential by name; `undefined` when the profile has no credential store.
 * @param header - the header to set and how to format its value.
 * @returns the header map, empty when the connection names no credential or nothing is stored for it.
 * @throws {AiError} `not-configured` when the credential name is not a valid reference.
 */
export async function credentialHeaders(
  connection: Pick<HttpConnection, 'apiKeyRef'>,
  resolve: (() => Promise<{ value: string } | undefined>) | undefined,
  header: CredentialHeader = {},
): Promise<Record<string, string>> {
  if (connection.apiKeyRef === '') return {}
  let found: { value: string } | undefined
  try { found = await resolve?.() } catch (error) { throw new AiError('not-configured', `the credential name "${connection.apiKeyRef}" is not valid`, { cause: error }) }
  if (found === undefined) return {}
  return { [header.name ?? 'authorization']: (header.format ?? (credential => `Bearer ${credential}`))(found.value) }
}
