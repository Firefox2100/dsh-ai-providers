import { LlmRequestError, type LlmFailureCode } from 'dsh-ai-core'

const CONTEXT = /context[_ ]?(?:length|window)|maximum context|too many tokens|exceeds? (?:the )?(?:model'?s? )?(?:maximum|max|context)|prompt is too long|input is too long|reduce the length/i
const QUOTA = /insufficient[_ ]quota|exceeded your current quota|out of credit|billing|balance/i

/** The seconds or date in a `Retry-After` header, as milliseconds. */
export function retryAfterMs(header: string | null): number | undefined {
  if (header === null) return undefined
  const seconds = Number(header)
  if (Number.isFinite(seconds) && seconds > 0) return Math.round(seconds * 1000)
  const at = Date.parse(header)
  const wait = at - Date.now()
  return Number.isFinite(wait) && wait > 0 ? wait : undefined
}

/** What an error the API reported says: its message, and its type and code when it gives them. */
export function describeApiError(raw: unknown): { message: string; detail: string } {
  const error = typeof raw === 'object' && raw !== null ? (raw as { error?: unknown }).error ?? raw : raw
  if (typeof error === 'string') return { message: error, detail: error }
  if (typeof error === 'object' && error !== null) {
    const fields = error as Record<string, unknown>
    const message = typeof fields['message'] === 'string' ? fields['message'] : ''
    const detail = [fields['type'], fields['code'], message].filter((part): part is string => typeof part === 'string').join(' ')
    return { message: message || detail, detail }
  }
  return { message: '', detail: '' }
}

/** How to treat an HTTP failure: whether asking again can help, and what a caller that compacts or retries should know. */
export function httpError(status: number, statusText: string, body: unknown, headers: Pick<Headers, 'get'>): LlmRequestError {
  const { message, detail } = describeApiError(body)
  const what = `${status} ${statusText}`.trim()
  const said = message === '' ? '' : `: ${message}`
  const facts = { status, ...retryAfterMs(headers.get('retry-after')) === undefined ? {} : { retryAfterMs: retryAfterMs(headers.get('retry-after'))! } }
  let code: LlmFailureCode
  if (CONTEXT.test(detail)) code = 'CONTEXT_WINDOW_EXCEEDED'
  else if (QUOTA.test(detail)) code = 'QUOTA'
  else if (status === 401 || status === 403) code = 'AUTH'
  else if (status === 429) code = 'RATE_LIMIT'
  else if (status === 408 || status === 504) code = 'TIMEOUT'
  else if (status >= 500) code = 'SERVER'
  else code = 'INVALID_REQUEST'
  return new LlmRequestError(code, `the endpoint answered ${what}${said}`, facts)
}

/** An error the API sent inside a stream that had already started. */
export function streamError(raw: unknown): LlmRequestError {
  const { message, detail } = describeApiError(raw)
  const code: LlmFailureCode = CONTEXT.test(detail) ? 'CONTEXT_WINDOW_EXCEEDED' : QUOTA.test(detail) ? 'QUOTA' : /rate.?limit/i.test(detail) ? 'RATE_LIMIT' : 'SERVER'
  return new LlmRequestError(code, `the endpoint reported an error: ${message || 'no message'}`)
}
