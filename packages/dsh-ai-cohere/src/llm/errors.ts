import { LlmRequestError, describeLlmErrorBody, requestIdOf, retryAfterMsOf, type LlmFailureCode, type LlmFailureFacts } from '@dsh-ai-providers/core'

const CONTEXT = /too many tokens|context (length|window)|exceeds? (the )?(maximum|limit)|prompt is too long|input is too long/i
const QUOTA = /credit|billing|payment|usage limit|quota/i

function classify(status: number | undefined, message: string): LlmFailureCode {
  if (CONTEXT.test(message)) return 'CONTEXT_WINDOW_EXCEEDED'
  if (status === 402 || QUOTA.test(message)) return 'QUOTA'
  if (status === 401 || status === 403) return 'AUTH'
  if (status === 429) return 'RATE_LIMIT'
  if (status === 408 || status === 504) return 'TIMEOUT'
  if (status === undefined) return 'SERVER'
  return status >= 500 ? 'SERVER' : 'INVALID_REQUEST'
}

export function httpError(response: Response, raw: unknown): LlmRequestError {
  const { message } = describeLlmErrorBody(raw)
  const retryAfterMs = retryAfterMsOf(response.headers)
  const requestId = requestIdOf(response.headers, raw)
  const facts: LlmFailureFacts = { status: response.status, ...retryAfterMs === undefined ? {} : { retryAfterMs }, ...requestId === undefined ? {} : { requestId } }
  return new LlmRequestError(classify(response.status, message), `the endpoint answered ${response.status}${message === '' ? '' : `: ${message}`}`, facts)
}

/** An error the server reports inside a stream that already answered 200, or as the reason a message ended. */
export function streamError(message: string, timedOut = false): LlmRequestError {
  return new LlmRequestError(timedOut ? 'TIMEOUT' : classify(undefined, message), `the endpoint reported an error: ${message || 'no message'}`)
}
