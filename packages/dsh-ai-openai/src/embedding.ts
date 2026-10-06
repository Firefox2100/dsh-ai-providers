import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, EmbeddingService, httpFailure, readJson, type EmbedOptions, type EmbeddingResult } from 'dsh-ai-core'
import type { Config } from './config.ts'
import { PROVIDER_ID } from './ids.ts'
import { connectionHeaders, type OpenAiConnection } from './connection.ts'

/**
 * What belongs to one request to an OpenAI-compatible API and not to every provider: the instance's
 * configuration says where to connect and which model, and these say how to embed this call.
 */
export interface OpenAiEmbedOptions extends EmbedOptions {
  /** Vectors of this many dimensions, for models that can shorten theirs; overrides the configured default. */
  dimensions?: number
  /** An identifier of the end user, which the API uses to watch for abuse. */
  user?: string
}

export interface OpenAiEmbeddingDeps {
  config: Config
  /** The credentials service, looked up on each call: the key is never held. */
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  connection: () => OpenAiConnection
  /** Replaceable for tests. */
  fetch?: typeof fetch
}

interface EmbeddingsResponse {
  data?: { embedding?: unknown; index?: unknown }[]
  model?: unknown
  usage?: { total_tokens?: unknown; prompt_tokens?: unknown }
  error?: { message?: unknown }
}

/** Embeddings from `POST {baseUrl}/embeddings`. Everything it needs is read from the configuration and the credentials on each call. */
export class OpenAiEmbeddingService extends EmbeddingService<OpenAiEmbedOptions> {
  readonly provider = PROVIDER_ID
  private readonly send: typeof fetch

  constructor(private readonly deps: OpenAiEmbeddingDeps) {
    super()
    this.send = deps.fetch ?? fetch
  }

  get model(): string {
    return this.deps.config.embeddingModel.get()
  }

  async embed(texts: readonly string[], options: OpenAiEmbedOptions = {}): Promise<EmbeddingResult> {
    const { config } = this.deps
    texts.forEach((text, index) => {
      if (text.trim() === '') throw new AiError('invalid-input', `text ${index + 1} is empty: the API refuses an empty input`)
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
    return { vectors, model: answered, dimensions: vectors[0]?.length ?? 0, ...(tokens === undefined ? {} : { tokens }) }
  }

  private async request(input: readonly string[], model: string, options: OpenAiEmbedOptions): Promise<{ vectors: number[][]; model: string; tokens?: number }> {
    const { config, credentials } = this.deps
    const connection = this.deps.connection()
    const root = connection.baseUrl
    if (root === '') throw new AiError('not-configured', 'no base URL is configured')
    const dimensions = options.dimensions ?? config.embeddingDimensions.get()
    const headers: Record<string, string> = { 'content-type': 'application/json', ...await connectionHeaders(connection, credentials) }
    const timeout = AbortSignal.timeout(Math.max(1, config.timeoutMs.get()))
    const signal = options.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout])

    let response: Response
    try {
      response = await this.send(`${root}/embeddings`, {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify({ model, input, ...(dimensions > 0 ? { dimensions } : {}), ...(options.user === undefined ? {} : { user: options.user }) }),
      })
    } catch (error) {
      if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled', { cause: error })
      if (timeout.aborted) throw new AiError('unavailable', `${root} did not answer within ${config.timeoutMs.get()} ms`, { cause: error })
      throw new AiError('unavailable', `${root} could not be reached: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    }

    const body = await readJson<EmbeddingsResponse>(response)
    if (!response.ok) throw httpFailure(response, typeof body?.error?.message === 'string' ? body.error.message : undefined)
    const rows = body?.data
    if (!Array.isArray(rows) || rows.length !== input.length) {
      throw new AiError('unavailable', `${root} answered with ${Array.isArray(rows) ? rows.length : 'no'} embeddings for ${input.length} texts`)
    }
    const ordered = [...rows].sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0))
    const vectors = ordered.map((row) => {
      const vector = row.embedding
      if (!Array.isArray(vector) || vector.some(value => typeof value !== 'number')) throw new AiError('unavailable', `${root} answered with something that is not a vector`)
      return vector as number[]
    })
    const total = body?.usage?.total_tokens ?? body?.usage?.prompt_tokens
    return { vectors, model: typeof body?.model === 'string' ? body.model : model, ...(typeof total === 'number' ? { tokens: total } : {}) }
  }
}
