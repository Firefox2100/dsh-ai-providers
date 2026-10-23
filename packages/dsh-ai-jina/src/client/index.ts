import type { Context } from '@deepseek-ai/cordis'
// Type-only: these pull in the Context and SlotMap augmentations this feature relies on.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { providerSlotId, providerSlotName } from '@dsh-ai-providers/core'
import type {} from '@dsh-ai-providers/core/slots'
import { ENTRY_ID, PROVIDER_ID } from '../ids.ts'
import { JinaCardController } from './controller.ts'
import { JinaCard, JinaEmbeddingCard } from './JinaCard.tsx'
import { JinaConnections } from './JinaConnections.tsx'
import { dictionaries, type JinaLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.jina': JinaLocaleKey
  }
}

const NAMESPACE = 'ai.jina'

/** Union of what the card needs. */
export const inject = ['slots', 'locale', 'configForms']

/** Puts the provider's configuration into the Reranking and Embedding tabs of the settings modal. */
export function apply(ctx: Context): void {
  const t = ctx.locale.bind(NAMESPACE)
  ctx.effect(() => ctx.locale.register(NAMESPACE, dictionaries), 'dsh-ai-jina: dictionaries')

  const controller = new JinaCardController(ctx.configForms.get(ENTRY_ID))
  controller.start()
  ctx.effect(() => () => { controller.dispose() }, 'dsh-ai-jina: form')

  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('ai.provider.connection', () =>
      ctx.slots.register({
        name: 'ai.provider.connection', id: `connection:${PROVIDER_ID}`, order: 3,
        label: () => t('label'), locale: NAMESPACE, inject: () => controller.inject(),
      }, JinaConnections as never))),
    'dsh-ai-jina: provider connection entry',
  )

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
      }, JinaCard))),
    'dsh-ai-jina: provider entry',
  )

  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject(providerSlotName('embedding'), () =>
      ctx.slots.register({
        name: providerSlotName('embedding'),
        id: providerSlotId('embedding', PROVIDER_ID),
        order: 0,
        label: () => t('label'),
        locale: NAMESPACE,
        inject: () => controller.inject(),
      }, JinaEmbeddingCard as never))),
    'dsh-ai-jina: embedding provider entry',
  )
}
