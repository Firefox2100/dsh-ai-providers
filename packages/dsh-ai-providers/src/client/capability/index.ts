import { createElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
// Type-only: these pull in the Context and SlotMap augmentations this feature relies on.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@dsh-ai-providers/core/slots'
import { CAPABILITIES, type Capability } from '@dsh-ai-providers/core'
import { ENTRY_ID } from '../../shared/ids.ts'
import { nestedSection, storeHook, type FeaturePage } from '../page.tsx'
import { CapabilityController } from './controller.ts'
import { capabilitySection } from './CapabilitySection.tsx'
import { dictionariesOf, type CapabilityLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'ai.embedding': CapabilityLocaleKey
    'ai.rerank': CapabilityLocaleKey
    'ai.tts': CapabilityLocaleKey
    'ai.stt': CapabilityLocaleKey
    'ai.image': CapabilityLocaleKey
    'ai.decision': CapabilityLocaleKey
  }
}

/** The namespace of each capability's copy; one page each, inside the capabilities page. */
const NAMESPACES = {
  embedding: 'ai.embedding',
  rerank: 'ai.rerank',
  tts: 'ai.tts',
  stt: 'ai.stt',
  image: 'ai.image',
  decision: 'ai.decision',
} as const satisfies Record<Capability, string>

/** The capabilities page: one nested tab per capability, each selecting its provider and testing it. */
export function describeCapabilities(ctx: Context): FeaturePage {
  const pages: FeaturePage[] = CAPABILITIES.map((capability) => {
    const namespace = NAMESPACES[capability]
    const t = ctx.locale.bind(namespace)
    ctx.effect(() => ctx.locale.register(namespace, dictionariesOf[capability]), `dsh-ai-providers: ${capability} dictionaries`)
    const controller = new CapabilityController(ctx, ctx.configForms.get(ENTRY_ID), capability)
    controller.start()
    ctx.effect(() => () => { controller.dispose() }, `dsh-ai-providers: ${capability} tab`)
    const Body = capabilitySection(capability)
    const face = controller.inject()
    return { id: capability, label: t('tab'), render: props => createElement(Body, { ...props, t, ...face, useCapability: storeHook(face.hooks.capability) }) }
  })
  const t = ctx.locale.bind('ai.providers')
  const Nested = nestedSection(pages, t('capabilities'))
  return { id: 'capabilities', label: t('pageCapabilities'), render: props => createElement(Nested, props) }
}
