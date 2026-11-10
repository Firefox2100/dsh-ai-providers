import { createElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
// Type-only: these pull in the Context and SlotMap augmentations this feature relies on.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { ENTRY_ID } from '../../shared/ids.ts'
import { storeHook, type FeaturePage } from '../page.tsx'
import { ConcurrencyController } from './controller.ts'
import { ConcurrencySection } from './ConcurrencySection.tsx'
import { dictionaries, type ConcurrencyLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.concurrency': ConcurrencyLocaleKey
  }
}

const NAMESPACE = 'ai.concurrency'

/** The concurrency page: which shared resources hold calls back, and what runs and waits on each now. */
export function describeConcurrency(ctx: Context): FeaturePage {
  const t = ctx.locale.bind(NAMESPACE)
  ctx.effect(() => ctx.locale.register(NAMESPACE, dictionaries), 'dsh-ai-providers: concurrency dictionaries')
  const controller = new ConcurrencyController(ctx.configForms.get(ENTRY_ID))
  controller.start(ctx)
  ctx.effect(() => () => { controller.dispose() }, 'dsh-ai-providers: concurrency tab')
  const face = controller.inject()
  return { id: 'concurrency', label: t('nav'), render: props => createElement(ConcurrencySection, { ...props, t, ...face, useConcurrency: storeHook(face.hooks.concurrency) }) }
}
