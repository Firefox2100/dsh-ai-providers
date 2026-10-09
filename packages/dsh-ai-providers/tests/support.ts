import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import { EmbeddingService, LlmService, RerankService, SttService, TtsService, type AiProvider, type LlmCall, type LlmRouteSpec, type EmbedOptions, type EmbeddingResult, type RerankOptions, type RerankResult, type SpeechInput, type Transcript, type TtsResult } from 'dsh-ai-core'

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

export class FakeTts extends TtsService {
  readonly provider = 'fake'
  model = 'voice-1'
  synthesize(text: string): Promise<TtsResult> {
    return Promise.resolve({ audio: new Blob([text]).stream(), mediaType: 'audio/mpeg', model: this.model })
  }
}

export class FakeStt extends SttService {
  readonly provider = 'fake'
  readonly model = 'listen-1'
  readonly info = { id: 'fake', name: 'Fake speech', location: 'host-local' as const, languages: ['auto', 'en'] }
  transcribe(input: SpeechInput, _signal: AbortSignal): Promise<Transcript> {
    return Promise.resolve({ text: 'heard', audioSeconds: input.audio.byteLength / 32_000, inferenceSeconds: 0.01 })
  }
}

export const providerOf = (id: string, service: FakeEmbedding | undefined, rerank?: FakeRerank, tts?: FakeTts, stt?: FakeStt): AiProvider => ({
  id,
  label: id.toUpperCase(),
  configEntryId: `ai-${id}`,
  capabilities: { ...(service === undefined ? {} : { embedding: () => service }), ...(rerank === undefined ? {} : { rerank: () => rerank }), ...(tts === undefined ? {} : { tts: () => tts }), ...(stt === undefined ? {} : { stt: () => stt }) },
})

export const settle = (ms = 30): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/** A language model service whose routes are given, that records what it was asked and streams what it is told to. */
export class FakeLlm extends LlmService {
  readonly provider = 'fake'
  routeList: LlmRouteSpec[] = []
  calls: LlmCall[] = []
  chunks: StreamChunk[] = [{ type: 'block-start', index: 0, blockType: 'text' }, { type: 'text-delta', index: 0, text: 'hi' }, { type: 'block-end', index: 0, block: { type: 'text', text: 'hi' } }, { type: 'finish', reason: { kind: 'stop' } }]
  failWith: Error | undefined

  routes(): readonly LlmRouteSpec[] { return this.routeList }

  async * stream(call: LlmCall): AsyncGenerator<StreamChunk> {
    this.calls.push(call)
    if (this.failWith !== undefined) throw this.failWith
    yield * this.chunks
  }
}
