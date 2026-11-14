import { describe, expect, it } from 'vitest'
import { expectLocaleCoverage, expectProviderContract } from '@dsh-ai-providers/testkit'
import * as plugin from '../src/index.ts'
import { dictionaries } from '../src/client/locales.ts'

describe('the provider', () => {
  it('registers one provider with the runtime and leaves with its fiber', async () => {
    await expectProviderContract({
      plugin: plugin as never,
      id: 'localai',
      label: 'LocalAI',
      configEntryId: 'ai-localai',
      capabilities: ['embedding', 'rerank', 'tts', 'stt', 'image', 'decision'],
      llm: true,
    })
  })

  it('is configured by the settings entry it names', () => {
    expect(plugin.Config).toBeTypeOf('function')
  })
})

describe('the copy', () => {
  it('speaks every language the settings UI ships', () => {
    expectLocaleCoverage(dictionaries)
  })
})
