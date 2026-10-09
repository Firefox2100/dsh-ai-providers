import { describe, expect, it } from 'vitest'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import type { LlmCall } from 'dsh-ai-core'
import { translate } from '../src/llm/translate.ts'
import { wireBody, wireMessages } from '../src/llm/serialize.ts'
import { OpenAiLlmService } from '../src/llm/service.ts'
import { sseData } from '../src/llm/sse.ts'

async function * events(...items: unknown[]): AsyncGenerator<string> {
  for (const item of items) yield typeof item === 'string' ? item : JSON.stringify(item)
}
const delta = (value: Record<string, unknown>, finish: string | null = null) => ({ choices: [{ delta: value, finish_reason: finish }] })
async function collect(source: AsyncIterable<StreamChunk>): Promise<StreamChunk[]> {
  const out: StreamChunk[] = []
  for await (const chunk of source) out.push(chunk)
  return out
}
const kinds = (chunks: StreamChunk[]): string[] => chunks.map(chunk => chunk.type === 'block-start' ? `start:${chunk.blockType}` : chunk.type === 'finish' ? `finish:${chunk.reason.kind}` : chunk.type)

describe('the stream of chat completions', () => {
  it('becomes a text block, its usage and a stop', async () => {
    const chunks = await collect(translate(events(delta({ content: 'Hel' }), delta({ content: 'lo' }), delta({}, 'stop'), { choices: [], usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12, prompt_tokens_details: { cached_tokens: 4 } } }, '[DONE]'), 'tags'))
    expect(kinds(chunks)).toEqual(['start:text', 'text-delta', 'text-delta', 'block-end', 'usage', 'finish:stop'])
    expect(chunks[3]).toMatchObject({ block: { type: 'text', text: 'Hello' } })
    expect(chunks[4]).toMatchObject({ usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12, cacheReadTokens: 4 } })
  })

  it('keeps the reasoning the endpoint separates, before the answer', async () => {
    const chunks = await collect(translate(events(delta({ reasoning_content: 'hm' }), delta({ content: 'Yes' }), delta({}, 'stop'), '[DONE]'), 'tags'))
    expect(kinds(chunks)).toEqual(['start:reasoning', 'reasoning-delta', 'start:text', 'text-delta', 'block-end', 'block-end', 'finish:stop'])
    expect(chunks.filter(chunk => chunk.type === 'block-end').map(chunk => (chunk as { block: unknown }).block)).toEqual([{ type: 'reasoning', text: 'hm' }, { type: 'text', text: 'Yes' }])
  })

  it('collects a tool call from its pieces and finishes as tool calls even when the endpoint says stop', async () => {
    const chunks = await collect(translate(events(
      delta({ tool_calls: [{ index: 0, id: 'call_a', function: { name: 'look', arguments: '{"at":' } }] }),
      delta({ tool_calls: [{ index: 0, function: { arguments: '"door"}' } }] }),
      delta({}, 'stop'), '[DONE]'), 'tags'))
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'tool-calls' } })
    expect(chunks.find(chunk => chunk.type === 'block-end')).toMatchObject({ block: { type: 'tool-call', id: 'call_a', name: 'look', arguments: '{"at":"door"}' } })
  })

  it('separates think tags even when a tag is cut between pieces, and leaves the text alone when told to', async () => {
    const pieces = ['<thi', 'nk>plan</thi', 'nk>\n\nAnswer']
    const split = await collect(translate(events(...pieces.map(content => delta({ content })), delta({}, 'stop'), '[DONE]'), 'tags'))
    expect(split.filter(chunk => chunk.type === 'block-end').map(chunk => (chunk as { block: unknown }).block)).toEqual([{ type: 'reasoning', text: 'plan' }, { type: 'text', text: 'Answer' }])
    const implicit = await collect(translate(events(delta({ content: 'plan</think>Answer' }), delta({}, 'stop'), '[DONE]'), 'implicit'))
    expect(implicit.filter(chunk => chunk.type === 'block-end').map(chunk => (chunk as { block: unknown }).block)).toEqual([{ type: 'reasoning', text: 'plan' }, { type: 'text', text: 'Answer' }])
    const plain = await collect(translate(events(delta({ content: '<think>x</think>y' }), delta({}, 'stop'), '[DONE]'), 'none'))
    expect(plain.find(chunk => chunk.type === 'block-end')).toMatchObject({ block: { type: 'text', text: '<think>x</think>y' } })
  })

  it('reports a cut-off answer as max tokens, and refuses nothing, errors and truncation', async () => {
    expect((await collect(translate(events(delta({ content: 'x' }, 'length'), '[DONE]'), 'tags'))).at(-1)).toEqual({ type: 'finish', reason: { kind: 'max-tokens' } })
    await expect(collect(translate(events(delta({}, 'stop'), '[DONE]'), 'tags'))).rejects.toMatchObject({ failure: 'EMPTY_RESPONSE' })
    await expect(collect(translate(events(delta({ content: 'x' }), { error: { message: 'maximum context length is 10 tokens' } }), 'tags'))).rejects.toMatchObject({ failure: 'CONTEXT_WINDOW_EXCEEDED' })
    await expect(collect(translate(events(delta({ content: 'x' })), 'tags'))).rejects.toMatchObject({ failure: 'TRANSPORT' })
  })

  it('is read from server-sent events whatever the way the bytes are cut', async () => {
    const body = new ReadableStream<Uint8Array>({ start(controller) { for (const part of ['data: {"a":', '1}\n\ndata: [DO', 'NE]\r\n\r\n']) controller.enqueue(new TextEncoder().encode(part)); controller.close() } })
    const out: string[] = []
    for await (const data of sseData(body)) out.push(data)
    expect(out).toEqual(['{"a":1}', '[DONE]'])
  })
})

