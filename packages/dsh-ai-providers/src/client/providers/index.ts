import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@dsh-ai-providers/core/slots'
import { ENTRY_ID } from '../../shared/ids.ts'
import { dictionaries, type ProvidersLocaleKey } from './locales.ts'
import { ProvidersSection } from './ProvidersSection.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.providers': ProvidersLocaleKey
  }
}

const NAMESPACE = 'ai.providers'

export function registerProviders(ctx: Context): void {
  const t = ctx.locale.bind(NAMESPACE)
  ctx.effect(() => ctx.locale.register(NAMESPACE, dictionaries), 'dsh-ai-providers: providers dictionaries')
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('settings.section', () => ctx.slots.register({
      name: 'settings.section',
      id: 'ai-provider-connections',
      order: 42,
      label: () => t('nav'),
      locale: NAMESPACE,
      children: { 'ai.provider.connection': { kind: 'list', scope: 'root' } },
    }, ProvidersSection as never))),
    'dsh-ai-providers: providers section',
  )
}
