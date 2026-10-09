import { Context } from '@deepseek-ai/cordis'
import LlmRuntime, { LlmAdapter, LlmError, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'
import { LlmRequestError } from 'dsh-ai-core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AiProviders } from '../src/host/registry.ts'
import { LlmRoutes, mergeSampling } from '../src/host/llm.ts'
import { FakeLlm, settle } from './support.ts'

let ctx: Context
let registry: AiProviders
let fake: FakeLlm
let routes: LlmRoutes
let problems: string[]
let runtime: LlmRuntime

beforeEach(async () => {
  ctx = new Context()
  runtime = new LlmRuntime(ctx)
  registry = new AiProviders(ctx)
  fake = new FakeLlm()
  fake.routeList = [{ id: 'local', name: 'Local', sampling: { temperature: 0.7, topP: 0.9 }, models: [{ id: 'big', name: 'Big', contextWindow: 8192, maxTokens: 512, sampling: { temperature: 0.5 }, reasoning: { levels: [{ id: 'off', name: 'Off', body: { reasoning_effort: 'none' } }, { id: 'high', name: 'High', body: {} }], default: 'off' } }] }]
  registry.register({ id: 'fake', label: 'Fake', capabilities: {}, llm: () => fake })
  problems = []
  routes = new LlmRoutes(ctx, registry, message => problems.push(message))
  routes.sync()
  await settle()
})
afterEach(async () => { routes.dispose(); await ctx.fiber.dispose() })

const request = (extra: Partial<GenerateOptions> = {}): GenerateOptions => ({ provider: 'local', model: 'big', messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }], ...extra })
async function run(options: GenerateOptions): Promise<StreamChunk[]> {
  const out: StreamChunk[] = []
  for await (const chunk of runtime.stream(options)) out.push(chunk)
  return out
}

describe('the language model routes', () => {
  it('are served to DSH under their own ids, with their models, context window, output limit and reasoning levels', async () => {
    expect(runtime.listProviders()).toEqual([{ id: 'local', name: 'Local' }])
    expect((await runtime.listModels('local')).map(model => model.id)).toEqual(['big'])
    const info = await runtime.resolveModelInfo('local', 'big')
    expect(info).toMatchObject({ context: { contextWindow: 8192 }, defaultMaxTokens: 512, reasoning: { efforts: [{ id: 'off' }, { id: 'high' }], defaultEffort: 'off' } })
    expect(routes.state('local')).toEqual({ active: true })
  })

  it('stream through the service of their provider, with the model\'s controls over the route\'s and the request\'s own over both', async () => {
    const chunks = await run(request())
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'stop' } })
    expect(fake.calls[0]!.sampling).toEqual({ temperature: 0.5, topP: 0.9 })
    expect(fake.calls[0]!.headers['user-agent']).toMatch(/\S/)
    await run(request({ temperature: 0.1, maxTokens: 9, stop: ['x'] }))
    expect(fake.calls[1]!.sampling).toEqual({ temperature: 0.1, topP: 0.9, maxTokens: 9, stop: ['x'] })
  })

  it('are told what a policy decides, in the order the policies were added, until it is removed', async () => {
    const remove = registry.policy(({ options }) => (options.purpose === 'compaction' ? { temperature: 0.2, toolChoice: 'required' } : undefined))
    registry.policy(({ route }) => ({ body: { route } }))
    await run(request({ purpose: 'compaction' }))
    expect(fake.calls[0]!.sampling).toMatchObject({ temperature: 0.2, toolChoice: 'required', body: { route: 'local' } })
    remove()
    await run(request({ purpose: 'compaction' }))
    expect(fake.calls[1]!.sampling).toEqual({ temperature: 0.5, topP: 0.9, body: { route: 'local' } })
  })

  it('turn a failure of the service into the error DSH retries and compacts by', async () => {
    fake.failWith = new LlmRequestError('RATE_LIMIT', 'slow down', { status: 429, retryAfterMs: 2000 })
    const chunks = await run(request())
    expect(chunks.at(-1)).toMatchObject({ type: 'finish', reason: { kind: 'error', failure: { code: 'RATE_LIMIT', status: 429, providerRetryAfterMs: 2000 } } })
    expect(new LlmError('x', 'RATE_LIMIT')).toBeInstanceOf(Error)
  })

  it('follow the configuration: a new route is registered, a removed one withdrawn, a name another adapter holds is reported', async () => {
    fake.routeList = [...fake.routeList, { id: 'second', name: 'Second', models: [] }]
    routes.sync()
    expect(runtime.listProviders().map(provider => provider.id)).toEqual(['local', 'second'])
    fake.routeList = [fake.routeList[1]!]
    routes.sync()
    expect(runtime.listProviders().map(provider => provider.id)).toEqual(['second'])
    runtime.registerAdapter(['taken'], new (class extends LlmAdapter { override async * stream(): AsyncGenerator<StreamChunk> { /* serves nothing */ } })())
    fake.routeList = [{ id: 'taken', name: 'Taken', models: [] }]
    routes.sync()
    expect(routes.state('taken')).toMatchObject({ active: false, problem: expect.stringMatching(/taken|already/i) })
    expect(problems).toHaveLength(1)
  })
})

describe('merged controls', () => {
  it('take the later layer for each field and merge the extra body fields', () => {
    expect(mergeSampling({ temperature: 1, body: { a: 1, b: 1 } }, undefined, { temperature: 0.2, body: { b: 2 } }, { topP: undefined })).toEqual({ temperature: 0.2, body: { a: 1, b: 2 } })
  })
})
