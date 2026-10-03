import type { Context } from '@deepseek-ai/cordis'
import { registerEmbedding } from './embedding/index.ts'

/** Union of what the tabs need. */
export const inject = ['slots', 'locale', 'configForms']

export function apply(ctx: Context): void {
  registerEmbedding(ctx)
}
