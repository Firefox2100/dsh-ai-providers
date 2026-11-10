import { LlmRequestError, describeLlmErrorBody, requestIdOf, retryAfterMsOf, type LlmFailureCode, type LlmFailureFacts } from '@dsh-ai-providers/core'

const CONTEXT = /range of input length|input length|too long|context (length|window)|exceeds? (the )?(maximum|limit)/i
const QUOTA = /arrearage|overdue|insufficient|quota|balance|free tier/i

function classify(status: number | undefined, code: string, message: string): LlmFailureCode {
  if (/^Throttling/i.test(code) || status === 429) return /AllocationQuota|FreeTierOnly/i.test(code) ? 'QUOTA' : 'RATE_LIMIT'
  if (/Arrearage/i.test(code) || status === 402) return 'QUOTA'
  if (/InvalidApiKey|AccessDenied|Unauthorized/i.test(code) || status === 401 || status === 403) return 'AUTH'
  if (CONTEXT.test(message)) return 'CONTEXT_WINDOW_EXCEEDED'
  if (QUOTA.test(message) && !/^Invalid/i.test(code)) return 'QUOTA'
  if (status === 408 || status === 504) return 'TIMEOUT'
  if (status === undefined) return /^(InternalError|ServiceUnavailable)/i.test(code) || code === '' ? 'SERVER' : 'INVALID_REQUEST'
  return status >= 500 ? 'SERVER' : 'INVALID_REQUEST'
}

export function httpError(response: Response, raw: unknown): LlmRequestError {
  const { message, code } = describeLlmErrorBody(raw)
  const retryAfterMs = retryAfterMsOf(response.headers)
  const requestId = requestIdOf(response.headers, raw)
  const said = [code, message].filter(part => part !== '').join(': ')
  const facts: LlmFailureFacts = { status: response.status, ...retryAfterMs === undefined ? {} : { retryAfterMs }, ...requestId === undefined ? {} : { requestId } }
  return new LlmRequestError(classify(response.status, code, message), `the endpoint answered ${response.status}${said === '' ? '' : `: ${said}`}`, facts)
}

/** An error the server reports inside a stream that already answered 200. */
export function streamError(code: string, message: string): LlmRequestError {
  return new LlmRequestError(classify(undefined, code, message), `the endpoint reported an error: ${[code, message].filter(part => part !== '').join(': ') || 'no message'}`)
}
