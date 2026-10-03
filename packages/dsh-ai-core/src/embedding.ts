import { AiError } from './errors.ts'
import { AiService, type CallOptions } from './service.ts'

/** Whether a text is a question to search with or a passage to be found; some models embed the two differently. */
export type EmbeddingInputType = 'query' | 'document'

export interface EmbedOptions extends CallOptions {
  inputType?: EmbeddingInputType
}

export interface EmbeddingResult {
  /** One vector per input text, in the order given. */
  vectors: number[][]
  /** The model that produced them; vectors from different models are not comparable. */
  model: string
  dimensions: number
  /** Tokens the provider counted, when it says. */
  tokens?: number
}

/**
 * Turns text into vectors, and nothing more: this is the whole of what every provider has in
 * common, as LangChain's `Embeddings` is. A provider extends it and adds what is its own:
 * what belongs to the instance (where it connects, which model, credentials) is its configuration,
 * and what belongs to one request (a dimension count, a user tag) is a subtype of the options,
 * the `Options` parameter. A consumer calls it through `ctx.embeddings` and uses only this base,
 * so it never depends on which provider is behind it.
 */
export abstract class EmbeddingService<Options extends EmbedOptions = EmbedOptions> extends AiService {
  readonly capability = 'embedding' as const

  /**
   * Embed texts. The vectors are ready for use when the promise settles: nothing is left to wait
   * for or to fetch, whether they were computed now or kept from before.
   * @throws {AiError} with a code that says why it could not.
   */
  abstract embed(texts: readonly string[], options?: Options): Promise<EmbeddingResult>

  /**
   * Ask for the vectors of these texts to be prepared now, without waiting for them, so that a
   * later `embed` of the same texts and options returns at once. It never throws, and a service
   * that keeps nothing between calls leaves it as it is.
   */
  prefetch(_texts: readonly string[], _options?: Options): void {}

  /** The vector of one text. */
  async embedOne(text: string, options?: Options): Promise<number[]> {
    const { vectors } = await this.embed([text], options)
    const [vector] = vectors
    if (vector === undefined) throw new AiError('unavailable', `${this.provider} returned no vector for one text`)
    return vector
  }
}
