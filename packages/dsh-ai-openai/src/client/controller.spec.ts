import { describe, expect, it, vi } from 'vitest'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  SettingsFormModel: class {}, settingsNumberField: vi.fn(), settingsTextField: vi.fn(),
}))

import { OpenAiCardController } from './controller.ts'

describe('OpenAI client controller lifecycle', () => {
  it('starts credential synchronization and releases its resources', () => {
    let notify = () => {}
    const unsubscribe = vi.fn()
    const readCredentials = vi.fn(async () => {})
    const abort = { abort: vi.fn() }
    const form = { dispose: vi.fn() }
    const controller = Object.assign(Object.create(OpenAiCardController.prototype), {
      scope: { subscribe: (listener: () => void) => { notify = listener; return unsubscribe } },
      readCredentials, abort, form,
    }) as OpenAiCardController

    controller.start()
    notify()
    expect(readCredentials).toHaveBeenCalledTimes(2)

    controller.dispose()
    expect(abort.abort).toHaveBeenCalledOnce()
    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(form.dispose).toHaveBeenCalledOnce()
  })
})
