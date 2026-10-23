import { describe, expect, it } from 'vitest'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { LlmRequestError, type LlmCall } from '@dsh-ai-providers/core'
import { Config, CohereLlmService, RERANK_REQUEST_OPTIONS, rerankBody, translate, type CohereRerankOptions, wireBody, wireMessages } from '../src/index.ts'
import { httpError } from '../src/llm/errors.ts'
import { EmbeddingApiService, RerankApiService } from '@dsh-ai-providers/jina-cohere'

const options = (extra: Partial<GenerateOptions> = {}): GenerateOptions => ({
  provider: 'cohere', model: 'command-a-03-2025', messages: [
    { role: 'system', content: [{ type: 'text', text: 'Be brief.' }], source: { kind: 'system-prompt' }, id: 's' as never },
    { role: 'user', content: [{ type: 'text', text: 'Look' }], source: { kind: 'user' }, id: 'u' as never },
    { role: 'assistant', content: [{ type: 'text', text: 'Checking.' }, { type: 'tool-call', id: 'call-1' as never, name: 'inspect', arguments: '{"place":"door"}' }], source: { kind: 'model', provider: 'cohere', model: 'command-a-03-2025' }, id: 'a' as never },
    { role: 'tool', content: [{ type: 'text', text: 'Locked' }], source: { kind: 'tool', callId: 'call-1' as never }, toolCallId: 'call-1' as never, id: 't' as never },
  ],
  tools: [{ name: 'inspect', description: 'Inspect', parameters: { type: 'object' } }, { name: 'other', description: 'Other', parameters: { type: 'object' } }],
  ...extra,
})
const call = (sampling: LlmCall['sampling'] = {}, extra: Partial<GenerateOptions> = {}): LlmCall => ({
  options: options(extra), route: { id: 'cohere', name: 'Cohere', models: [] }, model: { id: 'command-a-03-2025', name: 'Command A', maxTokens: 500, reasoning: { levels: [{ id: 'deep', name: 'Deep', body: { thinking: { type: 'enabled', token_budget: 2000 } } }] } }, sampling, headers: {},
})
async function* events(...values: unknown[]): AsyncGenerator<string> { for (const value of values) yield JSON.stringify(value) }
async function collect<T>(source: AsyncIterable<T>): Promise<T[]> { const out: T[] = []; for await (const value of source) out.push(value); return out }

describe('request mapping', () => {
  it('writes tool plans, calls and results the way Cohere reads them', async () => {
    expect(await wireMessages(options())).toEqual([
      { role: 'system', content: 'Be brief.' },
      { role: 'user', content: 'Look' },
      { role: 'assistant', tool_plan: 'Checking.', tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'inspect', arguments: '{"place":"door"}' } }] },
      { role: 'tool', tool_call_id: 'call-1', content: 'Locked' },
    ])
  })

  it('maps common and native controls to Cohere\'s names and leaves out what it has no field for', async () => {
    const body = await wireBody(call({ temperature: 0.2, topP: 0.9, topK: 40, minP: 0.1, repetitionPenalty: 1.2, stop: ['END'], thinking: 'enabled', thinkingBudget: 1000, safetyMode: 'STRICT', citationMode: 'FAST', priority: 3, body: { logprobs: true } } as never))
    expect(body).toMatchObject({
      model: 'command-a-03-2025', stream: true, temperature: 0.2, p: 0.9, k: 40, max_tokens: 500, stop_sequences: ['END'],
      thinking: { type: 'enabled', token_budget: 1000 }, safety_mode: 'STRICT', citation_options: { mode: 'FAST' }, priority: 3, logprobs: true,
    })
    expect(body).not.toHaveProperty('min_p')
    expect(body).not.toHaveProperty('repeat_penalty')
  })

  it('enforces required and named tool choices, and withholds tools for none', async () => {
    const required = await wireBody(call({ toolChoice: 'required' }))
    expect(required['tool_choice']).toBe('REQUIRED')
    expect((required['tools'] as unknown[]).length).toBe(2)
    const named = await wireBody(call({ toolChoice: { name: 'other' } }))
    expect(named['tool_choice']).toBe('REQUIRED')
    expect((named['tools'] as { function: { name: string } }[]).map(tool => tool.function.name)).toEqual(['other'])
    expect(await wireBody(call({ toolChoice: 'none' }))).not.toHaveProperty('tools')
    expect(await wireBody(call())).not.toHaveProperty('tool_choice')
  })

  it('lets the chosen reasoning level win over the typed thinking', async () => {
    const body = await wireBody(call({ thinking: 'disabled' } as never, { reasoningEffort: 'deep' as never }))
    expect(body['thinking']).toEqual({ type: 'enabled', token_budget: 2000 })
  })

  it('sends images as data URLs and keeps text-only turns as a string', async () => {
    const withImage = options({ messages: [{ role: 'user', content: [{ type: 'text', text: 'See' }, { type: 'image', attachment: {} as never }], source: { kind: 'user' }, id: 'u' as never }] as never })
    const [message] = await wireMessages(withImage, async () => ({ data: new Uint8Array([1, 2, 3]), mediaType: 'image/png' }))
    expect(message).toEqual({ role: 'user', content: [{ type: 'text', text: 'See' }, { type: 'image_url', image_url: { url: 'data:image/png;base64,AQID' } }] })
  })
})

