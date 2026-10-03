import { EmbeddingService, type AiProvider, type EmbedOptions, type EmbeddingResult } from 'dsh-ai-core'

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

export const providerOf = (id: string, service: FakeEmbedding | undefined): AiProvider => ({
  id,
  label: id.toUpperCase(),
  configEntryId: `ai-${id}`,
  capabilities: service === undefined ? {} : { embedding: () => service },
})

export const settle = (ms = 30): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))
