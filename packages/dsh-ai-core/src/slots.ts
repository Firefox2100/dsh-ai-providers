import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type { Capability } from './capabilities.ts'

/**
 * The slot a vendor's client plugin fills to put its configuration into the main plugin's settings
 * tab of a capability. Import this file type-only (`import type {} from 'dsh-ai-core/slots'`).
 *
 * A vendor registers one entry per capability it offers, with `id` set to
 * `providerSlotId(capability, providerId)`, `order` and `label` (what the provider is called in the
 * list), and its component. The tab lists the entries of its capability, lets the user pick one,
 * and renders the picked entry's component.
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'ai.provider': { kind: 'list'; scope: 'root'; owner: AiProviderOwnerProps }
  }
}

/** What the tab passes to the component of the provider it shows. */
export interface AiProviderOwnerProps {
  capability: Capability
  children?: never
}