describe('stream mapping', () => {
  it('maps thinking, text, usage and finish, numbering blocks afresh', async () => {
    const chunks = await collect(translate(events(
      { type: 'message-start', id: 'm' },
      { type: 'content-start', index: 0, delta: { message: { content: { type: 'thinking', thinking: '' } } } },
      { type: 'content-delta', index: 0, delta: { message: { content: { thinking: 'hm' } } } },
      { type: 'content-end', index: 0 },
      { type: 'content-start', index: 1, delta: { message: { content: { type: 'text', text: '' } } } },
      { type: 'content-delta', index: 1, delta: { message: { content: { text: 'Hi' } } } },
      { type: 'content-end', index: 1 },
      { type: 'message-end', delta: { finish_reason: 'COMPLETE', usage: { tokens: { input_tokens: 12, output_tokens: 3 }, cached_tokens: 4 } } },
    )))
    expect(chunks.map(chunk => chunk.type)).toEqual(['block-start', 'reasoning-delta', 'block-end', 'block-start', 'text-delta', 'block-end', 'usage', 'finish'])
    expect(chunks.at(-2)).toEqual({ type: 'usage', usage: { inputTokens: 12, outputTokens: 3, cacheReadTokens: 4 } })
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'stop' } })
  })

  it('maps the tool plan to text and assembles a tool call from its fragments', async () => {
    const chunks = await collect(translate(events(
      { type: 'tool-plan-delta', delta: { message: { tool_plan: 'I will ' } } },
      { type: 'tool-plan-delta', delta: { message: { tool_plan: 'look.' } } },
      { type: 'tool-call-start', index: 0, delta: { message: { tool_calls: { id: 'c1', type: 'function', function: { name: 'inspect', arguments: '' } } } } },
      { type: 'tool-call-delta', index: 0, delta: { message: { tool_calls: { function: { arguments: '{"place":' } } } } },
      { type: 'tool-call-delta', index: 0, delta: { message: { tool_calls: { function: { arguments: '"door"}' } } } } },
      { type: 'tool-call-end', index: 0 },
      { type: 'message-end', delta: { finish_reason: 'TOOL_CALL' } },
    )))
    const ends = chunks.filter((chunk): chunk is Extract<StreamChunk, { type: 'block-end' }> => chunk.type === 'block-end').map(chunk => chunk.block)
    expect(ends).toEqual([{ type: 'text', text: 'I will look.' }, { type: 'tool-call', id: 'c1', name: 'inspect', arguments: '{"place":"door"}' }])
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'tool-calls' } })
  })

  it('reports a cut answer, an empty one, a dropped stream and a failed message', async () => {
    expect((await collect(translate(events({ type: 'content-delta', index: 0, delta: { message: { content: { text: 'x' } } } }, { type: 'message-end', delta: { finish_reason: 'MAX_TOKENS' } })))).at(-1)).toEqual({ type: 'finish', reason: { kind: 'max-tokens' } })
    await expect(collect(translate(events({ type: 'message-end', delta: { finish_reason: 'COMPLETE' } })))).rejects.toMatchObject({ failure: 'EMPTY_RESPONSE' })
    await expect(collect(translate(events({ type: 'content-delta', index: 0, delta: { message: { content: { text: 'x' } } } })))).rejects.toMatchObject({ failure: 'TRANSPORT' })
    await expect(collect(translate(events({ type: 'message-end', delta: { finish_reason: 'ERROR', error: 'boom' } })))).rejects.toMatchObject({ failure: 'SERVER' })
    await expect(collect(translate(events({ type: 'message-end', delta: { finish_reason: 'TIMEOUT' } })))).rejects.toMatchObject({ failure: 'TIMEOUT' })
  })
})

