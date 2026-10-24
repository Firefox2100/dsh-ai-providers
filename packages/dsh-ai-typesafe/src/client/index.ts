import type { Context } from '@deepseek-ai/cordis'
// Type-only: these pull in the Context and SlotMap augmentations this feature relies on.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { providerSlotId, providerSlotName } from '@dsh-ai-providers/core'
import type {} from '@dsh-ai-providers/core/slots'
import { ENTRY_ID, PROVIDER_ID } from '../ids.ts'
import { TypeSafeCardController } from './controller.ts'
import { TypeSafeCard } from './TypeSafeCard.tsx'
import { TypeSafeConnections } from './TypeSafeConnections.tsx'
import { dictionaries, type TypeSafeLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.typesafe': TypeSafeLocaleKey
  }
}

const NAMESPACE = 'ai.typesafe'

/** Union of what the card needs. */
export const inject = ['slots', 'locale', 'configForms']

/** Puts the provider's configuration into the Providers and Decisions tabs of the settings modal. */
export function apply(ctx: Context): void {
  const t = ctx.locale.bind(NAMESPACE)
  ctx.effect(() => ctx.locale.register(NAMESPACE, dictionaries), 'dsh-ai-typesafe: dictionaries')

  const controller = new TypeSafeCardController(ctx.configForms.get(ENTRY_ID))
  controller.start()
  ctx.effect(() => () => { controller.dispose() }, 'dsh-ai-typesafe: form')

  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('ai.provider.connection', () =>
      ctx.slots.register({
        name: 'ai.provider.connection', id: `connection:${PROVIDER_ID}`, order: 6,
        label: () => t('label'), locale: NAMESPACE, inject: () => controller.inject(),
      }, TypeSafeConnections as never))),
    'dsh-ai-typesafe: provider connection entry',
  )

  // The entry only exists while the provider's plugin is loaded and serves its form.
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject(providerSlotName('decision'), () =>
      ctx.slots.register({
        name: providerSlotName('decision'),
        id: providerSlotId('decision', PROVIDER_ID),
        order: 0,
        label: () => t('label'),
        locale: NAMESPACE,
        inject: () => controller.inject(),
      }, TypeSafeCard))),
    'dsh-ai-typesafe: provider entry',
  )
}
