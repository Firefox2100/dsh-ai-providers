import { describeLlmErrorBody, requestJson, type JsonRequest } from '@dsh-ai-providers/core'

/** The provider's own message for a body, so a refusal keeps its wording. */
const messageOf = (body: unknown): string => describeLlmErrorBody(body).message

/**
 * One non-streaming call to the server, answered with its JSON. A refusal or an unreachable server is an `AiError`.
 * @param signal - the caller's cancellation, on top of the timeout.
 */
export function callJson<T>(send: typeof fetch, url: string, init: JsonRequest, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  return requestJson(send, url, init, timeoutMs, messageOf, signal)
}
