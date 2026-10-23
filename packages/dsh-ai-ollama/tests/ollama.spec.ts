import { describe, expect, it } from 'vitest'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { LlmRequestError, type LlmCall } from '@dsh-ai-providers/core'
import { Config, OllamaEmbeddingService, OllamaLlmService, translate, wireBody, wireMessages } from '../src/index.ts'
import { httpError } from '../src/llm/errors.ts'

const options = (extra: Partial<GenerateOptions> = {}): GenerateOptions => ({
  provider: 'local', model: 'qwen3:8b', messages: [
    { role: 'system', content: [{ type: 'text', text: 'Be brief.' }], source: { kind: 'system-prompt' }, id: 's' as never },
    { role: 'user', content: [{ type: 'text', text: 'Look' }], source: { kind: 'user' }, id: 'u' as never },
    { role: 'assistant', content: [{ type: 'text', text: 'Checking.' }, { type: 'tool-call', id: 'call-1' as never, name: 'inspect', arguments: '{"place":"door"}' }], source: { kind: 'model', provider: 'local', model: 'qwen3:8b' }, id: 'a' as never },
    { role: 'tool', content: [{ type: 'text', text: 'Locked' }], source: { kind: 'tool', callId: 'call-1' as never }, toolCallId: 'call-1' as never, id: 't' as never },
  ],
  tools: [{ name: 'inspect', description: 'Inspect', parameters: { type: 'object' } }],
  ...extra,
})
const call = (sampling: LlmCall['sampling'] = {}, extra: Partial<GenerateOptions> = {}): LlmCall => ({
  options: options(extra), route: { id: 'local', name: 'Local', models: [] }, model: { id: 'qwen3:8b', name: 'Qwen', maxTokens: 500, reasoning: { levels: [{ id: 'high', name: 'High', body: { think: 'high' } }] } }, sampling, headers: { 'user-agent': 'dsh' },
})
const lines = async function * (...values: unknown[]): AsyncGenerator<string> { for (const value of values) yield JSON.stringify(value) }
async function collect<T>(source: AsyncIterable<T>): Promise<T[]> { const out: T[] = []; for await (const value of source) out.push(value); return out }

describe('request mapping', () => {
  it('writes the conversation with tool results named by their tool', async () => {
    const messages = await wireMessages(options())
    expect(messages).toEqual([
      { role: 'system', content: 'Be brief.' },
      { role: 'user', content: 'Look' },
      { role: 'assistant', content: 'Checking.', tool_calls: [{ function: { name: 'inspect', arguments: { place: 'door' } } }] },
      { role: 'tool', content: 'Locked', tool_name: 'inspect' },
    ])
  })

  it('puts common and native controls where Ollama reads them', async () => {
    const body = await wireBody(call({ temperature: 0.2, topP: 0.9, repetitionPenalty: 1.1, stop: ['END'], numCtx: 16384, mirostat: 2, keepAlive: '-1', think: true, format: 'json', body: { raw: false } } as never))
    expect(body).toMatchObject({
      model: 'qwen3:8b', stream: true, think: true, format: 'json', keep_alive: -1, raw: false,
      options: { temperature: 0.2, top_p: 0.9, repeat_penalty: 1.1, stop: ['END'], num_ctx: 16384, mirostat: 2, num_predict: 500 },
      tools: [{ type: 'function', function: { name: 'inspect' } }],
    })
  })

  it('lets the chosen reasoning level win over the typed think, and withholds tools for none', async () => {
    const body = await wireBody(call({ think: false, toolChoice: 'none' } as never, { reasoningEffort: 'high' as never }))
    expect(body['think']).toBe('high')
    expect(body['tools']).toBeUndefined()
  })

  it('sends images as base64 and leaves a missing loader as text', async () => {
    const withImage = options({ messages: [{ role: 'user', content: [{ type: 'text', text: 'See' }, { type: 'image', attachment: {} as never }], source: { kind: 'user' }, id: 'u' as never }] as never })
    const [loaded] = await wireMessages(withImage, async () => ({ data: new Uint8Array([1, 2, 3]) }))
    expect(loaded).toEqual({ role: 'user', content: 'See', images: ['AQID'] })
    const [text] = await wireMessages(withImage)
    expect(text?.content).toContain('unavailable')
  })
})

