import { describe, expect, it } from 'vitest'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { LlmRequestError, type LlmCall } from '@dsh-ai-providers/core'
import { Config, DashScopeEmbeddingService, DashScopeImageService, DashScopeLlmService, DashScopeRerankService, DashScopeSttService, DashScopeTtsService, EMBEDDING_REQUEST_OPTIONS, RERANK_REQUEST_OPTIONS, inferenceSocketUrl, transcriptOf, translate, wireBody, wireMessages } from '../src/index.ts'
import { httpError, streamError } from '../src/llm/errors.ts'

const options = (extra: Partial<GenerateOptions> = {}): GenerateOptions => ({
  provider: 'dashscope', model: 'qwen-plus', messages: [
    { role: 'system', content: [{ type: 'text', text: 'Be brief.' }], source: { kind: 'system-prompt' }, id: 's' as never },
    { role: 'user', content: [{ type: 'text', text: 'Look' }], source: { kind: 'user' }, id: 'u' as never },
    { role: 'assistant', content: [{ type: 'text', text: 'Checking.' }, { type: 'tool-call', id: 'call-1' as never, name: 'inspect', arguments: '{"place":"door"}' }], source: { kind: 'model', provider: 'dashscope', model: 'qwen-plus' }, id: 'a' as never },
    { role: 'tool', content: [{ type: 'text', text: 'Locked' }], source: { kind: 'tool', callId: 'call-1' as never }, toolCallId: 'call-1' as never, id: 't' as never },
  ],
  tools: [{ name: 'inspect', description: 'Inspect', parameters: { type: 'object' } }, { name: 'other', description: 'Other', parameters: { type: 'object' } }],
  ...extra,
})
const call = (sampling: LlmCall['sampling'] = {}, extra: Partial<GenerateOptions> = {}, vision = false): LlmCall => ({
  options: options(extra), route: { id: 'dashscope', name: 'DashScope', models: [] },
  model: { id: 'qwen-plus', name: 'Qwen Plus', maxTokens: 500, inputs: vision ? ['text', 'image'] : ['text'], reasoning: { levels: [{ id: 'deep', name: 'Deep', body: { enable_thinking: true, thinking_budget: 2000 } }] } },
  sampling, headers: {},
})
async function* events(...values: unknown[]): AsyncGenerator<string> { for (const value of values) yield JSON.stringify(value) }
async function collect<T>(source: AsyncIterable<T>): Promise<T[]> { const out: T[] = []; for await (const value of source) out.push(value); return out }
const delta = (message: Record<string, unknown>, finish: string | null = null, usage?: unknown) => ({ output: { choices: [{ message, finish_reason: finish === null ? 'null' : finish }] }, ...usage === undefined ? {} : { usage } })

