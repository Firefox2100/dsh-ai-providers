import { Context } from '@deepseek-ai/cordis'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LlmModelControl } from '@dsh-ai-providers/core'
import { AiProviders, ModelControls } from '../src/index.ts'
import { FakeLlm } from './support.ts'

class ControlledLlm extends FakeLlm {
  override readonly modelControl: LlmModelControl

  constructor(control: LlmModelControl) {
    super()
    this.modelControl = control
  }
}

describe('route model controls', () => {
  let ctx: Context
  let registry: AiProviders
  let controls: ModelControls

  beforeEach(() => {
    ctx = new Context()
    registry = new AiProviders(ctx)
    controls = new ModelControls(ctx, registry)
  })

  afterEach(async () => { await ctx.fiber.dispose() })

  it('publishes the service and delegates every supported operation to the route provider', async () => {
    const status = vi.fn().mockResolvedValue({ state: 'ready', memoryBytes: 12 })
    const load = vi.fn().mockResolvedValue(undefined)
    const unload = vi.fn().mockResolvedValue(undefined)
    const service = new ControlledLlm({ operations: ['status', 'load', 'unload'], status, load, unload })
    service.routeList = [{ id: 'local', name: 'Local', models: [] }]
    registry.register({ id: 'localai', label: 'LocalAI', capabilities: {}, llm: () => service })
    const signal = new AbortController().signal

    expect(ctx.aiModels).toBeInstanceOf(ModelControls)
    expect(controls.operations('local')).toEqual(['status', 'load', 'unload'])
    await expect(controls.status('local', 'model.gguf', signal)).resolves.toEqual({ state: 'ready', memoryBytes: 12 })
    await controls.load('local', 'model.gguf', signal)
    await controls.unload('local', 'model.gguf', signal)
    expect(status).toHaveBeenCalledWith('local', 'model.gguf', signal)
    expect(load).toHaveBeenCalledWith('local', 'model.gguf', signal)
    expect(unload).toHaveBeenCalledWith('local', 'model.gguf', signal)
  })

  it('distinguishes an unknown route, a route without controls and an unsupported operation', async () => {
    const plain = new FakeLlm()
    plain.routeList = [{ id: 'plain', name: 'Plain', models: [] }]
    const partial = new ControlledLlm({ operations: ['status'], status: () => Promise.resolve({ state: 'unknown' }) })
    partial.routeList = [{ id: 'partial', name: 'Partial', models: [] }]
    registry.register({ id: 'fake', label: 'Fake', capabilities: {}, llm: () => plain })
    registry.register({ id: 'partial', label: 'Partial', capabilities: {}, llm: () => partial })

    expect(() => controls.operations('missing')).toThrow(expect.objectContaining({ code: 'not-configured' }))
    expect(() => controls.operations('plain')).toThrow(expect.objectContaining({ code: 'unsupported' }))
    expect(() => controls.unload('partial', 'model')).toThrow(expect.objectContaining({ code: 'unsupported' }))
  })
})
