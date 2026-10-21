import { describe, expect, it, vi } from 'vitest'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  SettingsFormModel: class {}, settingsNumberField: vi.fn(), settingsTextField: vi.fn(),
}))

import { Controller } from './controller.ts'

describe('Anthropic client controller lifecycle', () => {
  it('starts credential synchronization and releases its resources', () => {
    let notify = () => {}
    const unsubscribe = vi.fn()
    const read = vi.fn(async () => {})
    const abort = { abort: vi.fn() }
    const form = { dispose: vi.fn() }
    const controller = Object.assign(Object.create(Controller.prototype), {
      scope: { subscribe: (listener: () => void) => { notify = listener; return unsubscribe } },
      read, abort, form,
    }) as Controller

    controller.start()
    notify()
    expect(read).toHaveBeenCalledTimes(2)

    controller.dispose()
    expect(abort.abort).toHaveBeenCalledOnce()
    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(form.dispose).toHaveBeenCalledOnce()
  })
})
