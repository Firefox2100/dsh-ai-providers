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
  interface SecretSpec { field: string; write: (text: string) => Promise<boolean> }
  class SettingsFormModel<T extends object> {
    private readonly drafts = new Map<string, string>()
    private readonly secrets: readonly SecretSpec[]
    private project: (() => unknown) | undefined
    private store: ReturnType<typeof createSnapshotStore> | undefined
    private failed = false

    constructor(private readonly formScope: SettingsFormScope<T>, _specs: readonly unknown[] = [], secrets: readonly SecretSpec[] = []) {
      this.secrets = [...secrets]
    }

    bind<S>(project: () => S) {
      this.project = project
      this.store = createSnapshotStore(project(), { flush: 'sync' })
      return this.store
    }

    shell() { return { available: true, writable: true, dirty: this.drafts.size > 0, invalid: false, saving: false, failed: this.failed } }

    field(field: string) {
      const draft = this.drafts.get(field)
      if (this.secrets.some(secret => secret.field === field)) return { text: draft ?? '', overridden: false, invalid: false }
      const value = this.formScope.getSnapshot().value?.[field as keyof T]
      return { text: draft ?? (typeof value === 'string' ? value : value === undefined ? '' : JSON.stringify(value)), overridden: false, invalid: false }
    }

    actions() {
      return {
        edit: (field: string, text: string) => { this.drafts.set(field, text); this.publish() },
        resetField: (field: string) => { this.drafts.delete(field); this.publish() },
        save: () => { void this.commit() },
        discard: () => { this.drafts.clear(); this.publish() },
      }
    }

    /** What the real model does with a card's secrets: write them in order, and keep the draft a refusal left behind. */
    private async commit(): Promise<void> {
      this.failed = false
      for (const secret of this.secrets) {
        const text = this.drafts.get(secret.field) ?? ''
        if (text.trim() === '') continue
        if (!await secret.write(text)) { this.failed = true; this.publish(); return }
        this.drafts.delete(secret.field)
      }
      this.publish()
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
import { ObservabilityController } from './observability/controller.ts'

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
      inject: () => undefined,
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
      inject: () => undefined,
    } as unknown as Context
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      capabilities: [{ capability: 'embedding', providers: [{ id: 'test' }], available: false }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })))

    const controller = new CapabilityController(ctx, scope({ embedding: '' }), 'embedding')
    await controller.refresh()

    expect(controller.inject().hooks.capability.getSnapshot()).toMatchObject({ available: true, serviceAvailable: false })
    controller.dispose()
  })

  it('reads the host again after a saved selection, so a stale "unavailable" does not wait for a reload', async () => {
    vi.useFakeTimers()
    let notify = () => {}
    let available = false
    const form = { ...scope({ embedding: 'test' }), subscribe: (listener: () => void) => { notify = listener; return () => {} } }
    const ctx = {
      slots: { entriesOfSlot: () => [], subscribe: () => () => {} }, locale: { subscribe: () => () => {} }, effect: () => {}, inject: () => undefined,
    } as unknown as Context
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      capabilities: [{ capability: 'embedding', providers: [{ id: 'test' }], available }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })))

    const controller = new CapabilityController(ctx, form, 'embedding')
    controller.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.inject().hooks.capability.getSnapshot()).toMatchObject({ serviceAvailable: false })
    available = true
    notify()
    await vi.advanceTimersByTimeAsync(2500)
    expect(controller.inject().hooks.capability.getSnapshot()).toMatchObject({ serviceAvailable: true })
    controller.dispose()
  })

  it('starts periodic concurrency reads while mounted and stops them with the page', async () => {
    vi.useFakeTimers()
    const ctx = { effect: () => {}, inject: () => undefined } as unknown as Context
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      limits: [{ id: 'gpu', running: 1, waiting: 2 }], routes: [{ id: 'local', name: 'Local' }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })))
    const controller = new ConcurrencyController(ctx, scope({ limits: [], maxWaitSeconds: 30 }))

    controller.start()
    await controller.refresh()
    expect(controller.inject().hooks.concurrency.getSnapshot()).toMatchObject({
      live: { gpu: { id: 'gpu', running: 1, waiting: 2 } }, routes: [{ id: 'local', name: 'Local' }],
    })

    await vi.advanceTimersByTimeAsync(3000)
    expect(fetch).toHaveBeenCalledTimes(3)
    controller.stop()
    await vi.advanceTimersByTimeAsync(9000)
    expect(fetch).toHaveBeenCalledTimes(3)
    controller.dispose()
  })

  it('can dispose a concurrency controller before polling starts', () => {
    const ctx = { effect: () => {}, inject: () => undefined } as unknown as Context
    const controller = new ConcurrencyController(ctx, scope({ limits: [] }))
    expect(() => { controller.dispose() }).not.toThrow()
  })

  it('loads routes and records successful and failed model probes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ routes: [{ id: 'route', name: 'Route', models: [] }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, text: 'ready' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('no', { status: 503, statusText: 'Unavailable' }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new LlmController({ inject: () => undefined } as unknown as Context)

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

  it('reads nothing until its page mounts, and stops cleanly more than once', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ routes: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new LlmController({ inject: () => undefined } as unknown as Context)

    expect(fetchMock).not.toHaveBeenCalled()
    controller.start()
    await vi.waitFor(() => { expect(fetchMock).toHaveBeenCalledTimes(1) })
    controller.stop()
    controller.stop()
    expect(() => { controller.dispose() }).not.toThrow()
  })

  it('writes a staged key on save, under its credential name, without keeping the value', async () => {
    const calls: { url: string; method: string; body?: string }[] = []
    let stored = false
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method ?? 'GET', ...typeof init?.body === 'string' ? { body: init.body } : {} })
      if (init?.method === 'POST') stored = true
      return new Response(JSON.stringify({ ref: 'X', configured: stored, writable: true, ...stored ? { source: 'file' } : {} }), { status: 200 })
    }))
    const controller = new ObservabilityController({ effect: () => {}, inject: () => undefined } as unknown as Context, scope({ traceEnabled: true, traceSink: 'both', langfusePublicKeyRef: 'MY_PUBLIC' }))
    controller.start()
    await vi.waitFor(() => { expect(controller.inject().hooks.observability.getSnapshot().keys.publicKey).toMatchObject({ configured: false }) })
    expect(controller.inject().hooks.observability.getSnapshot()).toMatchObject({ enabled: true })
    expect(calls[0]!.url).toContain('ref=MY_PUBLIC')
    expect(calls[1]!.url).toContain('ref=AI_PROVIDERS_LANGFUSE_SECRET_KEY')
    expect(calls.filter(call => call.method === 'POST')).toHaveLength(0)

    controller.inject().edit('publicKey', 'pk-lf-123')
    controller.inject().save()
    await vi.waitFor(() => { expect(controller.inject().hooks.observability.getSnapshot().keys.publicKey).toMatchObject({ configured: true, source: 'file' }) })
    expect(calls.find(call => call.method === 'POST')).toMatchObject({ body: JSON.stringify({ ref: 'MY_PUBLIC', value: 'pk-lf-123' }) })
    expect(JSON.stringify(controller.inject().hooks.observability.getSnapshot())).not.toContain('pk-lf-123')
    controller.dispose()
  })

  it('keeps a refused key in the form and says why the store refused it', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => init?.method === 'POST'
      ? new Response(JSON.stringify({ error: 'credential store is read only' }), { status: 403 })
      : new Response(JSON.stringify({ configured: false, writable: true }), { status: 200 })))
    const controller = new ObservabilityController({ effect: () => {}, inject: () => undefined } as unknown as Context, scope({}))
    controller.start()

    controller.inject().edit('publicKey', 'keep-this-value')
    controller.inject().save()
    await vi.waitFor(() => { expect(controller.inject().hooks.observability.getSnapshot().keyError).toBe('credential store is read only') })
    const refused = controller.inject().hooks.observability.getSnapshot()
    expect(refused.publicKey.text).toBe('keep-this-value')
    expect(refused.keys.publicKey).toMatchObject({ configured: false })
    expect(refused.failed).toBe(true)
    controller.dispose()
  })

  it('removes a stored key at once, without staging it', async () => {
    const bodies: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (typeof init?.body === 'string') bodies.push(init.body)
      return new Response(JSON.stringify({ configured: false, writable: true }), { status: 200 })
    }))
    const controller = new ObservabilityController({ effect: () => {}, inject: () => undefined } as unknown as Context, scope({ langfusePublicKeyRef: 'MY_PUBLIC' }))
    controller.start()

    expect(await controller.inject().removeKey('publicKey')).toBe(true)
    expect(bodies).toEqual([JSON.stringify({ ref: 'MY_PUBLIC', value: '' })])
    expect(controller.inject().hooks.observability.getSnapshot().publicKey.text).toBe('')
    controller.dispose()
  })
})