describe('stream mapping', () => {
  it('maps thinking, text and usage, closing each block before the next', async () => {
    const chunks = await collect(translate(lines(
      { message: { thinking: 'hm' }, done: false },
      { message: { thinking: 'm' }, done: false },
      { message: { content: 'Hi' }, done: false },
      { message: { content: '' }, done: true, done_reason: 'stop', prompt_eval_count: 12, eval_count: 3 },
    )))
    expect(chunks.map(chunk => chunk.type)).toEqual(['block-start', 'reasoning-delta', 'reasoning-delta', 'block-end', 'block-start', 'text-delta', 'block-end', 'usage', 'finish'])
    expect(chunks[3]).toMatchObject({ block: { type: 'reasoning', text: 'hmm' } })
    expect(chunks.at(-2)).toEqual({ type: 'usage', usage: { inputTokens: 12, outputTokens: 3 } })
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'stop' } })
  })

  it('gives a whole tool call an id and string arguments, and finishes as tool calls', async () => {
    const chunks = await collect(translate(lines(
      { message: { content: 'Looking.' }, done: false },
      { message: { tool_calls: [{ function: { name: 'inspect', arguments: { place: 'door' } } }] }, done: false },
      { message: {}, done: true, done_reason: 'stop' },
    )))
    const end = chunks.find((chunk): chunk is Extract<StreamChunk, { type: 'block-end' }> => chunk.type === 'block-end' && chunk.block.type === 'tool-call')
    expect(end?.block).toMatchObject({ type: 'tool-call', name: 'inspect', arguments: '{"place":"door"}' })
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'tool-calls' } })
  })

  it('reports a cut answer, an empty one, a dropped stream and a reported error', async () => {
    expect((await collect(translate(lines({ message: { content: 'x' }, done: true, done_reason: 'length' })))).at(-1)).toEqual({ type: 'finish', reason: { kind: 'max-tokens' } })
    await expect(collect(translate(lines({ message: {}, done: true })))).rejects.toMatchObject({ failure: 'EMPTY_RESPONSE' })
    await expect(collect(translate(lines({ message: { content: 'x' }, done: false })))).rejects.toMatchObject({ failure: 'TRANSPORT' })
    await expect(collect(translate(lines({ error: 'model runner has unexpectedly stopped' })))).rejects.toMatchObject({ failure: 'SERVER' })
  })
})

describe('failure classes', () => {
  const answer = (status: number, error: string) => httpError(new Response(null, { status }), { error })
  it('tells the failures DSH acts on apart', () => {
    expect(answer(401, 'unauthorized').failure).toBe('AUTH')
    expect(answer(429, 'slow down').failure).toBe('RATE_LIMIT')
    expect(answer(400, 'input length exceeds the context length').failure).toBe('CONTEXT_WINDOW_EXCEEDED')
    expect(answer(404, 'model "x" not found, try pulling it first').failure).toBe('INVALID_REQUEST')
    expect(answer(500, 'boom').failure).toBe('SERVER')
    expect(answer(403, 'you have reached your weekly usage limit').failure).toBe('QUOTA')
  })
})

const config = (patch: Record<string, unknown> = {}) => Config({ connections: [{ id: 'local', name: 'Local', baseUrl: 'http://ollama.test:11434/api///', apiKeyRef: '' }], embeddingConnection: 'local', llmRoutes: [{ id: 'local', name: 'Local', connection: 'local', models: [{ id: 'qwen3:8b', name: 'qwen3:8b', sampling: { numCtx: 8192, think: 'high' } }], sampling: { mirostat: 1 } }], ...patch })
const ndjson = (...values: unknown[]) => new Response(values.map(value => `${JSON.stringify(value)}\n`).join(''), { headers: { 'content-type': 'application/x-ndjson' } })

