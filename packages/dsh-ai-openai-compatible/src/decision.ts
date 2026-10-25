import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, DecisionService, httpFailure, readJson, validateDecisionRequest, type DecisionAnswers, type DecisionOptions, type DecisionQuestion, type DecisionQuestions, type DecisionResult, type DecisionState } from '@dsh-ai-providers/core'
import { connectionHeaders, type OpenAiConnection } from './connection.ts'

/** The settings a decision call reads, live, so a vendor passes the fields of its own configuration. */
export interface OpenAiDecisionSettings {
  /** The decision model, as the API names it. */
  decisionModel: { get(): string }
  /** How long a request may take before it is given up, in milliseconds. */
  timeoutMs: { get(): number }
}

export interface OpenAiDecisionDeps {
  config: OpenAiDecisionSettings
  provider?: string
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  connection: () => OpenAiConnection
  /** Fields added to the request body. */
  body?: () => Readonly<Record<string, unknown>>
  /** Replaceable for tests. */
  fetch?: typeof fetch
}

type Raw = Record<string, unknown>

interface ResponseBody {
  model?: unknown
  answers?: unknown
  usage?: { input_tokens?: unknown }
  error?: { message?: unknown }
}

const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isRaw = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value)

/** The questions in OpenAI's shape: a list, with options and levels as objects. */
function wireQuestions(questions: DecisionQuestions): Raw[] {
  return Object.entries(questions).map(([name, question]) => {
    if (question.type === 'choice') return { type: 'choice', name, instructions: question.instructions, choices: Object.entries(question.criteria).map(([value, description]) => ({ value, description })) }
    if (question.type === 'score') return { type: 'score', name, instructions: question.instructions, levels: question.criteria.map(label => ({ label })) }
    return { type: 'predicate', name, instructions: question.instructions }
  })
}

/** Probabilities arrive keyed by option or level, as a list in the order asked, or as labeled objects. */
function probabilitiesOf(raw: unknown, keys: readonly string[]): number[] | undefined {
  const at = (index: number): unknown => {
    if (Array.isArray(raw)) {
      const matching = raw.find(item => isRaw(item) && String(item['value'] ?? item['label']) === keys[index])
      const item: unknown = matching ?? raw[index]
      return isRaw(item) ? item['probability'] : item
    }
    return isRaw(raw) ? raw[keys[index]!] ?? raw[String(index)] : undefined
  }
  const values = keys.map((_key, index) => at(index))
  return values.every(number) ? values : undefined
}

function answerOf(question: DecisionQuestion, raw: Raw): unknown {
  if (question.type === 'noul') return number(raw['probability']) ? { type: 'noul', probability: raw['probability'] } : undefined
  const confidence = (probabilities: readonly number[]): number => (number(raw['confidence']) ? raw['confidence'] : Math.max(0, ...probabilities))
  if (question.type === 'choice') {
    const keys = Object.keys(question.criteria)
    const probabilities = probabilitiesOf(raw['probabilities'], keys)
    if (typeof raw['choice'] !== 'string' || probabilities === undefined) return undefined
    return { type: 'choice', choice: raw['choice'], confidence: confidence(probabilities), probabilities: Object.fromEntries(keys.map((key, index) => [key, probabilities[index]!])) }
  }
  const probabilities = probabilitiesOf(raw['probabilities'], question.criteria.map((_level, index) => String(index)))
  if (probabilities === undefined) return undefined
  // The position is the probability-weighted level; computed here when the server leaves it out.
  const score = number(raw['score']) ? raw['score'] : probabilities.reduce((sum, probability, index) => sum + probability * index, 0)
  return { type: 'score', score, confidence: confidence(probabilities), probabilities }
}

/**
 * Decisions from OpenAI's `POST {baseUrl}/decisions`: an input and named typed questions go in, and an answer for
 * each (a predicate's probability, a choice with the probability of every option, a score over ordered levels) comes
 * out in the order asked. A text state is sent as it is, any other JSON as its text. An answer the model refused is
 * `rejected`; one this cannot read is `unavailable`.
 */
export class OpenAiDecisionService extends DecisionService {
  readonly provider: string
  private readonly send: typeof fetch

  constructor(private readonly deps: OpenAiDecisionDeps) {
    super()
    this.provider = deps.provider ?? 'openai'
    this.send = deps.fetch ?? fetch
  }

  get model(): string {
    return this.deps.config.decisionModel.get()
  }

  async decide<Questions extends DecisionQuestions>(state: DecisionState, questions: Questions, options: DecisionOptions = {}): Promise<DecisionResult<Questions>> {
    const { config, credentials } = this.deps
    validateDecisionRequest(state, questions)
    const cancelled = (): boolean => options.signal?.aborted === true
    if (cancelled()) throw new AiError('cancelled', 'cancelled')
    const model = config.decisionModel.get().trim()
    if (model === '') throw new AiError('not-configured', 'no decision model is configured')
    const connection = this.deps.connection()
    const root = connection.baseUrl
    const headers = { 'content-type': 'application/json', ...await connectionHeaders(connection, credentials) }
    const timeout = AbortSignal.timeout(Math.max(1, config.timeoutMs.get()))
    const signal = options.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout])

    let response: Response
    try {
      response = await this.send(`${root}/decisions`, {
        method: 'POST', headers, signal, redirect: 'error',
        body: JSON.stringify({ ...this.deps.body?.(), model, input: typeof state === 'string' ? state : JSON.stringify(state), questions: wireQuestions(questions) }),
      })
    } catch (error) {
      if (cancelled()) throw new AiError('cancelled', 'cancelled', { cause: error })
      if (timeout.aborted) throw new AiError('unavailable', `${root} did not answer within ${config.timeoutMs.get()} ms`, { cause: error })
      throw new AiError('unavailable', `${root} could not be reached: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    }

    const body = await readJson<ResponseBody>(response)
    if (!response.ok) throw httpFailure(response, typeof body?.error?.message === 'string' ? body.error.message : undefined)
    if (!Array.isArray(body?.answers)) throw new AiError('unavailable', `${root} answered without answers`)
    const given = body.answers as unknown[]
    const answers: Record<string, unknown> = {}
    for (const [name, question] of Object.entries(questions)) {
      // By name, as each answer echoes it; a server that leaves names out is read in the order asked.
      const named = given.find((item): item is Raw => isRaw(item) && item['name'] === name)
      const raw = named ?? given[Object.keys(questions).indexOf(name)]
      if (isRaw(raw) && raw['type'] === 'refusal') throw new AiError('rejected', `${root} refused question "${name}"`)
      const answer = isRaw(raw) ? answerOf(question, raw) : undefined
      if (answer === undefined) throw new AiError('unavailable', `${root} gave no readable ${question.type} answer to question "${name}"`)
      answers[name] = answer
    }
    return {
      answers: answers as DecisionAnswers<Questions>,
      model: typeof body.model === 'string' ? body.model : model,
      ...(number(body.usage?.input_tokens) ? { tokens: body.usage.input_tokens } : {}),
    }
  }
}
