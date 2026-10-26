import { AiError } from '@dsh-ai-providers/core'
import { OpenAiDecisionService } from '@dsh-ai-providers/openai-compatible'
import { describe, expect, it } from 'vitest'

interface Sent { url: string; auth: string | null; body: Record<string, unknown> }

function service(reply: unknown, status = 200) {
  const sent: Sent[] = []
  const fake: typeof fetch = (url, init) => {
    sent.push({ url: String(url), auth: new Headers(init?.headers).get('authorization'), body: JSON.parse(String(init?.body)) as Record<string, unknown> })
    return Promise.resolve(new Response(JSON.stringify(reply), { status, headers: { 'content-type': 'application/json' } }))
  }
  const decisions = new OpenAiDecisionService({
    config: { decisionModel: { get: () => 'gpt-6-luna' }, timeoutMs: { get: () => 5000 } },
    connection: () => ({ baseUrl: 'https://api.test/v1', apiKeyRef: 'KEY' }),
    credentials: () => ({ resolve: () => Promise.resolve({ value: 'sk-1', source: 'file' }) }) as never,
    fetch: fake,
  })
  return { decisions, sent }
}

const questions = {
  refund: { type: 'noul', instructions: 'Is it a refund request?' },
  team: { type: 'choice', instructions: 'Which team?', criteria: { billing: 'money', tech: 'bugs' } },
  anger: { type: 'score', instructions: 'How angry?', criteria: ['calm', 'annoyed', 'angry'] },
} as const

describe('OpenAI decisions', () => {
  it('sends the questions as a list and reads the answers by name', async () => {
    const { decisions, sent } = service({
      model: 'gpt-6-luna-2026', usage: { input_tokens: 42 },
      answers: [
        { type: 'score', name: 'anger', probabilities: [{ value: 2, label: 'angry', probability: 0.7 }, { value: 0, label: 'calm', probability: 0.1 }, { value: 1, label: 'annoyed', probability: 0.2 }], confidence: 0.8 },
        { type: 'predicate', name: 'refund', probability: 0.93 },
        { type: 'choice', name: 'team', choice: 'billing', probabilities: { billing: 0.9, tech: 0.1 }, confidence: 0.9 },
      ],
    })
    const result = await decisions.decide('charged twice', questions)
    expect(sent[0]).toMatchObject({ url: 'https://api.test/v1/decisions', auth: 'Bearer sk-1' })
    expect(sent[0]!.body).toEqual({
      model: 'gpt-6-luna', input: 'charged twice',
      questions: [
        { type: 'predicate', name: 'refund', instructions: 'Is it a refund request?' },
        { type: 'choice', name: 'team', instructions: 'Which team?', choices: [{ value: 'billing', description: 'money' }, { value: 'tech', description: 'bugs' }] },
        { type: 'score', name: 'anger', instructions: 'How angry?', levels: [{ label: 'calm' }, { label: 'annoyed' }, { label: 'angry' }] },
      ],
    })
    expect(result.model).toBe('gpt-6-luna-2026')
    expect(result.tokens).toBe(42)
    expect(result.answers.refund).toEqual({ type: 'noul', probability: 0.93 })
    expect(result.answers.team).toEqual({ type: 'choice', choice: 'billing', confidence: 0.9, probabilities: { billing: 0.9, tech: 0.1 } })
    expect(result.answers.anger.probabilities).toEqual([0.1, 0.2, 0.7])
    expect(result.answers.anger.score).toBeCloseTo(1.6)
  })

  it('sends structured state as its JSON text', async () => {
    const { decisions, sent } = service({ answers: [{ type: 'predicate', name: 'q', probability: 0.5 }] })
    await decisions.decide({ a: 1 }, { q: { type: 'noul', instructions: 'x' } })
    expect(sent[0]!.body['input']).toBe('{"a":1}')
  })

  it('reads the answer a live LocalAI gave: probabilities as lists of objects, matched by value', async () => {
    const { decisions } = service({
      model: 'kev-9b', usage: { input_tokens: 109, output_tokens: 0, total_tokens: 109 },
      answers: [
        { type: 'predicate', name: 'refund', probability: 0.963 },
        { type: 'choice', name: 'team', choice: 'billing', confidence: 0.68, probabilities: [{ value: 'tech', probability: 0.16 }, { value: 'billing', probability: 0.84 }] },
        { type: 'score', name: 'anger', score: 1.396, confidence: 0.094, probabilities: [{ value: 0, label: 'calm', probability: 0.09 }, { value: 1, label: 'annoyed', probability: 0.42 }, { value: 2, label: 'angry', probability: 0.49 }] },
      ],
    })
    const result = await decisions.decide('charged twice', questions)
    expect(result.tokens).toBe(109)
    expect(result.answers.team).toEqual({ type: 'choice', choice: 'billing', confidence: 0.68, probabilities: { billing: 0.84, tech: 0.16 } })
    expect(result.answers.anger).toEqual({ type: 'score', score: 1.396, confidence: 0.094, probabilities: [0.09, 0.42, 0.49] })
  })

  it('reads probabilities given as a list in the order asked', async () => {
    const { decisions } = service({ answers: [{ type: 'choice', name: 'team', choice: 'tech', probabilities: [0.3, 0.7] }] })
    const result = await decisions.decide('x', { team: questions.team })
    expect(result.answers.team).toEqual({ type: 'choice', choice: 'tech', confidence: 0.7, probabilities: { billing: 0.3, tech: 0.7 } })
  })

  it('matches labeled choice probabilities to their requested keys', async () => {
    const { decisions } = service({ answers: [{ type: 'choice', name: 'team', choice: 'tech', probabilities: [{ value: 'tech', probability: 0.7 }, { value: 'billing', probability: 0.3 }] }] })
    const result = await decisions.decide('x', { team: questions.team })
    expect(result.answers.team.probabilities).toEqual({ billing: 0.3, tech: 0.7 })
  })

  it('fails loudly: a refusal, an unreadable answer, an HTTP error, a malformed request', async () => {
    await expect(service({ answers: [{ type: 'refusal', name: 'refund' }] }).decisions.decide('x', { refund: questions.refund })).rejects.toMatchObject({ code: 'rejected' })
    await expect(service({ answers: [{ type: 'predicate', name: 'refund' }] }).decisions.decide('x', { refund: questions.refund })).rejects.toMatchObject({ code: 'unavailable' })
    await expect(service({ error: { message: 'bad key' } }, 401).decisions.decide('x', { refund: questions.refund })).rejects.toMatchObject({ code: 'rejected', message: expect.stringContaining('bad key') as string })
    const { decisions, sent } = service({})
    await expect(decisions.decide('', { refund: questions.refund })).rejects.toBeInstanceOf(AiError)
    expect(sent).toEqual([])
  })
})
