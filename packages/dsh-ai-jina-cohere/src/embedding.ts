import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, EmbeddingService, httpFailure, readJson, type EmbedOptions, type EmbeddingInputType, type EmbeddingResult, type RequestOption } from '@dsh-ai-providers/core'
import { connectionHeaders, type ApiConnection } from './connection.ts'

/** What belongs to one embedding request to Jina or Cohere and not to every provider. */
export interface EmbeddingApiOptions extends EmbedOptions {
  /** Vectors of this many dimensions, for models that can shorten theirs; overrides the configured default. */
  dimensions?: number
  /** Whether a text longer than the model's input is cut to fit (`true`) or refused; overrides the configured default. */
  truncate?: boolean
  /**
   * The model's own task, sent as it is and winning over `inputType`: Jina's `task` (`retrieval.query`, `retrieval.passage`,
   * `text-matching`, `classification`, `separation`) or Cohere's `input_type` (`search_query`, `search_document`, `classification`, `clustering`).
   */
  task?: string
}

export const EMBEDDING_REQUEST_OPTIONS: readonly RequestOption[] = [
  {
    key: 'dimensions',
    type: 'integer',
    label: { en: 'Vector dimensions', zh: '向量维度' },
    description: { en: 'Shorter vectors, for models that can shorten theirs (Jina v3 and v4, Cohere embed-v4). Leave empty to use the provider\'s setting. Vectors of different sizes cannot be compared, so choose before the first request.', zh: '缩短向量长度，适用于支持缩短的模型（Jina v3 和 v4、Cohere embed-v4）。留空则使用提供方的设置。不同长度的向量无法比较，请在第一次请求前选定。' },
    min: 1,
    atStart: true,
  },
  {
    key: 'truncate',
    type: 'boolean',
    label: { en: 'Truncate long texts', zh: '截断过长文本' },
    description: { en: 'Cut a text longer than the model\'s input to fit, instead of refusing it.', zh: '文本超出模型输入长度时截断，而不是拒绝。' },
    default: true,
  },
  {
    key: 'task',
    type: 'string',
    label: { en: 'Task', zh: '任务' },
    description: { en: 'The model\'s own task, overriding the query/document choice: Jina text-matching, classification or separation; Cohere classification or clustering.', zh: '模型自身的任务，优先于查询/文档的选择：Jina 的 text-matching、classification 或 separation；Cohere 的 classification 或 clustering。' },
  },
]

/** The settings an embedding call reads, live, so a vendor passes the fields of its own configuration. */
export interface EmbeddingSettings {
  embeddingModel: { get(): string }
  /** Vectors of this many dimensions, for models that can shorten theirs; 0 leaves it to the model. */
  embeddingDimensions: { get(): number }
  /** What happens to a text longer than the model's input: cut to fit, or refused. */
  embeddingOverflow: { get(): 'truncate' | 'error' }
  /** The most texts sent in one request; more are sent in several. Cohere accepts 96 at most. */
  batchSize: { get(): number }
  timeoutMs: { get(): number }
}

export interface EmbeddingApiDeps {
  config: EmbeddingSettings
  /** The provider id the service reports. */
  provider: string
  /** Which API the connection speaks: Jina's `/embeddings` or Cohere's `/embed`. */
  api: 'jina' | 'cohere'
  /** The credentials service, looked up on each call: the key is never held. */
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  connection: () => ApiConnection
  /** Replaceable for tests. */
  fetch?: typeof fetch
}

interface Answer {
  vectors: number[][]
  model?: string
  tokens?: number
}

const JINA_TASKS: Record<EmbeddingInputType, string> = { query: 'retrieval.query', document: 'retrieval.passage' }
const COHERE_TYPES: Record<EmbeddingInputType, string> = { query: 'search_query', document: 'search_document' }

function messageOf(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined
  const row = body as { error?: { message?: unknown }; message?: unknown; detail?: unknown }
  return [row.error?.message, row.message, row.detail].find((candidate): candidate is string => typeof candidate === 'string')
}

/**
 * Embeddings from Jina (`POST {baseUrl}/embeddings`) or Cohere (`POST {baseUrl}/embed`), whichever the configuration says the connection speaks.
 * The query/document choice of a call becomes Jina's `task` or Cohere's `input_type`, which Cohere requires: without a choice, texts are documents.
 */
export class EmbeddingApiService extends EmbeddingService<EmbeddingApiOptions> {
  readonly provider: string
  private readonly send: typeof fetch

  constructor(private readonly deps: EmbeddingApiDeps) {
    super()
    this.provider = deps.provider
    this.send = deps.fetch ?? fetch
  }

  get model(): string {
    return this.deps.config.embeddingModel.get()
  }

