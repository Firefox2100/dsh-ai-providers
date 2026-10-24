import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, DecisionService, httpFailure, readJson, validateDecisionRequest, type ChoiceQuestion, type DecisionAnswers, type DecisionOptions, type DecisionQuestion, type DecisionQuestions, type DecisionResult, type DecisionState, type ScoreQuestion } from '@dsh-ai-providers/core'
import { connectionHeaders, type ApiConnection } from './connection.ts'

/** The settings a decision call reads, live, so a vendor passes the fields of its own configuration. */
export interface DecisionSettings {
  /** The decision model, as the API names it. */
  decisionModel: { get(): string }
  /** How long a request may take before it is given up, in milliseconds. */
  timeoutMs: { get(): number }
}

export interface SystemOneApiDeps<Options extends DecisionOptions = DecisionOptions> {
  config: DecisionSettings
  /** The provider id the service reports. */
  provider: string
  /** Fields added to the request body, from the call's options and the vendor's configuration: a vendor's own controls. */
  body?: (options: Options) => Readonly<Record<string, unknown>>
  /** Headers added to the request, such as one that switches on a longer context. */
  headers?: () => Readonly<Record<string, string>>
  /** The credentials service, looked up on each call: the key is never held. */
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  connection: () => ApiConnection
  /** Replaceable for tests. */
  fetch?: typeof fetch
}

type Raw = Record<string, unknown>

interface ResponseBody {
  model?: unknown
  answers?: Record<string, unknown>
  usage?: { input_tokens?: unknown }
  error?: { message?: unknown }
  message?: unknown
  detail?: unknown
}

const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isRaw = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value)

/** The server's own words for what was wrong: a message, or the first problem of a validation error. */
function said(body: ResponseBody | undefined): string | undefined {
  const detail = body?.detail
  const first = Array.isArray(detail) ? (detail[0] as { msg?: unknown; loc?: unknown } | undefined) : undefined
  const where = Array.isArray(first?.loc) ? ` (${first.loc.join('.')})` : ''
  const fromDetail = typeof first?.msg === 'string' ? `${first.msg}${where}` : typeof detail === 'string' ? detail : undefined
  return [body?.error?.message, body?.message, fromDetail].find((candidate): candidate is string => typeof candidate === 'string')
}

/** The probabilities of a choice, as the server gave them; a server that leaves its confidence out has it taken as the highest probability. */
function choiceOf(raw: Raw, question: ChoiceQuestion): DecisionAnswers<{ q: ChoiceQuestion }>['q'] | undefined {
  const probabilities = raw['probabilities']
  if (typeof raw['choice'] !== 'string' || !isRaw(probabilities) || !Object.values(probabilities).every(number)) return undefined
  const given = probabilities as Record<string, number>
  const confidence = number(raw['confidence']) ? raw['confidence'] : Math.max(0, ...Object.values(given))
  return { type: 'choice', choice: raw['choice'], confidence, probabilities: Object.fromEntries(Object.keys(question.criteria).flatMap(key => (key in given ? [[key, given[key]!]] : []))) }
}

/** The probabilities of a score arrive by level number (`"0"`, `"1"`, ...) or as a list, and become a list in the order of the question's levels. */
function scoreOf(raw: Raw, question: ScoreQuestion): DecisionAnswers<{ q: ScoreQuestion }>['q'] | undefined {
  const probabilities = raw['probabilities']
  if (!number(raw['score']) || !(Array.isArray(probabilities) || isRaw(probabilities))) return undefined
  const level = (index: number): unknown => (Array.isArray(probabilities) ? probabilities[index] : (probabilities as Raw)[String(index)])
  const levels = question.criteria.map((_description, index) => level(index))
  if (!levels.every(number)) return undefined
  return { type: 'score', score: raw['score'], confidence: number(raw['confidence']) ? raw['confidence'] : Math.max(0, ...levels), probabilities: levels }
}

/**
 * A noul is a probability. A server that bands it into a boolean for its own use may add the number it banded as
 * `noul_raw`, and that is the one a caller can gate on.
 */
function noulOf(raw: Raw): DecisionAnswers<{ q: { type: 'noul'; instructions: string } }>['q'] | undefined {
  const value = number(raw['noul_raw']) ? raw['noul_raw'] : raw['noul']
  return number(value) ? { type: 'noul', probability: value } : undefined
}

function answerOf(question: DecisionQuestion, raw: unknown): unknown {
  if (!isRaw(raw)) return undefined
  if (question.type === 'noul') return noulOf(raw)
  return question.type === 'choice' ? choiceOf(raw, question) : scoreOf(raw, question)
}

/**
 * Decisions from `POST {baseUrl}/systemone`, the API TypeSafe's Jev introduced and that LocalAI, llama.cpp's server,
 * LM Studio and others copy: a model, a state and named typed questions go in, and an answer for each (`noul`,
 * `choice` and `score`, with the probabilities behind it) and the tokens counted come out. Everything it needs is
 * read from the configuration and the credentials on each call.
 */
export class SystemOneApiService<Options extends DecisionOptions = DecisionOptions> extends DecisionService<Options> {
  readonly provider: string
  private readonly send: typeof fetch

  constructor(private readonly deps: SystemOneApiDeps<Options>) {
    super()
    this.provider = deps.provider
    this.send = deps.fetch ?? fetch
  }

  get model(): string {
    return this.deps.config.decisionModel.get()
  }

  async decide<Questions extends DecisionQuestions>(state: DecisionState, questions: Questions, options: Options = {} as Options): Promise<DecisionResult<Questions>> {
    const { config, credentials } = this.deps
    validateDecisionRequest(state, questions)
    const cancelled = (): boolean => options.signal?.aborted === true
    if (cancelled()) throw new AiError('cancelled', 'cancelled')
    const model = config.decisionModel.get().trim()
    if (model === '') throw new AiError('not-configured', 'no decision model is configured')
    const connection = this.deps.connection()
    const root = connection.baseUrl

    const headers: Record<string, string> = { 'content-type': 'application/json', ...this.deps.headers?.(), ...await connectionHeaders(connection, credentials) }
    const timeout = AbortSignal.timeout(Math.max(1, config.timeoutMs.get()))
    const signal = options.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout])

    let response: Response
    try {
      response = await this.send(`${root}/systemone`, { method: 'POST', headers, signal, redirect: 'error', body: JSON.stringify({ ...this.deps.body?.(options), model, state, questions }) })
    } catch (error) {
      if (cancelled()) throw new AiError('cancelled', 'cancelled', { cause: error })
      if (timeout.aborted) throw new AiError('unavailable', `${root} did not answer within ${config.timeoutMs.get()} ms`, { cause: error })
      throw new AiError('unavailable', `${root} could not be reached: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    }

    const body = await readJson<ResponseBody>(response)
    if (!response.ok) throw httpFailure(response, said(body))
    if (!isRaw(body?.answers)) throw new AiError('unavailable', `${root} answered without answers`)
    const answers: Record<string, unknown> = {}
    for (const [name, question] of Object.entries(questions)) {
      const answer = answerOf(question, body.answers[name])
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
