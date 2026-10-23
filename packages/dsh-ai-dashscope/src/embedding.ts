import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, EmbeddingService, type EmbedOptions, type EmbeddingResult, type RequestOption } from '@dsh-ai-providers/core'
import { postJson } from './api.ts'
import { connectionHeaders, type DashScopeConnection } from './connection.ts'

/** DashScope's own controls of one embedding request. */
export interface DashScopeEmbedOptions extends EmbedOptions {
  /** Vectors of this many dimensions, from the sizes the model offers (`dimension`); the configuration's value is used when left out. */
  dimensions?: number
  /** What the embedding model is told about the task (`instruct`); the configuration's value is used when left out. */
  instruct?: string
}

export const EMBEDDING_REQUEST_OPTIONS: readonly RequestOption[] = [
  {
    key: 'dimensions',
    type: 'integer',
    label: { en: 'Vector dimensions', zh: '向量维度' },
    description: { en: 'Shorter vectors, from the sizes the model offers (64 to 2048 for text-embedding-v4). Leave empty to use the provider\'s setting. Vectors of different sizes cannot be compared, so choose before the first request.', zh: '缩短向量长度，只能取模型提供的几种尺寸（text-embedding-v4 为 64 到 2048）。留空则使用提供方的设置。不同长度的向量无法比较，请在第一次请求前选定。' },
    min: 1,
    atStart: true,
  },
  {
    key: 'instruct',
    type: 'string',
    label: { en: 'Instruction', zh: '任务指令' },
    description: { en: 'Describes the task to the model, for the models that read one (English works best). Leave empty to use the provider\'s setting.', zh: '向模型描述任务，仅适用于会读取指令的模型（英文效果最好）。留空则使用提供方的设置。' },
  },
]

export interface DashScopeEmbeddingSettings {
  embeddingModel: { get(): string }
  embeddingDimensions: { get(): number }
  embeddingInstruct: { get(): string }
  embeddingEndpoint: { get(): 'text' | 'multimodal' }
  batchSize: { get(): number }
  timeoutMs: { get(): number }
}

export interface DashScopeEmbeddingDeps {
  config: DashScopeEmbeddingSettings
  provider: string
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  connection: () => DashScopeConnection
  /** Replaceable for tests. */
  fetch?: typeof fetch
}

interface Answer {
  output?: { embeddings?: { embedding?: unknown; text_index?: unknown; index?: unknown }[] }
  usage?: { total_tokens?: unknown }
}

/** The native fields of an embedding request. Only dense vectors are asked for: the contract carries no sparse ones. */
export function embeddingParameters(defaults: { dimensions: number; instruct: string }, { inputType, dimensions = defaults.dimensions, instruct = defaults.instruct }: DashScopeEmbedOptions): Record<string, unknown> {
  return {
    output_type: 'dense',
    ...inputType === undefined ? {} : { text_type: inputType },
    ...dimensions > 0 ? { dimension: dimensions } : {},
    ...instruct === '' ? {} : { instruct },
  }
}

/**
 * Embeddings from `POST {baseUrl}/services/embeddings/text-embedding/text-embedding`; the query/document choice of a call becomes
 * `text_type`. With the multimodal endpoint selected (for models such as qwen3-vl-embedding) each text is sent as a `{ text }`
 * content and embedded on its own: the embedding contract takes text, so images and video cannot be sent through it.
 */
export class DashScopeEmbeddingService extends EmbeddingService<DashScopeEmbedOptions> {
  private readonly send: typeof fetch

  constructor(private readonly deps: DashScopeEmbeddingDeps) {
    super()
    this.send = deps.fetch ?? fetch
  }

  get provider(): string { return this.deps.provider }

  get model(): string { return this.deps.config.embeddingModel.get() }

  async embed(texts: readonly string[], options: DashScopeEmbedOptions = {}): Promise<EmbeddingResult> {
    const { config, credentials } = this.deps
    texts.forEach((text, index) => {
      if (text.trim() === '') throw new AiError('invalid-input', `text ${index + 1} is empty: the API refuses an empty input`)
    })
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    const model = config.embeddingModel.get()
    if (model === '') throw new AiError('not-configured', 'no embedding model is configured')
    const connection = this.deps.connection()
    const headers = await connectionHeaders(connection, credentials)
    const multimodal = config.embeddingEndpoint.get() === 'multimodal'
    const url = `${connection.baseUrl}/services/embeddings/${multimodal ? 'multimodal-embedding/multimodal-embedding' : 'text-embedding/text-embedding'}`
    const { text_type: textType, ...shared } = embeddingParameters({ dimensions: config.embeddingDimensions.get(), instruct: config.embeddingInstruct.get() }, options)
    const parameters = multimodal ? shared : { ...shared, ...textType === undefined ? {} : { text_type: textType } }
    const batch = Math.max(1, config.batchSize.get())
    const vectors: number[][] = []
    let tokens: number | undefined
    for (let start = 0; start < texts.length; start += batch) {
      const input = texts.slice(start, start + batch)
      const body = await postJson<Answer>(this.send, url, headers, { model, input: multimodal ? { contents: input.map(text => ({ text })) } : { texts: input }, parameters }, config.timeoutMs.get(), options.signal)
      const rows = body.output?.embeddings
      if (!Array.isArray(rows) || rows.length !== input.length) throw new AiError('unavailable', `${connection.baseUrl} answered with ${Array.isArray(rows) ? rows.length : 'no'} embeddings for ${input.length} texts`)
      for (const row of [...rows].sort((a, b) => Number(a.text_index ?? a.index ?? 0) - Number(b.text_index ?? b.index ?? 0))) {
        if (!Array.isArray(row.embedding) || row.embedding.some(value => typeof value !== 'number')) throw new AiError('unavailable', `${connection.baseUrl} answered with something that is not a vector`)
        vectors.push(row.embedding as number[])
      }
      const used = body.usage?.total_tokens
      if (typeof used === 'number') tokens = (tokens ?? 0) + used
    }
    return { vectors, model, dimensions: vectors[0]?.length ?? 0, ...tokens === undefined ? {} : { tokens } }
  }
}
