import { describe, expect, it } from 'vitest'
import { AiError } from 'dsh-ai-core'
import { RequestGate, type GateRule } from '../src/host/gate.ts'

const gpu: GateRule = { id: 'gpu', max: 1, routes: ['local'], capabilities: ['image', 'tts'] }

function gateOf(rules: GateRule[], maxWaitMs = 0) {
  return new RequestGate({ rules: () => rules, maxWaitMs: () => maxWaitMs })
}

const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

describe('the request gate', () => {
  it('lets only as many calls run at once as the limit says, and starts the next when one ends', async () => {
    const gate = gateOf([{ ...gpu, max: 2 }])
    const started: number[] = []
    const releases = new Map<number, () => void>()
    const call = async (n: number): Promise<void> => { const release = await gate.acquire({ capability: 'llm', route: 'local' }); started.push(n); releases.set(n, release) }
    const calls = [1, 2, 3].map(call)
    await tick()
    expect(started).toEqual([1, 2])
    expect(gate.status()[0]).toMatchObject({ active: 2, queued: { foreground: 1, background: 0 } })
    releases.get(1)!()
    await tick()
    expect(started).toEqual([1, 2, 3])
    await Promise.all(calls)
  })

  it('serves a call a person waits for before one that can wait, and otherwise in order of arrival', async () => {
    const gate = gateOf([gpu])
    const first = await gate.acquire({ capability: 'image' })
    const order: string[] = []
    const waiting = [
      gate.acquire({ capability: 'image', priority: 'background' }).then((release) => { order.push('background-1'); release() }),
      gate.acquire({ capability: 'tts', priority: 'background' }).then((release) => { order.push('background-2'); release() }),
      gate.acquire({ capability: 'llm', route: 'local' }).then((release) => { order.push('foreground'); release() }),
    ]
    await tick()
    first()
    await Promise.all(waiting)
    expect(order).toEqual(['foreground', 'background-1', 'background-2'])
  })

  it('does not hold back what no limit names, and releasing twice frees one place only', async () => {
    const gate = gateOf([gpu])
    await gate.acquire({ capability: 'embedding' })
    await gate.acquire({ capability: 'llm', route: 'cloud' })
    const release = await gate.acquire({ capability: 'image' })
    release(); release()
    expect(gate.status()[0]!.active).toBe(0)
    const a = await gate.acquire({ capability: 'image' })
    let second = false
    void gate.acquire({ capability: 'image' }).then(() => { second = true })
    await tick()
    expect(second).toBe(false)
    a()
    await tick()
    expect(second).toBe(true)
  })

  it('starts a call that needs several resources only when all have room, and holds none while it waits', async () => {
    const gate = gateOf([{ id: 'a', max: 1, routes: ['both', 'a-only'], capabilities: [] }, { id: 'b', max: 1, routes: ['both'], capabilities: [] }])
    const holdA = await gate.acquire({ capability: 'llm', route: 'a-only' })
    let both = false
    const bothCall = gate.acquire({ capability: 'llm', route: 'both' }).then((release) => { both = true; return release })
    await tick()
    expect(both).toBe(false)
    expect(gate.status().find(status => status.id === 'b')!.active).toBe(0)
    holdA()
    const release = await bothCall
    expect(gate.status().map(status => status.active)).toEqual([1, 1])
    release()
  })

  it('drops a call that is cancelled while it waits, and one that waited longer than allowed, without using a place', async () => {
    const gate = gateOf([gpu], 20)
    const held = await gate.acquire({ capability: 'image' })
    const controller = new AbortController()
    const cancelled = gate.acquire({ capability: 'image', signal: controller.signal })
    controller.abort()
    await expect(cancelled).rejects.toMatchObject({ code: 'cancelled' })
    await expect(gate.acquire({ capability: 'tts' })).rejects.toMatchObject({ code: 'unavailable' })
    expect(gate.status()[0]).toMatchObject({ active: 1, queued: { foreground: 0, background: 0 } })
    held()
    await expect(gate.acquire({ capability: 'image', signal: AbortSignal.abort() })).rejects.toBeInstanceOf(AiError)
  })

  it('keeps the reserved places for calls a person waits for, though background work arrived first', async () => {
    const gate = gateOf([{ ...gpu, max: 2, reserve: 1 }])
    const first = await gate.acquire({ capability: 'image', priority: 'background' })
    let second = false
    void gate.acquire({ capability: 'tts', priority: 'background' }).then(() => { second = true })
    await tick()
    expect(second).toBe(false)
    const person = await gate.acquire({ capability: 'llm', route: 'local' })
    expect(gate.status()[0]!.active).toBe(2)
    person()
    first()
    await tick()
    expect(second).toBe(true)
  })

  it('follows an edit of the limits when told to look again', async () => {
    const rules: GateRule[] = [{ ...gpu }]
    const gate = new RequestGate({ rules: () => rules, maxWaitMs: () => 0 })
    await gate.acquire({ capability: 'image' })
    let second = false
    void gate.acquire({ capability: 'image' }).then(() => { second = true })
    await tick()
    expect(second).toBe(false)
    rules[0] = { ...gpu, max: 2 }
    gate.pump()
    await tick()
    expect(second).toBe(true)
  })

  it('holds the place for the whole stream and frees it when the reader stops early', async () => {
    const gate = gateOf([gpu])
    async function * chunks(): AsyncGenerator<number> { yield 1; yield 2; yield 3 }
    const seen: number[] = []
    for await (const chunk of gate.stream({ capability: 'llm', route: 'local' }, chunks)) { seen.push(chunk); expect(gate.status()[0]!.active).toBe(1) }
    expect(seen).toEqual([1, 2, 3])
    expect(gate.status()[0]!.active).toBe(0)
    for await (const chunk of gate.stream({ capability: 'llm', route: 'local' }, chunks)) { void chunk; break }
    expect(gate.status()[0]!.active).toBe(0)
  })

  it('lets go of a call that holds its place too long, or whose signal fires, and says what holds the places', async () => {
    const forced: string[] = []
    const gate = new RequestGate({ rules: () => [gpu], maxWaitMs: () => 0, maxHoldMs: () => 20, onForced: request => { forced.push(request.capability) } })
    await gate.acquire({ capability: 'image' })
    expect(gate.status()[0]!.running).toMatchObject([{ capability: 'image', priority: 'foreground' }])
    const next = gate.acquire({ capability: 'tts' })
    await next
    expect(forced).toEqual(['image'])
    const controller = new AbortController()
    const quick = new RequestGate({ rules: () => [gpu], maxWaitMs: () => 0 })
    await quick.acquire({ capability: 'image', signal: controller.signal })
    const waiting = quick.acquire({ capability: 'tts' })
    controller.abort()
    await waiting
    expect(quick.status()[0]!.active).toBe(1)
  })

  it('frees the place when the work fails', async () => {
    const gate = gateOf([gpu])
    await expect(gate.run({ capability: 'image' }, () => Promise.reject(new Error('down')))).rejects.toThrow('down')
    expect(gate.status()[0]!.active).toBe(0)
  })
})
