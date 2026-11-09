import type { Context } from '@deepseek-ai/cordis'
// Type-only: these pull in the Context and SlotMap augmentations this feature relies on.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { ENTRY_ID } from '../../shared/ids.ts'
import { ObservabilityController } from './controller.ts'
import { ObservabilitySection } from './ObservabilitySection.tsx'
import { dictionaries, type ObservabilityLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.observability': ObservabilityLocaleKey
  }
}

const NAMESPACE = 'ai.observability'

/** Adds the Observability tab to the settings modal. */
export function registerObservability(ctx: Context): void {
  const t = ctx.locale.bind(NAMESPACE)
  ctx.effect(() => ctx.locale.register(NAMESPACE, dictionaries), 'dsh-ai-providers: observability dictionaries')
  const controller = new ObservabilityController(ctx.configForms.get(ENTRY_ID))
  controller.start(ctx)
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('settings.section', () =>
      ctx.slots.register({
        name: 'settings.section',
        id: 'ai-observability',
        order: 55,
        label: () => t('nav'),
        locale: NAMESPACE,
        inject: () => controller.inject(),
      }, ObservabilitySection as never))),
    'dsh-ai-providers: observability section',
  )
}
