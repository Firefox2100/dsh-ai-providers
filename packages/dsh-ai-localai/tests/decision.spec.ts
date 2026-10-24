import { describe, expect, it, vi } from 'vitest'
import { localAiDecision } from '../src/decision.ts'

const field = <T>(value: T) => ({ get: () => value })
const config = (decisionConnection = 'local') => ({
  connections: field([{ id: 'local', name: 'LocalAI', baseUrl: 'http://local.test/v1/', apiKeyRef: '' }]),
  decisionConnection: field(decisionConnection), decisionModel: field('julia-1'), decisionBody: field({ permute: true }), timeoutMs: field(1000),
}) as never

const questions = { angry: { type: 'noul', instructions: 'The customer is angry.' } } as const

describe('LocalAI decisions', () => {
  it('uses the native System One endpoint of the selected connection and preserves configured backend fields', async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ model: 'julia-1', answers: { angry: { type: 'noul', noul: 0.75 } }, usage: { input_tokens: 31, output_tokens: 0 } }), { status: 200, headers: { 'content-type': 'application/json' } }))
    const service = localAiDecision(config(), () => undefined, send)
    expect([service.provider, service.model]).toEqual(['localai', 'julia-1'])
    expect(await service.decide('I was charged twice.', questions)).toEqual({ model: 'julia-1', answers: { angry: { type: 'noul', probability: 0.75 } }, tokens: 31 })
    expect(send).toHaveBeenCalledWith('http://local.test/v1/systemone', expect.objectContaining({ body: JSON.stringify({ permute: true, model: 'julia-1', state: 'I was charged twice.', questions }) }))
  })

  it('reports an unselected or missing connection and an empty state through AiError', async () => {
    await expect(localAiDecision(config(''), () => undefined, vi.fn()).decide('text', questions)).rejects.toMatchObject({ name: 'AiError', code: 'not-configured', message: expect.stringMatching(/no LocalAI connection/) })
    await expect(localAiDecision(config('gone'), () => undefined, vi.fn()).decide('text', questions)).rejects.toMatchObject({ code: 'not-configured', message: expect.stringMatching(/does not exist/) })
    await expect(localAiDecision(config(), () => undefined, vi.fn()).decide(' ', questions)).rejects.toMatchObject({ code: 'invalid-input' })
  })
})
