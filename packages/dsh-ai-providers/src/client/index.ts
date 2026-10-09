import type { Context } from '@deepseek-ai/cordis'
import { registerCapabilities } from './capability/index.ts'
import { registerLlm } from './llm/index.ts'

/** Union of what the tabs need. */
export const inject = ['slots', 'locale', 'configForms']

export function apply(ctx: Context): void {
  registerCapabilities(ctx)
  registerLlm(ctx)
}