describe('configuration', () => {
  it('parses the real schema without inventing a retry policy or dropping native controls', () => {
    const parsed = config()
    const [route] = parsed.llmRoutes.get()
    expect(route?.retry).toBeUndefined()
    expect(route?.models[0]?.sampling).toMatchObject({ numCtx: 8192, think: 'high' })
    expect(route?.sampling?.mirostat).toBe(1)
    expect(parsed.timeoutMs.get()).toBe(120_000)
  })
})

describe('service', () => {
  it('streams a chat over NDJSON to the API under the base URL, however the URL was written', async () => {
    const seen: { url: string; body: Record<string, unknown>; accept: string | null }[] = []
    const fetcher = (async (url: string, init: RequestInit) => {
      seen.push({ url, body: JSON.parse(init.body as string) as Record<string, unknown>, accept: new Headers(init.headers).get('accept') })
      return ndjson({ message: { content: 'Hi' }, done: false }, { message: {}, done: true, done_reason: 'stop', prompt_eval_count: 4, eval_count: 1 })
    }) as unknown as typeof fetch
    const service = new OllamaLlmService({ config: config(), credentials: () => undefined, fetch: fetcher })
    const chunks = await collect(service.stream(call({ numCtx: 8192 } as never)))
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'stop' } })
    expect(seen[0]).toMatchObject({ url: 'http://ollama.test:11434/api/chat', accept: 'application/x-ndjson', body: { options: { num_ctx: 8192 } } })
    expect(service.routes()[0]).toMatchObject({ id: 'local', baseUrl: 'http://ollama.test:11434/api' })
  })

  it('classifies a refusal before the stream starts', async () => {
    const fetcher = (async () => new Response(JSON.stringify({ error: 'model "x" not found' }), { status: 404 })) as unknown as typeof fetch
    const service = new OllamaLlmService({ config: config(), credentials: () => undefined, fetch: fetcher })
    await expect(collect(service.stream(call()))).rejects.toBeInstanceOf(LlmRequestError)
  })

  it('lists chat models with what show says they can do, and leaves embedding-only ones out', async () => {
    const fetcher = (async (url: string, init?: RequestInit) => {
      if (url.endsWith('/tags')) return Response.json({ models: [{ name: 'qwen3:8b' }, { name: 'bge-m3:latest' }, { name: 'gpt-oss:20b' }, { name: 'odd:1b' }] })
      const model = (JSON.parse(init?.body as string) as { model: string }).model
      if (model === 'odd:1b') return new Response('{}', { status: 500 })
      if (model === 'bge-m3:latest') return Response.json({ capabilities: ['embedding'], model_info: {} })
      if (model === 'gpt-oss:20b') return Response.json({ capabilities: ['completion', 'tools', 'thinking'], model_info: { 'general.architecture': 'gptoss', 'gptoss.context_length': 131072 } })
      return Response.json({ capabilities: ['completion', 'vision', 'thinking'], model_info: { 'general.architecture': 'qwen3', 'qwen3.context_length': 40960 } })
    }) as unknown as typeof fetch
    const models = await new OllamaLlmService({ config: config(), credentials: () => undefined, fetch: fetcher }).discover('local')
    expect(models.map(model => model.id)).toEqual(['qwen3:8b', 'gpt-oss:20b', 'odd:1b'])
    expect(models[0]).toMatchObject({ contextWindow: 40960, inputs: ['text', 'image'], reasoning: { levels: [{ id: 'off' }, { id: 'on' }] } })
    expect(models[1]?.reasoning).toMatchObject({ default: 'medium', levels: [{ id: 'low' }, { id: 'medium' }, { id: 'high' }] })
    expect(models[2]).toEqual({ id: 'odd:1b', name: 'odd:1b', inputs: ['text'] })
  })

  it('reads residency from ps and loads or unloads with keep_alive', async () => {
    const calls: { url: string; body?: unknown }[] = []
    const fetcher = (async (url: string, init?: RequestInit) => {
      calls.push({ url, ...init?.body === undefined ? {} : { body: JSON.parse(init.body as string) } })
      return url.endsWith('/ps') ? Response.json({ models: [{ name: 'qwen3:8b', size: 123 }] }) : Response.json({ done: true })
    }) as unknown as typeof fetch
    const control = new OllamaLlmService({ config: config(), credentials: () => undefined, fetch: fetcher }).modelControl
    expect(control.operations).toEqual(['status', 'load', 'unload'])
    expect(await control.status?.('local', 'qwen3:8b')).toEqual({ state: 'ready', memoryBytes: 123 })
    expect(await control.status?.('local', 'other')).toEqual({ state: 'uninitialized' })
    await control.load?.('local', 'qwen3:8b')
    await control.unload?.('local', 'qwen3:8b')
    expect(calls.filter(item => item.url.endsWith('/generate')).map(item => item.body)).toEqual([{ model: 'qwen3:8b', stream: false }, { model: 'qwen3:8b', keep_alive: 0, stream: false }])
  })

  it('describes optional route capabilities and rejects missing route configuration', async () => {
    const rich = config({ llmRoutes: [{
      id: 'rich', name: 'Rich', connection: 'local', retry: { mode: 'always' }, sampling: { temperature: 0.2 },
      models: [{ id: 'vision', name: 'Vision', vision: true, contextWindow: 8192, maxTokens: 512, reasoningLevels: [{ id: 'on', name: 'On', body: { think: true } }], defaultReasoning: 'on', sampling: { topP: 0.8 } }],
    }] })
    const fetcher = (async (url: string) => url.endsWith('/tags') ? Response.json({ models: [] }) : Response.json({})) as typeof fetch
    const service = new OllamaLlmService({ config: rich, credentials: () => undefined, fetch: fetcher })
    expect(service.routes()[0]).toMatchObject({ retry: { mode: 'always' }, sampling: { temperature: 0.2 }, models: [{ inputs: ['text', 'image'], contextWindow: 8192, maxTokens: 512, reasoning: { default: 'on' }, sampling: { topP: 0.8 } }] })
    await expect(service.discover('missing')).rejects.toMatchObject({ code: 'not-configured' })
    await expect(new OllamaLlmService({ config: config({ connections: [] }), credentials: () => undefined }).discover('local')).rejects.toMatchObject({ code: 'not-configured' })
    expect(await service.interrogate({ baseUrl: 'http://draft.test' })).toEqual([])
  })
})

