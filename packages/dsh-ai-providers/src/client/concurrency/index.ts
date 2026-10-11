import type { Context } from '@deepseek-ai/cordis'
// Type-only: these pull in the Context and SlotMap augmentations this feature relies on.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { ENTRY_ID } from '../../shared/ids.ts'
import { ConcurrencyController } from './controller.ts'
import { ConcurrencySection } from './ConcurrencySection.tsx'
import { dictionaries, type ConcurrencyLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.concurrency': ConcurrencyLocaleKey
  }
}

const NAMESPACE = 'ai.concurrency'

/** Adds the Concurrency tab to the settings modal. */
export function registerConcurrency(ctx: Context): void {
  const t = ctx.locale.bind(NAMESPACE)
  ctx.effect(() => ctx.locale.register(NAMESPACE, dictionaries), 'dsh-ai-providers: concurrency dictionaries')
  const controller = new ConcurrencyController(ctx, ctx.configForms.get(ENTRY_ID))
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('settings.section', () =>
      ctx.slots.register({
        name: 'settings.section',
        id: 'ai-concurrency',
        order: 50,
        label: () => t('nav'),
        locale: NAMESPACE,
        inject: () => controller.inject(),
      }, ConcurrencySection as never))),
    'dsh-ai-providers: concurrency section',
  )
}
