import { LlmRequestError, type LlmFailureCode } from '@dsh-ai-providers/core'

const CONTEXT = /context (length|window)|too long|exceeds the (available )?context/i
const QUOTA = /usage limit|quota|subscription|upgrade/i
const IMAGE = /image|vision|multimodal/i

/** The message of Ollama's `{ "error": "..." }`, whatever else the body is. */
export function messageOf(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (typeof raw !== 'object' || raw === null) return ''
  const error = (raw as { error?: unknown }).error
  if (typeof error === 'string') return error
  const nested = typeof error === 'object' && error !== null ? (error as { message?: unknown }).message : undefined
  return typeof nested === 'string' ? nested : ''
}

function retryAfter(headers: Pick<Headers, 'get'>): number | undefined {
  const seconds = Number(headers.get('retry-after'))
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined
}

function classify(status: number | undefined, message: string): LlmFailureCode {
  if (CONTEXT.test(message)) return 'CONTEXT_WINDOW_EXCEEDED'
  if (QUOTA.test(message)) return 'QUOTA'
  if (status === 401 || status === 403) return 'AUTH'
  if (status === 429) return 'RATE_LIMIT'
  if (status === 408 || status === 504) return 'TIMEOUT'
  if (IMAGE.test(message) && /support|invalid|unable|cannot|failed/i.test(message)) return 'UNSUPPORTED_CONTENT'
  if (status === undefined) return 'SERVER'
  return status >= 500 ? 'SERVER' : 'INVALID_REQUEST'
}

export function httpError(response: Response, raw: unknown): LlmRequestError {
  const message = messageOf(raw)
  const wait = retryAfter(response.headers)
  return new LlmRequestError(classify(response.status, message), `the endpoint answered ${response.status}${message === '' ? '' : `: ${message}`}`, { status: response.status, ...wait === undefined ? {} : { retryAfterMs: wait } })
}

/** An error the server reports inside a stream that already answered 200. */
export function streamError(raw: unknown): LlmRequestError {
  const message = messageOf(raw)
  return new LlmRequestError(classify(undefined, message), `the endpoint reported an error: ${message || 'no message'}`)
}
