import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, RerankService, httpFailure, readJson, type RerankOptions, type RerankResult } from '@dsh-ai-providers/core'
import { connectionHeaders, validateConnection } from '@dsh-ai-providers/openai-compatible'
import type { Config } from './config.ts'
import { PROVIDER_ID } from './ids.ts'

interface ResponseBody {
  model?: unknown
  results?: { index?: unknown; relevance_score?: unknown; score?: unknown }[]
  usage?: { total_tokens?: unknown }
  error?: { message?: unknown }
  message?: unknown
}

export class LocalAiRerankService extends RerankService {
  readonly provider = PROVIDER_ID
  private readonly send: typeof fetch

  constructor(private readonly deps: { config: Config; credentials: () => Pick<CredentialProvider, 'resolve'> | undefined; fetch?: typeof fetch }) {
    super()
    this.send = deps.fetch ?? fetch
  }

  get model(): string { return this.deps.config.rerankModel.get() }

  async rerank(query: string, documents: readonly string[], options: RerankOptions = {}): Promise<RerankResult> {
    if (query.trim() === '') throw new AiError('invalid-input', 'the query is empty')
    documents.forEach((document, index) => { if (document.trim() === '') throw new AiError('invalid-input', `document ${index + 1} is empty`) })
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    const model = this.model.trim()
    if (model === '') throw new AiError('not-configured', 'no LocalAI rerank model is configured')
    if (documents.length === 0) return { results: [], model }
    const id = this.deps.config.rerankConnection.get().trim()
    const selected = this.deps.config.connections.get().find(connection => connection.id === id)
    if (selected === undefined) throw new AiError('not-configured', `the selected LocalAI connection "${id}" does not exist`)
    const connection = validateConnection(selected)
    const timeout = AbortSignal.timeout(Math.max(1, this.deps.config.timeoutMs.get()))
    const signal = options.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout])
    let response: Response
    try {
      response = await this.send(`${connection.baseUrl}/rerank`, {
        method: 'POST', signal,
        headers: { 'content-type': 'application/json', ...await connectionHeaders(connection, this.deps.credentials) },
        body: JSON.stringify({ ...this.deps.config.rerankBody.get(), model, query, documents, return_documents: false, ...(options.topN === undefined ? {} : { top_n: options.topN }) }),
      })
    } catch (error) {
      if (options.signal?.aborted) throw new AiError('cancelled', 'cancelled', { cause: error })
      throw new AiError('unavailable', `${connection.baseUrl} could not be reached: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    }
    const body = await readJson<ResponseBody>(response)
    if (!response.ok) throw httpFailure(response, typeof body?.error?.message === 'string' ? body.error.message : typeof body?.message === 'string' ? body.message : undefined)
    if (!Array.isArray(body?.results)) throw new AiError('unavailable', `${connection.baseUrl} answered without reranking results`)
    const rows = body.results.map((row) => {
      const score = row.relevance_score ?? row.score
      if (!Number.isInteger(row.index) || typeof score !== 'number' || !Number.isFinite(score)) throw new AiError('unavailable', 'LocalAI returned an invalid reranking result')
      return { index: row.index as number, score: score < 0 || score > 1 ? 1 / (1 + Math.exp(-score)) : score }
    }).sort((a, b) => b.score - a.score)
    return { results: rows, model: typeof body.model === 'string' ? body.model : model, ...(typeof body.usage?.total_tokens === 'number' ? { tokens: body.usage.total_tokens } : {}) }
  }
}
