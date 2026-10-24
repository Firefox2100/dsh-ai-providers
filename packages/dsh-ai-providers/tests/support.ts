import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import { DecisionService, EmbeddingService, LlmService, RerankService, SttService, TtsService, type AiProvider, type LlmCall, type LlmModelSpec, LlmRouteSpec, type DecisionOptions, type DecisionQuestions, type DecisionResult, type DecisionState, type EmbedOptions, type EmbeddingResult, type RerankOptions, type RerankResult, type SpeechInput, type Transcript, type TtsResult } from '@dsh-ai-providers/core'

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

/** Answers a noul with a fixed probability and a choice with the option whose words the state shares most. */
export class FakeDecision extends DecisionService {
  readonly provider = 'fake'
  model = 'decide-1'
  calls: { state: DecisionState; questions: DecisionQuestions; options: DecisionOptions }[] = []
  failWith: Error | undefined
  noul = 0.9
  /** What to answer instead of the scores, to test a provider that misbehaves. */
  answers: Record<string, unknown> | undefined

  decide<Questions extends DecisionQuestions>(state: DecisionState, questions: Questions, options: DecisionOptions = {}): Promise<DecisionResult<Questions>> {
    this.calls.push({ state, questions, options })
    if (this.failWith !== undefined) return Promise.reject(this.failWith)
    if (this.answers !== undefined) return Promise.resolve({ answers: this.answers as never, model: this.model })
    const words = new Set(JSON.stringify(state).toLowerCase().split(/\W+/))
    const answers = Object.fromEntries(Object.entries(questions).map(([name, question]) => {
      if (question.type === 'noul') return [name, { type: 'noul', probability: this.noul }]
      if (question.type === 'score') return [name, { type: 'score', score: 0, confidence: 1, probabilities: question.criteria.map((_level, index) => (index === 0 ? 1 : 0)) }]
      const shared = Object.entries(question.criteria).map(([key, description]) => [key, 0.01 + `${key} ${description}`.toLowerCase().split(/\W+/).filter(word => word.length > 3 && words.has(word)).length] as const)
      const total = shared.reduce((sum, [, weight]) => sum + weight, 0)
      const probabilities = Object.fromEntries(shared.map(([key, weight]) => [key, weight / total]))
      const [choice] = [...shared].sort((a, b) => b[1] - a[1])[0]!
      return [name, { type: 'choice', choice, confidence: probabilities[choice]!, probabilities }]
    }))
    return Promise.resolve({ answers: answers as never, model: this.model, tokens: 12 })
  }
}

export const providerOf = (id: string, service: FakeEmbedding | undefined, rerank?: FakeRerank, tts?: FakeTts, stt?: FakeStt, decision?: FakeDecision): AiProvider => ({
  id,
  label: id.toUpperCase(),
  configEntryId: `ai-${id}`,
  capabilities: { ...(service === undefined ? {} : { embedding: () => service }), ...(rerank === undefined ? {} : { rerank: () => rerank }), ...(tts === undefined ? {} : { tts: () => tts }), ...(stt === undefined ? {} : { stt: () => stt }), ...(decision === undefined ? {} : { decision: () => decision }) },
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

  interrogated: { baseUrl: string; apiKey?: string }[] = []
  override async interrogate(draft: { baseUrl: string; apiKey?: string }): Promise<LlmModelSpec[]> {
    this.interrogated.push(draft)
    return [{ id: 'found', name: 'Found', contextWindow: 4096, inputs: ['text', 'image'] }]
  }

  async * stream(call: LlmCall): AsyncGenerator<StreamChunk> {
    this.calls.push(call)
    if (this.failWith !== undefined) throw this.failWith
    yield * this.chunks
  }
}
