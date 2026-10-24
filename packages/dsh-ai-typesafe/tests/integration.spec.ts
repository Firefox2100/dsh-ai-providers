import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Context } from '@deepseek-ai/cordis'
import * as providers from '@dsh-ai-providers/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as vendor from '../src/index.ts'

/** The two plugins and a consumer in one context, against a server that counts what it is asked. */
let server: Server
let requests: { auth: string | undefined; longContext: string | undefined; body: { model: string; state: unknown; questions: Record<string, { type: string; criteria?: Record<string, string> }> } }[]
let ctx: Context
let selection: { value: string }
let longContext: boolean
const settle = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 60))

beforeEach(async () => {
  requests = []
  longContext = false
  server = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(chunk as Buffer))
    req.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as (typeof requests)[number]['body']
      requests.push({ auth: req.headers['authorization'], longContext: req.headers['typesafe-danger-zone-long-context'] as string | undefined, body })
      res.setHeader('content-type', 'application/json')
      const text = JSON.stringify(body.state).toLowerCase()
      const answers = Object.fromEntries(Object.entries(body.questions).map(([name, question]) => {
        if (question.type === 'noul') return [name, { type: 'noul', noul: text.includes('furious') ? 0.97 : 0.04 }]
        const options = Object.keys(question.criteria ?? {})
        const choice = options.find(option => text.includes(option)) ?? options[0]!
        return [name, { type: 'choice', choice, confidence: 0.9, probabilities: Object.fromEntries(options.map(option => [option, option === choice ? 0.9 : 0.1 / Math.max(1, options.length - 1)])) }]
      }))
      res.end(JSON.stringify({ model: 'jev-1.14.0', answers, usage: { input_tokens: 40, output_tokens: 2 } }))
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  ctx = new Context()
  selection = { value: 'typesafe' }
  const vendorConfig = {
    connections: { get: () => [{ id: 'test', name: 'Test', baseUrl: `http://127.0.0.1:${port}/v1`, apiKeyRef: '' }] },
    decisionConnection: { get: () => 'test' }, decisionModel: { get: () => 'jev-latest' }, longContext: { get: () => longContext }, timeoutMs: { get: () => 2000 },
  }
  ctx.plugin({ name: 'vendor', inject: vendor.inject, apply: (scope: Context) => { vendor.apply(scope, vendorConfig as never) } } as never, {} as never)
  await settle()
  ctx.plugin({ name: 'main', apply: (scope: Context) => { providers.apply(scope, { embedding: { get: () => '' }, rerank: { get: () => '' }, tts: { get: () => '' }, stt: { get: () => '' }, image: { get: () => '' }, decision: { get: () => selection.value }, holdSeconds: { get: () => 300 }, limits: { get: () => [] }, maxWaitSeconds: { get: () => 0 }, maxHoldSeconds: { get: () => 0 } } as never) } } as never, {} as never)
  await settle()
})
afterEach(async () => {
  await ctx.fiber.dispose()
  await new Promise(resolve => server.close(resolve))
})

const questions = {
  angry: { type: 'noul', instructions: 'The customer is angry.' },
  topic: { type: 'choice', instructions: 'What is it about?', criteria: { billing: 'Charges and refunds.', shipping: 'Delivery of a parcel.' } },
} as const

describe('a consumer of the decision service', () => {
  it('finds it on the context, and gets typed answers without knowing which provider is behind it', async () => {
    const service = ctx.get('decisions')!
    expect(service).toBeDefined()
    expect(ctx.get('embeddings')).toBeUndefined()
    const answer = await service.decide('The customer is furious about billing.', questions)
    expect([answer.answers.angry.probability, answer.answers.topic.choice, answer.model, answer.tokens]).toEqual([0.97, 'billing', 'jev-1.14.0', 40])
    expect(requests[0]?.body.model).toBe('jev-latest')
  })

  it('asks for the longer context only when it is switched on, and refuses a malformed request before the server is asked', async () => {
    const service = ctx.get('decisions')!
    await service.decide('text', questions)
    longContext = true
    await service.decide('text', questions)
    expect(requests.map(request => request.longContext)).toEqual([undefined, 'true'])
    await expect(service.decide('text', {})).rejects.toMatchObject({ name: 'AiError', code: 'invalid-input' })
    expect(requests).toHaveLength(2)
  })

  it('carries a failure of the server as a typed error, and goes away when the selection is cleared', async () => {
    const service = ctx.get('decisions')!
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
    await expect(service.decide('text', questions)).rejects.toMatchObject({ name: 'AiError', code: 'unavailable' })
    server = createServer()
    expect(ctx.aiProviders.list('decision').map(provider => provider.id)).toEqual(['typesafe'])
  })
})