describe('request mapping', () => {
  it('writes messages the way the text endpoint reads them', async () => {
    expect(await wireMessages(options(), false)).toEqual([
      { role: 'system', content: 'Be brief.' },
      { role: 'user', content: 'Look' },
      { role: 'assistant', content: 'Checking.', tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'inspect', arguments: '{"place":"door"}' }, index: 0 }] },
      { role: 'tool', tool_call_id: 'call-1', content: 'Locked' },
    ])
  })

  it('writes parts and data-URL images for the multimodal endpoint', async () => {
    const withImage = options({ messages: [{ role: 'user', content: [{ type: 'text', text: 'See' }, { type: 'image', attachment: {} as never }], source: { kind: 'user' }, id: 'u' as never }] as never })
    expect(await wireMessages(withImage, true, async () => ({ data: new Uint8Array([1, 2, 3]), mediaType: 'image/png' }))).toEqual([{ role: 'user', content: [{ text: 'See' }, { image: 'data:image/png;base64,AQID' }] }])
  })

  it('puts the input and every control where DashScope reads them', async () => {
    const body = await wireBody(call({
      temperature: 0.2, topP: 0.9, topK: 40, minP: 0.1, frequencyPenalty: 0.5, repetitionPenalty: 1.2, presencePenalty: 0.3, seed: 7, stop: ['END'],
      enableThinking: true, thinkingBudget: 1000, reasoningEffort: 'high', preserveThinking: true, enableSearch: true, searchOptions: { forced_search: true },
      enableCodeInterpreter: true, parallelToolCalls: true, toolStream: true, responseFormat: { type: 'json_object' }, vlHighResolutionImages: true, minPixels: 1, maxPixels: 2, totalPixels: 3,
      body: { n: 2 },
    } as never))
    expect(body).toMatchObject({ model: 'qwen-plus', input: { messages: expect.any(Array) as unknown } })
    const parameters = body['parameters'] as Record<string, unknown>
    expect(parameters).toMatchObject({
      result_format: 'message', incremental_output: true, temperature: 0.2, top_p: 0.9, top_k: 40, repetition_penalty: 1.2, presence_penalty: 0.3, max_tokens: 500, seed: 7, stop: ['END'],
      enable_thinking: true, thinking_budget: 1000, reasoning_effort: 'high', preserve_thinking: true, enable_search: true, search_options: { forced_search: true },
      enable_code_interpreter: true, parallel_tool_calls: true, tool_stream: true, response_format: { type: 'json_object' }, vl_high_resolution_images: true, min_pixels: 1, max_pixels: 2, total_pixels: 3, n: 2,
    })
    expect(parameters).not.toHaveProperty('min_p')
    expect(parameters).not.toHaveProperty('frequency_penalty')
    expect(body).not.toHaveProperty('stream')
  })

  it('offers tools in the parameters and passes the tool choice on', async () => {
    const auto = (await wireBody(call())).parameters as Record<string, unknown>
    expect((auto['tools'] as unknown[]).length).toBe(2)
    expect(auto).not.toHaveProperty('tool_choice')
    expect(((await wireBody(call({ toolChoice: 'required' }))).parameters as Record<string, unknown>)['tool_choice']).toBe('required')
    expect(((await wireBody(call({ toolChoice: 'none' }))).parameters as Record<string, unknown>)['tool_choice']).toBe('none')
    expect(((await wireBody(call({ toolChoice: { name: 'other' } }))).parameters as Record<string, unknown>)['tool_choice']).toEqual({ type: 'function', function: { name: 'other' } })
    expect((await wireBody(call({}, { tools: [] }))).parameters).not.toHaveProperty('tools')
  })

  it('lets the chosen reasoning level win over the typed thinking', async () => {
    const parameters = (await wireBody(call({ enableThinking: false } as never, { reasoningEffort: 'deep' as never }))).parameters as Record<string, unknown>
    expect(parameters).toMatchObject({ enable_thinking: true, thinking_budget: 2000 })
  })
})

