import { LlmRequestError, describeLlmErrorBody, requestIdOf, retryAfterMsOf, type LlmFailureCode, type LlmFailureFacts } from '@dsh-ai-providers/core'

const CONTEXT = /context|too many tokens|prompt is too long|input is too long/i
const QUOTA = /credit|billing|quota|balance/i

export function httpError(response: Response, raw: unknown): LlmRequestError {
  const { message, type } = describeLlmErrorBody(raw)
  const description = `${type} ${message}`
  let failure: LlmFailureCode
  if (CONTEXT.test(description)) failure = 'CONTEXT_WINDOW_EXCEEDED'
  else if (QUOTA.test(description)) failure = 'QUOTA'
  else if (response.status === 401 || response.status === 403 || type === 'authentication_error' || type === 'permission_error') failure = 'AUTH'
  else if (response.status === 429 || type === 'rate_limit_error') failure = 'RATE_LIMIT'
  else if (response.status === 408 || response.status === 504) failure = 'TIMEOUT'
  else if (response.status >= 500 || type === 'api_error' || type === 'overloaded_error') failure = 'SERVER'
  else failure = 'INVALID_REQUEST'
  const retryAfterMs = retryAfterMsOf(response.headers)
  const requestId = requestIdOf(response.headers, raw)
  const facts: LlmFailureFacts = { status: response.status, ...retryAfterMs === undefined ? {} : { retryAfterMs }, ...requestId === undefined ? {} : { requestId } }
  return new LlmRequestError(failure, `the endpoint answered ${response.status}${message === '' ? '' : `: ${message}`}`, facts)
}

export function streamError(raw: unknown): LlmRequestError {
  const { message, type } = describeLlmErrorBody(raw)
  const failure: LlmFailureCode = type === 'rate_limit_error' ? 'RATE_LIMIT' : type === 'overloaded_error' || type === 'api_error' ? 'SERVER' : 'INVALID_REQUEST'
  return new LlmRequestError(failure, `the endpoint reported an error: ${message || type || 'no message'}`)
}
