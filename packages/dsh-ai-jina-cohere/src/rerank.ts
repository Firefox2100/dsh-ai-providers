import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, RerankService, httpFailure, readJson, type RerankOptions, type RerankResult } from 'dsh-ai-core'
import type { Config } from './config.ts'
import { PROVIDER_ID } from './ids.ts'
import { connectionHeaders, type JinaCohereConnection } from './connection.ts'

export interface JinaCohereDeps {
  config: Config
  /** The credentials service, looked up on each call: the key is never held. */
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  connection: () => JinaCohereConnection
  /** Replaceable for tests. */
  fetch?: typeof fetch
}

interface RerankResponse {
  model?: unknown
  results?: { index?: unknown; relevance_score?: unknown; score?: unknown }[]
  usage?: { total_tokens?: unknown }
  meta?: { billed_units?: { search_units?: unknown }; tokens?: { input_tokens?: unknown } }
  error?: { message?: unknown }
  message?: unknown
  detail?: unknown
}

/** A raw score squeezed into 0..1 the way a classifier does, for servers that answer with logits. */
const logistic = (score: number): number => 1 / (1 + Math.exp(-score))

/**
 * Reranking from `POST {baseUrl}/rerank`, the API Jina and Cohere share (and LocalAI, vLLM and others
 * copy): a model, a query and documents go in, and `results` with each document's `index` and
 * `relevance_score` come out. Everything it needs is read from the configuration and the credentials on
 * each call. The contract promises scores from 0 to 1, so when a server answers with raw scores outside
 * that range (a cross-encoder's logits) all of them are mapped through a logistic function, which keeps
 * their order.
 */
export class JinaCohereRerankService extends RerankService {
  readonly provider = PROVIDER_ID
  private readonly send: typeof fetch

  constructor(private readonly deps: JinaCohereDeps) {
    super()
    this.send = deps.fetch ?? fetch
  }

  get model(): string {
    return this.deps.config.rerankModel.get()
  }

  async rerank(query: string, documents: readonly string[], options: RerankOptions = {}): Promise<RerankResult> {
    const { config, credentials } = this.deps
    if (query.trim() === '') throw new AiError('invalid-input', 'the query is empty')
    documents.forEach((document, index) => {
      if (document.trim() === '') throw new AiError('invalid-input', `document ${index + 1} is empty: the API refuses an empty document`)
    })
    const cancelled = (): boolean => options.signal?.aborted === true
    if (cancelled()) throw new AiError('cancelled', 'cancelled')
    const model = config.rerankModel.get()
    if (model === '') throw new AiError('not-configured', 'no rerank model is configured')
    const connection = this.deps.connection()
    const root = connection.baseUrl
    if (documents.length === 0) return { results: [], model }

    const headers: Record<string, string> = { 'content-type': 'application/json', ...await connectionHeaders(connection, credentials) }
    const timeout = AbortSignal.timeout(Math.max(1, config.timeoutMs.get()))
    const signal = options.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout])

    let response: Response
    try {
      response = await this.send(`${root}/rerank`, {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify({ model, query, documents, ...(options.topN === undefined ? {} : { top_n: options.topN }), return_documents: false }),
      })
    } catch (error) {
      if (cancelled()) throw new AiError('cancelled', 'cancelled', { cause: error })
      if (timeout.aborted) throw new AiError('unavailable', `${root} did not answer within ${config.timeoutMs.get()} ms`, { cause: error })
      throw new AiError('unavailable', `${root} could not be reached: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    }

    const body = await readJson<RerankResponse>(response)
    if (!response.ok) {
      const said = [body?.error?.message, body?.message, body?.detail].find((candidate): candidate is string => typeof candidate === 'string')
      throw httpFailure(response, said)
    }
    const rows = body?.results
    if (!Array.isArray(rows)) throw new AiError('unavailable', `${root} answered without results`)
    const scored = rows.map((row) => {
      const score = row.relevance_score ?? row.score
      if (!Number.isInteger(row.index) || typeof score !== 'number' || !Number.isFinite(score)) throw new AiError('unavailable', `${root} answered with a result that has no index and score`)
      return { index: row.index as number, score }
    })
    const normalised = scored.some(entry => entry.score < 0 || entry.score > 1) ? scored.map(entry => ({ ...entry, score: logistic(entry.score) })) : scored
    const tokens = body?.usage?.total_tokens ?? body?.meta?.tokens?.input_tokens
    return {
      results: normalised.sort((a, b) => b.score - a.score),
      model: typeof body?.model === 'string' ? body.model : model,
      ...(typeof tokens === 'number' ? { tokens } : {}),
    }
  }
}
