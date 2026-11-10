import { createElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
// Type-only: these pull in the Context and SlotMap augmentations this feature relies on.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { ENTRY_ID } from '../../shared/ids.ts'
import { storeHook, type FeaturePage } from '../page.tsx'
import { ObservabilityController } from './controller.ts'
import { ObservabilitySection } from './ObservabilitySection.tsx'
import { dictionaries, type ObservabilityLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.observability': ObservabilityLocaleKey
  }
}

const NAMESPACE = 'ai.observability'

/** The observability page: whether calls are recorded, where, how much, and the Langfuse keys. */
export function describeObservability(ctx: Context): FeaturePage {
  const t = ctx.locale.bind(NAMESPACE)
  ctx.effect(() => ctx.locale.register(NAMESPACE, dictionaries), 'dsh-ai-providers: observability dictionaries')
  const controller = new ObservabilityController(ctx.configForms.get(ENTRY_ID))
  controller.start(ctx)
  ctx.effect(() => () => { controller.dispose() }, 'dsh-ai-providers: observability tab')
  const face = controller.inject()
  return { id: 'observability', label: t('nav'), render: props => createElement(ObservabilitySection, { ...props, t, ...face, useObservability: storeHook(face.hooks.observability) }) }
}
