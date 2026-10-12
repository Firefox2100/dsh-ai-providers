import { AiError, type Capability, type RequestPriority } from '@dsh-ai-providers/core'

/** One shared resource and how many calls may use it at once (a GPU that serves one image or a few chats at a time). */
export interface GateRule {
  id: string
  max: number
  /** Places only calls a person waits for may take: background work stops at `max - reserve`, so a call that arrives never waits behind a full house of it. */
  reserve?: number
  /** Language model routes that use it. */
  routes: readonly string[]
  /** Capabilities whose selected provider uses it (`llm` is chosen by route instead). */
  capabilities: readonly Capability[]
}

/** What a call is, as far as the gate is concerned. */
export interface GateRequest {
  /** `llm` for a model request, else the capability. */
  capability: Capability | 'llm'
  /** The language model route, for a model request. */
  route?: string
  priority?: RequestPriority | undefined
  signal?: AbortSignal | undefined
}

export interface GateStatus {
  id: string
  max: number
  active: number
  queued: { foreground: number; background: number }
  /** How long the call that has waited longest has waited, in milliseconds. */
  oldestWaitMs: number
  /** What holds the places now, longest first. */
  running: { capability: string; route?: string; priority: string; ms: number }[]
}

interface Waiter {
  request: GateRequest
  groups: readonly string[]
  rank: number
  since: number
  admit: () => void
  fail: (error: AiError) => void
}

interface Held { request: GateRequest; groups: readonly string[]; since: number; release: () => void }

interface Options {
  rules: () => readonly GateRule[]
  /** The longest a call may hold its places, in milliseconds; 0 for no limit. A call that holds them longer is let go of, so one that never reports back cannot starve the rest. */
  maxHoldMs?: () => number
  /** Told when a call is let go of. */
  onForced?: (request: GateRequest, ms: number) => void
  /** The longest a call waits for its turn before it fails, in milliseconds; 0 for no limit. */
  maxWaitMs: () => number
  now?: () => number
}

const matches = (rule: GateRule, request: GateRequest): boolean => (request.capability === 'llm' ? request.route !== undefined && rule.routes.includes(request.route) : rule.capabilities.includes(request.capability))

/**
 * Lets a shared resource serve only as many calls at once as it is configured for, and serves the rest in order: a call a person waits for
 * before one that can wait, then by arrival. A call that needs several resources starts when all have room (it never holds one while waiting
 * for another, so two such calls cannot block each other). A call that matches no rule is not held back. Nothing running is interrupted.
 */
export class RequestGate {
  private readonly active = new Map<string, number>()
  private readonly waiting: Waiter[] = []
  private readonly holding = new Set<Held>()
  private readonly now: () => number

  constructor(private readonly options: Options) {
    this.now = options.now ?? Date.now
  }

  /**
   * Waits for the resources the call needs.
   * @returns what the call hands back when it is done; calling it again does nothing.
   * @throws {AiError} `cancelled` when the signal fires first, `unavailable` after the longest wait the configuration allows.
   */
  acquire(request: GateRequest): Promise<() => void> {
    const groups = this.options.rules().filter(rule => matches(rule, request)).map(rule => rule.id)
    if (request.signal?.aborted === true) return Promise.reject(new AiError('cancelled', 'cancelled'))
    if (groups.length === 0) return Promise.resolve(() => undefined)
    return new Promise<() => void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined
      const settle = (): void => {
        if (timer !== undefined) clearTimeout(timer)
        request.signal?.removeEventListener('abort', onAbort)
      }
      const waiter: Waiter = {
        request, groups, rank: request.priority === 'background' ? 1 : 0, since: this.now(),
        admit: () => {
          settle()
          for (const id of groups) this.active.set(id, (this.active.get(id) ?? 0) + 1)
          let released = false
          let watchdog: ReturnType<typeof setTimeout> | undefined
          const held: Held = { request, groups, since: this.now(), release: () => undefined }
          const release = (): void => {
            if (released) return
            released = true
            if (watchdog !== undefined) clearTimeout(watchdog)
            request.signal?.removeEventListener('abort', release)
            this.holding.delete(held)
            for (const id of groups) this.active.set(id, Math.max(0, (this.active.get(id) ?? 1) - 1))
            this.pump()
          }
          held.release = release
          this.holding.add(held)
          // A call that is cancelled has no more use for its places, whether or not its owner remembers to say so.
          request.signal?.addEventListener('abort', release, { once: true })
          const longest = this.options.maxHoldMs?.() ?? 0
          if (longest > 0) watchdog = setTimeout(() => { this.options.onForced?.(request, longest); release() }, longest)
          resolve(release)
        },
        fail: (error) => { settle(); reject(error) },
      }
      const onAbort = (): void => { this.remove(waiter); waiter.fail(new AiError('cancelled', 'cancelled')); this.pump() }
      request.signal?.addEventListener('abort', onAbort, { once: true })
      const limit = this.options.maxWaitMs()
      if (limit > 0) timer = setTimeout(() => { this.remove(waiter); waiter.fail(new AiError('unavailable', `waited ${Math.round(limit / 1000)} s in the queue for ${groups.join(', ')} and gave up`)); this.pump() }, limit)
      this.waiting.push(waiter)
      this.waiting.sort((a, b) => a.rank - b.rank || a.since - b.since)
      this.pump()
    })
  }

  /** Runs the work while holding the resources. */
  async run<T>(request: GateRequest, work: () => Promise<T>): Promise<T> {
    const release = await this.acquire(request)
    try { return await work() } finally { release() }
  }

  /** The same, for work that produces a stream: the resources are held until the stream ends, fails or is cancelled. */
  async * stream<T>(request: GateRequest, work: () => AsyncIterable<T>): AsyncGenerator<T> {
    const release = await this.acquire(request)
    try { yield * work() } finally { release() }
  }

  /** What each rule serves and keeps waiting now. */
  status(): GateStatus[] {
    const now = this.now()
    return this.options.rules().map((rule) => {
      const queue = this.waiting.filter(waiter => waiter.groups.includes(rule.id))
      return {
        id: rule.id, max: rule.max, active: this.active.get(rule.id) ?? 0,
        queued: { foreground: queue.filter(waiter => waiter.rank === 0).length, background: queue.filter(waiter => waiter.rank === 1).length },
        oldestWaitMs: queue.length === 0 ? 0 : now - Math.min(...queue.map(waiter => waiter.since)),
        running: [...this.holding].filter(held => held.groups.includes(rule.id)).sort((a, b) => a.since - b.since).map(held => ({ capability: held.request.capability, ...held.request.route === undefined ? {} : { route: held.request.route }, priority: held.request.priority ?? 'foreground', ms: now - held.since })),
      }
    })
  }

  /** Looks again at who can start; call it when the limits are edited. */
  pump(): void {
    const limits = new Map(this.options.rules().map(rule => [rule.id, rule]))
    const free = (id: string, background: boolean): boolean => {
      const rule = limits.get(id)
      return rule === undefined || (this.active.get(id) ?? 0) < rule.max - (background ? Math.min(rule.reserve ?? 0, rule.max - 1) : 0)
    }
    for (const waiter of [...this.waiting]) {
      if (!waiter.groups.every(id => free(id, waiter.rank === 1))) continue
      this.remove(waiter)
      waiter.admit()
    }
  }

  private remove(waiter: Waiter): void {
    const at = this.waiting.indexOf(waiter)
    if (at >= 0) this.waiting.splice(at, 1)
  }
}
