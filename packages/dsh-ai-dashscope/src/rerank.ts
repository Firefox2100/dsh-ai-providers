import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, RerankService, type RequestOption, type RerankOptions, type RerankResult } from '@dsh-ai-providers/core'
import { postJson } from './api.ts'
import { connectionHeaders, type DashScopeConnection } from './connection.ts'

/** DashScope's own controls of one rerank request. */
export interface DashScopeRerankOptions extends RerankOptions {
  /** What the reranker is told about the task (`instruct`); the configuration's value is used when left out. */
  instruct?: string
}

export const RERANK_REQUEST_OPTIONS: readonly RequestOption[] = [
  {
    key: 'instruct',
    type: 'string',
    label: { en: 'Instruction', zh: '任务指令' },
    description: { en: 'Tells a Qwen reranker what a good match is for this task, replacing its default of question-answer retrieval. Leave empty to use the provider\'s setting.', zh: '告诉 Qwen 重排模型这次任务中怎样算好的匹配，取代默认的问答检索。留空则使用提供方的设置。' },
  },
]

export interface DashScopeRerankSettings {
  rerankModel: { get(): string }
  rerankInstruct: { get(): string }
  timeoutMs: { get(): number }
}

export interface DashScopeRerankDeps {
  config: DashScopeRerankSettings
  provider: string
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  connection: () => DashScopeConnection
  /** Replaceable for tests. */
  fetch?: typeof fetch
}

interface Answer {
  output?: { results?: { index?: unknown; relevance_score?: unknown }[] }
  usage?: { total_tokens?: unknown }
}

/** The native fields of a rerank request: the call's instruction, else the configured one, and the number of results asked for. */
export function rerankParameters(defaultInstruct: string, { topN, instruct = defaultInstruct }: DashScopeRerankOptions): Record<string, unknown> {
  return {
    return_documents: false,
    ...topN === undefined ? {} : { top_n: topN },
    ...instruct === '' ? {} : { instruct },
  }
}

/**
 * Reranking from `POST {baseUrl}/services/rerank/text-rerank/text-rerank`: the query and documents go in `input`, the controls in
 * `parameters`, and the scored `output.results` come back already between 0 and 1. Documents are text; the multimodal reranker's
 * images and videos have no place in the rerank contract.
 */
export class DashScopeRerankService extends RerankService<DashScopeRerankOptions> {
  private readonly send: typeof fetch

  constructor(private readonly deps: DashScopeRerankDeps) {
    super()
    this.send = deps.fetch ?? fetch
  }

  get provider(): string { return this.deps.provider }

  get model(): string { return this.deps.config.rerankModel.get() }

  async rerank(query: string, documents: readonly string[], options: DashScopeRerankOptions = {}): Promise<RerankResult> {
    const { config, credentials } = this.deps
    if (query.trim() === '') throw new AiError('invalid-input', 'the query is empty')
    documents.forEach((document, index) => {
      if (document.trim() === '') throw new AiError('invalid-input', `document ${index + 1} is empty: the API refuses an empty document`)
    })
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    const model = config.rerankModel.get()
    if (model === '') throw new AiError('not-configured', 'no rerank model is configured')
    const connection = this.deps.connection()
    if (documents.length === 0) return { results: [], model }

    const headers = await connectionHeaders(connection, credentials)
    const url = `${connection.baseUrl}/services/rerank/text-rerank/text-rerank`
    const body = await postJson<Answer>(this.send, url, headers, { model, input: { query, documents }, parameters: rerankParameters(config.rerankInstruct.get(), options) }, config.timeoutMs.get(), options.signal)
    const rows = body.output?.results
    if (!Array.isArray(rows)) throw new AiError('unavailable', `${connection.baseUrl} answered without results`)
    const results = rows.map((row) => {
      const score = row.relevance_score
      if (!Number.isInteger(row.index) || typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1) throw new AiError('unavailable', `${connection.baseUrl} answered with a result that has no index and a score from 0 to 1`)
      return { index: row.index as number, score }
    }).sort((a, b) => b.score - a.score)
    const tokens = body.usage?.total_tokens
    return { results, model, ...typeof tokens === 'number' ? { tokens } : {} }
  }
}