  async embed(texts: readonly string[], options: EmbeddingApiOptions = {}): Promise<EmbeddingResult> {
    const { config } = this.deps
    texts.forEach((text, index) => {
      if (text.trim() === '') throw new AiError('invalid-input', `text ${index + 1} is empty: the API refuses an empty input`)
    })
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    const model = config.embeddingModel.get()
    if (model === '') throw new AiError('not-configured', 'no embedding model is configured')
    const { api } = this.deps
    const batch = Math.max(1, api === 'cohere' ? Math.min(config.batchSize.get(), 96) : config.batchSize.get())
    const vectors: number[][] = []
    let tokens: number | undefined
    let answered = model
    for (let start = 0; start < texts.length; start += batch) {
      const answer = await this.request(api, texts.slice(start, start + batch), model, options)
      vectors.push(...answer.vectors)
      answered = answer.model ?? model
      if (answer.tokens !== undefined) tokens = (tokens ?? 0) + answer.tokens
    }
    return { vectors, model: answered, dimensions: vectors[0]?.length ?? 0, ...tokens === undefined ? {} : { tokens } }
  }

  private body(api: 'jina' | 'cohere', input: readonly string[], model: string, options: EmbeddingApiOptions): Record<string, unknown> {
    const { config } = this.deps
    const dimensions = options.dimensions ?? config.embeddingDimensions.get()
    const truncate = options.truncate ?? config.embeddingOverflow.get() === 'truncate'
    if (api === 'cohere') {
      return {
        model,
        texts: input,
        input_type: options.task ?? COHERE_TYPES[options.inputType ?? 'document'],
        embedding_types: ['float'],
        truncate: truncate ? 'END' : 'NONE',
        ...dimensions > 0 ? { output_dimension: dimensions } : {},
      }
    }
    const task = options.task ?? (options.inputType === undefined ? undefined : JINA_TASKS[options.inputType])
    return {
      model,
      input,
      embedding_type: 'float',
      truncate,
      ...task === undefined ? {} : { task },
      ...dimensions > 0 ? { dimensions } : {},
    }
  }

  private async request(api: 'jina' | 'cohere', input: readonly string[], model: string, options: EmbeddingApiOptions): Promise<Answer> {
    const { config, credentials } = this.deps
    const connection = this.deps.connection()
    const root = connection.baseUrl
    const headers: Record<string, string> = { 'content-type': 'application/json', ...await connectionHeaders(connection, credentials) }
    const timeout = AbortSignal.timeout(Math.max(1, config.timeoutMs.get()))
    const signal = options.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout])

    let response: Response
    try {
      response = await this.send(`${root}/${api === 'cohere' ? 'embed' : 'embeddings'}`, { method: 'POST', headers, signal, body: JSON.stringify(this.body(api, input, model, options)) })
    } catch (error) {
      if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled', { cause: error })
      if (timeout.aborted) throw new AiError('unavailable', `${root} did not answer within ${config.timeoutMs.get()} ms`, { cause: error })
      throw new AiError('unavailable', `${root} could not be reached: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    }

    const body = await readJson<Record<string, unknown>>(response)
    if (!response.ok) throw httpFailure(response, messageOf(body))
    const rows = api === 'cohere' ? this.cohereRows(body) : this.jinaRows(body)
    if (rows === undefined || rows.length !== input.length) throw new AiError('unavailable', `${root} answered with ${rows === undefined ? 'no' : rows.length} embeddings for ${input.length} texts`)
    const vectors = rows.map((row) => {
      if (!Array.isArray(row) || row.some(value => typeof value !== 'number')) throw new AiError('unavailable', `${root} answered with something that is not a vector`)
      return row as number[]
    })
    const tokens = api === 'cohere'
      ? (body?.['meta'] as { billed_units?: { input_tokens?: unknown } } | undefined)?.billed_units?.input_tokens
      : (body?.['usage'] as { total_tokens?: unknown; prompt_tokens?: unknown } | undefined)?.total_tokens
    return { vectors, ...typeof body?.['model'] === 'string' ? { model: body['model'] } : {}, ...typeof tokens === 'number' ? { tokens } : {} }
  }

  private jinaRows(body: Record<string, unknown> | undefined): unknown[] | undefined {
    const data = body?.['data']
    if (!Array.isArray(data)) return undefined
    return [...data as { embedding?: unknown; index?: unknown }[]].sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0)).map(row => row.embedding)
  }

  private cohereRows(body: Record<string, unknown> | undefined): unknown[] | undefined {
    const floats = (body?.['embeddings'] as { float?: unknown } | undefined)?.float
    return Array.isArray(floats) ? floats : undefined
  }
}
