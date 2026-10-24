import type { RequestGate } from './gate.ts'
import { AiError, DecisionService, validateDecisionRequest, type AiProviderRegistry, type DecisionOptions, type DecisionQuestion, type DecisionQuestions, type DecisionResult, type DecisionState } from '@dsh-ai-providers/core'

interface Source {
  /** The id of the selected provider; empty for none. */
  selected: () => string
  registry: Pick<AiProviderRegistry, 'get'>
  gate?: RequestGate
}

const NAME_OF_NONE = 'none'
const SLACK = 1e-6

const probability = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= -SLACK && value <= 1 + SLACK

/** What is wrong with a provider's answer to one question, or nothing. */
function answerProblem(name: string, question: DecisionQuestion, answer: unknown): string | undefined {
  const given = answer as Record<string, unknown> | undefined
  if (given === undefined || given === null || typeof given !== 'object') return `question "${name}" was not answered`
  if (given['type'] !== question.type) return `question "${name}" was answered as ${String(given['type'])}, not ${question.type}`
  if (question.type === 'noul') return probability(given['probability']) ? undefined : `the probability for "${name}" is not a number from 0 to 1`
  if (!probability(given['confidence'])) return `the confidence for "${name}" is not a number from 0 to 1`
  const probabilities = given['probabilities'] as Record<string, unknown> | undefined
  if (question.type === 'choice') {
    if (typeof given['choice'] !== 'string' || !Object.hasOwn(question.criteria, given['choice'])) return `"${name}" was answered with an option that was not offered`
    const offered = Object.keys(question.criteria)
    if (probabilities === undefined || Object.keys(probabilities).length !== offered.length || offered.some(key => !Object.hasOwn(probabilities, key) || !probability(probabilities[key]))) return `the probabilities for "${name}" are not one number from 0 to 1 for every offered option`
    return undefined
  }
  const levels = question.criteria.length
  if (typeof given['score'] !== 'number' || !Number.isFinite(given['score']) || given['score'] < -SLACK || given['score'] > levels - 1 + SLACK) return `the score for "${name}" is outside its ${levels} levels`
  if (!Array.isArray(probabilities) || probabilities.length !== levels || !probabilities.every(probability)) return `the probabilities for "${name}" are not one number from 0 to 1 for each of its ${levels} levels`
  return undefined
}

/**
 * What `ctx.decisions` is: the service of the selected provider, as the consumer should meet it. Nothing is kept
 * between calls, a malformed request is refused before it is sent, and the answer is checked before it is handed on:
 * a question left unanswered, an option that was never offered, or a probability that is no probability is a
 * provider that misbehaves, and the consumer is told so instead of acting on it.
 */
export class ConfiguredDecision extends DecisionService {
  constructor(private readonly source: Source) {
    super()
  }

  get provider(): string {
    return this.source.selected() || NAME_OF_NONE
  }

  get model(): string {
    return this.current()?.model ?? NAME_OF_NONE
  }

  async decide<Questions extends DecisionQuestions>(state: DecisionState, questions: Questions, options: DecisionOptions = {}): Promise<DecisionResult<Questions>> {
    const service = this.current()
    if (service === undefined) throw new AiError('not-configured', 'no decision provider is selected, or the selected one is not loaded')
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    validateDecisionRequest(state, questions)
    const answer = this.source.gate === undefined ? await service.decide(state, questions, options) : await this.source.gate.run({ capability: 'decision', priority: options.priority, signal: options.signal }, () => service.decide(state, questions, options))
    for (const [name, question] of Object.entries(questions)) {
      const problem = answerProblem(name, question, (answer.answers as Record<string, unknown>)[name])
      if (problem !== undefined) throw new AiError('unavailable', `${service.provider}: ${problem}`)
    }
    return answer
  }

  private current(): DecisionService | undefined {
    const id = this.source.selected()
    const factory = id === '' ? undefined : this.source.registry.get(id)?.capabilities.decision
    return factory === undefined ? undefined : factory()
  }
}
