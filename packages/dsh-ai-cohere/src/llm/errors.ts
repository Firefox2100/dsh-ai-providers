import { LlmRequestError, type LlmFailureCode } from '@dsh-ai-providers/core'

const CONTEXT = /too many tokens|context (length|window)|exceeds? (the )?(maximum|limit)|prompt is too long|input is too long/i
const QUOTA = /credit|billing|payment|usage limit|quota/i

/** The message of Cohere's `{ "message": "..." }`, whatever else the body is. */
export function messageOf(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (typeof raw !== 'object' || raw === null) return ''
  const row = raw as { message?: unknown; error?: unknown; detail?: unknown }
  const nested = typeof row.error === 'object' && row.error !== null ? (row.error as { message?: unknown }).message : row.error
  return [row.message, nested, row.detail].find((candidate): candidate is string => typeof candidate === 'string') ?? ''
}

function retryAfter(headers: Pick<Headers, 'get'>): number | undefined {
  const seconds = Number(headers.get('retry-after'))
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined
}

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
  const message = messageOf(raw)
  const wait = retryAfter(response.headers)
  const id = response.headers.get('x-request-id') ?? response.headers.get('request-id')
  return new LlmRequestError(classify(response.status, message), `the endpoint answered ${response.status}${message === '' ? '' : `: ${message}`}`, { status: response.status, ...wait === undefined ? {} : { retryAfterMs: wait }, ...id === null ? {} : { requestId: id } })
}

/** An error the server reports inside a stream that already answered 200, or as the reason a message ended. */
export function streamError(message: string, timedOut = false): LlmRequestError {
  return new LlmRequestError(timedOut ? 'TIMEOUT' : classify(undefined, message), `the endpoint reported an error: ${message || 'no message'}`)
}
