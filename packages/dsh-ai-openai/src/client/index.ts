import type { Context } from '@deepseek-ai/cordis'
// Type-only: these pull in the Context and SlotMap augmentations this feature relies on.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { providerSlotId, providerSlotName } from 'dsh-ai-core'
import type {} from 'dsh-ai-core/slots'
import { ENTRY_ID, PROVIDER_ID } from '../ids.ts'
import { OpenAiCardController } from './controller.ts'
import { OpenAiCard } from './OpenAiCard.tsx'
import { OpenAiConnections } from './OpenAiConnections.tsx'
import { OpenAiLlm } from './LlmEditor.tsx'
import { dictionaries, type OpenAiLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.openai': OpenAiLocaleKey
  }
}

const NAMESPACE = 'ai.openai'

/** Union of what the card needs. */
export const inject = ['slots', 'locale', 'configForms']

/** Puts the provider's shared configuration into every capability tab it supplies. */
export function apply(ctx: Context): void {
  const t = ctx.locale.bind(NAMESPACE)
  ctx.effect(() => ctx.locale.register(NAMESPACE, dictionaries), 'dsh-ai-openai: dictionaries')

  const controller = new OpenAiCardController(ctx.configForms.get(ENTRY_ID))
  ctx.effect(() => () => { controller.dispose() }, 'dsh-ai-openai: form')

  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('settings.section', () =>
      ctx.slots.register({
        name: 'settings.section', id: 'ai-openai-connections', order: 44,
        label: () => t('connectionsNav'), locale: NAMESPACE, inject: () => controller.inject(),
      }, OpenAiConnections as never))),
    'dsh-ai-openai: connections section',
  )

  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('ai.provider.llm', () =>
      ctx.slots.register({
        name: 'ai.provider.llm', id: `llm:${PROVIDER_ID}`, order: 0,
        label: () => t('label'), locale: NAMESPACE, inject: () => controller.inject(),
      }, OpenAiLlm as never))),
    'dsh-ai-openai: llm provider entry',
  )

  // The entry only exists while the provider's plugin is loaded and serves its form.
  for (const capability of ['embedding', 'tts', 'stt', 'image'] as const) {
    ctx.effect(
      () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject(providerSlotName(capability), () =>
        ctx.slots.register({
          name: providerSlotName(capability),
          id: providerSlotId(capability, PROVIDER_ID),
          order: 0,
          label: () => t('label'),
          locale: NAMESPACE,
          inject: () => controller.inject(),
        }, OpenAiCard as never))),
      `dsh-ai-openai: ${capability} provider entry`,
    )
  }
}