describe('failure classes', () => {
  const answer = (status: number, message: string) => httpError(new Response(null, { status }), { message })
  it('tells the failures DSH acts on apart', () => {
    expect(answer(401, 'invalid api token').failure).toBe('AUTH')
    expect(answer(429, 'too many requests').failure).toBe('RATE_LIMIT')
    expect(answer(422, 'too many tokens: total number of tokens in the prompt exceeded the limit').failure).toBe('CONTEXT_WINDOW_EXCEEDED')
    expect(answer(402, 'payment required').failure).toBe('QUOTA')
    expect(answer(400, 'invalid request').failure).toBe('INVALID_REQUEST')
    expect(answer(503, 'unavailable').failure).toBe('SERVER')
  })
})

const config = (patch: Record<string, unknown> = {}) => Config({ connections: [{ id: 'c', name: 'Cohere', baseUrl: 'https://api.cohere.test/v2///', apiKeyRef: '' }], llmRoutes: [{ id: 'cohere', name: 'Cohere', connection: 'c', models: [{ id: 'command-a-03-2025', name: 'Command A', sampling: { safetyMode: 'OFF', thinking: 'enabled' } }] }], ...patch })
const sse = (...values: unknown[]) => new Response(values.map(value => `event: x\ndata: ${JSON.stringify(value)}\n\n`).join(''), { headers: { 'content-type': 'text/event-stream' } })

describe('configuration', () => {
  it('parses the real schema without inventing a retry policy and keeps native controls', () => {
    const parsed = config()
    const [route] = parsed.llmRoutes.get()
    expect(route?.retry).toBeUndefined()
    expect(route?.models[0]?.sampling).toMatchObject({ safetyMode: 'OFF', thinking: 'enabled' })
    expect(route?.models[0]?.sampling?.responseFormat).toBeUndefined()
    expect([parsed.rerankModel.get(), parsed.embeddingModel.get(), parsed.batchSize.get()]).toEqual(['rerank-v3.5', 'embed-v4.0', 96])
  })
})

describe('service', () => {
  it('streams a chat over SSE to /chat under the base URL', async () => {
    const seen: { url: string; body: Record<string, unknown>; accept: string | null; auth: string | null }[] = []
    const fetcher = (async (url: string, init: RequestInit) => {
      seen.push({ url, body: JSON.parse(init.body as string) as Record<string, unknown>, accept: new Headers(init.headers).get('accept'), auth: new Headers(init.headers).get('authorization') })
      return sse({ type: 'content-delta', index: 0, delta: { message: { content: { text: 'Hi' } } } }, { type: 'message-end', delta: { finish_reason: 'COMPLETE', usage: { tokens: { input_tokens: 4, output_tokens: 1 } } } })
    }) as unknown as typeof fetch
    const service = new CohereLlmService({ config: config(), credentials: () => undefined, fetch: fetcher })
    const chunks = await collect(service.stream(call({ safetyMode: 'OFF' } as never)))
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'stop' } })
    expect(seen[0]).toMatchObject({ url: 'https://api.cohere.test/v2/chat', accept: 'text/event-stream', body: { safety_mode: 'OFF' } })
    expect(service.routes()[0]).toMatchObject({ id: 'cohere', baseUrl: 'https://api.cohere.test/v2' })
  })

  it('classifies a refusal before the stream starts', async () => {
    const fetcher = (async () => new Response(JSON.stringify({ message: 'invalid api token' }), { status: 401 })) as unknown as typeof fetch
    const service = new CohereLlmService({ config: config(), credentials: () => undefined, fetch: fetcher })
    const error = await collect(service.stream(call())).catch((reason: unknown) => reason)
    expect(error).toBeInstanceOf(LlmRequestError)
    expect(error).toMatchObject({ failure: 'AUTH' })
  })

  it('lists chat models from /v1/models beside the versioned API, with context length and vision', async () => {
    const urls: string[] = []
    const fetcher = (async (url: string) => {
      urls.push(url)
      return Response.json({ models: [{ name: 'command-a-03-2025', context_length: 256000, features: ['tools'] }, { name: 'command-a-vision-07-2025', context_length: 128000, features: ['vision'] }] })
    }) as unknown as typeof fetch
    const service = new CohereLlmService({ config: config(), credentials: () => undefined, fetch: fetcher })
    const models = await service.discover('cohere')
    expect(urls[0]).toBe('https://api.cohere.test/v1/models?endpoint=chat&page_size=1000')
    expect(models).toEqual([
      { id: 'command-a-03-2025', name: 'command-a-03-2025', inputs: ['text'], contextWindow: 256000 },
      { id: 'command-a-vision-07-2025', name: 'command-a-vision-07-2025', inputs: ['text', 'image'], contextWindow: 128000 },
    ])
  })

  it('describes optional route capabilities and rejects missing route configuration', async () => {
    const rich = config({ llmRoutes: [{
      id: 'rich', name: 'Rich', connection: 'c', retry: { mode: 'always' }, sampling: { temperature: 0.2 },
      models: [{ id: 'vision', name: 'Vision', vision: true, contextWindow: 8192, maxTokens: 512, reasoningLevels: [{ id: 'on', name: 'On', body: { thinking: { type: 'enabled' } } }], defaultReasoning: 'on', sampling: { topP: 0.8 } }],
    }] })
    const service = new CohereLlmService({ config: rich, credentials: () => undefined, fetch: (async () => Response.json({ models: [] })) as typeof fetch })
    expect(service.routes()[0]).toMatchObject({ retry: { mode: 'always' }, sampling: { temperature: 0.2 }, models: [{ inputs: ['text', 'image'], contextWindow: 8192, maxTokens: 512, reasoning: { default: 'on' }, sampling: { topP: 0.8 } }] })
    await expect(service.discover('missing')).rejects.toMatchObject({ code: 'not-configured' })
    await expect(new CohereLlmService({ config: config({ connections: [] }), credentials: () => undefined }).discover('cohere')).rejects.toMatchObject({ code: 'not-configured' })
    expect(await service.interrogate({ baseUrl: 'https://draft.test/v2' })).toEqual([])
  })
})

