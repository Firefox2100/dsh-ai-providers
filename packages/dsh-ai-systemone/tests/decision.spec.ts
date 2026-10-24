import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SystemOneApiService } from '../src/decision.ts'

interface Seen { path: string; auth: string | undefined; headers: Record<string, string | string[] | undefined>; body: { model: string; state: unknown; questions: Record<string, { type: string; instructions: string; criteria?: unknown }> } }

let server: Server
let seen: Seen[]
let handler: (request: Seen, respond: (status: number, body: unknown, delay?: number) => void) => void
let settings: { baseUrl: string; apiKeyEnv: string; decisionModel: string; timeoutMs: number }
let key: string | undefined

const field = <K extends keyof typeof settings>(name: K) => ({ get: () => settings[name] })
const service = (extra: { body?: () => Record<string, unknown>; headers?: () => Record<string, string> } = {}) => new SystemOneApiService({
  provider: 'typesafe',
  config: { decisionModel: field('decisionModel'), timeoutMs: field('timeoutMs') },
  connection: () => ({ baseUrl: settings.baseUrl.replace(/\/+$/, ''), apiKeyRef: settings.apiKeyEnv }),
  credentials: () => ({ resolve: () => Promise.resolve(key === undefined ? undefined : { value: key, source: 'file' }) }) as never,
  ...extra,
})

const questions = {
  angry: { type: 'noul', instructions: 'The customer is angry.' },
  topic: { type: 'choice', instructions: 'What is it about?', criteria: { billing: 'Charges and refunds.', shipping: 'Delivery of a parcel.' } },
  mood: { type: 'score', instructions: 'How upset is the customer?', criteria: ['calm', 'annoyed', 'furious'] },
} as const

/** What Jev answers, field for field. */
const jev = {
  angry: { type: 'noul', noul: 0.98 },
  topic: { type: 'choice', choice: 'billing', confidence: 0.9, probabilities: { billing: 0.93, shipping: 0.07 } },
  mood: { type: 'score', score: 1.7, confidence: 0.55, legend: { 0: 'calm', 1: 'annoyed', 2: 'furious' }, probabilities: { 0: 0.1, 1: 0.2, 2: 0.7 } },
}
const ok = (_request: Seen, respond: (status: number, body: unknown) => void): void => { respond(200, { model: 'jev-1.14.0', answers: jev, usage: { input_tokens: 120, output_tokens: 12 } }) }

beforeEach(async () => {
  seen = []
  key = 'sk-test'
  handler = ok
  server = createServer((req: IncomingMessage, res) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(chunk as Buffer))
    req.on('end', () => {
      const request: Seen = { path: req.url ?? '', auth: req.headers['authorization'], headers: req.headers, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) }
      seen.push(request)
      handler(request, (status, body, delay = 0) => {
        setTimeout(() => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.end(typeof body === 'string' ? body : JSON.stringify(body)) }, delay)
      })
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  settings = { baseUrl: `http://127.0.0.1:${port}/v1/`, apiKeyEnv: 'TYPESAFE_API_KEY', decisionModel: 'jev-latest', timeoutMs: 2000 }
})
afterEach(async () => { await new Promise(resolve => server.close(resolve)) })

const failure = async (run: () => Promise<unknown>): Promise<string> => {
  try { await run() } catch (error) { return `${(error as { code?: string }).code}: ${(error as Error).message}` }
  return 'did not fail'
}

describe('the request', () => {
  it('posts the model, the state and the questions to {baseUrl}/systemone with the key, and reads Jev\'s answers', async () => {
    const state = { message: 'I was charged twice and nobody answers.' }
    const answer = await service().decide(state, questions)
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ path: '/v1/systemone', auth: 'Bearer sk-test', body: { model: 'jev-latest', state, questions } })
    expect(answer.model).toBe('jev-1.14.0')
    expect(answer.tokens).toBe(120)
    expect(answer.answers.angry).toEqual({ type: 'noul', probability: 0.98 })
    expect(answer.answers.topic).toEqual({ type: 'choice', choice: 'billing', confidence: 0.9, probabilities: { billing: 0.93, shipping: 0.07 } })
    expect(answer.answers.mood).toEqual({ type: 'score', score: 1.7, confidence: 0.55, probabilities: [0.1, 0.2, 0.7] })
  })

  it('sends no key when there is none, adds the vendor\'s own fields and headers, and refuses a request it cannot make before sending it', async () => {
    key = undefined
    await service({ body: () => ({ permute: true }), headers: () => ({ 'x-extra': 'on' }) }).decide('text', { angry: questions.angry })
    expect(seen[0]?.auth).toBeUndefined()
    expect(seen[0]?.headers['x-extra']).toBe('on')
    expect(seen[0]?.body).toMatchObject({ permute: true, model: 'jev-latest' })
    expect(await failure(() => service().decide('  ', questions))).toMatch(/^invalid-input: the state is empty/)
    settings.decisionModel = ''
    expect(await failure(() => service().decide('text', questions))).toMatch(/^not-configured: no decision model/)
    expect(seen).toHaveLength(1)
  })
})

