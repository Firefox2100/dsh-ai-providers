import { describe, expect, it } from 'vitest'
import { OpenAiImageGenerationService } from '../src/image.ts'

const PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

const setup = () => {
  const settings: Record<string, string | number> = { baseUrl: 'https://images.example/v1/', apiKeyEnv: 'OPENAI_API_KEY', imageModel: 'gpt-image-1', imageSize: '1024x1024', imageQuality: 'auto', imageOutputFormat: 'png', imageOutputCompression: 100, timeoutMs: 2000 }
  const field = (name: string) => ({ get: () => settings[name] })
  let seen: { url: string; body?: Record<string, unknown> }[] = []
  let answer = new Response(JSON.stringify({ data: [{ b64_json: PIXEL, revised_prompt: 'A tiny red circle.' }] }), { headers: { 'content-type': 'application/json' } })
  const service = new OpenAiImageGenerationService({
    config: { baseUrl: field('baseUrl'), apiKeyEnv: field('apiKeyEnv'), imageModel: field('imageModel'), imageSize: field('imageSize'), imageQuality: field('imageQuality'), imageOutputFormat: field('imageOutputFormat'), imageOutputCompression: field('imageOutputCompression'), timeoutMs: field('timeoutMs') } as never,
    connection: () => ({ baseUrl: String(settings.baseUrl).replace(/\/+$/, ''), apiKeyRef: String(settings.apiKeyEnv) }),
    credentials: () => ({ resolve: () => Promise.resolve({ value: 'sk-test', source: 'file' }) }) as never,
    fetch: (async (url: string | URL | Request, init?: RequestInit) => {
      seen.push({ url: String(url), ...(init?.body === undefined ? {} : { body: JSON.parse(String(init.body)) }) })
      return String(url) === 'https://cdn.example/image.webp' ? new Response('image', { headers: { 'content-type': 'image/webp' } }) : answer
    }) as typeof fetch,
  })
  return { service, seen, settings, setAnswer: (value: Response) => { answer = value } }
}

describe('OpenAI-compatible image generation', () => {
  it('requests self-contained image data and returns blobs', async () => {
    const { service, seen } = setup()
    const result = await service.generate('A red circle.', { count: 1, size: '512x512', quality: 'high', outputFormat: 'png', background: 'opaque', user: 'u1' })
    expect(seen[0]).toEqual({ url: 'https://images.example/v1/images/generations', body: { model: 'gpt-image-1', prompt: 'A red circle.', n: 1, size: '512x512', quality: 'high', output_format: 'png', output_compression: 100, background: 'opaque', user: 'u1' } })
    expect(result.model).toBe('gpt-image-1')
    expect(result.images[0]?.mediaType).toBe('image/png')
    expect(result.images[0]?.revisedPrompt).toBe('A tiny red circle.')
    expect(result.images[0]?.data.size).toBeGreaterThan(0)
  })

  it('accepts a URL response from compatible servers', async () => {
    const { service, setAnswer } = setup()
    setAnswer(new Response(JSON.stringify({ data: [{ url: 'https://cdn.example/image.webp' }], model: 'local-image' }), { headers: { 'content-type': 'application/json' } }))
    const result = await service.generate('A tree.')
    expect(result.model).toBe('local-image')
    expect(result.images[0]?.mediaType).toBe('image/webp')
  })

  it('validates prompt, count and compression before sending', async () => {
    const { service } = setup()
    await expect(service.generate(' ')).rejects.toMatchObject({ code: 'invalid-input' })
    await expect(service.generate('x', { count: 0 })).rejects.toMatchObject({ code: 'invalid-input' })
    await expect(service.generate('x', { outputCompression: 101 })).rejects.toMatchObject({ code: 'invalid-input' })
  })
})
