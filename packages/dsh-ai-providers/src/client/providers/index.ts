import { createElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
// Type-only: these pull in the Context and SlotMap augmentations this feature relies on.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@dsh-ai-providers/core/slots'
import type { FeaturePage } from '../page.tsx'
import { dictionaries, type ProvidersLocaleKey } from './locales.ts'
import { ProvidersSection } from './ProvidersSection.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.providers': ProvidersLocaleKey
  }
}

const NAMESPACE = 'ai.providers'

/** The providers page: the endpoints and credentials every capability reuses, one card per installed provider. */
export function describeProviders(ctx: Context): FeaturePage {
  const t = ctx.locale.bind(NAMESPACE)
  ctx.effect(() => ctx.locale.register(NAMESPACE, dictionaries), 'dsh-ai-providers: providers dictionaries')
  return { id: 'providers', label: t('nav'), render: props => createElement(ProvidersSection, { ...props, t }) }
}
