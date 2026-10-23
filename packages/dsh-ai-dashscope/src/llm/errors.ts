import { LlmRequestError, type LlmFailureCode } from '@dsh-ai-providers/core'

const CONTEXT = /range of input length|input length|too long|context (length|window)|exceeds? (the )?(maximum|limit)/i
const QUOTA = /arrearage|overdue|insufficient|quota|balance|free tier/i

/** The message of DashScope's `{ "code": "...", "message": "..." }`, whatever else the body is. */
export function messageOf(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (typeof raw !== 'object' || raw === null) return ''
  const row = raw as { message?: unknown; error?: unknown; detail?: unknown }
  const nested = typeof row.error === 'object' && row.error !== null ? (row.error as { message?: unknown }).message : row.error
  return [row.message, nested, row.detail].find((candidate): candidate is string => typeof candidate === 'string') ?? ''
}

/** DashScope's own error code, such as `Throttling.RateQuota` or `InvalidApiKey`. */
function codeOf(raw: unknown): string {
  if (typeof raw !== 'object' || raw === null) return ''
  const code = (raw as { code?: unknown }).code
  return typeof code === 'string' ? code : ''
}

function retryAfter(headers: Pick<Headers, 'get'>): number | undefined {
  const seconds = Number(headers.get('retry-after'))
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined
}

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
  const message = messageOf(raw)
  const code = codeOf(raw)
  const wait = retryAfter(response.headers)
  const id = response.headers.get('x-request-id') ?? (typeof raw === 'object' && raw !== null && typeof (raw as { request_id?: unknown }).request_id === 'string' ? (raw as { request_id: string }).request_id : null)
  const said = [code, message].filter(part => part !== '').join(': ')
  return new LlmRequestError(classify(response.status, code, message), `the endpoint answered ${response.status}${said === '' ? '' : `: ${said}`}`, { status: response.status, ...wait === undefined ? {} : { retryAfterMs: wait }, ...id === null ? {} : { requestId: id } })
}

/** An error the server reports inside a stream that already answered 200. */
export function streamError(code: string, message: string): LlmRequestError {
  return new LlmRequestError(classify(undefined, code, message), `the endpoint reported an error: ${[code, message].filter(part => part !== '').join(': ') || 'no message'}`)
}
