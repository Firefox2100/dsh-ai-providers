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
