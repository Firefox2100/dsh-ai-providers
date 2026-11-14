import { refreshOn } from '../subscriptions.ts'
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

/** Whether the settings page is in front; a hidden tab reads nothing. */
const pageHidden = (): boolean => typeof document !== 'undefined' && document.visibilityState === 'hidden'

/** The tab of concurrency limits: which shared resources hold calls back, and what is running and waiting on each now. */
export class ConcurrencyController {
  private readonly form: SettingsFormModel<ConcurrencySettings>
  private readonly store: SnapshotStore<ConcurrencyState>
  private abort = new AbortController()
  private live: Record<string, ConcurrencyStatus> = {}
  private routes: { id: string; name: string }[] = []
  private timer: ReturnType<typeof setInterval> | undefined
  /** Stops everything the mounted page started; present only while the page is mounted. */
  private teardown: (() => void) | undefined
  private nextLimit = 1

  constructor(private readonly ctx: Context, scope: SettingsFormScope<ConcurrencySettings>) {
    this.form = new SettingsFormModel(scope, [limitsField, settingsNumberField('maxWaitSeconds')])
    this.store = this.form.bind(() => this.projection())
  }

  /** Reads the counters and starts the timer, while the page is mounted. */
  start(): void {
    if (this.teardown) return
    const stopRefresh = refreshOn(this.ctx, ['settings/document-updated'], () => { void this.refresh() })
    // The counters are live, so they are read on a timer — but only while the page is in front: a settings tab left in
    // the background, or closed, must not keep asking the host.
    this.timer = setInterval(() => { if (!pageHidden()) void this.refresh() }, REFRESH_MS)
    const onVisibility = (): void => { if (!pageHidden()) void this.refresh() }
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility)
    this.teardown = () => {
      stopRefresh()
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility)
      if (this.timer !== undefined) clearInterval(this.timer)
      this.timer = undefined
      this.abort.abort()
      this.abort = new AbortController()
    }
    void this.refresh()
  }

  /** Drops the timer and the listeners of a page that is no longer on screen. */
  stop(): void {
    this.teardown?.()
    this.teardown = undefined
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
    const { signal } = this.abort
    try {
      const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.concurrency}`, { credentials: 'same-origin', signal })
      if (!response.ok) return
      const payload = await response.json() as ConcurrencyPayload
      this.live = Object.fromEntries(payload.limits.map(status => [status.id, status]))
      this.routes = payload.routes
      this.store.set(this.projection())
    } catch { /* the next refresh tries again */ }
  }

  /**
   * An id no current rule uses. Ids are the host's admission key, so two rules sharing one silently collapse into a
   * single policy; a removed rule's id must not be handed out again while its row can still be keyed by it.
   */
  private nextLimitId(): string {
    const taken = new Set(this.limits().map(rule => rule.id))
    while (taken.has(`limit-${this.nextLimit}`)) this.nextLimit++
    return `limit-${this.nextLimit++}`
  }

  inject(): ConcurrencyFace {
    return {
      hooks: { concurrency: this.store },
      ...this.form.actions(),
      addLimit: () => { this.set([...this.limits(), { id: this.nextLimitId(), max: 1, routes: [], capabilities: [] }]) },
      updateLimit: (index, change) => { this.set(this.limits().map((rule, at) => (at === index ? { ...rule, ...change } : rule))) },
      removeLimit: (index) => { this.set(this.limits().filter((_rule, at) => at !== index)) },
    }
  }

  dispose(): void {
    this.stop()
    this.form.dispose()
  }
}
