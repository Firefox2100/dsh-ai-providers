import { describe, expect, it } from 'vitest'
import { AI_ERROR_CODES, AiError, CAPABILITIES, EmbeddingService, SERVICE_NAMES, cosineSimilarity, localized, parseProviderSlotId, providerSlotId, type EmbedOptions, type EmbeddingResult } from '../src/index.ts'

class Fake extends EmbeddingService {
  readonly provider = 'fake'
  readonly model = 'fake-1'
  calls: (readonly string[])[] = []
  constructor(private readonly vectors: number[][]) { super() }

  embed(texts: readonly string[]): Promise<EmbeddingResult> {
    this.calls.push(texts)
    return Promise.resolve({ vectors: this.vectors, model: this.model, dimensions: this.vectors[0]?.length ?? 0 })
  }
}

describe('the capabilities', () => {
  it('each have a service name on the context', () => {
    expect(CAPABILITIES).toEqual(['embedding'])
    expect(SERVICE_NAMES.embedding).toBe('embeddings')
  })
})

describe('EmbeddingService', () => {
  it('is a service of its capability, which names its provider and model', () => {
    const service = new Fake([[1, 0]])
    expect(service.capability).toBe('embedding')
    expect([service.provider, service.model]).toEqual(['fake', 'fake-1'])
  })

  it('embeds one text through embed', async () => {
    const service = new Fake([[0.5, 0.5]])
    expect(await service.embedOne('hello')).toEqual([0.5, 0.5])
    expect(service.calls).toEqual([['hello']])
  })

  it('says so when the provider returns no vector', async () => {
    await expect(new Fake([]).embedOne('hello')).rejects.toMatchObject({ code: 'unavailable' })
  })
})

describe('AiError', () => {
  it('carries a code that says what to do, whatever the vendor', () => {
    const error = new AiError('rejected', 'bad key', { cause: new Error('401') })
    expect(error).toBeInstanceOf(Error)
    expect([error.name, error.code, error.message, (error.cause as Error).message]).toEqual(['AiError', 'rejected', 'bad key', '401'])
    expect(AI_ERROR_CODES).toContain('not-configured')
  })
})

describe('cosineSimilarity', () => {
  it('is 1 for the same direction, 0 for orthogonal, -1 for opposite, and 0 for a zero vector', () => {
    expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1)
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1)
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
  })

  it('refuses vectors of different models', () => {
    expect(() => cosineSimilarity([1], [1, 2])).toThrow(RangeError)
  })
})

describe('what a consumer can rely on', () => {
  it('gets vectors that are ready when embed settles, and a prefetch that is a harmless hint by default', async () => {
    const service = new Fake([[1, 0]])
    service.prefetch(['a'])
    expect(service.calls).toEqual([])
    expect((await service.embed(['a'])).vectors).toEqual([[1, 0]])
  })

  it('lets a provider extend the options of a request without the consumer knowing', async () => {
    interface WithDimensions extends EmbedOptions { dimensions?: number }
    class Shortened extends EmbeddingService<WithDimensions> {
      readonly provider = 'short'
      readonly model = 's'
      seen: WithDimensions[] = []
      embed(_texts: readonly string[], options: WithDimensions = {}): Promise<EmbeddingResult> {
        this.seen.push(options)
        return Promise.resolve({ vectors: [[1]], model: 's', dimensions: options.dimensions ?? 1 })
      }
    }
    const own = new Shortened()
    const asBase: EmbeddingService = own
    await asBase.embed(['x'])
    await own.embed(['x'], { dimensions: 256 })
    expect(own.seen).toEqual([{}, { dimensions: 256 }])
  })
})

describe('the ids of provider entries in the settings UI', () => {
  it('name the capability and the provider, and refuse an id that is not one', () => {
    expect(providerSlotId('embedding', 'openai')).toBe('embedding:openai')
    expect(parseProviderSlotId('embedding:openai')).toEqual({ capability: 'embedding', providerId: 'openai' })
    expect(parseProviderSlotId('embedding:a:b')).toEqual({ capability: 'embedding', providerId: 'a:b' })
    expect(parseProviderSlotId('nothing')).toBeUndefined()
    expect(parseProviderSlotId('speech:x')).toBeUndefined()
  })
})

describe('localized text', () => {
  it('is the text for the locale, else English, else any', () => {
    expect(localized('plain', 'zh')).toBe('plain')
    expect(localized({ en: 'Dimensions', zh: '维度' }, 'zh')).toBe('维度')
    expect(localized({ en: 'Dimensions', zh: '维度' }, 'fr')).toBe('Dimensions')
    expect(localized({ de: 'Dimensionen' }, 'fr')).toBe('Dimensionen')
    expect(localized({}, 'en')).toBe('')
  })
})
