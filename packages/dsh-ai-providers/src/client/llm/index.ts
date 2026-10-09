import type { Context } from '@deepseek-ai/cordis'
// Type-only: these pull in the Context and SlotMap augmentations this feature relies on.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from 'dsh-ai-core/slots'
import { ENTRY_ID } from '../../shared/ids.ts'
import { LlmController } from './controller.ts'
import { dictionaries, type LlmLocaleKey } from './locales.ts'
import { LlmSection } from './LlmSection.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.llm': LlmLocaleKey
  }
}

const NAMESPACE = 'ai.llm'

/** Adds the Language models tab to the settings modal. */
export function registerLlm(ctx: Context): void {
  const t = ctx.locale.bind(NAMESPACE)
  ctx.effect(() => ctx.locale.register(NAMESPACE, dictionaries), 'dsh-ai-providers: llm dictionaries')
  const controller = new LlmController()
  ctx.effect(() => () => { controller.dispose() }, 'dsh-ai-providers: llm tab')
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('settings.section', () =>
      ctx.slots.register({
        name: 'settings.section',
        id: 'ai-llm',
        order: 43,
        label: () => t('nav'),
        locale: NAMESPACE,
        inject: () => controller.inject(),
        children: { 'ai.provider.llm': { kind: 'list', scope: 'root' } },
      }, LlmSection as never))),
    'dsh-ai-providers: llm section',
  )
}