const options = (extra: Partial<GenerateOptions> = {}): GenerateOptions => ({
  provider: 'local', model: 'big', messages: [
    { role: 'system', content: [{ type: 'text', text: 'Be brief.' }], source: { kind: 'system-prompt' }, id: 's' as never },
    { role: 'user', content: [{ type: 'text', text: 'Hi' }], source: { kind: 'user' }, id: 'u' as never },
    { role: 'assistant', content: [{ type: 'reasoning', text: 'think' }, { type: 'text', text: 'Looking.' }, { type: 'tool-call', id: 'c1' as never, name: 'look', arguments: '{}' }], source: { kind: 'model', provider: 'local', model: 'big' }, id: 'a' as never },
    { role: 'tool', content: [{ type: 'text', text: 'a door' }], source: { kind: 'tool', callId: 'c1' as never }, toolCallId: 'c1' as never, id: 't' as never },
  ],
  tools: [{ name: 'look', description: 'Look', parameters: { type: 'object' } }],
  ...extra,
})

const callOf = (extra: Partial<LlmCall> = {}, opt: Partial<GenerateOptions> = {}): LlmCall => ({
  options: options(opt),
  route: { id: 'local', name: 'Local', models: [] },
  model: { id: 'big', name: 'Big', maxTokens: 1000, reasoning: { levels: [{ id: 'off', name: 'Off', body: { reasoning_effort: 'none' } }] } },
  sampling: {}, headers: { 'user-agent': 'harness' },
  ...extra,
})

