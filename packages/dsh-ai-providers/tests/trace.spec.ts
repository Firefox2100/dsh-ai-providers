import { Context } from '@deepseek-ai/cordis'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'
import { ConfiguredEmbedding } from '../src/host/embedding.ts'
import { AiLlmAdapter } from '../src/host/llm.ts'
import { AiProviders } from '../src/host/registry.ts'
import { JsonlSink, LangfuseSink, otlpSpan } from '../src/host/trace/sinks.ts'
import { Tracer, type SpanRecord, type TraceItem, type TraceSink } from '../src/host/trace/tracer.ts'
import { FakeEmbedding, FakeLlm, providerOf } from './support.ts'
import { mkdtemp, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

class Memory implements TraceSink {
  readonly name = 'memory'
  items: TraceItem[] = []
  write(items: readonly TraceItem[]): Promise<void> { this.items.push(...items); return Promise.resolve() }
  get spans(): SpanRecord[] { return this.items.flatMap(item => item.type === 'span' ? [item.span] : []) }
}

function tracerOf(options: { enabled?: boolean; summary?: number; redact?: RegExp[]; wire?: boolean } = {}) {
  const sink = new Memory()
  const state = { enabled: options.enabled ?? true }
  const problems: string[] = []
  const tracer = new Tracer({ enabled: () => state.enabled, sinks: () => [sink], summaryChars: () => options.summary ?? 0, redact: () => options.redact ?? [], wire: () => options.wire === true, onProblem: message => problems.push(message) })
  return { tracer, sink, state, problems }
}

describe('the tracer', () => {
  it('nests the spans of work that runs inside another, through the async context', async () => {
    const { tracer, sink } = tracerOf()
    await tracer.run({ name: 'turn', trace: { name: 'turn 1', sessionId: 's1' } }, async () => {
      await new Promise(resolve => setTimeout(resolve, 1))
      await tracer.run({ name: 'round' }, async () => { await tracer.run({ name: 'call' }, () => Promise.resolve()) })
    })
    await tracer.flush()
    const [call, round, turn] = sink.spans
    expect([call!.name, round!.name, turn!.name]).toEqual(['call', 'round', 'turn'])
    expect(call!.parentId).toBe(round!.spanId)
    expect(round!.parentId).toBe(turn!.spanId)
    expect(turn!.parentId).toBeUndefined()
    expect(new Set(sink.spans.map(span => span.traceId)).size).toBe(1)
    expect(call!.trace).toEqual({ name: 'turn 1', sessionId: 's1' })
  })

  it('starts a trace of its own for a call with nothing around it', async () => {
    const { tracer, sink } = tracerOf()
    await tracer.run({ name: 'a' }, () => Promise.resolve())
    await tracer.run({ name: 'b' }, () => Promise.resolve())
    await tracer.flush()
    expect(new Set(sink.spans.map(span => span.traceId)).size).toBe(2)
  })

  it('files work the async context does not reach under the span linked to its key', () => {
    const { tracer } = tracerOf()
    const parent = tracer.start({ name: 'helper' })
    const unlink = tracer.link('session-1', parent.ref)
    expect(tracer.linked('session-1')).toEqual(parent.ref)
    unlink()
    expect(tracer.linked('session-1')).toBeUndefined()
  })

  it('marks a failed span and lets the failure through', async () => {
    const { tracer, sink } = tracerOf()
    await expect(tracer.run({ name: 'bad' }, () => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    await tracer.flush()
    expect(sink.spans[0]).toMatchObject({ level: 'ERROR', statusMessage: 'boom' })
  })

  it('does nothing while capture is off, and the work still runs', async () => {
    const { tracer, sink, state } = tracerOf({ enabled: false })
    expect(await tracer.run({ name: 'x' }, () => Promise.resolve(7))).toBe(7)
    expect(tracer.start({ name: 'y' }).ref.traceId).toBe('')
    expect(tracer.current()).toBeUndefined()
    await tracer.flush()
    expect(sink.items).toEqual([])
    state.enabled = true
    await tracer.run({ name: 'z' }, () => Promise.resolve())
    await tracer.flush()
    expect(sink.spans).toHaveLength(1)
  })

  it('cuts texts to the summary length and replaces what the redaction patterns match', async () => {
    const { tracer, sink } = tracerOf({ summary: 20, redact: [/sk-\w+/g] })
    await tracer.run({ name: 'x', input: 'a key sk-abc123 and then a long long tail of words' }, async (span) => { span.update({ output: { text: 'sk-zzz' } }) })
    await tracer.flush()
    expect(sink.spans[0]!.input).toMatch(/^a key \[redacted] and… \(\d+ characters\)$/)
    expect(sink.spans[0]!.output).toMatch(/^\{"text":"\[redacted\]"/)
  })

  it('keeps media out of a record, only its size', async () => {
    const { tracer, sink } = tracerOf()
    await tracer.run({ name: 'x', input: { audio: new Uint8Array(1000) } }, () => Promise.resolve())
    await tracer.flush()
    expect(sink.spans[0]!.input).toBe('{"audio":"<1000 bytes>"}')
  })

  it('reports a failing sink once per batch and never fails the call', async () => {
    const problems: string[] = []
    const failing: TraceSink = { name: 'broken', write: () => Promise.reject(new Error('down')) }
    const tracer = new Tracer({ enabled: () => true, sinks: () => [failing], summaryChars: () => 0, redact: () => [], onProblem: message => problems.push(message) })
    await tracer.run({ name: 'x' }, () => Promise.resolve())
    await tracer.flush()
    expect(problems).toEqual(['the broken trace sink failed: down'])
  })

  it('writes a score against a trace', async () => {
    const { tracer, sink } = tracerOf()
    const span = tracer.start({ name: 'turn' })
    tracer.score(span.ref, { name: 'held', value: 1, comment: 'ok' })
    await tracer.flush()
    expect(sink.items[0]).toMatchObject({ type: 'score', score: { traceId: span.ref.traceId, name: 'held', value: 1 } })
  })
})

describe('what the services record', () => {
  it('records an embedding call without its vectors', async () => {
    const { tracer, sink } = tracerOf()
    const registry = new AiProviders(new Context())
    registry.register(providerOf('fake', new FakeEmbedding()))
    const embedding = new ConfiguredEmbedding({ selected: () => 'fake', registry, holdMs: () => 1000, trace: tracer })
    await embedding.embed(['aa', 'b'])
    await tracer.flush()
    expect(sink.spans[0]).toMatchObject({ name: 'embedding', kind: 'embedding', model: 'fake-1', input: '["aa","b"]', output: '{"vectors":2,"dimensions":2}', metadata: { provider: 'fake' } })
  })

  it('records a model request as a generation with what came back, its usage and its parent', async () => {
    const { tracer, sink } = tracerOf()
    const registry = new AiProviders(new Context())
    const fake = new FakeLlm()
    fake.routeList = [{ id: 'local', name: 'Local', models: [{ id: 'big', name: 'Big' }] }]
    fake.chunks = [
      { type: 'block-start', index: 0, blockType: 'text' }, { type: 'text-delta', index: 0, text: 'he' }, { type: 'text-delta', index: 0, text: 'llo' },
      { type: 'tool-call-delta', index: 1, id: 'c1' as never, name: 'go', argumentsDelta: '{"a"' }, { type: 'tool-call-delta', index: 1, id: 'c1' as never, argumentsDelta: ':1}' },
      { type: 'usage', usage: { inputTokens: 10, outputTokens: 3, totalTokens: 13 } }, { type: 'finish', reason: { kind: 'stop' } as never },
    ]
    registry.register({ id: 'fake', label: 'Fake', capabilities: {}, llm: () => fake })
    const adapter = new AiLlmAdapter(registry, undefined, tracer)
    const options = { provider: 'local', model: 'big', messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }], sessionId: 'session-9' } as unknown as GenerateOptions
    const parent = tracer.start({ name: 'helper' })
    tracer.link('session-9', parent.ref)
    const chunks: StreamChunk[] = []
    for await (const chunk of adapter.stream(options)) chunks.push(chunk)
    expect(chunks).toHaveLength(fake.chunks.length)
    await tracer.flush()
    const generation = sink.spans[0]!
    expect(generation).toMatchObject({ kind: 'generation', model: 'big', parentId: parent.ref.spanId, traceId: parent.ref.traceId, usage: { input: 10, output: 3, total: 13 } })
    expect(JSON.parse(generation.output!)).toEqual({ text: 'hello', toolCalls: [{ name: 'go', arguments: '{"a":1}' }] })
    expect(generation.firstTokenMs).toBeGreaterThan(0)
  })

  it('keeps the body a provider put on the wire only when asked to', async () => {
    for (const wire of [true, false]) {
      const { tracer, sink } = tracerOf({ wire })
      const registry = new AiProviders(new Context())
      const fake = new FakeLlm()
      fake.routeList = [{ id: 'local', name: 'Local', models: [{ id: 'big', name: 'Big' }] }]
      registry.register({ id: 'fake', label: 'Fake', capabilities: {}, llm: () => fake })
      const adapter = new AiLlmAdapter(registry, undefined, tracer)
      for await (const _ of adapter.stream({ provider: 'local', model: 'big', messages: [] } as unknown as GenerateOptions)) { /* drained */ }
      await tracer.flush()
      expect(sink.spans[0]!.wire).toBe(wire ? '{"model":"big","messages":"as sent"}' : undefined)
    }
  })

  it('records a failed model request and rethrows it', async () => {
    const { tracer, sink } = tracerOf()
    const registry = new AiProviders(new Context())
    const fake = new FakeLlm()
    fake.routeList = [{ id: 'local', name: 'Local', models: [{ id: 'big', name: 'Big' }] }]
    fake.failWith = new Error('refused')
    registry.register({ id: 'fake', label: 'Fake', capabilities: {}, llm: () => fake })
    const adapter = new AiLlmAdapter(registry, undefined, tracer)
    await expect((async () => { for await (const _ of adapter.stream({ provider: 'local', model: 'big', messages: [] } as unknown as GenerateOptions)) { /* drained */ } })()).rejects.toThrow('refused')
    await tracer.flush()
    expect(sink.spans[0]).toMatchObject({ level: 'ERROR', statusMessage: 'refused' })
  })
})

describe('the sinks', () => {
  const span: SpanRecord = { traceId: 'a'.repeat(32), spanId: 'b'.repeat(16), parentId: 'c'.repeat(16), name: 'llm big', kind: 'generation', startMs: 1000, endMs: 2500, trace: { name: 'turn 3', sessionId: 'story-1', tags: ['roleplay'] }, input: '"hi"', output: '"yo"', metadata: { route: 'local', n: 2 }, model: 'big', usage: { input: 4, output: 2 }, firstTokenMs: 1200 }

  it('writes a JSONL file per day, one line per record', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'trace-'))
    await new JsonlSink(() => directory, () => Date.UTC(2026, 10, 8)).write([{ type: 'span', span }, { type: 'score', score: { traceId: span.traceId, name: 'held', value: 1, atMs: 1 } }])
    expect(await readdir(directory)).toEqual(['trace-2026-11-08.jsonl'])
    const lines = (await readFile(join(directory, 'trace-2026-11-08.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line) as { type: string })
    expect(lines.map(line => line.type)).toEqual(['span', 'score'])
  })

  it('maps a span to the attributes Langfuse reads, with every trace attribute on the span', () => {
    const made = otlpSpan(span, 'dev') as { attributes: { key: string; value: Record<string, unknown> }[]; parentSpanId: string; startTimeUnixNano: string }
    const get = (key: string): unknown => Object.values(made.attributes.find(attribute => attribute.key === key)?.value ?? {})[0]
    expect(made.parentSpanId).toBe(span.parentId)
    expect(made.startTimeUnixNano).toBe('1000000000')
    expect(get('langfuse.observation.type')).toBe('generation')
    expect(get('langfuse.trace.input')).toBeUndefined()
    const root = otlpSpan({ ...(({ parentId: _parent, ...rest }) => rest)(span), wire: '{"a":1}' }, undefined) as { attributes: { key: string; value: Record<string, unknown> }[] }
    const rooted = (key: string): unknown => Object.values(root.attributes.find(attribute => attribute.key === key)?.value ?? {})[0]
    expect([rooted('langfuse.trace.input'), rooted('langfuse.trace.output'), rooted('langfuse.observation.metadata.wire')]).toEqual(['"hi"', '"yo"', '{"a":1}'])
    expect(get('langfuse.session.id')).toBe('story-1')
    expect(get('langfuse.trace.name')).toBe('turn 3')
    expect(get('langfuse.observation.model.name')).toBe('big')
    expect(JSON.parse(get('langfuse.observation.usage_details') as string)).toEqual({ input: 4, output: 2 })
    expect(get('langfuse.observation.metadata.route')).toBe('local')
    expect(get('langfuse.observation.metadata.n')).toBe('2')
    expect(get('langfuse.environment')).toBe('dev')
    expect(get('langfuse.observation.completion_start_time')).toBe(new Date(1200).toISOString())
  })

  it('posts spans over OTLP with the ingestion version and basic auth, and scores to the scores API', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const send = ((url: string, init: RequestInit) => { calls.push({ url, init }); return Promise.resolve(new Response('{}', { status: 200 })) }) as unknown as typeof fetch
    const sink = new LangfuseSink({ host: () => 'http://lf:3000///', keys: () => Promise.resolve({ publicKey: 'pk', secretKey: 'sk' }), fetch: send })
    await sink.write([{ type: 'span', span }, { type: 'score', score: { traceId: span.traceId, spanId: span.spanId, name: 'held', value: true, atMs: 1 } }])
    expect(calls.map(call => call.url)).toEqual(['http://lf:3000/api/public/otel/v1/traces', 'http://lf:3000/api/public/scores'])
    const headers = calls[0]!.init.headers as Record<string, string>
    expect(headers['x-langfuse-ingestion-version']).toBe('4')
    expect(headers['authorization']).toBe(`Basic ${Buffer.from('pk:sk').toString('base64')}`)
    expect(JSON.parse(calls[1]!.init.body as string)).toMatchObject({ traceId: span.traceId, observationId: span.spanId, name: 'held', value: 1, dataType: 'BOOLEAN' })
  })

  it('says why when Langfuse refuses or the keys are missing', async () => {
    const refuse = (() => Promise.resolve(new Response('no', { status: 401 }))) as unknown as typeof fetch
    await expect(new LangfuseSink({ host: () => 'http://x', keys: () => Promise.resolve({ publicKey: 'a', secretKey: 'b' }), fetch: refuse }).write([{ type: 'span', span }])).rejects.toThrow('401')
    await expect(new LangfuseSink({ host: () => 'http://x', keys: () => Promise.resolve(undefined) }).write([{ type: 'span', span }])).rejects.toThrow('keys are not set')
  })
})
