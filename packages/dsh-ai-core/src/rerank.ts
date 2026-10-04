import { AiService, type CallOptions } from './service.ts'

export interface RerankOptions extends CallOptions {
  /** Return only this many of the best documents; every document is scored when left out. */
  topN?: number
}

export interface RerankedDocument {
  /** The position of the document in the list that was given. */
  index: number
  /** How well the document answers the query, from 0 to 1, higher is better. Comparable within one call only. */
  score: number
}

export interface RerankResult {
  /** Best first. Holds every document, or the `topN` best when that was asked for. */
  results: RerankedDocument[]
  /** The model that scored them. */
  model: string
  /** Tokens the provider counted, when it says. */
  tokens?: number
}

/**
 * Judges how well each of some documents answers a query, with a model that reads the two
 * together (a cross-encoder), which is more accurate than comparing vectors made apart. This is
 * the whole of what every provider has in common; what is its own (instance configuration,
 * per-request options) is a subtype, as for {@link EmbeddingService}. It is meant for a short
 * list a cheaper search already found, not for searching a collection.
 */
export abstract class RerankService<Options extends RerankOptions = RerankOptions> extends AiService {
  readonly capability = 'rerank' as const

  /**
   * Score the documents against the query.
   * @throws {AiError} with a code that says why it could not.
   */
  abstract rerank(query: string, documents: readonly string[], options?: Options): Promise<RerankResult>
}
