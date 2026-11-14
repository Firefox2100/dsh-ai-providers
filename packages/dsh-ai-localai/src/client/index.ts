import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { providerSlotId, providerSlotName } from '@dsh-ai-providers/core'
import type {} from '@dsh-ai-providers/core/slots'
import { ENTRY_ID, PROVIDER_ID } from '../ids.ts'
import { Card, LlmCard } from './Card.tsx'
import { Connections } from './Connections.tsx'
import { Controller } from './controller.ts'
import { dictionaries } from './locales.ts'

const locale = 'ai.localai'

export const inject = ['slots', 'locale', 'configForms']
export function apply(ctx: Context): void {
  const t = ctx.locale.bind(locale)
  ctx.effect(() => ctx.locale.register(locale, dictionaries), 'dsh-ai-localai: dictionaries')
  const controller = new Controller(ctx.configForms.get(ENTRY_ID))
  controller.start()
  ctx.effect(() => () => { controller.dispose() }, 'dsh-ai-localai: form')
  ctx.effect(() => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('ai.provider.connection', () => ctx.slots.register({ name: 'ai.provider.connection', id: `connection:${PROVIDER_ID}`, order: 5, label: () => t('label'), locale, inject: () => controller.inject() }, Connections as never))), 'dsh-ai-localai: provider connection entry')
  ctx.effect(() => ctx.slots.inject('ai.provider.llm', () => ctx.slots.register({ name: 'ai.provider.llm', id: `llm:${PROVIDER_ID}`, order: 2, label: () => t('label'), locale, inject: () => controller.inject() }, LlmCard as never)), 'dsh-ai-localai: llm entry')
  for (const capability of ['embedding', 'rerank', 'tts', 'stt', 'image', 'decision'] as const) {
    ctx.effect(() => ctx.slots.inject(providerSlotName(capability), () => ctx.slots.register({ name: providerSlotName(capability), id: providerSlotId(capability, PROVIDER_ID), order: 2, label: () => t('label'), locale, inject: () => controller.inject() }, Card as never)), `dsh-ai-localai: ${capability} entry`)
  }
}
