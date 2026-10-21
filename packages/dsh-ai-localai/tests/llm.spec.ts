import { describe, expect, it, vi } from 'vitest'
import { LocalAiLlmService } from '../src/llm.ts'

const make = (answer: (url: string, init: RequestInit) => Response | Promise<Response>) => {
  const seen: { url: string; init: RequestInit }[] = []
  const service = new LocalAiLlmService({
    config: {
      llmRoutes: { get: () => [{ id: 'local', name: 'Local', connection: 'c', models: [] }] },
      connections: { get: () => [{ id: 'c', name: 'LocalAI', baseUrl: 'http://local.test/v1/', apiKeyRef: 'LOCAL_KEY' }] },
      llmIdleTimeoutMs: { get: () => 5000 },
    } as never,
    credentials: () => ({ resolve: () => Promise.resolve({ value: 'secret', source: 'file' }) }) as never,
    fetch: (async (url: string, init: RequestInit) => { seen.push({ url: String(url), init }); return await answer(String(url), init) }) as never,
  })
  return { control: service.modelControl, seen }
}

describe('LocalAI model controls', () => {
  it('reports backend state and memory through the configured route', async () => {
    const { control, seen } = make(() => Response.json({ state: 2, memory: { total: 1_234 } }))
    await expect(control.status!('local', 'qwen 3')).resolves.toEqual({ state: 'ready', memoryBytes: 1_234 })
    expect(control.operations).toEqual(['status', 'load', 'unload'])
    expect(seen[0]?.url).toBe('http://local.test/v1/backend/monitor?model=qwen+3')
    expect(new Headers(seen[0]?.init.headers).get('authorization')).toBe('Bearer secret')
  })

  it.each([
    [0, 'uninitialized'], [1, 'busy'], [-1, 'error'], [9, 'unknown'],
  ] as const)('maps LocalAI state %s to %s', async (wire, state) => {
    const { control } = make(() => Response.json({ state: wire }))
    await expect(control.status!('local', 'model')).resolves.toEqual({ state })
  })

  it('loads and unloads a model with LocalAI administrative requests', async () => {
    const { control, seen } = make(() => new Response(null, { status: 204 }))
    await control.load!('local', 'qwen.gguf')
    await control.unload!('local', 'qwen.gguf')
    expect(seen.map(call => [call.url, call.init.method, JSON.parse(String(call.init.body))])).toEqual([
      ['http://local.test/v1/backend/load', 'POST', { model: 'qwen.gguf' }],
      ['http://local.test/v1/backend/shutdown', 'POST', { model: 'qwen.gguf' }],
    ])
    expect(new Headers(seen[0]?.init.headers).get('content-type')).toBe('application/json')
  })

  it('rejects invalid responses and preserves useful HTTP classifications', async () => {
    await expect(make(() => Response.json({ state: 'ready' })).control.status!('local', 'model')).rejects.toMatchObject({ code: 'unavailable' })
    await expect(make(() => Response.json({ message: 'admin token required' }, { status: 401 })).control.load!('local', 'model')).rejects.toMatchObject({ code: 'rejected', message: expect.stringContaining('admin token required') })
    await expect(make(() => new Response('down', { status: 503 })).control.unload!('local', 'model')).rejects.toMatchObject({ code: 'unavailable' })
    await expect(make(() => Response.json({ state: 2 })).control.status!('local', ' ')).rejects.toMatchObject({ code: 'invalid-input' })
  })

  it('classifies transport failure and cancellation', async () => {
    await expect(make(() => Promise.reject(new TypeError('fetch failed'))).control.status!('local', 'model')).rejects.toMatchObject({ code: 'unavailable' })
    const controller = new AbortController()
    controller.abort()
    const fetch = vi.fn(() => Promise.reject(new DOMException('aborted', 'AbortError')))
    await expect(make(fetch).control.load!('local', 'model', controller.signal)).rejects.toMatchObject({ code: 'cancelled' })
  })
})
