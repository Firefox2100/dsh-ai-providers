import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@dsh-ai-providers/core/slots'
import { ENTRY_ID } from '../shared/ids.ts'
import { describeCapabilities } from './capability/index.ts'
import { describeConcurrency } from './concurrency/index.ts'
import { describeLlm } from './llm/index.ts'
import { describeObservability } from './observability/index.ts'
import { settingsSection } from './page.tsx'
import { describeProviders } from './providers/index.ts'

/** Union of what the pages need. */
export const inject = ['slots', 'locale', 'configForms', 'remote']

/**
 * One settings page for everything this plugin configures, with a tab per subject: the shared provider endpoints,
 * the language models served to DSH, the capability selections, the concurrency limits and the trace settings. Vendor
 * halves contribute cards to the provider slots this page owns, so a new provider needs no new page.
 */
export function apply(ctx: Context): void {
  const t = ctx.locale.bind('ai.providers')
  const pages = [
    describeProviders(ctx),
    describeLlm(ctx),
    describeCapabilities(ctx),
    describeConcurrency(ctx),
    describeObservability(ctx),
  ]
  const Section = settingsSection(pages, t('tablist'))
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('settings.section', () => ctx.slots.register({
      name: 'settings.section',
      id: 'ai-providers',
      order: 42,
      label: () => t('section'),
      locale: 'ai.providers',
      children: {
        'ai.provider.connection': { kind: 'list', scope: 'root' },
        'ai.provider.llm': { kind: 'list', scope: 'root' },
        'ai.provider.embedding': { kind: 'list', scope: 'root' },
        'ai.provider.rerank': { kind: 'list', scope: 'root' },
        'ai.provider.tts': { kind: 'list', scope: 'root' },
        'ai.provider.stt': { kind: 'list', scope: 'root' },
        'ai.provider.image': { kind: 'list', scope: 'root' },
        'ai.provider.decision': { kind: 'list', scope: 'root' },
      },
    }, Section as never))),
    'dsh-ai-providers: settings section',
  )
}
