import { LlmRequestError, describeLlmErrorBody, requestIdOf, retryAfterMsOf, type LlmFailureCode, type LlmFailureFacts } from '@dsh-ai-providers/core'

const CONTEXT = /context[_ ]?(?:length|window)|maximum context|too many tokens|exceeds? (?:the )?(?:model'?s? )?(?:maximum|max|context)|prompt is too long|input is too long|reduce the length/i
const QUOTA = /insufficient[_ ]quota|exceeded your current quota|out of credit|billing|balance/i

/** How to treat an HTTP failure: whether asking again can help, and what a caller that compacts or retries should know. */
export function httpError(status: number, statusText: string, body: unknown, headers: Pick<Headers, 'get'>): LlmRequestError {
  const described = describeLlmErrorBody(body)
  // A body that names only a type and code still describes itself through the joined detail.
  const message = described.message === '' ? described.detail : described.message
  const what = `${status} ${statusText}`.trim()
  const said = message === '' ? '' : `: ${message}`
  let code: LlmFailureCode
  if (CONTEXT.test(described.detail)) code = 'CONTEXT_WINDOW_EXCEEDED'
  else if (QUOTA.test(described.detail)) code = 'QUOTA'
  else if (status === 401 || status === 403) code = 'AUTH'
  else if (status === 429) code = 'RATE_LIMIT'
  else if (status === 408 || status === 504) code = 'TIMEOUT'
  else if (status >= 500) code = 'SERVER'
  else code = 'INVALID_REQUEST'
  const retryAfterMs = retryAfterMsOf(headers)
  const requestId = requestIdOf(headers, body)
  const facts: LlmFailureFacts = { status, ...retryAfterMs === undefined ? {} : { retryAfterMs }, ...requestId === undefined ? {} : { requestId } }
  return new LlmRequestError(code, `the endpoint answered ${what}${said}`, facts)
}

/** An error the API sent inside a stream that had already started. */
export function streamError(raw: unknown): LlmRequestError {
  const { message, detail } = describeLlmErrorBody(raw)
  const code: LlmFailureCode = CONTEXT.test(detail) ? 'CONTEXT_WINDOW_EXCEEDED' : QUOTA.test(detail) ? 'QUOTA' : /rate.?limit/i.test(detail) ? 'RATE_LIMIT' : 'SERVER'
  return new LlmRequestError(code, `the endpoint reported an error: ${message || 'no message'}`)
}
