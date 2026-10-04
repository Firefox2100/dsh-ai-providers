import { EmbeddingService, RerankService, type AiProvider, type EmbedOptions, type EmbeddingResult, type RerankOptions, type RerankResult } from 'dsh-ai-core'

/** A provider's service that counts what it is asked, and answers [length, index of the text in its call]. */
export class FakeEmbedding extends EmbeddingService {
  readonly provider = 'fake'
  model = 'fake-1'
  calls: { texts: readonly string[]; options: EmbedOptions }[] = []
  delay = 0
  failWith: Error | undefined

  async embed(texts: readonly string[], options: EmbedOptions = {}): Promise<EmbeddingResult> {
    this.calls.push({ texts: [...texts], options })
    if (this.delay > 0) await new Promise(resolve => setTimeout(resolve, this.delay))
    if (this.failWith !== undefined) throw this.failWith
    return { vectors: texts.map(text => [text.length, 1]), model: this.model, dimensions: 2 }
  }
}

/** Scores a document by how many words it shares with the query. */
export class FakeRerank extends RerankService {
  readonly provider = 'fake'
  model = 'rank-1'
  calls: { query: string; documents: readonly string[]; options: RerankOptions }[] = []
  failWith: Error | undefined
  /** What to answer instead of the scores, to test a provider that misbehaves. */
  answer: RerankResult | undefined

  rerank(query: string, documents: readonly string[], options: RerankOptions = {}): Promise<RerankResult> {
    this.calls.push({ query, documents: [...documents], options })
    if (this.failWith !== undefined) return Promise.reject(this.failWith)
    if (this.answer !== undefined) return Promise.resolve(this.answer)
    const words = new Set(query.toLowerCase().split(/\W+/))
    const results = documents.map((document, index) => ({ index, score: document.toLowerCase().split(/\W+/).filter(word => words.has(word)).length / 10 })).sort((a, b) => b.score - a.score)
    return Promise.resolve({ results: results.slice(0, options.topN ?? results.length), model: this.model })
  }
}

export const providerOf = (id: string, service: FakeEmbedding | undefined, rerank?: FakeRerank): AiProvider => ({
  id,
  label: id.toUpperCase(),
  configEntryId: `ai-${id}`,
  capabilities: { ...(service === undefined ? {} : { embedding: () => service }), ...(rerank === undefined ? {} : { rerank: () => rerank }) },
})

export const settle = (ms = 30): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))
