import type { Context } from '@deepseek-ai/cordis'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots'
import {
  SettingsFormModel,
  settingsTextField,
  type SettingsFieldState,
  type SettingsFormActions,
  type SettingsFormScope,
  type SettingsFormShell,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { AI_API_PREFIX, AI_API_ROUTES, parseProviderSlotId, type CapabilitiesPayload, type ProbeResult } from 'dsh-ai-core'
import type {} from 'dsh-ai-core/slots'

export interface ProviderEntry {
  id: string
  label: string
  /** Whether the provider's plugin is loaded on the host, so that it can be selected and used. */
  loaded: boolean
}

export interface EmbeddingSettings {
  embedding?: string
}

export interface EmbeddingState extends SettingsFormShell {
  /** The staged id of the selected provider; empty for none. */
  embedding: SettingsFieldState
  providers: readonly ProviderEntry[]
  /** Whether the embedding service is on the host's context right now. */
  available: boolean
  status: 'loading' | 'ready' | 'failed'
  error?: string
  probe: { status: 'idle' | 'running' | 'done'; result?: ProbeResult }
}

export interface EmbeddingFace extends SettingsFormActions {
  hooks: {
    /** Bound by the renderer as `useEmbedding`. */
    embedding: SnapshotStore<EmbeddingState>
  }
  runProbe: () => void
}

const CAPABILITY = 'embedding'

/** The tab of the embedding capability: which provider supplies it, and whether it works. */
export class EmbeddingController {
  private readonly form: SettingsFormModel<EmbeddingSettings>
  private readonly store: SnapshotStore<EmbeddingState>
  private readonly abort = new AbortController()
  private entries: { id: string; label: string }[] = []
  private loaded = new Set<string>()
  private available = false
  private status: EmbeddingState['status'] = 'loading'
  private error: string | undefined
  private probe: EmbeddingState['probe'] = { status: 'idle' }

  constructor(private readonly ctx: Context, scope: SettingsFormScope<EmbeddingSettings>) {
    this.form = new SettingsFormModel(scope, [settingsTextField('embedding')])
    this.store = this.form.bind(() => this.projection())
    this.syncEntries()
    ctx.effect(() => {
      const disposers = [ctx.slots.subscribe('ai.provider', () => { this.syncEntries() }), ctx.locale.subscribe(() => { this.syncEntries() })]
      return () => { for (const dispose of disposers) dispose() }
    }, 'dsh-ai-providers: provider list')
    void this.refresh()
  }

  private projection(): EmbeddingState {
    return {
      ...this.form.shell(),
      embedding: this.form.field('embedding'),
      providers: this.entries.map(entry => ({ ...entry, loaded: this.loaded.has(entry.id) })),
      available: this.available,
      status: this.status,
      ...(this.error === undefined ? {} : { error: this.error }),
      probe: this.probe,
    }
  }

  private publish(): void {
    this.store.set(this.projection())
  }

  /** The providers whose vendor plugins have put their configuration in the tab. */
  private syncEntries(): void {
    this.entries = this.ctx.slots.entriesOfSlot('ai.provider')
      .flatMap(({ options }) => {
        const parsed = parseProviderSlotId(options.id as string)
        return parsed?.capability === CAPABILITY ? [{ id: parsed.providerId, order: options.order ?? 0, label: resolveSlotLabel(options.label) ?? parsed.providerId }] : []
      })
      .sort((a, b) => a.order - b.order)
      .map(({ id, label }) => ({ id, label }))
    this.publish()
  }

  /** Read what the host knows: which providers are loaded and whether the service is up. */
  async refresh(): Promise<void> {
    try {
      const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.capabilities}`, { credentials: 'same-origin', signal: this.abort.signal })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim())
      const payload = await response.json() as CapabilitiesPayload
      const state = payload.capabilities.find(entry => entry.capability === CAPABILITY)
      this.loaded = new Set((state?.providers ?? []).map(provider => provider.id))
      this.available = state?.available ?? false
      this.status = 'ready'
      this.error = undefined
    } catch (error) {
      if (this.abort.signal.aborted) return
      this.status = 'failed'
      this.error = error instanceof Error ? error.message : String(error)
    }
    this.publish()
  }

  /** Ask the host to embed a sentence through the selected provider, and show what came of it. */
  async runProbe(): Promise<void> {
    this.probe = { status: 'running' }
    this.publish()
    try {
      const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.probe}?capability=${CAPABILITY}`, { method: 'POST', credentials: 'same-origin', signal: this.abort.signal })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim())
      this.probe = { status: 'done', result: await response.json() as ProbeResult }
    } catch (error) {
      if (this.abort.signal.aborted) return
      this.probe = { status: 'done', result: { ok: false, code: 'internal', message: error instanceof Error ? error.message : String(error) } }
    }
    await this.refresh()
  }

  inject(): EmbeddingFace {
    return {
      hooks: { embedding: this.store },
      ...this.form.actions(),
      runProbe: () => { void this.runProbe() },
    }
  }

  dispose(): void {
    this.abort.abort()
    this.form.dispose()
  }
}
