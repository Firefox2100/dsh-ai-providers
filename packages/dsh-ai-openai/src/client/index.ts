import type { Context } from '@deepseek-ai/cordis'
// Type-only: these pull in the Context and SlotMap augmentations this feature relies on.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { providerSlotId } from 'dsh-ai-core'
import type {} from 'dsh-ai-core/slots'
import { ENTRY_ID, PROVIDER_ID } from '../ids.ts'
import { OpenAiCardController } from './controller.ts'
import { OpenAiCard } from './OpenAiCard.tsx'
import { dictionaries, type OpenAiLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.openai': OpenAiLocaleKey
  }
}

const NAMESPACE = 'ai.openai'

/** Union of what the card needs. */
export const inject = ['slots', 'locale', 'configForms']

/** Puts the provider's configuration into the Embedding tab of the settings modal. */
export function apply(ctx: Context): void {
  const t = ctx.locale.bind(NAMESPACE)
  ctx.effect(() => ctx.locale.register(NAMESPACE, dictionaries), 'dsh-ai-openai: dictionaries')

  const controller = new OpenAiCardController(ctx.configForms.get(ENTRY_ID))
  ctx.effect(() => () => { controller.dispose() }, 'dsh-ai-openai: form')

  // The entry only exists while the provider's plugin is loaded and serves its form.
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('ai.provider', () =>
      ctx.slots.register({
        name: 'ai.provider',
        id: providerSlotId('embedding', PROVIDER_ID),
        order: 0,
        label: () => t('label'),
        locale: NAMESPACE,
        inject: () => controller.inject(),
      }, OpenAiCard))),
    'dsh-ai-openai: provider entry',
  )
}