describe('stream mapping', () => {
  it('maps thinking, text, usage and finish, closing thinking when the answer starts', async () => {
    const chunks = await collect(translate(events(
      delta({ role: 'assistant', content: '', reasoning_content: 'hm' }),
      delta({ content: '', reasoning_content: ' ok' }),
      delta({ content: 'Hi' }),
      delta({ content: ' there' }, 'stop', { input_tokens: 12, output_tokens: 3, prompt_tokens_details: { cached_tokens: 4 }, output_tokens_details: { reasoning_tokens: 2 } }),
    )))
    expect(chunks.map(chunk => chunk.type)).toEqual(['block-start', 'reasoning-delta', 'reasoning-delta', 'block-end', 'block-start', 'text-delta', 'text-delta', 'block-end', 'usage', 'finish'])
    expect(chunks.at(-2)).toEqual({ type: 'usage', usage: { inputTokens: 12, outputTokens: 3, cacheReadTokens: 4, reasoningTokens: 2 } })
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'stop' } })
  })

  it('reads the text parts the multimodal endpoint sends', async () => {
    const chunks = await collect(translate(events(delta({ content: [{ text: 'Hel' }] }), delta({ content: [{ text: 'lo' }] }, 'stop'))))
    expect(chunks.filter(chunk => chunk.type === 'block-end')).toEqual([{ type: 'block-end', index: 0, block: { type: 'text', text: 'Hello' } }])
  })

  it('assembles tool calls from fragments by index', async () => {
    const chunks = await collect(translate(events(
      delta({ content: 'Looking.' }),
      delta({ content: '', tool_calls: [{ index: 0, id: 'c1', type: 'function', function: { name: 'inspect', arguments: '{"place":' } }] }),
      delta({ content: '', tool_calls: [{ index: 0, function: { arguments: '"door"}' } }] }),
      delta({ content: '', tool_calls: [{ index: 1, id: 'c2', function: { name: 'other', arguments: '{}' } }] }, 'tool_calls'),
    )))
    const ends = chunks.filter((chunk): chunk is Extract<StreamChunk, { type: 'block-end' }> => chunk.type === 'block-end').map(chunk => chunk.block)
    expect(ends).toEqual([{ type: 'text', text: 'Looking.' }, { type: 'tool-call', id: 'c1', name: 'inspect', arguments: '{"place":"door"}' }, { type: 'tool-call', id: 'c2', name: 'other', arguments: '{}' }])
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'tool-calls' } })
  })

  it('reports a cut answer, an empty one, a dropped stream and an error event', async () => {
    expect((await collect(translate(events(delta({ content: 'x' }, 'length'))))).at(-1)).toEqual({ type: 'finish', reason: { kind: 'max-tokens' } })
    await expect(collect(translate(events(delta({ content: '' }, 'stop'))))).rejects.toMatchObject({ failure: 'EMPTY_RESPONSE' })
    await expect(collect(translate(events(delta({ content: 'x' }))))).rejects.toMatchObject({ failure: 'TRANSPORT' })
    await expect(collect(translate(events({ code: 'Throttling.RateQuota', message: 'slow down' })))).rejects.toMatchObject({ failure: 'RATE_LIMIT' })
  })
})

describe('failure classes', () => {
  const answer = (status: number, code: string, message: string) => httpError(new Response(null, { status }), { code, message })
  it('tells the failures DSH acts on apart', () => {
    expect(answer(401, 'InvalidApiKey', 'Invalid API-key provided.').failure).toBe('AUTH')
    expect(answer(429, 'Throttling.RateQuota', 'Requests rate limit exceeded').failure).toBe('RATE_LIMIT')
    expect(answer(400, 'InvalidParameter', 'Range of input length should be [1, 129024]').failure).toBe('CONTEXT_WINDOW_EXCEEDED')
    expect(answer(429, 'Throttling.AllocationQuota', 'Free allocated quota exceeded.').failure).toBe('QUOTA')
    expect(answer(400, 'Arrearage', 'Access denied, please make sure your account is in good standing.').failure).toBe('QUOTA')
    expect(answer(400, 'DataInspectionFailed', 'Input data may contain inappropriate content.').failure).toBe('INVALID_REQUEST')
    expect(answer(500, 'InternalError', 'oops').failure).toBe('SERVER')
    expect(streamError('InternalError', 'boom').failure).toBe('SERVER')
  })
})

const config = (patch: Record<string, unknown> = {}) => Config({ connections: [{ id: 'c', name: 'DashScope', baseUrl: 'https://dashscope.test/api/v1///', apiKeyRef: '' }], llmRoutes: [{ id: 'dashscope', name: 'DashScope', connection: 'c', models: [{ id: 'qwen-plus', name: 'Qwen Plus', sampling: { enableThinking: true, thinkingBudget: 800 } }] }], rerankConnection: 'c', embeddingConnection: 'c', ...patch })
const sse = (...values: unknown[]) => new Response(values.map(value => `id:1\nevent:result\ndata:${JSON.stringify(value)}\n\n`).join(''), { headers: { 'content-type': 'text/event-stream' } })

describe('configuration', () => {
  it('parses the real schema without inventing a retry policy or search options', () => {
    const parsed = config()
    const [route] = parsed.llmRoutes.get()
    expect(route?.retry).toBeUndefined()
    expect(route?.models[0]?.sampling).toMatchObject({ enableThinking: true, thinkingBudget: 800 })
    expect(route?.models[0]?.sampling?.searchOptions).toBeUndefined()
    expect(route?.models[0]?.sampling?.responseFormat).toBeUndefined()
    expect([parsed.rerankModel.get(), parsed.embeddingModel.get(), parsed.batchSize.get()]).toEqual(['qwen3-rerank', 'text-embedding-v4', 10])
    expect(parsed.connections.get()[0]).toMatchObject({ id: 'c' })
  })
})

