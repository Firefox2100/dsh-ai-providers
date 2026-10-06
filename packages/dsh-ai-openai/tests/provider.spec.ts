import { Context } from '@deepseek-ai/cordis'
import { AiProviders } from 'dsh-ai-providers'
import { EmbeddingService, ImageGenerationService, SttService, TtsService } from 'dsh-ai-core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as plugin from '../src/index.ts'

let ctx: Context
const settle = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 40))

beforeEach(() => { ctx = new Context() })
afterEach(async () => { await ctx.fiber.dispose() })

describe('the provider', () => {
  it('registers itself with the main plugin once that is there, and leaves when it is unloaded', async () => {
    const fiber = ctx.plugin(plugin as never, {} as never) as unknown as { dispose(): void }
    await settle()
    expect(ctx.get('aiProviders')).toBeUndefined()
    new AiProviders(ctx)
    await settle()
    expect(ctx.aiProviders.list().map(provider => provider.id)).toEqual(['openai'])
    expect(ctx.aiProviders.get('openai')).toMatchObject({ label: 'OpenAI-compatible', configEntryId: 'ai-openai' })
    expect(ctx.aiProviders.get('openai')?.requestOptions?.embedding?.map(option => [option.key, option.type, option.atStart ?? false])).toEqual([['dimensions', 'integer', true], ['user', 'string', false]])
    const service = ctx.aiProviders.get('openai')!.capabilities.embedding!()
    expect(service).toBeInstanceOf(EmbeddingService)
    expect([service.provider, service.model]).toEqual(['openai', 'text-embedding-3-small'])
    expect(ctx.aiProviders.get('openai')!.capabilities.tts!()).toBeInstanceOf(TtsService)
    expect(ctx.aiProviders.get('openai')!.capabilities.stt!()).toBeInstanceOf(SttService)
    expect(ctx.aiProviders.get('openai')!.capabilities.image!()).toBeInstanceOf(ImageGenerationService)
    fiber.dispose()
    await settle()
    expect(ctx.aiProviders.list()).toEqual([])
  })

  it('has a configuration of defaults a profile can override, all editable in settings', () => {
    const parse = plugin.Config as unknown as (value: unknown) => Record<string, { get(): unknown }>
    expect(Object.fromEntries(Object.entries(parse({})).map(([key, field]) => [key, field.get()]))).toEqual({
      connections: [{ id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKeyRef: 'OPENAI_API_KEY' }],
      embeddingConnection: 'openai', ttsConnection: 'openai', sttConnection: 'openai', imageConnection: 'openai',
      embeddingModel: 'text-embedding-3-small', embeddingDimensions: 0,
      ttsModel: 'gpt-4o-mini-tts', ttsVoice: 'alloy', ttsResponseFormat: 'mp3', ttsSpeed: 1, batchSize: 64, timeoutMs: 60_000,
      sttModel: 'whisper-1', sttRealtimeModel: 'gpt-4o-mini-transcribe',
      imageModel: 'gpt-image-1', imageSize: '1024x1024', imageQuality: 'auto', imageOutputFormat: 'png', imageOutputCompression: 100,
    })
  })
})
