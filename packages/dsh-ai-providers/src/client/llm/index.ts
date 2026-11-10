import { createElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
// Type-only: these pull in the Context and SlotMap augmentations this feature relies on.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@dsh-ai-providers/core/slots'
import { storeHook, type FeaturePage } from '../page.tsx'
import { LlmController } from './controller.ts'
import { LlmSection } from './LlmSection.tsx'
import { dictionaries, type LlmLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.llm': LlmLocaleKey
  }
}

const NAMESPACE = 'ai.llm'

/** The language models page: which routes the providers serve to DSH, and whether a model answers. */
export function describeLlm(ctx: Context): FeaturePage {
  const t = ctx.locale.bind(NAMESPACE)
  ctx.effect(() => ctx.locale.register(NAMESPACE, dictionaries), 'dsh-ai-providers: llm dictionaries')
  const controller = new LlmController()
  controller.start(ctx)
  ctx.effect(() => () => { controller.dispose() }, 'dsh-ai-providers: llm tab')
  const face = controller.inject()
  return { id: 'llm', label: () => t('nav'), render: props => createElement(LlmSection, { ...props, t, ...face, useLlm: storeHook(face.hooks.llm) }) }
}