describe('service', () => {
  it('streams from the text endpoint with the SSE header', async () => {
    const seen: { url: string; body: Record<string, unknown>; sse: string | null }[] = []
    const fetcher = (async (url: string, init: RequestInit) => {
      seen.push({ url, body: JSON.parse(init.body as string) as Record<string, unknown>, sse: new Headers(init.headers).get('x-dashscope-sse') })
      return sse(delta({ content: 'Hi' }, 'stop', { input_tokens: 4, output_tokens: 1 }))
    }) as unknown as typeof fetch
    const service = new DashScopeLlmService({ config: config(), credentials: () => undefined, fetch: fetcher })
    const chunks = await collect(service.stream(call({ enableSearch: true } as never)))
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'stop' } })
    expect(seen[0]).toMatchObject({ url: 'https://dashscope.test/api/v1/services/aigc/text-generation/generation', sse: 'enable', body: { parameters: { enable_search: true } } })
    expect(service.routes()[0]).toMatchObject({ id: 'dashscope', baseUrl: 'https://dashscope.test/api/v1' })
  })

  it('uses the multimodal endpoint for a model that reads images', async () => {
    const urls: string[] = []
    const fetcher = (async (url: string) => { urls.push(url); return sse(delta({ content: [{ text: 'ok' }] }, 'stop')) }) as unknown as typeof fetch
    await collect(new DashScopeLlmService({ config: config(), credentials: () => undefined, fetch: fetcher }).stream(call({}, {}, true)))
    expect(urls[0]).toBe('https://dashscope.test/api/v1/services/aigc/multimodal-generation/generation')
  })

  it('classifies a refusal before the stream starts', async () => {
    const fetcher = (async () => new Response(JSON.stringify({ code: 'InvalidApiKey', message: 'Invalid API-key provided.', request_id: 'r1' }), { status: 401 })) as unknown as typeof fetch
    const service = new DashScopeLlmService({ config: config(), credentials: () => undefined, fetch: fetcher })
    const error = await collect(service.stream(call())).catch((reason: unknown) => reason)
    expect(error).toBeInstanceOf(LlmRequestError)
    expect(error).toMatchObject({ failure: 'AUTH', facts: { status: 401, requestId: 'r1' } })
  })

  it('lists text-generation models page by page with context window, output limit and image input', async () => {
    const urls: string[] = []
    const page = (count: number, first: number) => Array.from({ length: count }, (_, index) => ({ model: `m${first + index}`, name: `M${first + index}`, inference_metadata: { request_modality: first + index === 100 ? ['Text', 'Image'] : ['Text'] }, model_info: { context_window: 1000, max_output_tokens: 100 } }))
    const fetcher = (async (url: string) => {
      urls.push(url)
      return Response.json({ output: { total: 101, models: url.includes('page_no=1&') ? page(100, 0) : page(1, 100) } })
    }) as unknown as typeof fetch
    const models = await new DashScopeLlmService({ config: config(), credentials: () => undefined, fetch: fetcher }).discover('dashscope')
    expect(urls).toEqual(['https://dashscope.test/api/v1/models?capabilities=TG&page_no=1&page_size=100', 'https://dashscope.test/api/v1/models?capabilities=TG&page_no=2&page_size=100'])
    expect(models).toHaveLength(101)
    expect(models[100]).toEqual({ id: 'm100', name: 'M100', inputs: ['text', 'image'], contextWindow: 1000, maxTokens: 100 })
  })

  it('rejects missing route configuration', async () => {
    const service = new DashScopeLlmService({ config: config(), credentials: () => undefined, fetch: (async () => Response.json({ output: { models: [] } })) as typeof fetch })
    await expect(service.discover('missing')).rejects.toMatchObject({ code: 'not-configured' })
    await expect(new DashScopeLlmService({ config: config({ connections: [] }), credentials: () => undefined }).discover('dashscope')).rejects.toMatchObject({ code: 'not-configured' })
  })
})