describe('the answers of servers that copy the API', () => {
  it('takes the number a server banded a noul from, a score\'s probabilities as a list, and the highest probability for a confidence that is left out', async () => {
    handler = (_request, respond) => respond(200, { answers: {
      angry: { type: 'noul', noul: true, noul_raw: 0.81 },
      topic: { type: 'choice', choice: 'shipping', probabilities: { billing: 0.2, shipping: 0.8, other: 0 } },
      mood: { type: 'score', score: 0.4, probabilities: [0.6, 0.3, 0.1] },
    } })
    const answer = await service().decide('text', questions)
    expect(answer.answers.angry.probability).toBe(0.81)
    expect(answer.answers.topic).toEqual({ type: 'choice', choice: 'shipping', confidence: 0.8, probabilities: { billing: 0.2, shipping: 0.8 } })
    expect(answer.answers.mood).toEqual({ type: 'score', score: 0.4, confidence: 0.6, probabilities: [0.6, 0.3, 0.1] })
    expect(answer.model).toBe('jev-latest')
    expect(answer).not.toHaveProperty('tokens')
  })

  it('does not guess at an answer it cannot read, one that is missing, or a reply that holds no answers', async () => {
    handler = (_request, respond) => respond(200, { answers: { ...jev, topic: { type: 'choice', choice: 'billing' } } })
    expect(await failure(() => service().decide('text', questions))).toMatch(/^unavailable: .*no readable choice answer to question "topic"/)
    handler = (_request, respond) => respond(200, { answers: { angry: jev.angry, topic: jev.topic } })
    expect(await failure(() => service().decide('text', questions))).toMatch(/^unavailable: .*no readable score answer to question "mood"/)
    handler = (_request, respond) => respond(200, { model: 'x' })
    expect(await failure(() => service().decide('text', questions))).toMatch(/^unavailable: .*without answers/)
  })
})

describe('failures', () => {
  it('map to the codes a caller acts on, with what the server said', async () => {
    handler = (_request, respond) => respond(401, { detail: 'Invalid API key' })
    expect(await failure(() => service().decide('text', questions))).toMatch(/^rejected: .*Invalid API key/)
    handler = (_request, respond) => respond(422, { detail: [{ loc: ['body', 'questions', 'topic', 'criteria'], msg: 'Field required', type: 'missing' }] })
    expect(await failure(() => service().decide('text', questions))).toMatch(/^rejected: .*Field required \(body\.questions\.topic\.criteria\)/)
    handler = (_request, respond) => respond(402, { error: { message: 'Out of credit' } })
    expect(await failure(() => service().decide('text', questions))).toMatch(/^rejected: .*Out of credit/)
    handler = (_request, respond) => respond(429, { message: 'slow down' })
    expect(await failure(() => service().decide('text', questions))).toMatch(/^unavailable: .*limiting requests.*slow down/)
    handler = (_request, respond) => respond(503, 'not json')
    expect(await failure(() => service().decide('text', questions))).toMatch(/^unavailable: the API failed/)
  })

  it('say when the server is slow or gone, and that the caller cancelled', async () => {
    handler = (_request, respond) => respond(200, { answers: jev }, 300)
    settings.timeoutMs = 50
    expect(await failure(() => service().decide('text', questions))).toMatch(/^unavailable: .*did not answer within 50 ms/)
    settings.timeoutMs = 2000
    const controller = new AbortController()
    const pending = failure(() => service().decide('text', questions, { signal: controller.signal }))
    setTimeout(() => { controller.abort() }, 20)
    expect(await pending).toMatch(/^cancelled/)
    controller.abort()
    expect(await failure(() => service().decide('text', questions, { signal: controller.signal }))).toBe('cancelled: cancelled')
    await new Promise(resolve => server.close(resolve))
    server = createServer()
    expect(await failure(() => service().decide('text', questions))).toMatch(/^unavailable: .*could not be reached/)
  })
})
