import type { SettingsFormScope, SettingsFormScopeSnapshot } from '@deepseek-ai/dsh-client-ui-primitives'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@deepseek-ai/dsh-client-store', () => ({
  createSnapshotStore: <T>(initial: T) => {
    let value = initial
    return { getSnapshot: () => value, set: (next: T) => { value = next }, subscribe: () => () => {} }
  },
}))

vi.mock('@deepseek-ai/dsh-client-ui-primitives', async () => {
  const { createSnapshotStore } = await import('@deepseek-ai/dsh-client-store')
  class SettingsFormModel<T extends object> {
    constructor(private readonly scope: SettingsFormScope<T>) {}
    bind<S>(project: () => S) { return createSnapshotStore(project()) }
    shell() { return { available: true, writable: true, dirty: false, invalid: false, saving: false, failed: false } }
    field(field: string) {
      const value = this.scope.getSnapshot().value?.[field as keyof T]
      return { text: typeof value === 'string' ? value : value === undefined ? '' : JSON.stringify(value), overridden: false, invalid: false }
    }
    actions() { return { edit: () => {}, resetField: () => {}, save: () => {}, discard: () => {} } }
    dispose() {}
  }
  const field = (name: string) => ({ field: name, format: String, parse: (text: string) => ({ kind: 'set', value: text }) })
  return { SettingsFormModel, settingsNumberField: field, settingsTextField: field }
})

import { TypeSafeCardController } from './controller.ts'

afterEach(() => { vi.unstubAllGlobals() })

describe('TypeSafe client controller', () => {
  it('reads credential state after start and releases its subscription', async () => {
    const unsubscribe = vi.fn()
    const snapshot: SettingsFormScopeSnapshot<{
      connections: Array<{ id: string; name: string; baseUrl: string; apiKeyRef: string }>
    }> = {
      status: 'ready',
      value: { connections: [{ id: 'typesafe', name: 'TypeSafe', baseUrl: 'https://api.typesafe.ai/v1', apiKeyRef: 'TYPESAFE_KEY' }] },
      base: {}, user: {}, writable: true, revision: 1,
    }
    const scope: SettingsFormScope<typeof snapshot.value & object> = {
      getSnapshot: () => snapshot,
      subscribe: () => unsubscribe,
      mutate: async () => true,
    }
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ configured: true, source: 'environment' })))
    const controller = new TypeSafeCardController(scope)

    controller.start()
    await vi.waitFor(() => {
      expect(controller.inject().hooks.typeSafeCard.getSnapshot().connectionStatus).toEqual({
        TYPESAFE_KEY: { configured: true, source: 'environment' },
      })
    })
    controller.dispose()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})