describe('rerank and embedding', () => {
  const connection = () => ({ baseUrl: 'https://dashscope.test/api/v1', apiKeyRef: '' })
  const capture = (answer: object | ((body: Record<string, unknown>) => object)) => {
    const seen: { url: string; body: Record<string, unknown> }[] = []
    const fetcher = (async (url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as Record<string, unknown>
      seen.push({ url, body })
      return Response.json(typeof answer === 'function' ? answer(body) : answer)
    }) as unknown as typeof fetch
    return { seen, fetcher }
  }

  it('reranks through the native envelope with the instruction and topN', async () => {
    const { seen, fetcher } = capture({ output: { results: [{ index: 1, relevance_score: 0.2 }, { index: 0, relevance_score: 0.9 }] }, usage: { total_tokens: 11 } })
    const parsed = config({ rerankInstruct: 'Find the answer.' })
    const service = new DashScopeRerankService({ config: parsed, provider: 'dashscope', connection, credentials: () => undefined, fetch: fetcher })
    const result = await service.rerank('q', ['a', 'b'], { topN: 1 })
    expect(seen[0]).toEqual({ url: 'https://dashscope.test/api/v1/services/rerank/text-rerank/text-rerank', body: { model: 'qwen3-rerank', input: { query: 'q', documents: ['a', 'b'] }, parameters: { return_documents: false, top_n: 1, instruct: 'Find the answer.' } } })
    expect(result).toEqual({ results: [{ index: 0, score: 0.9 }, { index: 1, score: 0.2 }], model: 'qwen3-rerank', tokens: 11 })
    await service.rerank('q', ['a'], { instruct: 'Other.' })
    expect(seen[1]?.body['parameters']).toMatchObject({ instruct: 'Other.' })
    expect(RERANK_REQUEST_OPTIONS.map(option => option.key)).toEqual(['instruct'])
  })

  it('refuses a rerank answer with a score outside 0 to 1', async () => {
    const { fetcher } = capture({ output: { results: [{ index: 0, relevance_score: 4 }] } })
    await expect(new DashScopeRerankService({ config: config(), provider: 'dashscope', connection, credentials: () => undefined, fetch: fetcher }).rerank('q', ['a'])).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('embeds in batches through the native envelope, mapping the input type and ordering by text_index', async () => {
    const { seen, fetcher } = capture((body) => {
      const texts = (body['input'] as { texts: string[] }).texts
      return { output: { embeddings: texts.map((_, index) => ({ embedding: [index, index], text_index: index })).reverse() }, usage: { total_tokens: 5 } }
    })
    const parsed = config({ batchSize: 2, embeddingDimensions: 512, embeddingInstruct: 'Retrieve.' })
    const service = new DashScopeEmbeddingService({ config: parsed, provider: 'dashscope', connection, credentials: () => undefined, fetch: fetcher })
    const result = await service.embed(['a', 'b', 'c', 'd'], { inputType: 'query' })
    expect(seen).toHaveLength(2)
    expect(seen[0]).toEqual({ url: 'https://dashscope.test/api/v1/services/embeddings/text-embedding/text-embedding', body: { model: 'text-embedding-v4', input: { texts: ['a', 'b'] }, parameters: { output_type: 'dense', text_type: 'query', dimension: 512, instruct: 'Retrieve.' } } })
    expect(result).toEqual({ vectors: [[0, 0], [1, 1], [0, 0], [1, 1]], model: 'text-embedding-v4', dimensions: 2, tokens: 10 })
    await service.embed(['a'], { dimensions: 64, instruct: '' })
    expect(seen[2]?.body['parameters']).toEqual({ output_type: 'dense', dimension: 64 })
    expect(EMBEDDING_REQUEST_OPTIONS.map(option => option.key)).toEqual(['dimensions', 'instruct'])
  })

  it('fails loudly on an empty text and on a wrong number of vectors', async () => {
    const { fetcher } = capture({ output: { embeddings: [] } })
    const service = new DashScopeEmbeddingService({ config: config(), provider: 'dashscope', connection, credentials: () => undefined, fetch: fetcher })
    await expect(service.embed([' '])).rejects.toMatchObject({ code: 'invalid-input' })
    await expect(service.embed(['a'])).rejects.toMatchObject({ code: 'unavailable' })
  })
})

describe('multimodal embedding endpoint', () => {
  it('sends each text as a content of the multimodal endpoint and orders by index', async () => {
    const seen: { url: string; body: Record<string, unknown> }[] = []
    const fetcher = (async (url: string, init: RequestInit) => {
      seen.push({ url, body: JSON.parse(init.body as string) as Record<string, unknown> })
      return Response.json({ output: { embeddings: [{ index: 1, embedding: [2], type: 'text' }, { index: 0, embedding: [1], type: 'text' }] }, usage: { total_tokens: 3 } })
    }) as unknown as typeof fetch
    const parsed = config({ embeddingEndpoint: 'multimodal', embeddingModel: 'qwen3-vl-embedding', embeddingDimensions: 1024 })
    const service = new DashScopeEmbeddingService({ config: parsed, provider: 'dashscope', connection: () => ({ baseUrl: 'https://dashscope.test/api/v1', apiKeyRef: '' }), credentials: () => undefined, fetch: fetcher })
    expect(await service.embed(['a', 'b'], { inputType: 'query' })).toEqual({ vectors: [[1], [2]], model: 'qwen3-vl-embedding', dimensions: 1, tokens: 3 })
    expect(seen[0]).toEqual({ url: 'https://dashscope.test/api/v1/services/embeddings/multimodal-embedding/multimodal-embedding', body: { model: 'qwen3-vl-embedding', input: { contents: [{ text: 'a' }, { text: 'b' }] }, parameters: { output_type: 'dense', dimension: 1024 } } })
  })
})

describe('image generation', () => {
  it('sends references before the prompt, requests the options, and downloads the pictures without credentials', async () => {
    const calls: { url: string; body?: Record<string, unknown>; auth: string | null }[] = []
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push({ url, ...init.body === undefined ? {} : { body: JSON.parse(init.body as string) as Record<string, unknown> }, auth: new Headers(init.headers).get('authorization') })
      if (url.endsWith('/generation')) return Response.json({ output: { choices: [{ message: { content: [{ image: 'https://oss.test/1.png' }, { image: 'https://oss.test/2.png' }] } }] } })
      return new Response(new Uint8Array([9, 9]), { headers: { 'content-type': 'image/png' } })
    }) as unknown as typeof fetch
    const credentials = () => ({ resolve: async () => ({ value: 'secret' }) }) as never
    const service = new DashScopeImageService({ config: config({ imageSize: '1024*1024' }), provider: 'dashscope', connection: () => ({ baseUrl: 'https://dashscope.test/api/v1', apiKeyRef: 'KEY' }), credentials, fetch: fetcher })
    const result = await service.generate('a fox', { count: 2, negativePrompt: 'blur', seed: 5, references: [{ data: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }) }] })
    expect(calls[0]).toMatchObject({ url: 'https://dashscope.test/api/v1/services/aigc/multimodal-generation/generation', auth: 'Bearer secret', body: {
      model: 'qwen-image-2.0-pro', input: { messages: [{ role: 'user', content: [{ image: 'data:image/png;base64,AQID' }, { text: 'a fox' }] }] },
      parameters: { n: 2, size: '1024*1024', negative_prompt: 'blur', prompt_extend: true, watermark: false, seed: 5 },
    } })
    expect(calls.slice(1).map(call => [call.url, call.auth])).toEqual([['https://oss.test/1.png', null], ['https://oss.test/2.png', null]])
    expect(result.images.map(image => image.mediaType)).toEqual(['image/png', 'image/png'])
    expect(result.model).toBe('qwen-image-2.0-pro')
  })

  it('fails loudly when the answer holds no pictures', async () => {
    const fetcher = (async () => Response.json({ output: { choices: [{ message: { content: [] } }] } })) as unknown as typeof fetch
    const service = new DashScopeImageService({ config: config(), provider: 'dashscope', connection: () => ({ baseUrl: 'https://dashscope.test/api/v1', apiKeyRef: '' }), credentials: () => undefined, fetch: fetcher })
    await expect(service.generate('x')).rejects.toMatchObject({ code: 'unavailable' })
    await expect(service.generate(' ')).rejects.toMatchObject({ code: 'invalid-input' })
  })
})

