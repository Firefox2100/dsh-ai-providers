import { HarnessError, LlmError } from '@deepseek-ai/dsh-llm'
import { AiError } from '@dsh-ai-providers/core'

/**
 * DSH routes on its own error type, so this plugin hands one over where a failure leaves the plugin: the model loop
 * reads `LlmError`, and anything else DSH catches expects a `HarnessError`. The conversion lives here, in the host half
 * that already depends on `@deepseek-ai/dsh-llm`, instead of in the contracts package, which stays loadable on any DSH.
 * @param error - the value a capability threw.
 * @returns the same failure as a harness error, or the value untouched when it is not an `AiError`.
 */
export function asHarnessError(error: unknown): unknown {
  if (!(error instanceof AiError) || error instanceof HarnessError) return error
  return new HarnessError(error.message, error.code, { cause: error })
}

/** How a capability failure reads to DSH's model loop; the codes a gate raises are the ones that reach it. */
const LLM_CODE_OF: Record<string, string> = {
  cancelled: 'ABORTED',
  unavailable: 'TRANSPORT',
  'not-configured': 'INVALID_REQUEST',
  'invalid-input': 'INVALID_REQUEST',
  unsupported: 'INVALID_REQUEST',
  rejected: 'AUTH',
}

/**
 * The same conversion for a model request, which DSH's loop classifies by `LlmError`'s failure code.
 * @param error - the value a model call threw.
 * @returns the same failure as an `LlmError`, or the value untouched when it is not an `AiError`.
 */
export function asLlmError(error: unknown): unknown {
  if (!(error instanceof AiError) || error instanceof LlmError) return error
  return new LlmError(error.message, LLM_CODE_OF[error.code] ?? 'TRANSPORT', { cause: error })
}
