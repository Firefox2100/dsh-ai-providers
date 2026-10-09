import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { AI_API_PREFIX, AI_API_ROUTES, type LlmPayload, type LlmProbeResult, type LlmRouteSummary } from 'dsh-ai-core'

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
  private readonly abort = new AbortController()

  constructor() { void this.load() }

  private patch(change: Partial<LlmState>): void {
    this.store.set({ ...this.store.getSnapshot(), ...change })
  }

  async load(): Promise<void> {
    try {
      const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.llm}`, { credentials: 'same-origin', signal: this.abort.signal })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim())
      const { routes } = await response.json() as LlmPayload
      this.patch({ status: 'ready', routes })
    } catch (error) {
      if (this.abort.signal.aborted) return
      const { error: _previous, ...rest } = this.store.getSnapshot()
      this.store.set({ ...rest, status: 'failed', error: error instanceof Error ? error.message : String(error) })
    }
  }

  async probe(route: string, model: string): Promise<void> {
    const key = `${route}/${model}`
    this.patch({ probes: { ...this.store.getSnapshot().probes, [key]: { status: 'running' } } })
    let result: LlmProbeResult
    try {
      const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.llmProbe}?route=${encodeURIComponent(route)}&model=${encodeURIComponent(model)}`, { method: 'POST', credentials: 'same-origin', signal: this.abort.signal })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim())
      result = await response.json() as LlmProbeResult
    } catch (error) {
      if (this.abort.signal.aborted) return
      result = { ok: false, code: 'internal', message: error instanceof Error ? error.message : String(error) }
    }
    this.patch({ probes: { ...this.store.getSnapshot().probes, [key]: { status: 'done', result } } })
  }

  inject(): LlmFace {
    return { hooks: { llm: this.store }, refresh: () => { void this.load() }, probe: (route, model) => { void this.probe(route, model) } }
  }

  dispose(): void { this.abort.abort() }
}
