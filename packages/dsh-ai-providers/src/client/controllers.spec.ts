import type { Context } from '@deepseek-ai/cordis'
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
    private readonly drafts = new Map<string, string>()
    private project: (() => unknown) | undefined
    private store: ReturnType<typeof createSnapshotStore> | undefined

    constructor(private readonly formScope: SettingsFormScope<T>) {}

    bind<S>(project: () => S) {
      this.project = project
      this.store = createSnapshotStore(project(), { flush: 'sync' })
      return this.store
    }

    shell() { return { available: true, writable: true, dirty: false, invalid: false, saving: false, failed: false } }
    field(field: string) {
      const value = this.formScope.getSnapshot().value?.[field as keyof T]
      return { text: this.drafts.get(field) ?? (typeof value === 'string' ? value : value === undefined ? '' : JSON.stringify(value)), overridden: false, invalid: false }
    }

    actions() {
      return {
        edit: (field: string, text: string) => { this.drafts.set(field, text); this.publish() },
        resetField: (field: string) => { this.drafts.delete(field); this.publish() },
        save: () => {}, discard: () => { this.drafts.clear(); this.publish() },
      }
    }

    dispose() {}
    private publish() { if (this.project && this.store) this.store.set(this.project()) }
  }
  const field = (name: string) => ({ field: name, format: String, parse: (text: string) => ({ kind: 'set', value: text }) })
  return { SettingsFormModel, settingsNumberField: field, settingsTextField: field }
})

import { CapabilityController } from './capability/controller.ts'
import { ConcurrencyController } from './concurrency/controller.ts'
import { LlmController } from './llm/controller.ts'

function scope<T>(value: T): SettingsFormScope<T> {
  const snapshot: SettingsFormScopeSnapshot<T> = {
    status: 'ready', value, base: {}, user: {}, writable: true, revision: 1,
  }
  return { getSnapshot: () => snapshot, subscribe: () => () => {}, mutate: async () => true }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('client controllers', () => {
  it('starts and disposes the capability controller lifecycle', async () => {
    const disposeSlot = vi.fn()
    const disposeLocale = vi.fn()
    const effects: Array<() => void> = []
    const ctx = {
      slots: {
        entriesOfSlot: () => [{ options: { id: 'embedding:test', order: 1, label: 'Test' } }],
        subscribe: (_name: string, listener: () => void) => { listener(); return disposeSlot },
      },
      locale: { subscribe: (listener: () => void) => { listener(); return disposeLocale } },
      effect: (setup: () => () => void) => { effects.push(setup()) },
    } as unknown as Context
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      capabilities: [{ capability: 'embedding', providers: [{ id: 'test' }], available: true }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })))

    const controller = new CapabilityController(ctx, scope({ embedding: 'test' }), 'embedding')
    controller.start()
    await controller.refresh()

    expect(controller.inject().hooks.capability.getSnapshot()).toMatchObject({
      status: 'ready', available: true, serviceAvailable: true, providers: [{ id: 'test', label: 'Test', loaded: true }],
    })
    effects.forEach(dispose => { dispose() })
    expect(disposeSlot).toHaveBeenCalledOnce()
    expect(disposeLocale).toHaveBeenCalledOnce()
    controller.dispose()
  })

  it('keeps its form usable while the service is down, or no provider could ever be chosen', async () => {
    const ctx = {
      slots: { entriesOfSlot: () => [{ options: { id: 'embedding:test', order: 1, label: 'Test' } }], subscribe: () => () => {} },
      locale: { subscribe: () => () => {} },
      effect: () => {},
    } as unknown as Context
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      capabilities: [{ capability: 'embedding', providers: [{ id: 'test' }], available: false }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })))

    const controller = new CapabilityController(ctx, scope({ embedding: '' }), 'embedding')
    await controller.refresh()

    expect(controller.inject().hooks.capability.getSnapshot()).toMatchObject({ available: true, serviceAvailable: false })
    controller.dispose()
  })

  it('starts periodic concurrency reads and exposes the returned status', async () => {
    vi.useFakeTimers()
    const disposers: Array<() => void> = []
    const ctx = { effect: (setup: () => () => void) => { disposers.push(setup()) } } as unknown as Context
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      limits: [{ id: 'gpu', running: 1, waiting: 2 }], routes: [{ id: 'local', name: 'Local' }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })))
    const controller = new ConcurrencyController(scope({ limits: [], maxWaitSeconds: 30 }))

    controller.start(ctx)
    await controller.refresh()
    expect(controller.inject().hooks.concurrency.getSnapshot()).toMatchObject({
      live: { gpu: { id: 'gpu', running: 1, waiting: 2 } }, routes: [{ id: 'local', name: 'Local' }],
    })

    await vi.advanceTimersByTimeAsync(3000)
    expect(fetch).toHaveBeenCalledTimes(3)
    disposers.forEach(dispose => { dispose() })
  })

  it('can dispose a concurrency controller before polling starts', () => {
    const controller = new ConcurrencyController(scope({ limits: [] }))
    expect(() => { controller.dispose() }).not.toThrow()
  })

  it('loads routes and records successful and failed model probes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ routes: [{ id: 'route', name: 'Route', models: [] }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, text: 'ready' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('no', { status: 503, statusText: 'Unavailable' }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new LlmController()

    controller.start()
    await vi.waitFor(() => {
      expect(controller.inject().hooks.llm.getSnapshot().status).toBe('ready')
    })
    await controller.probe('route', 'good/model')
    await controller.probe('route', 'bad')

    const snapshot = controller.inject().hooks.llm.getSnapshot()
    expect(snapshot.routes).toHaveLength(1)
    expect(snapshot.probes['route/good/model']).toEqual({ status: 'done', result: { ok: true, text: 'ready' } })
    expect(snapshot.probes['route/bad']).toEqual({
      status: 'done', result: { ok: false, code: 'internal', message: '503 Unavailable' },
    })
    expect(fetchMock.mock.calls[1]?.[0]).toContain('model=good%2Fmodel')
    controller.dispose()
  })
})
