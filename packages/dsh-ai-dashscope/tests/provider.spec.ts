import { describe, expect, it } from 'vitest'
import { expectProviderContract } from '@dsh-ai-providers/testkit'
import * as plugin from '../src/index.ts'

describe('the provider', () => {
  it('registers one provider with the runtime and leaves with its fiber', async () => {
    await expectProviderContract({
      plugin: plugin as never,
      id: 'dashscope',
      label: 'DashScope',
      configEntryId: 'ai-dashscope',
      capabilities: ['embedding', 'rerank', 'tts', 'stt', 'image'],
      llm: true,
    })
  })

  it('is configured by the settings entry it names', () => {
    expect(plugin.Config).toBeTypeOf('function')
  })
})