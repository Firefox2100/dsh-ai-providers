import { AiError, RerankService, type AiProviderRegistry, type RerankOptions, type RerankResult } from 'dsh-ai-core'

interface Source {
  /** The id of the selected provider; empty for none. */
  selected: () => string
  registry: Pick<AiProviderRegistry, 'get'>
}

const NAME_OF_NONE = 'none'

/**
 * What `ctx.rerankers` is: the service of the selected provider, as the consumer should meet it.
 * Nothing is kept between calls (a rerank depends on the query, so there is nothing to share), and
 * the answer is checked before it is handed on: a position outside the list, or a score that is not
 * a number, is a provider that misbehaves, and the consumer is told so instead of ranking by it.
 */
export class ConfiguredRerank extends RerankService {
  constructor(private readonly source: Source) {
    super()
  }

  get provider(): string {
    return this.source.selected() || NAME_OF_NONE
  }

  get model(): string {
    return this.current()?.model ?? NAME_OF_NONE
  }

  async rerank(query: string, documents: readonly string[], options: RerankOptions = {}): Promise<RerankResult> {
    const service = this.current()
    if (service === undefined) throw new AiError('not-configured', 'no rerank provider is selected, or the selected one is not loaded')
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    if (query.trim() === '') throw new AiError('invalid-input', 'the query is empty')
    if (documents.length === 0) return { results: [], model: service.model }
    if (options.topN !== undefined && (!Number.isInteger(options.topN) || options.topN < 1)) throw new AiError('invalid-input', 'topN must be a whole number from 1')
    const answer = await service.rerank(query, documents, options)
    const seen = new Set<number>()
    for (const { index, score } of answer.results) {
      if (!Number.isInteger(index) || index < 0 || index >= documents.length || seen.has(index)) throw new AiError('unavailable', `${service.provider} scored a document that was not given, or twice (position ${index})`)
      if (!Number.isFinite(score)) throw new AiError('unavailable', `${service.provider} gave a score that is not a number`)
      seen.add(index)
    }
    const results = [...answer.results].sort((a, b) => b.score - a.score)
    return { ...answer, results: options.topN === undefined ? results : results.slice(0, options.topN) }
  }

  private current(): RerankService | undefined {
    const id = this.source.selected()
    const factory = id === '' ? undefined : this.source.registry.get(id)?.capabilities.rerank
    return factory === undefined ? undefined : factory()
  }
}
