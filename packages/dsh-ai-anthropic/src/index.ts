import type {Context} from '@deepseek-ai/cordis'
import type {} from 'dsh-ai-core'
import type {} from '@deepseek-ai/dsh-credentials'
import {Config} from './config.ts'
import {AnthropicLlmService} from './llm/service.ts'
import {ENTRY_ID, PROVIDER_ID} from './ids.ts'

export {Config} from './config.ts'
export type {AnthropicConnectionConfig, AnthropicLlmModelConfig, AnthropicLlmRouteConfig, AnthropicSamplingConfig} from './config.ts'
export {AnthropicLlmService} from './llm/service.ts'
export {wireBody, wireConversation} from './llm/serialize.ts'
export {translate} from './llm/translate.ts'
export {ENTRY_ID, PROVIDER_ID} from './ids.ts'
export const name = 'dsh-ai-anthropic'
export const inject = ['aiProviders']

export function apply(ctx: Context, config: Config): void {
  ctx.effect(() => ctx.aiProviders.register({id: PROVIDER_ID, label: 'Anthropic', configEntryId: ENTRY_ID, capabilities: {}, llm: () => new AnthropicLlmService({config, credentials: () => ctx.get('credentials'), attachments: () => ctx.get('attachments') as never})}), 'dsh-ai-anthropic: provider')
}
