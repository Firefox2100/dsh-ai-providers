import type { Context } from '@deepseek-ai/cordis'
// Type-only: these pull in the Context and SlotMap augmentations this feature relies on.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from 'dsh-ai-core/slots'
import { ENTRY_ID } from '../../shared/ids.ts'
import { EmbeddingController } from './controller.ts'
import { EmbeddingSection } from './EmbeddingSection.tsx'
import { dictionaries, type EmbeddingLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.embedding': EmbeddingLocaleKey
  }
}

const NAMESPACE = 'ai.embedding'

/** Adds the Embedding tab to the settings modal. */
export function registerEmbedding(ctx: Context): void {
  const t = ctx.locale.bind(NAMESPACE)
  ctx.effect(() => ctx.locale.register(NAMESPACE, dictionaries), 'dsh-ai-providers: embedding dictionaries')

  const controller = new EmbeddingController(ctx, ctx.configForms.get(ENTRY_ID))
  ctx.effect(() => () => { controller.dispose() }, 'dsh-ai-providers: embedding tab')

  // The tab only exists while the host plugin is loaded and serves its form.
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('settings.section', () =>
      ctx.slots.register({
        name: 'settings.section',
        id: 'ai-embedding',
        order: 45,
        label: () => t('nav'),
        locale: NAMESPACE,
        inject: () => controller.inject(),
        children: { 'ai.provider': { kind: 'list', scope: 'root' } },
      }, EmbeddingSection))),
    'dsh-ai-providers: embedding section',
  )
}
