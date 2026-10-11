import {LlmRequestError, type LlmFailureCode} from 'dsh-ai-core'

const CONTEXT = /context|too many tokens|prompt is too long|input is too long/i
const QUOTA = /credit|billing|quota|balance/i
function detail(raw: unknown): {message: string; type: string} {
  const value = typeof raw === 'object' && raw !== null ? (raw as {error?: unknown}).error ?? raw : raw
  if (typeof value !== 'object' || value === null) return {message: typeof value === 'string' ? value : '', type: ''}
  const row = value as Record<string, unknown>
  return {message: typeof row['message'] === 'string' ? row['message'] : '', type: typeof row['type'] === 'string' ? row['type'] : ''}
}
function retryAfter(headers: Pick<Headers, 'get'>): number | undefined {
  const milliseconds = Number(headers.get('retry-after-ms'))
  if (Number.isFinite(milliseconds) && milliseconds > 0) return milliseconds
  const seconds = Number(headers.get('retry-after'))
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined
}
export function httpError(response: Response, raw: unknown): LlmRequestError {
  const {message, type} = detail(raw)
  const description = `${type} ${message}`
  let failure: LlmFailureCode
  if (CONTEXT.test(description)) failure = 'CONTEXT_WINDOW_EXCEEDED'
  else if (QUOTA.test(description)) failure = 'QUOTA'
  else if (response.status === 401 || response.status === 403 || type === 'authentication_error' || type === 'permission_error') failure = 'AUTH'
  else if (response.status === 429 || type === 'rate_limit_error') failure = 'RATE_LIMIT'
  else if (response.status === 408 || response.status === 504) failure = 'TIMEOUT'
  else if (response.status >= 500 || type === 'api_error' || type === 'overloaded_error') failure = 'SERVER'
  else failure = 'INVALID_REQUEST'
  const wait = retryAfter(response.headers)
  return new LlmRequestError(failure, `the endpoint answered ${response.status}${message === '' ? '' : `: ${message}`}`, {status: response.status, ...(wait === undefined ? {} : {retryAfterMs: wait}), ...(response.headers.get('request-id') === null ? {} : {requestId: response.headers.get('request-id')!})})
}
export function streamError(raw: unknown): LlmRequestError {
  const {message, type} = detail(raw)
  const failure: LlmFailureCode = type === 'rate_limit_error' ? 'RATE_LIMIT' : type === 'overloaded_error' || type === 'api_error' ? 'SERVER' : 'INVALID_REQUEST'
  return new LlmRequestError(failure, `the endpoint reported an error: ${message || type || 'no message'}`)
}