describe('the request of a call', () => {
  it('carries the conversation as the API wants it, without the reasoning unless asked', () => {
    expect(wireMessages(options(), { replayReasoning: false })).toEqual([
      { role: 'system', content: 'Be brief.' }, { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Looking.', tool_calls: [{ id: 'c1', type: 'function', function: { name: 'look', arguments: '{}' } }] },
      { role: 'tool', tool_call_id: 'c1', content: 'a door' },
    ])
    expect(wireMessages(options(), { replayReasoning: true })[2]).toMatchObject({ reasoning_content: 'think' })
  })

  it('has every control that applies, the level of reasoning chosen and the model\'s own output limit', () => {
    const body = wireBody(callOf({ sampling: { temperature: 0.2, topP: 0.9, stop: ['END'], toolChoice: 'required', body: { extra: 1 } } }, { reasoningEffort: 'off' as never }), { maxTokensField: 'max_tokens', replayReasoning: false })
    expect(body).toMatchObject({ model: 'big', stream: true, stream_options: { include_usage: true }, max_tokens: 1000, temperature: 0.2, top_p: 0.9, stop: ['END'], tool_choice: 'required', reasoning_effort: 'none', extra: 1 })
    expect(body['tools']).toEqual([{ type: 'function', function: { name: 'look', description: 'Look', parameters: { type: 'object' } } }])
    expect(wireBody(callOf({ sampling: { toolChoice: { name: 'look' }, maxTokens: 50 } }), { maxTokensField: 'max_completion_tokens', replayReasoning: false })).toMatchObject({ tool_choice: { type: 'function', function: { name: 'look' } }, max_completion_tokens: 50 })
    expect(wireBody(callOf({ sampling: { toolChoice: 'required' } }, { tools: [] }), { maxTokensField: 'max_tokens', replayReasoning: false })).not.toHaveProperty('tool_choice')
  })
})

describe('the service', () => {
  const sse = (...items: unknown[]): Response => new Response(`${items.map(item => `data: ${typeof item === 'string' ? item : JSON.stringify(item)}\n\n`).join('')}`, { headers: { 'content-type': 'text/event-stream' } })
  const make = (answer: (url: string, init: RequestInit) => Response | Promise<Response>, idle = 5000) => {
    const seen: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = []
    const route = { id: 'local', name: 'Local', connection: 'c', models: [{ id: 'big', name: 'Big' }], headers: { 'x-route': '1' } }
    const service = new OpenAiLlmService({
      config: { llmRoutes: { get: () => [route] }, connections: { get: () => [{ id: 'c', name: 'C', baseUrl: 'http://llm.test/v1/', apiKeyRef: 'KEY' }] }, llmIdleTimeoutMs: { get: () => idle } } as never,
      credentials: () => ({ resolve: () => Promise.resolve({ value: 'sk-1', source: 'file' }) }) as never,
      fetch: (async (url: string, init: RequestInit) => { seen.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body ?? '{}')) }); return await answer(url, init) }) as never,
    })
    return { service, seen }
  }

  it('posts to chat/completions with the key and the harness\'s headers and streams the answer', async () => {
    const { service, seen } = make(() => sse(delta({ content: 'ok' }, 'stop'), '[DONE]'))
    const chunks = await collect(service.stream(callOf()))
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'stop' } })
    expect(seen[0]).toMatchObject({ url: 'http://llm.test/v1/chat/completions', headers: { authorization: 'Bearer sk-1', 'user-agent': 'harness', 'x-route': '1' } })
  })

  it('classifies what the endpoint refuses', async () => {
    const refuse = async (status: number, body: unknown, headers: Record<string, string> = {}) => await collect(make(() => new Response(JSON.stringify(body), { status, headers })).service.stream(callOf())).catch((error: unknown) => error)
    expect(await refuse(401, { error: { message: 'bad key' } })).toMatchObject({ failure: 'AUTH', facts: { status: 401 } })
    expect(await refuse(429, { error: { message: 'slow down' } }, { 'retry-after': '3' })).toMatchObject({ failure: 'RATE_LIMIT', facts: { retryAfterMs: 3000 } })
    expect(await refuse(400, { error: { message: "This model's maximum context length is 8192 tokens" } })).toMatchObject({ failure: 'CONTEXT_WINDOW_EXCEEDED' })
    expect(await refuse(429, { error: { type: 'insufficient_quota', message: 'You exceeded your current quota' } })).toMatchObject({ failure: 'QUOTA' })
    expect(await refuse(503, 'down')).toMatchObject({ failure: 'SERVER' })
    expect(await refuse(422, { error: { message: 'nope' } })).toMatchObject({ failure: 'INVALID_REQUEST' })
  })

  it('gives up on a silent answer, and says so when the caller cancels', async () => {
    const silent = make(() => new Response(new ReadableStream({ start() { /* never says anything */ } })), 30)
    await expect(collect(silent.service.stream(callOf()))).rejects.toMatchObject({ failure: 'TIMEOUT' })
    const controller = new AbortController()
    controller.abort()
    const cancelled = make((_url, init) => (init.signal?.aborted === true ? Promise.reject(new DOMException('aborted', 'AbortError')) : sse('[DONE]')))
    await expect(collect(cancelled.service.stream(callOf({}, { signal: controller.signal })))).rejects.toMatchObject({ failure: 'ABORTED' })
    await expect(collect(make(() => Promise.reject(new TypeError('fetch failed'))).service.stream(callOf()))).rejects.toMatchObject({ failure: 'TRANSPORT' })
  })

  it('reads its routes from the configuration on each use and lists what the endpoint has', async () => {
    const { service } = make(() => Response.json({ data: [{ id: 'a', context_length: 4096 }, 'b', { name: 'no id' }] }))
    expect(service.routes()).toMatchObject([{ id: 'local', name: 'Local', models: [{ id: 'big', inputs: ['text'] }] }])
    expect(await service.discover('local')).toEqual([{ id: 'a', name: 'a', contextWindow: 4096 }, { id: 'b', name: 'b' }])
  })
})
