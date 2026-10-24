import { Context } from '@deepseek-ai/cordis'
import { AiError, type DecisionQuestions } from '@dsh-ai-providers/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { ConfiguredDecision } from '../src/host/decision.ts'
import { AiProviders } from '../src/host/registry.ts'
import { FakeDecision, providerOf } from './support.ts'

let service: FakeDecision
let selected: string
let decisions: ConfiguredDecision

const questions = {
  angry: { type: 'noul', instructions: 'The customer is angry.' },
  topic: { type: 'choice', instructions: 'What is it about?', criteria: { billing: 'charge refund payment', shipping: 'delivery of an order' } },
  mood: { type: 'score', instructions: 'How upset?', criteria: ['calm', 'annoyed', 'furious'] },
} as const satisfies DecisionQuestions

beforeEach(() => {
  const registry = new AiProviders(new Context())
  service = new FakeDecision()
  registry.register(providerOf('decides', undefined, undefined, undefined, undefined, service))
  selected = 'decides'
  decisions = new ConfiguredDecision({ selected: () => selected, registry })
})

const failure = async (run: () => Promise<unknown>): Promise<string> => {
  try { await run() } catch (error) { return error instanceof AiError ? `${error.code}: ${error.message}` : String(error) }
  return 'did not fail'
}

describe('the configured decision service', () => {
  it('names the provider and model it stands for, or none', () => {
    expect([decisions.provider, decisions.model, decisions.capability]).toEqual(['decides', 'decide-1', 'decision'])
    selected = ''
    expect([decisions.provider, decisions.model]).toEqual(['none', 'none'])
  })

  it('answers every question through the selected provider, with the state and options it was given', async () => {
    const controller = new AbortController()
    const { answers, model, tokens } = await decisions.decide('A refund for a payment, please.', questions, { priority: 'background', signal: controller.signal })
    expect([answers.angry.probability, answers.topic.choice, answers.mood.score, model, tokens]).toEqual([0.9, 'billing', 0, 'decide-1', 12])
    expect(service.calls[0]?.options).toEqual({ priority: 'background', signal: controller.signal })
  })

  it('refuses a malformed request without asking the provider, and says when there is no provider or the caller already cancelled', async () => {
    expect(await failure(() => decisions.decide('  ', questions))).toBe('invalid-input: the state is empty')
    expect(await failure(() => decisions.decide('text', {}))).toMatch(/invalid-input/)
    expect(service.calls).toEqual([])
    const controller = new AbortController()
    controller.abort()
    expect(await failure(() => decisions.decide('text', questions, { signal: controller.signal }))).toBe('cancelled: cancelled')
    selected = ''
    expect(await failure(() => decisions.decide('text', questions))).toMatch(/not-configured/)
  })

  it('does not pass on an answer that leaves a question out, answers it as another type, or is not made of probabilities', async () => {
    const good = { angry: { type: 'noul', probability: 0.5 }, topic: { type: 'choice', choice: 'billing', confidence: 0.6, probabilities: { billing: 0.6, shipping: 0.4 } }, mood: { type: 'score', score: 1.2, confidence: 0.5, probabilities: [0.1, 0.8, 0.1] } }
    service.answers = good
    expect(await failure(() => decisions.decide('text', questions))).toBe('did not fail')
    const bad: [string, Record<string, unknown>, RegExp][] = [
      ['a question left out', { angry: good.angry, topic: good.topic }, /"mood" was not answered/],
      ['another type', { ...good, angry: { type: 'choice', choice: 'x' } }, /answered as choice, not noul/],
      ['a probability above 1', { ...good, angry: { type: 'noul', probability: 1.4 } }, /probability for "angry"/],
      ['a probability that is no number', { ...good, angry: { type: 'noul', probability: Number.NaN } }, /probability for "angry"/],
      ['an option that was not offered', { ...good, topic: { ...good.topic, choice: 'sales' } }, /option that was not offered/],
      ['probabilities with an offered option missing', { ...good, topic: { ...good.topic, probabilities: { billing: 1 } } }, /for every offered option/],
      ['probabilities for options that were not offered', { ...good, topic: { ...good.topic, probabilities: { billing: 0.5, shipping: 0.4, sales: 0.1 } } }, /for every offered option/],
      ['a confidence outside 0..1', { ...good, topic: { ...good.topic, confidence: 2 } }, /confidence for "topic"/],
      ['a score outside its levels', { ...good, mood: { ...good.mood, score: 3 } }, /outside its 3 levels/],
      ['level probabilities of the wrong length', { ...good, mood: { ...good.mood, probabilities: [1, 0] } }, /for each of its 3 levels/],
    ]
    for (const [label, answers, message] of bad) {
      service.answers = answers
      expect(await failure(() => decisions.decide('text', questions)), label).toMatch(new RegExp(`unavailable: fake: .*${message.source}`))
    }
  })

  it('carries a failure of the provider on unchanged', async () => {
    service.failWith = new AiError('rejected', 'bad key')
    expect(await failure(() => decisions.decide('text', questions))).toBe('rejected: bad key')
  })
})
