import { AiError } from './errors.ts'
import { AiService, type CallOptions } from './service.ts'

/** What the questions are about: text, or JSON that the provider reads as it is. */
export type DecisionState = string | readonly unknown[] | { readonly [key: string]: unknown }

/** Whether a statement holds. */
export interface NoulQuestion {
  type: 'noul'
  /** The statement to judge, worded as a statement or a yes/no question. */
  instructions: string
}

/** Which one of a closed set of options fits best. */
export interface ChoiceQuestion {
  type: 'choice'
  instructions: string
  /** Each option's key, with a description of when it applies: the descriptions steer the answer more than the question does. */
  criteria: Readonly<Record<string, string>>
}

/** Where on an ordered scale something falls. */
export interface ScoreQuestion {
  type: 'score'
  instructions: string
  /** What each level means, lowest first. */
  criteria: readonly string[]
}

export type DecisionQuestion = NoulQuestion | ChoiceQuestion | ScoreQuestion

/** Named questions, answered together over one state. */
export type DecisionQuestions = Readonly<Record<string, DecisionQuestion>>

export interface NoulAnswer {
  type: 'noul'
  /** How likely the statement holds, from 0 to 1. */
  probability: number
}

export interface ChoiceAnswer<Key extends string = string> {
  type: 'choice'
  /** The option with the highest probability. */
  choice: Key
  /** How concentrated the probabilities are, from 0 to 1. */
  confidence: number
  /** Every option's probability; they add up to about 1. */
  probabilities: Record<Key, number>
}

export interface ScoreAnswer {
  type: 'score'
  /** The position on the scale as a number from 0 to the highest level; it can fall between two levels. */
  score: number
  confidence: number
  /** The probability of each level, in the order of the question's `criteria`. */
  probabilities: readonly number[]
}

/** The answer a question gets, by its type. */
export type AnswerOf<Question extends DecisionQuestion> =
  Question extends { type: 'choice'; criteria: infer Criteria } ? ChoiceAnswer<Extract<keyof Criteria, string>>
    : Question extends { type: 'score' } ? ScoreAnswer
      : NoulAnswer

export type DecisionAnswers<Questions extends DecisionQuestions> = { [Name in keyof Questions]: AnswerOf<Questions[Name]> }

export type DecisionOptions = CallOptions

export interface DecisionResult<Questions extends DecisionQuestions = DecisionQuestions> {
  /** One answer for every question asked, under its name. */
  answers: DecisionAnswers<Questions>
  /** The model that decided. */
  model: string
  /** Input tokens the provider counted, when it says. */
  tokens?: number
}

/** The most levels of a score question: what every provider that offers one can give. */
export const MAX_SCORE_LEVELS = 10

/**
 * Checks what every provider needs of a request, so that a caller learns about a malformed one at once and the same way
 * whichever provider is behind the service. Limits of a particular model (how many options, how long a state) are its own.
 * @throws {AiError} with code `invalid-input`.
 */
export function validateDecisionRequest(state: DecisionState, questions: DecisionQuestions): void {
  if (typeof state === 'string' ? state.trim() === '' : state === null || state === undefined) throw new AiError('invalid-input', 'the state is empty')
  const names = Object.keys(questions)
  if (names.length === 0) throw new AiError('invalid-input', 'no question is asked')
  for (const name of names) {
    const question = questions[name]!
    if (name.trim() === '') throw new AiError('invalid-input', 'a question has no name')
    if (typeof question.instructions !== 'string' || question.instructions.trim() === '') throw new AiError('invalid-input', `question "${name}" has no instructions`)
    if (question.type === 'choice') {
      const options = Object.entries(question.criteria)
      if (options.length < 2) throw new AiError('invalid-input', `question "${name}" needs at least two options`)
      for (const [key, description] of options) if (key.trim() === '' || description.trim() === '') throw new AiError('invalid-input', `question "${name}" has an option without a key or a description`)
    } else if (question.type === 'score') {
      if (question.criteria.length < 2 || question.criteria.length > MAX_SCORE_LEVELS) throw new AiError('invalid-input', `question "${name}" needs from 2 to ${MAX_SCORE_LEVELS} levels`)
      if (question.criteria.some(level => level.trim() === '')) throw new AiError('invalid-input', `question "${name}" has a level without a description`)
    } else if (question.type !== 'noul') {
      throw new AiError('invalid-input', `question "${name}" has an unknown type`)
    }
  }
}

/**
 * Answers typed questions about a state with a model that scores the options in one pass instead of writing text
 * (a System One decision model). What it returns are probabilities, so a caller can act on a confident answer and
 * hand an unsure one to something slower. This is all that every provider has in common; what is its own (instance
 * configuration, per-request options) is a subtype, as for {@link RerankService}.
 */
export abstract class DecisionService<Options extends DecisionOptions = DecisionOptions> extends AiService {
  readonly capability = 'decision' as const

  /**
   * Answer every question about the state.
   * @throws {AiError} with a code that says why it could not.
   */
  abstract decide<Questions extends DecisionQuestions>(state: DecisionState, questions: Questions, options?: Options): Promise<DecisionResult<Questions>>
}
