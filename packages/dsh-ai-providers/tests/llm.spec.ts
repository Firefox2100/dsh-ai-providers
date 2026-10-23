import { Context } from '@deepseek-ai/cordis'
import LlmRuntime, { LlmAdapter, LlmError, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'
import { LlmRequestError } from '@dsh-ai-providers/core'
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

describe('what the routes tell DSH besides their models', () => {
  it('is the retry policy of a route, DSH\'s own defaults when it has none, and a refusal to serve the route when the policy is wrong', () => {
    expect(runtime.providerRetryPolicy('local')).toMatchObject({ mode: 'normal', maxRetries: 5 })
    fake.routeList = [{ ...fake.routeList[0]!, retry: { mode: 'normal', maxRetries: 2, backoff: { initialDelayMs: 100 } } }]
    routes.sync()
    expect(runtime.providerRetryPolicy('local')).toMatchObject({ mode: 'normal', maxRetries: 2, initialDelayMs: 100 })
    fake.routeList = [{ ...fake.routeList[0]!, retry: { mode: 'always' } }]
    routes.sync()
    expect(runtime.providerRetryPolicy('local')).toMatchObject({ mode: 'always' })
    fake.routeList = [{ ...fake.routeList[0]!, retry: { mode: 'normal', maxRetries: -1 } }]
    routes.sync()
    expect(problems.at(-1)).toMatch(/maxRetries/)
  })

  it('is whether a model reads a changed system prompt in place, only when its configuration says so', async () => {
    expect((await runtime.resolveModelInfo('local', 'big')).systemPromptUpdate).toBeUndefined()
    fake.routeList = [{ ...fake.routeList[0]!, models: [{ ...fake.routeList[0]!.models[0]!, systemPromptUpdate: 'in-history' }] }]
    expect((await runtime.resolveModelInfo('local', 'big')).systemPromptUpdate).toBe('in-history')
  })

  it('keeps the facts of a prepared call for its request, whatever the configuration becomes in between', async () => {
    const prepared = await runtime.prepareCall({ provider: 'local', model: 'big' })
    expect(prepared.config.maxTokens).toBe(512)
    fake.routeList = [{ ...fake.routeList[0]!, sampling: { temperature: 0.1 }, models: [{ id: 'big', name: 'Big', maxTokens: 64 }] }]
    for await (const _chunk of prepared.stream({ ...request(), ...prepared.config })) { /* drained */ }
    expect(fake.calls.at(-1)!.model?.maxTokens).toBe(512)
    expect(fake.calls.at(-1)!.sampling).toMatchObject({ temperature: 0.5, topP: 0.9 })
  })

  it('is the directory of configurable providers: each route as one the configuration declared, with its endpoint and its trouble', () => {
    fake.routeList = [{ ...fake.routeList[0]!, baseUrl: 'http://local.test/v1' }]
    routes.sync()
    expect(runtime.listConfigurableProviders()).toEqual([{ provider: 'local', displayName: 'Local', settingsNs: 'fake', settingsPath: ['llmRoutes'], declared: true, defaultBaseURL: 'http://local.test/v1' }])
    fake.routeList = []
    routes.sync()
    expect(runtime.listConfigurableProviders()).toEqual([])
    fake.routeList = [{ id: 'taken', name: 'Taken', models: [] }]
    runtime.registerAdapter(['taken'], new (class extends LlmAdapter { override async * stream(): AsyncGenerator<StreamChunk> { /* serves nothing */ } })())
    routes.sync()
    expect(runtime.listConfigurableProviders()[0]).toMatchObject({ provider: 'taken', error: expect.stringMatching(/taken|already/i) })
  })

  it('is model discovery for the section that holds the routes: a configured route answers with its models, a draft endpoint is asked', async () => {
    expect((await runtime.discoverModels('fake', { provider: 'local' })).map(model => model.id)).toEqual(['big'])
    expect(await runtime.discoverModels('fake', { provider: 'local' })).toEqual([{ id: 'big', name: 'Big', contextWindow: 8192, maxTokens: 512, inputModalities: ['text'] }])
    expect(await runtime.discoverModels('fake', { baseURL: 'http://draft.test/v1', apiKey: 'k' })).toEqual([{ id: 'found', name: 'Found', contextWindow: 4096, inputModalities: ['text', 'image'] }])
    expect(fake.interrogated).toEqual([{ baseUrl: 'http://draft.test/v1', apiKey: 'k' }])
    expect(await runtime.discoverModels('fake', { baseURL: 'http://draft.test/without-key' })).toEqual([{ id: 'found', name: 'Found', contextWindow: 4096, inputModalities: ['text', 'image'] }])
    expect(fake.interrogated.at(-1)).toEqual({ baseUrl: 'http://draft.test/without-key' })
    await expect(runtime.discoverModels('fake', {})).rejects.toThrow(/route or a baseURL/)
    await expect(runtime.discoverModels('elsewhere', { baseURL: 'http://x.test' })).rejects.toThrow(/no model discovery/)
  })
})

describe('merged controls', () => {
  it('take the later layer for each field and merge the extra body fields', () => {
    expect(mergeSampling({ temperature: 1, body: { a: 1, b: 1 } }, undefined, { temperature: 0.2, body: { b: 2 } }, { topP: undefined })).toEqual({ temperature: 0.2, body: { a: 1, b: 2 } })
  })
})
