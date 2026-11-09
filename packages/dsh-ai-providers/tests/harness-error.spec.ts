import { HarnessError, LlmError } from '@deepseek-ai/dsh-llm'
import { AiError } from '@dsh-ai-providers/core'
import { describe, expect, it } from 'vitest'
import { asHarnessError, asLlmError } from '../src/host/harness-error.ts'

describe('handing a capability failure to DSH', () => {
  it('turns an AiError into the harness type and keeps the original as its cause', () => {
    const original = new AiError('rejected', 'bad key')
    const converted = asHarnessError(original)
    expect(converted).toBeInstanceOf(HarnessError)
    expect((converted as HarnessError).message).toBe('bad key')
    expect((converted as HarnessError).cause).toBe(original)
  })

  it('turns a gate failure into the model loop type with a code it routes on', () => {
    const cancelled = asLlmError(new AiError('cancelled', 'cancelled')) as LlmError
    expect(cancelled).toBeInstanceOf(LlmError)
    expect(cancelled.code).toBe('ABORTED')
    expect((asLlmError(new AiError('unavailable', 'nothing answered')) as LlmError).code).toBe('TRANSPORT')
  })

  it('leaves a failure it did not raise alone', () => {
    const plain = new Error('from elsewhere')
    expect(asHarnessError(plain)).toBe(plain)
    expect(asLlmError(plain)).toBe(plain)
    const harness = new HarnessError('already one', 'X')
    expect(asHarnessError(harness)).toBe(harness)
  })
})
