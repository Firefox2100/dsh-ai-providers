import type {Context} from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@dsh-ai-providers/core/slots'
import {ENTRY_ID,PROVIDER_ID} from '../ids.ts'
import {Controller} from './controller.ts'
import {Connections,LlmSettings} from './Settings.tsx'
import {dictionaries,type Key} from './locales.ts'
declare module '@deepseek-ai/dsh-client-ui-slots'{interface LocaleNamespaceMap{'ai.anthropic':Key}}
export const inject=['slots','locale','configForms'];const N='ai.anthropic'
export function apply(ctx:Context){const t=ctx.locale.bind(N);ctx.effect(()=>ctx.locale.register(N,dictionaries),'dsh-ai-anthropic: dictionaries');const controller=new Controller(ctx.configForms.get(ENTRY_ID));controller.start();ctx.effect(()=>()=>controller.dispose(),'dsh-ai-anthropic: form');ctx.effect(()=>ctx.configForms.whileServed([ENTRY_ID],()=>ctx.slots.inject('ai.provider.connection',()=>ctx.slots.register({name:'ai.provider.connection',id:`connection:${PROVIDER_ID}`,order:1,label:()=>t('label'),locale:N,inject:()=>controller.inject()},Connections as never))),'dsh-ai-anthropic: provider connection entry');ctx.effect(()=>ctx.configForms.whileServed([ENTRY_ID],()=>ctx.slots.inject('ai.provider.llm',()=>ctx.slots.register({name:'ai.provider.llm',id:`llm:${PROVIDER_ID}`,order:1,label:()=>t('label'),locale:N,inject:()=>controller.inject()},LlmSettings as never))),'dsh-ai-anthropic: llm')}
