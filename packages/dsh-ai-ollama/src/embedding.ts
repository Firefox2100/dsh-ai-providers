import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, EmbeddingService, type EmbedOptions, type EmbeddingResult, type RequestOption } from '@dsh-ai-providers/core'
import { callJson } from './api.ts'
import type { Config } from './config.ts'
import { connectionHeaders, type OllamaConnection } from './connection.ts'
import { keepAliveOf } from './llm/serialize.ts'

/** What belongs to one embedding request to Ollama and not to every provider. */
export interface OllamaEmbedOptions extends EmbedOptions {
  /** Vectors of this many dimensions, for models that can shorten theirs; overrides the configured default. */
  dimensions?: number
  /** Whether a text longer than the context is cut to fit (`true`) or refused; overrides the configured default. */
  truncate?: boolean
  /** How long the model stays loaded after the request, such as `5m`, `-1` or `0`; overrides the configured default. */
  keepAlive?: string
}

export const EMBEDDING_REQUEST_OPTIONS: readonly RequestOption[] = [
  {
    key: 'dimensions',
    type: 'integer',
    label: { en: 'Vector dimensions', zh: '向量维度' },
    description: { en: 'Shorter vectors, for models that can shorten theirs. Leave empty to use the provider\'s setting. Vectors of different sizes cannot be compared, so choose before the first request.', zh: '缩短向量长度，适用于支持缩短的模型。留空则使用提供方的设置。不同长度的向量无法比较，请在第一次请求前选定。' },
    min: 1,
    atStart: true,
  },
  {
    key: 'truncate',
    type: 'boolean',
    label: { en: 'Truncate long texts', zh: '截断过长文本' },
    description: { en: 'Cut a text longer than the model\'s context to fit, instead of refusing it.', zh: '文本超出模型上下文时截断，而不是拒绝。' },
    default: true,
  },
  {
    key: 'keepAlive',
    type: 'string',
    label: { en: 'Keep loaded', zh: '保持加载' },
    description: { en: 'How long the model stays in memory after the request: 5m, 1h, -1 for ever, 0 to unload at once.', zh: '请求后模型在内存中保留多久：5m、1h，-1 表示一直保留，0 表示立即卸载。' },
  },
]

export interface OllamaEmbeddingDeps {
  config: Config
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  connection: () => OllamaConnection
  /** Replaceable for tests. */
  fetch?: typeof fetch
}

interface EmbedResponse {
  model?: unknown
  embeddings?: unknown
  prompt_eval_count?: unknown
}

/** Embeddings from `POST {baseUrl}/api/embed`, read from the configuration and the credentials on each call. */
export class OllamaEmbeddingService extends EmbeddingService<OllamaEmbedOptions> {
  readonly provider = 'ollama'
  private readonly send: typeof fetch

  constructor(private readonly deps: OllamaEmbeddingDeps) {
    super()
    this.send = deps.fetch ?? fetch
  }

  get model(): string {
    return this.deps.config.embeddingModel.get()
  }

  async embed(texts: readonly string[], options: OllamaEmbedOptions = {}): Promise<EmbeddingResult> {
    const { config } = this.deps
    texts.forEach((text, index) => {
      if (text.trim() === '') throw new AiError('invalid-input', `text ${index + 1} is empty: the server refuses an empty input`)
    })
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    const model = config.embeddingModel.get()
    if (model === '') throw new AiError('not-configured', 'no embedding model is configured')
    const batch = Math.max(1, config.batchSize.get())
    const vectors: number[][] = []
    let tokens: number | undefined
    let answered = model
    for (let start = 0; start < texts.length; start += batch) {
      const answer = await this.request(texts.slice(start, start + batch), model, options)
      vectors.push(...answer.vectors)
      answered = answer.model
      if (answer.tokens !== undefined) tokens = (tokens ?? 0) + answer.tokens
    }
    return { vectors, model: answered, dimensions: vectors[0]?.length ?? 0, ...tokens === undefined ? {} : { tokens } }
  }

  private async request(input: readonly string[], model: string, options: OllamaEmbedOptions): Promise<{ vectors: number[][]; model: string; tokens?: number }> {
    const { config, credentials } = this.deps
    const connection = this.deps.connection()
    const dimensions = options.dimensions ?? config.embeddingDimensions.get()
    const numCtx = config.embeddingNumCtx.get()
    const keepAlive = options.keepAlive ?? config.embeddingKeepAlive.get()
    const body = await callJson<EmbedResponse>(this.send, `${connection.apiUrl}/embed`, {
      headers: await connectionHeaders(connection, credentials),
      body: {
        model,
        input,
        truncate: options.truncate ?? config.embeddingOverflow.get() === 'truncate',
        ...dimensions > 0 ? { dimensions } : {},
        ...keepAlive === '' ? {} : { keep_alive: keepAliveOf(keepAlive) },
        ...numCtx > 0 ? { options: { num_ctx: numCtx } } : {},
      },
    }, config.timeoutMs.get(), options.signal)
    const rows = body.embeddings
    if (!Array.isArray(rows) || rows.length !== input.length) {
      throw new AiError('unavailable', `${connection.apiUrl} answered with ${Array.isArray(rows) ? rows.length : 'no'} embeddings for ${input.length} texts`)
    }
    const vectors = rows.map((row: unknown) => {
      if (!Array.isArray(row) || row.some(value => typeof value !== 'number')) throw new AiError('unavailable', `${connection.apiUrl} answered with something that is not a vector`)
      return row as number[]
    })
    return { vectors, model: typeof body.model === 'string' ? body.model : model, ...typeof body.prompt_eval_count === 'number' ? { tokens: body.prompt_eval_count } : {} }
  }
}
