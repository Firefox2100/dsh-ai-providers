import type { Context } from '@deepseek-ai/cordis'
// Type-only: these pull in the Context and SlotMap augmentations this feature relies on.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { providerSlotId, providerSlotName } from '@dsh-ai-providers/core'
import type {} from '@dsh-ai-providers/core/slots'
import { ENTRY_ID, PROVIDER_ID } from '../ids.ts'
import { Controller } from './controller.ts'
import { dictionaries, type Key } from './locales.ts'
import { Connections, EmbeddingSettings, LlmSettings, RerankSettings } from './Settings.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.cohere': Key
  }
}

const NAMESPACE = 'ai.cohere'

export const inject = ['slots', 'locale', 'configForms']

/** Puts the provider's connections, route editor and embedding form into the settings, while its plugin serves its form. */
export function apply(ctx: Context): void {
  const t = ctx.locale.bind(NAMESPACE)
  ctx.effect(() => ctx.locale.register(NAMESPACE, dictionaries), 'dsh-ai-cohere: dictionaries')

  const controller = new Controller(ctx.configForms.get(ENTRY_ID))
  controller.start()
  ctx.effect(() => () => { controller.dispose() }, 'dsh-ai-cohere: form')

  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('ai.provider.connection', () =>
      ctx.slots.register({ name: 'ai.provider.connection', id: `connection:${PROVIDER_ID}`, order: 4, label: () => t('label'), locale: NAMESPACE, inject: () => controller.inject() }, Connections as never))),
    'dsh-ai-cohere: provider connection entry',
  )

  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('ai.provider.llm', () =>
      ctx.slots.register({ name: 'ai.provider.llm', id: `llm:${PROVIDER_ID}`, order: 3, label: () => t('label'), locale: NAMESPACE, inject: () => controller.inject() }, LlmSettings as never))),
    'dsh-ai-cohere: llm',
  )
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject(providerSlotName('embedding'), () =>
      ctx.slots.register({ name: providerSlotName('embedding'), id: providerSlotId('embedding', PROVIDER_ID), order: 3, label: () => t('label'), locale: NAMESPACE, inject: () => controller.inject() }, EmbeddingSettings as never))),
    'dsh-ai-cohere: embedding',
  )
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject(providerSlotName('rerank'), () =>
      ctx.slots.register({ name: providerSlotName('rerank'), id: providerSlotId('rerank', PROVIDER_ID), order: 3, label: () => t('label'), locale: NAMESPACE, inject: () => controller.inject() }, RerankSettings as never))),
    'dsh-ai-cohere: rerank',
  )
}
