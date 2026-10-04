import type { Context } from '@deepseek-ai/cordis'
// Type-only: these pull in the Context and SlotMap augmentations this feature relies on.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from 'dsh-ai-core/slots'
import { CAPABILITIES, providerSlotName, type Capability } from 'dsh-ai-core'
import { ENTRY_ID } from '../../shared/ids.ts'
import { CapabilityController } from './controller.ts'
import { capabilitySection } from './CapabilitySection.tsx'
import { dictionariesOf, type CapabilityLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.embedding': CapabilityLocaleKey
    'ai.rerank': CapabilityLocaleKey
  }
}

/** Where each capability's tab sits in the settings modal, and the namespace of its copy. */
const TABS = {
  embedding: { id: 'ai-embedding', order: 45, namespace: 'ai.embedding' },
  rerank: { id: 'ai-rerank', order: 46, namespace: 'ai.rerank' },
} as const satisfies Record<Capability, { id: string; order: number; namespace: 'ai.embedding' | 'ai.rerank' }>

function registerTab(ctx: Context, capability: Capability): void {
  const { id, order, namespace } = TABS[capability]
  const t = ctx.locale.bind(namespace)
  ctx.effect(() => ctx.locale.register(namespace, dictionariesOf[capability]), `dsh-ai-providers: ${capability} dictionaries`)

  const controller = new CapabilityController(ctx, ctx.configForms.get(ENTRY_ID), capability)
  ctx.effect(() => () => { controller.dispose() }, `dsh-ai-providers: ${capability} tab`)

  // The tab only exists while the host plugin is loaded and serves its form.
  ctx.effect(
    () => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('settings.section', () =>
      ctx.slots.register({
        name: 'settings.section',
        id,
        order,
        label: () => t('nav'),
        locale: namespace,
        inject: () => controller.inject(),
        children: { [providerSlotName(capability)]: { kind: 'list', scope: 'root' } },
      }, capabilitySection(capability) as never))),
    `dsh-ai-providers: ${capability} section`,
  )
}

/** Adds a tab to the settings modal for each capability. */
export function registerCapabilities(ctx: Context): void {
  for (const capability of CAPABILITIES) registerTab(ctx, capability)
}