describe('reused services', () => {
  it('reranks through /v2/rerank without return_documents and with max_tokens_per_doc', async () => {
    const seen: Record<string, unknown>[] = []
    const fetcher = (async (_url: string, init: RequestInit) => { seen.push(JSON.parse(init.body as string) as Record<string, unknown>); return Response.json({ id: 'r', results: [{ index: 1, relevance_score: 0.9 }, { index: 0, relevance_score: 0.1 }] }) }) as unknown as typeof fetch
    const parsed = config({ rerankMaxTokensPerDoc: 1024 })
    const service = new RerankApiService<CohereRerankOptions>({ config: parsed, provider: 'cohere', connection: () => ({ baseUrl: 'https://api.cohere.test/v2', apiKeyRef: '' }), credentials: () => undefined, returnDocuments: false, body: options => rerankBody(parsed.rerankMaxTokensPerDoc.get(), options), fetch: fetcher })
    const result = await service.rerank('q', ['a', 'b'])
    expect(service.provider).toBe('cohere')
    expect(seen[0]).toEqual({ max_tokens_per_doc: 1024, model: 'rerank-v3.5', query: 'q', documents: ['a', 'b'] })
    expect(result.results.map(entry => entry.index)).toEqual([1, 0])
  })

  it('lets a call override the token limit and set a priority', () => {
    expect(rerankBody(1024, {})).toEqual({ max_tokens_per_doc: 1024 })
    expect(rerankBody(1024, { maxTokensPerDoc: 256, queuePriority: 5 })).toEqual({ max_tokens_per_doc: 256, priority: 5 })
    expect(rerankBody(0, {})).toEqual({})
    expect(RERANK_REQUEST_OPTIONS.map(option => option.key)).toEqual(['maxTokensPerDoc', 'queuePriority'])
  })

  it('embeds through /v2/embed whatever the shared configuration says', async () => {
    const seen: { url: string; body: Record<string, unknown> }[] = []
    const fetcher = (async (url: string, init: RequestInit) => { seen.push({ url, body: JSON.parse(init.body as string) as Record<string, unknown> }); return Response.json({ embeddings: { float: [[1, 2]] }, meta: { billed_units: { input_tokens: 3 } } }) }) as unknown as typeof fetch
    const service = new EmbeddingApiService({ config: config(), provider: 'cohere', api: 'cohere', connection: () => ({ baseUrl: 'https://api.cohere.test/v2', apiKeyRef: '' }), credentials: () => undefined, fetch: fetcher })
    expect(await service.embed(['a'], { inputType: 'query' })).toEqual({ vectors: [[1, 2]], model: 'embed-v4.0', dimensions: 2, tokens: 3 })
    expect(seen[0]).toMatchObject({ url: 'https://api.cohere.test/v2/embed', body: { input_type: 'search_query', texts: ['a'] } })
    expect(service.provider).toBe('cohere')
  })
})
