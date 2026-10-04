import { AiError } from './errors.ts'

/** The body of a response as JSON, or nothing when it is not. */
export async function readJson<T = Record<string, unknown>>(response: Response): Promise<T | undefined> {
  try { return await response.json() as T } catch { return undefined }
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
