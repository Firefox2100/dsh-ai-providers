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
import { Connections, EmbeddingSettings, ImageSettings, LlmSettings, RerankSettings, SttSettings, TtsSettings } from './Settings.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.dashscope': Key
  }
}

const NAMESPACE = 'ai.dashscope'

export const inject = ['slots', 'locale', 'configForms']

/** Puts the provider's connections, route editor and embedding form into the settings, while its plugin serves its form. */
export function apply(ctx: Context): void {
  const t = ctx.locale.bind(NAMESPACE)
  ctx.effect(() => ctx.locale.register(NAMESPACE, dictionaries), 'dsh-ai-dashscope: dictionaries')

  const controller = new Controller(ctx.configForms.get(ENTRY_ID))
  controller.start()
  ctx.effect(() => () => { controller.dispose() }, 'dsh-ai-dashscope: form')

  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('ai.provider.connection', () =>
      ctx.slots.register({ name: 'ai.provider.connection', id: `connection:${PROVIDER_ID}`, order: 4, label: () => t('label'), locale: NAMESPACE, inject: () => controller.inject() }, Connections as never))),
    'dsh-ai-dashscope: provider connection entry',
  )

  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('ai.provider.llm', () =>
      ctx.slots.register({ name: 'ai.provider.llm', id: `llm:${PROVIDER_ID}`, order: 3, label: () => t('label'), locale: NAMESPACE, inject: () => controller.inject() }, LlmSettings as never))),
    'dsh-ai-dashscope: llm',
  )
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject(providerSlotName('embedding'), () =>
      ctx.slots.register({ name: providerSlotName('embedding'), id: providerSlotId('embedding', PROVIDER_ID), order: 3, label: () => t('label'), locale: NAMESPACE, inject: () => controller.inject() }, EmbeddingSettings as never))),
    'dsh-ai-dashscope: embedding',
  )
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject(providerSlotName('rerank'), () =>
      ctx.slots.register({ name: providerSlotName('rerank'), id: providerSlotId('rerank', PROVIDER_ID), order: 3, label: () => t('label'), locale: NAMESPACE, inject: () => controller.inject() }, RerankSettings as never))),
    'dsh-ai-dashscope: rerank',
  )
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject(providerSlotName('tts'), () =>
      ctx.slots.register({ name: providerSlotName('tts'), id: providerSlotId('tts', PROVIDER_ID), order: 3, label: () => t('label'), locale: NAMESPACE, inject: () => controller.inject() }, TtsSettings as never))),
    'dsh-ai-dashscope: tts',
  )
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject(providerSlotName('stt'), () =>
      ctx.slots.register({ name: providerSlotName('stt'), id: providerSlotId('stt', PROVIDER_ID), order: 3, label: () => t('label'), locale: NAMESPACE, inject: () => controller.inject() }, SttSettings as never))),
    'dsh-ai-dashscope: stt',
  )
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject(providerSlotName('image'), () =>
      ctx.slots.register({ name: providerSlotName('image'), id: providerSlotId('image', PROVIDER_ID), order: 3, label: () => t('label'), locale: NAMESPACE, inject: () => controller.inject() }, ImageSettings as never))),
    'dsh-ai-dashscope: image',
  )
}