describe('speech recognition', () => {
  const wav = new Uint8Array(44 + 32000)
  new DataView(wav.buffer).setUint32(28, 32000, true)
  new DataView(wav.buffer).setUint32(40, 32000, true)

  it('sends the recording as a data URL with the language and reads the transcript', async () => {
    const seen: Record<string, unknown>[] = []
    const fetcher = (async (_url: string, init: RequestInit) => { seen.push(JSON.parse(init.body as string) as Record<string, unknown>); return Response.json({ output: { text: 'hello' } }) }) as unknown as typeof fetch
    const service = new DashScopeSttService({ config: config(), provider: 'dashscope', connection: () => ({ baseUrl: 'https://dashscope.test/api/v1', apiKeyRef: '' }), credentials: () => undefined, fetch: fetcher })
    const transcript = await service.transcribe({ audio: wav, language: 'zh' }, new AbortController().signal)
    expect(transcript).toMatchObject({ text: 'hello', audioSeconds: 1 })
    expect(seen[0]).toMatchObject({ model: 'qwen3-asr-flash', parameters: { asr_options: { language: 'zh', enable_itn: false } } })
    expect(JSON.stringify(seen[0])).toContain('"type":"input_audio"')
    await service.transcribe({ audio: wav, language: 'auto' }, new AbortController().signal)
    expect((seen[1]?.['parameters'] as { asr_options: object }).asr_options).toEqual({ enable_itn: false })
    expect(service.info).toMatchObject({ id: 'dashscope', location: 'cloud' })
  })

  it('finds the transcript wherever the answer puts it', () => {
    expect(transcriptOf({ output: { output: { sentence: { text: 'a' } } } })).toBe('a')
    expect(transcriptOf({ output: { choices: [{ message: { content: [{ text: 'b' }, { text: 'c' }] } }] } })).toBe('bc')
    expect(transcriptOf({ output: {} })).toBeUndefined()
  })
})

