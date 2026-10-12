import type { Context } from '@deepseek-ai/cordis'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import {
  SettingsFormModel,
  settingsNumberField,
  type SettingsFieldSpec,
  type SettingsFieldState,
  type SettingsFormActions,
  type SettingsFormScope,
  type SettingsFormShell,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { AI_API_PREFIX, AI_API_ROUTES, CAPABILITIES, type Capability, type ConcurrencyPayload, type ConcurrencyStatus } from '@dsh-ai-providers/core'

/** One shared resource and how many calls it serves at once, as the plugin's configuration holds it. */
export interface LimitRule {
  id: string
  max: number
  reserve?: number
  routes: string[]
  capabilities: Capability[]
}

export interface ConcurrencySettings {
  limits?: LimitRule[]
  maxWaitSeconds?: number
}

export interface ConcurrencyState extends SettingsFormShell {
  limits: readonly LimitRule[]
  maxWait: SettingsFieldState
  /** What each saved limit serves and keeps waiting now, by id. */
  live: Readonly<Record<string, ConcurrencyStatus>>
  /** The language model routes a limit can name. */
  routes: readonly { id: string; name: string }[]
  capabilities: readonly Capability[]
}

export interface ConcurrencyFace extends SettingsFormActions {
  hooks: {
    /** Bound by the renderer as `useConcurrency`. */
    concurrency: SnapshotStore<ConcurrencyState>
  }
  addLimit(): void
  updateLimit(index: number, change: Partial<LimitRule>): void
  removeLimit(index: number): void
}

const limitsField: SettingsFieldSpec = {
  field: 'limits',
  format: value => JSON.stringify(Array.isArray(value) ? value : []),
  parse: (text) => {
    try {
      const value = JSON.parse(text) as unknown
      return Array.isArray(value) ? { kind: 'set', value } : undefined
    } catch { return undefined }
  },
}

const REFRESH_MS = 3000

/** The tab of concurrency limits: which shared resources hold calls back, and what is running and waiting on each now. */
export class ConcurrencyController {
  private readonly form: SettingsFormModel<ConcurrencySettings>
  private readonly store: SnapshotStore<ConcurrencyState>
  private readonly abort = new AbortController()
  private live: Record<string, ConcurrencyStatus> = {}
  private routes: { id: string; name: string }[] = []
  private readonly timer: ReturnType<typeof setInterval>

  constructor(ctx: Context, scope: SettingsFormScope<ConcurrencySettings>) {
    this.form = new SettingsFormModel(scope, [limitsField, settingsNumberField('maxWaitSeconds')])
    this.store = this.form.bind(() => this.projection())
    void this.refresh()
    this.timer = setInterval(() => { void this.refresh() }, REFRESH_MS)
    ctx.effect(() => () => { this.dispose() }, 'dsh-ai-providers: concurrency tab')
  }

  private limits(): LimitRule[] {
    try { return JSON.parse(this.form.field('limits').text) as LimitRule[] } catch { return [] }
  }

  private projection(): ConcurrencyState {
    return { ...this.form.shell(), limits: this.limits(), maxWait: this.form.field('maxWaitSeconds'), live: this.live, routes: this.routes, capabilities: CAPABILITIES }
  }

  private set(limits: LimitRule[]): void {
    this.form.actions().edit('limits', JSON.stringify(limits))
  }

  async refresh(): Promise<void> {
    try {
      const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.concurrency}`, { credentials: 'same-origin', signal: this.abort.signal })
      if (!response.ok) return
      const payload = await response.json() as ConcurrencyPayload
      this.live = Object.fromEntries(payload.limits.map(status => [status.id, status]))
      this.routes = payload.routes
      this.store.set(this.projection())
    } catch { /* the next refresh tries again */ }
  }

  inject(): ConcurrencyFace {
    return {
      hooks: { concurrency: this.store },
      ...this.form.actions(),
      addLimit: () => { this.set([...this.limits(), { id: `limit-${this.limits().length + 1}`, max: 1, routes: [], capabilities: [] }]) },
      updateLimit: (index, change) => { this.set(this.limits().map((rule, at) => (at === index ? { ...rule, ...change } : rule))) },
      removeLimit: (index) => { this.set(this.limits().filter((_rule, at) => at !== index)) },
    }
  }

  dispose(): void {
    clearInterval(this.timer)
    this.abort.abort()
    this.form.dispose()
  }
}