describe('embedding', () => {
  it('batches texts into /api/embed with the configured and requested controls', async () => {
    const bodies: Record<string, unknown>[] = []
    const fetcher = (async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { input: string[] }
      bodies.push(body)
      return Response.json({ model: 'nomic-embed-text', embeddings: body.input.map(() => [0.1, 0.2]), prompt_eval_count: body.input.length })
    }) as unknown as typeof fetch
    const parsed = config({ batchSize: 2, embeddingNumCtx: 2048, embeddingKeepAlive: '10m' })
    const service = new OllamaEmbeddingService({ config: parsed, credentials: () => undefined, connection: () => ({ apiUrl: 'http://x/api', apiKeyRef: '' }), fetch: fetcher })
    const result = await service.embed(['a', 'b', 'c'], { dimensions: 2, truncate: false })
    expect(result).toEqual({ vectors: [[0.1, 0.2], [0.1, 0.2], [0.1, 0.2]], model: 'nomic-embed-text', dimensions: 2, tokens: 3 })
    expect(bodies[0]).toMatchObject({ truncate: false, dimensions: 2, keep_alive: '10m', options: { num_ctx: 2048 } })
    expect(bodies).toHaveLength(2)
    await expect(service.embed([' '])).rejects.toMatchObject({ code: 'invalid-input' })
  })

  it('refuses an answer with the wrong number of vectors', async () => {
    const fetcher = (async () => Response.json({ embeddings: [] })) as unknown as typeof fetch
    const service = new OllamaEmbeddingService({ config: config(), credentials: () => undefined, connection: () => ({ apiUrl: 'http://x/api', apiKeyRef: '' }), fetch: fetcher })
    await expect(service.embed(['a'])).rejects.toMatchObject({ code: 'unavailable' })
  })
})