describe('speech synthesis', () => {
  const connection = () => ({ baseUrl: 'https://dashscope.test/api/v1', apiKeyRef: 'KEY' })
  const credentials = () => ({ resolve: async () => ({ value: 'secret' }) }) as never
  async function read(stream: ReadableStream<Uint8Array>): Promise<number[]> {
    const out: number[] = []
    const reader = stream.getReader()
    for (;;) { const { done, value } = await reader.read(); if (done) return out; out.push(...value) }
  }

  it('Qwen-TTS: asks over HTTP and streams the file from its address without credentials', async () => {
    const calls: { url: string; body?: Record<string, unknown>; auth: string | null }[] = []
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push({ url, ...init.body === undefined ? {} : { body: JSON.parse(init.body as string) as Record<string, unknown> }, auth: new Headers(init.headers).get('authorization') })
      return url.endsWith('/generation') ? Response.json({ output: { audio: { url: 'https://oss.test/a.wav' } } }) : new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'audio/wav' } })
    }) as unknown as typeof fetch
    const service = new DashScopeTtsService({ config: config(), provider: 'dashscope', connection, credentials, fetch: fetcher })
    const result = await service.synthesize('Hello', { languageType: 'English' })
    expect(await read(result.audio)).toEqual([1, 2, 3])
    expect(result).toMatchObject({ mediaType: 'audio/wav', model: 'qwen3-tts-flash' })
    expect(calls[0]).toMatchObject({ auth: 'Bearer secret', body: { model: 'qwen3-tts-flash', input: { text: 'Hello', voice: 'Cherry', language_type: 'English' } } })
    expect(calls[1]).toMatchObject({ url: 'https://oss.test/a.wav', auth: null })
    await service.synthesize('Hello')
    expect(calls[2]?.body?.['input']).toEqual({ text: 'Hello', voice: 'Cherry' })
  })

  it('derives the WebSocket address beside the HTTP one', () => {
    expect(inferenceSocketUrl('https://dashscope.aliyuncs.com/api/v1')).toBe('wss://dashscope.aliyuncs.com/api-ws/v1/inference')
    expect(inferenceSocketUrl('http://localhost:8080/proxy/api/v1/')).toBe('ws://localhost:8080/proxy/api-ws/v1/inference')
    expect(() => inferenceSocketUrl('https://example.test/v1')).toThrow(/api\/v1/)
  })

  function socketFor(script: (sent: { header: { action: string; task_id: string }; payload: Record<string, unknown> }, emit: (data: unknown) => void) => void) {
    const listeners: Record<string, ((event: { data?: unknown }) => void)[]> = {}
    const sent: unknown[] = []
    const emit = (data: unknown): void => { for (const listener of listeners['message'] ?? []) listener({ data }) }
    const socket = {
      addEventListener: (type: string, listener: (event: { data?: unknown }) => void) => { (listeners[type] ??= []).push(listener) },
      send: (data: string) => { const message = JSON.parse(data) as Parameters<typeof script>[0]; sent.push(message); script(message, emit) },
      close: () => { for (const listener of listeners['close'] ?? []) listener({}) },
    }
    const factory = (url: string, headers: Record<string, string>) => { sent.push({ url, headers }); queueMicrotask(() => { for (const listener of listeners['open'] ?? []) listener({}) }); return socket }
    return { factory, sent }
  }

  it('CosyVoice: runs a task over the WebSocket and streams the frames', async () => {
    const { factory, sent } = socketFor((message, emit) => {
      const send = (event: string): void => emit(JSON.stringify({ header: { event, task_id: message.header.task_id } }))
      if (message.header.action === 'run-task') send('task-started')
      if (message.header.action === 'finish-task') { emit(new Uint8Array([7, 8])); emit(new Uint8Array([9])); send('task-finished') }
    })
    const service = new DashScopeTtsService({ config: config({ ttsModel: 'cosyvoice-v3-flash', ttsVoice: 'longanyang' }), provider: 'dashscope', connection, credentials, socket: factory })
    const result = await service.synthesize('Hi there', { rate: 1.2, format: 'wav' })
    expect(result).toMatchObject({ mediaType: 'audio/wav', model: 'cosyvoice-v3-flash' })
    expect(await read(result.audio)).toEqual([7, 8, 9])
    expect(sent[0]).toEqual({ url: 'wss://dashscope.test/api-ws/v1/inference', headers: { authorization: 'Bearer secret' } })
    expect(sent[1]).toMatchObject({ header: { action: 'run-task', streaming: 'duplex' }, payload: { task_group: 'audio', task: 'tts', function: 'SpeechSynthesizer', model: 'cosyvoice-v3-flash', parameters: { voice: 'longanyang', format: 'wav', rate: 1.2, text_type: 'PlainText' } } })
    expect(sent.slice(2)).toMatchObject([{ header: { action: 'continue-task' }, payload: { input: { text: 'Hi there' } } }, { header: { action: 'finish-task' } }])
  })

  it('CosyVoice: a task that fails before it starts is an error of the call', async () => {
    const { factory } = socketFor((message, emit) => {
      if (message.header.action === 'run-task') emit(JSON.stringify({ header: { event: 'task-failed', task_id: message.header.task_id, error_code: 'InvalidApiKey', error_message: 'bad key' } }))
    })
    const service = new DashScopeTtsService({ config: config({ ttsModel: 'cosyvoice-v2' }), provider: 'dashscope', connection, credentials, socket: factory })
    await expect(service.synthesize('Hi')).rejects.toMatchObject({ code: 'rejected', message: expect.stringContaining('bad key') as unknown })
  })

  it('refuses empty text and a missing voice or model', async () => {
    const service = new DashScopeTtsService({ config: config({ ttsVoice: '' }), provider: 'dashscope', connection, credentials: () => undefined })
    await expect(service.synthesize(' ')).rejects.toMatchObject({ code: 'invalid-input' })
    await expect(service.synthesize('Hi')).rejects.toMatchObject({ code: 'not-configured' })
  })
})
