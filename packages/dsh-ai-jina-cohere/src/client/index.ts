import type { Context } from '@deepseek-ai/cordis'
// Type-only: these pull in the Context and SlotMap augmentations this feature relies on.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { providerSlotId, providerSlotName } from 'dsh-ai-core'
import type {} from 'dsh-ai-core/slots'
import { ENTRY_ID, PROVIDER_ID } from '../ids.ts'
import { JinaCohereCardController } from './controller.ts'
import { JinaCohereCard } from './JinaCohereCard.tsx'
import { dictionaries, type JinaCohereLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.jina-cohere': JinaCohereLocaleKey
  }
}

const NAMESPACE = 'ai.jina-cohere'

/** Union of what the card needs. */
export const inject = ['slots', 'locale', 'configForms']

/** Puts the provider's configuration into the Reranking tab of the settings modal. */
export function apply(ctx: Context): void {
  const t = ctx.locale.bind(NAMESPACE)
  ctx.effect(() => ctx.locale.register(NAMESPACE, dictionaries), 'dsh-ai-jina-cohere: dictionaries')

  const controller = new JinaCohereCardController(ctx.configForms.get(ENTRY_ID))
  ctx.effect(() => () => { controller.dispose() }, 'dsh-ai-jina-cohere: form')

  // The entry only exists while the provider's plugin is loaded and serves its form.
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject(providerSlotName('rerank'), () =>
      ctx.slots.register({
        name: providerSlotName('rerank'),
        id: providerSlotId('rerank', PROVIDER_ID),
        order: 0,
        label: () => t('label'),
        locale: NAMESPACE,
        inject: () => controller.inject(),
      }, JinaCohereCard))),
    'dsh-ai-jina-cohere: provider entry',
  )
}
