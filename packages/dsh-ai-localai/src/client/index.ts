import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { providerSlotId, providerSlotName } from '@dsh-ai-providers/core'
import type {} from '@dsh-ai-providers/core/slots'
import { PROVIDER_ID } from '../ids.ts'
import { Card, LlmCard } from './Card.tsx'

type Key = 'label' | 'title' | 'description' | 'llmDescription' | 'capability' | 'configure'
declare module '@deepseek-ai/dsh-client-ui-slots' { interface LocaleNamespaceMap { 'ai.localai': Key } }
const locale = 'ai.localai'
const dictionaries = {
  en: { label: 'LocalAI', title: 'LocalAI', description: 'Use this LocalAI instance for the selected capability.', llmDescription: 'OpenAI-compatible chat with LocalAI sampling, grammar and backend fields available through route JSON.', capability: 'Capability', configure: 'Configure connections, models and native options in the LocalAI plugin settings.' },
  zh: { label: 'LocalAI', title: 'LocalAI', description: '将此 LocalAI 实例用于所选能力。', llmDescription: '通过 OpenAI 兼容对话使用 LocalAI；采样、语法及后端字段可在路由 JSON 中配置。', capability: '能力', configure: '请在 LocalAI 插件设置中配置连接、模型及原生选项。' },
}

export const inject = ['slots', 'locale']
export function apply(ctx: Context): void {
  const t = ctx.locale.bind(locale)
  ctx.effect(() => ctx.locale.register(locale, dictionaries), 'dsh-ai-localai: dictionaries')
  ctx.effect(() => ctx.slots.inject('ai.provider.llm', () => ctx.slots.register({ name: 'ai.provider.llm', id: `llm:${PROVIDER_ID}`, order: 2, label: () => t('label'), locale }, LlmCard as never)), 'dsh-ai-localai: llm entry')
  for (const capability of ['embedding', 'rerank', 'tts', 'stt', 'image'] as const) {
    ctx.effect(() => ctx.slots.inject(providerSlotName(capability), () => ctx.slots.register({ name: providerSlotName(capability), id: providerSlotId(capability, PROVIDER_ID), order: 2, label: () => t('label'), locale }, Card as never)), `dsh-ai-localai: ${capability} entry`)
  }
}
