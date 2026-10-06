import { describe, expect, it } from 'vitest'
import { OpenAiTtsService } from '../src/tts.ts'

interface Seen { url: string; auth?: string; body: Record<string, unknown> }

const setup = () => {
  const settings: Record<string, string | number> = { baseUrl: 'https://speech.example/v1/', apiKeyEnv: 'OPENAI_API_KEY', ttsModel: 'gpt-4o-mini-tts', ttsVoice: 'alloy', ttsResponseFormat: 'mp3', ttsSpeed: 1, timeoutMs: 2000 }
  const seen: Seen[] = []
  let answer = new Response('audio bytes', { status: 200, headers: { 'content-type': 'audio/mpeg' } })
  const field = (name: string) => ({ get: () => settings[name] })
  const send = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const headers = init?.headers as Record<string, string>
    seen.push({ url: String(input), ...(headers.authorization === undefined ? {} : { auth: headers.authorization }), body: JSON.parse(String(init?.body)) })
    return answer
  }
  const service = new OpenAiTtsService({
    config: { baseUrl: field('baseUrl'), apiKeyEnv: field('apiKeyEnv'), ttsModel: field('ttsModel'), ttsVoice: field('ttsVoice'), ttsResponseFormat: field('ttsResponseFormat'), ttsSpeed: field('ttsSpeed'), timeoutMs: field('timeoutMs') } as never,
    credentials: () => ({ resolve: () => Promise.resolve({ value: 'sk-test', source: 'file' }) }) as never,
    fetch: send as typeof fetch,
  })
  return { settings, seen, service, setAnswer: (value: Response) => { answer = value } }
}

describe('OpenAI-compatible speech', () => {
  it('posts to audio/speech and returns the response as a stream', async () => {
    const { service, seen } = setup()
    const result = await service.synthesize('Hello world', { voice: 'coral', responseFormat: 'wav', speed: 1.25, instructions: 'Warmly', user: 'u1' })
    expect(seen).toEqual([{ url: 'https://speech.example/v1/audio/speech', auth: 'Bearer sk-test', body: { model: 'gpt-4o-mini-tts', input: 'Hello world', voice: 'coral', response_format: 'wav', speed: 1.25, instructions: 'Warmly', user: 'u1' } }])
    expect([result.model, result.mediaType]).toEqual(['gpt-4o-mini-tts', 'audio/mpeg'])
    expect(await new Response(result.audio).text()).toBe('audio bytes')
  })

  it('reads model and defaults on each call', async () => {
    const { service, seen, settings, setAnswer } = setup()
    await (await service.synthesize('one')).audio.cancel()
    settings.ttsModel = 'tts-1'; settings.ttsVoice = 'nova'; settings.ttsResponseFormat = 'opus'; settings.ttsSpeed = 0.8
    setAnswer(new Response('second', { headers: { 'content-type': 'audio/ogg' } }))
    await (await service.synthesize('two')).audio.cancel()
    expect(seen.map(entry => entry.body)).toEqual([
      { model: 'gpt-4o-mini-tts', input: 'one', voice: 'alloy', response_format: 'mp3', speed: 1 },
      { model: 'tts-1', input: 'two', voice: 'nova', response_format: 'opus', speed: 0.8 },
    ])
    expect(service.model).toBe('tts-1')
  })

  it('maps invalid input and API rejection to AiError', async () => {
    const { service, setAnswer } = setup()
    await expect(service.synthesize(' ')).rejects.toMatchObject({ code: 'invalid-input' })
    await expect(service.synthesize('x', { speed: 10 })).rejects.toMatchObject({ code: 'invalid-input' })
    setAnswer(new Response(JSON.stringify({ error: { message: 'bad key' } }), { status: 401, headers: { 'content-type': 'application/json' } }))
    await expect(service.synthesize('x')).rejects.toMatchObject({ code: 'rejected', message: expect.stringMatching(/bad key/) })
    const abort = new AbortController(); abort.abort()
    await expect(service.synthesize('x', { signal: abort.signal })).rejects.toMatchObject({ code: 'cancelled' })
  })
})
