import type { Context } from '@deepseek-ai/cordis'
import { registerCapabilities } from './capability/index.ts'
import { registerConcurrency } from './concurrency/index.ts'
import { registerLlm } from './llm/index.ts'
import { registerProviders } from './providers/index.ts'

/** Union of what the tabs need. */
export const inject = ['slots', 'locale', 'configForms']

export function apply(ctx: Context): void {
  registerCapabilities(ctx)
  registerProviders(ctx)
  registerLlm(ctx)
  registerConcurrency(ctx)
}
