import { refreshOn } from '../subscriptions.ts'
import type { Context } from '@deepseek-ai/cordis'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { AI_API_PREFIX, AI_API_ROUTES, type LlmPayload, type LlmProbeResult, type LlmRouteSummary } from '@dsh-ai-providers/core'

export interface LlmState {
  status: 'loading' | 'ready' | 'failed'
  error?: string
  routes: readonly LlmRouteSummary[]
  /** What testing a model came to, by `route/model`. */
  probes: Readonly<Record<string, { status: 'running' } | { status: 'done'; result: LlmProbeResult }>>
}

export interface LlmFace {
  hooks: {
    /** Bound by the renderer as `useLlm`. */
    llm: SnapshotStore<LlmState>
  }
  refresh(): void
  probe(route: string, model: string): void
}

/** The tab of language models: which routes the providers serve to DSH, and whether a model answers. */
export class LlmController {
  private readonly store = createSnapshotStore<LlmState>({ status: 'loading', routes: [], probes: {} }, { flush: 'sync' })
  private abort = new AbortController()
  /** Unsubscribes the forwarded events; set only while the page is mounted. */
  private stopEvents: (() => void) | undefined

  constructor(private readonly ctx: Context) {}

  /**
   * Asks the host what the providers serve, and listens for changes until {@link stop}. A page calls this when it mounts,
   * so a profile whose settings page is never opened does not read `/ai-api` at every start.
   */
  start(): void {
    if (this.stopEvents) return
    this.stopEvents = refreshOn(this.ctx, ['llm/adapters-updated', 'llm/models-updated', 'settings/document-updated'], () => { void this.load() })
    void this.load()
  }

  /** Drops the listeners and the requests of a page that is no longer on screen. */
  stop(): void {
    this.stopEvents?.()
    this.stopEvents = undefined
    this.abort.abort()
    this.abort = new AbortController()
  }

  private patch(change: Partial<LlmState>): void {
    this.store.set({ ...this.store.getSnapshot(), ...change })
  }

  async load(): Promise<void> {
    const { signal } = this.abort
    try {
      const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.llm}`, { credentials: 'same-origin', signal })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim())
      const { routes } = await response.json() as LlmPayload
      this.patch({ status: 'ready', routes })
    } catch (error) {
      if (signal.aborted) return
      const { error: _previous, ...rest } = this.store.getSnapshot()
      this.store.set({ ...rest, status: 'failed', error: error instanceof Error ? error.message : String(error) })
    }
  }

  async probe(route: string, model: string): Promise<void> {
    const key = `${route}/${model}`
    const { signal } = this.abort
    this.patch({ probes: { ...this.store.getSnapshot().probes, [key]: { status: 'running' } } })
    let result: LlmProbeResult
    try {
      const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.llmProbe}?route=${encodeURIComponent(route)}&model=${encodeURIComponent(model)}`, { method: 'POST', credentials: 'same-origin', signal })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim())
      result = await response.json() as LlmProbeResult
    } catch (error) {
      if (signal.aborted) return
      result = { ok: false, code: 'internal', message: error instanceof Error ? error.message : String(error) }
    }
    this.patch({ probes: { ...this.store.getSnapshot().probes, [key]: { status: 'done', result } } })
  }

  inject(): LlmFace {
    return { hooks: { llm: this.store }, refresh: () => { void this.load() }, probe: (route, model) => { void this.probe(route, model) } }
  }

  dispose(): void { this.stop() }
}
