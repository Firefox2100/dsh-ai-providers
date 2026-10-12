import { describe, expect, it, vi } from 'vitest'
import { LocalAiImageGenerationService, scaledSize } from '../src/image.ts'

const field = <T>(value: T) => ({ get: () => value })
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
const config = (mode: string) => ({
  imageModel: field('z-image-turbo'), imageSize: field('512x512'), imageBody: field({ cfg: 1 }), imageReferences: field(mode), imageHighresScale: field(1.5), imageHighresSteps: field(6), timeoutMs: field(1000),
}) as never
const connection = () => ({ id: 'l', name: 'LocalAI', baseUrl: 'http://local.test/v1', apiKeyRef: '' })
const answer = () => new Response(JSON.stringify({ data: [{ b64_json: PNG.toString('base64') }] }), { status: 200, headers: { 'content-type': 'application/json' } })
const service = (mode: string, send: typeof fetch) => new LocalAiImageGenerationService({ config: config(mode), credentials: () => undefined, connection, fetch: send })
const bodies = (send: ReturnType<typeof vi.fn>) => send.mock.calls.map(call => JSON.parse((call[1] as RequestInit).body as string) as Record<string, unknown>)

describe('LocalAI image generation', () => {
  it('scales sizes to multiples the backends take', () => {
    expect(scaledSize('512x512', 1.5)).toBe('768x768')
    expect(scaledSize('512x768', 1.5)).toBe('768x1152')
    expect(scaledSize('512x512', 1.3)).toBe('640x640')
  })

  it('asks the native endpoint, keeps configured fields and leaves references out by default', async () => {
    const send = vi.fn<typeof fetch>().mockImplementation(async () => answer())
    const result = await service('ignore', send).generate('a lighthouse', { references: [{ data: new Blob([PNG]) }], steps: 8 })
    expect(result.images[0]?.mediaType).toBe('image/png')
    expect(send.mock.calls[0]![0]).toBe('http://local.test/v1/images/generations')
    expect(bodies(send)).toEqual([{ cfg: 1, model: 'z-image-turbo', prompt: 'a lighthouse', n: 1, size: '512x512', response_format: 'b64_json', step: 8 }])
  })

  it('gives references as the image to repaint or as reference images, as configured', async () => {
    const one = vi.fn<typeof fetch>().mockImplementation(async () => answer())
    await service('img2img', one).generate('x', { references: [{ data: new Blob([PNG]) }, { data: new Blob([PNG]) }] })
    expect(bodies(one)[0]!['files']).toEqual([PNG.toString('base64')])
    const many = vi.fn<typeof fetch>().mockImplementation(async () => answer())
    await service('ref_images', many).generate('x', { references: [{ data: new Blob([PNG]) }, { data: new Blob([PNG]) }] })
    expect(bodies(many)[0]!['ref_images']).toHaveLength(2)
  })

  it('renders larger in a second pass over the first result for the hires fix', async () => {
    const send = vi.fn<typeof fetch>().mockImplementation(async () => answer())
    await service('ignore', send).generate('x', { highRes: true })
    const [first, second] = bodies(send)
    expect(first).toMatchObject({ size: '512x512' })
    expect(first).not.toHaveProperty('files')
    expect(second).toMatchObject({ size: '768x768', step: 6, files: [PNG.toString('base64')] })
  })

  it('reports failures through AiError', async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'backend gone' } }), { status: 500, headers: { 'content-type': 'application/json' } }))
    await expect(service('ignore', send).generate('x')).rejects.toMatchObject({ name: 'AiError' })
    await expect(service('ignore', send).generate(' ')).rejects.toMatchObject({ code: 'invalid-input' })
  })
})
