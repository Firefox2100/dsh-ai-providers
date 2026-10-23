import { AiError, httpFailure, requestJson, type JsonRequest } from '@dsh-ai-providers/core'
import { messageOf } from './llm/errors.ts'

/**
 * One non-streaming call to the server, answered with its JSON. A refusal or an unreachable server is an `AiError`.
 * @param signal - the caller's cancellation, on top of the timeout.
 */
export function callJson<T>(send: typeof fetch, url: string, init: JsonRequest, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  return requestJson(send, url, init, timeoutMs, messageOf, signal)
}

/** One POST of a JSON body, with the same error mapping. */
export function postJson<T>(send: typeof fetch, url: string, headers: Record<string, string>, body: unknown, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  return requestJson(send, url, { method: 'POST', headers, body }, timeoutMs, messageOf, signal)
}

/** The multimodal generation endpoint, which serves vision chat, Qwen-TTS, Qwen-ASR and Qwen-Image. */
export const multimodalUrl = (baseUrl: string): string => `${baseUrl}/services/aigc/multimodal-generation/generation`

/**
 * Fetches a file DashScope made for the caller (generated speech and images are served from a temporary address). The request carries
 * no credentials: the address is a signed storage URL, not the API.
 */
export async function download(send: typeof fetch, url: string, timeoutMs: number, signal?: AbortSignal): Promise<Response> {
  const timeout = AbortSignal.timeout(Math.max(1, timeoutMs))
  let response: Response
  try {
    response = await send(url, { redirect: 'follow', signal: signal === undefined ? timeout : AbortSignal.any([signal, timeout]) })
  } catch (error) {
    if (signal?.aborted === true) throw new AiError('cancelled', 'cancelled', { cause: error })
    if (timeout.aborted) throw new AiError('unavailable', `${url} did not answer within ${timeoutMs} ms`, { cause: error })
    throw new AiError('unavailable', `${url} could not be reached: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }
  if (!response.ok) throw httpFailure(response)
  return response
}
