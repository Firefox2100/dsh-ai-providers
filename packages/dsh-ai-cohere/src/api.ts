import { AiError, httpFailure, readJson } from '@dsh-ai-providers/core'
import { messageOf } from './llm/errors.ts'

/**
 * One non-streaming call to the server, answered with its JSON. A refusal or an unreachable server is an `AiError`.
 * @param signal - the caller's cancellation, on top of the timeout.
 */
export async function callJson<T>(send: typeof fetch, url: string, init: { method?: 'GET' | 'POST'; headers: Record<string, string>; body?: unknown }, timeoutMs: number, signal?: AbortSignal): Promise<T> {
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
