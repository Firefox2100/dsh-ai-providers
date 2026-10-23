import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { SettingsFormModel, settingsNumberField, settingsTextField, type SettingsFieldSpec, type SettingsFieldState, type SettingsFormActions, type SettingsFormScope, type SettingsFormShell } from '@deepseek-ai/dsh-client-ui-primitives'
import { AI_API_PREFIX, AI_API_ROUTES, type CredentialsPayload } from '@dsh-ai-providers/core'
import type { OllamaConnectionConfig, OllamaLlmRouteConfig } from '../config.ts'

/** The fields of the provider's configuration this form edits. */
export interface OllamaSettings {
  connections?: OllamaConnectionConfig[]
  llmRoutes?: OllamaLlmRouteConfig[]
  llmIdleTimeoutMs?: number
  embeddingConnection?: string
  embeddingModel?: string
  embeddingDimensions?: number
  embeddingNumCtx?: number
  embeddingOverflow?: string
  embeddingKeepAlive?: string
  batchSize?: number
  timeoutMs?: number
}

export interface State extends SettingsFormShell {
  connections: OllamaConnectionConfig[]
  routes: OllamaLlmRouteConfig[]
  status: Record<string, CredentialsPayload>
  llmIdleTimeoutMs: SettingsFieldState
  embeddingConnection: SettingsFieldState
  embeddingModel: SettingsFieldState
  embeddingDimensions: SettingsFieldState
  embeddingNumCtx: SettingsFieldState
  embeddingOverflow: SettingsFieldState
  embeddingKeepAlive: SettingsFieldState
  batchSize: SettingsFieldState
  timeoutMs: SettingsFieldState
}

export interface Face extends SettingsFormActions {
  hooks: {
    /** Bound by the renderer as `useOllama`. */
    ollama: SnapshotStore<State>
  }
  addConnection(): void
  updateConnection(id: string, field: 'name' | 'baseUrl' | 'apiKeyRef', value: string): void
  removeConnection(id: string): void
  saveKey(id: string, value: string): Promise<boolean>
  addRoute(): void
  updateRoute(id: string, value: OllamaLlmRouteConfig): void
  removeRoute(id: string): void
}

const listField = (field: string): SettingsFieldSpec => ({
  field,
  format: value => JSON.stringify(Array.isArray(value) ? value : []),
  parse: (text) => {
    try {
      const value = JSON.parse(text) as unknown
      return Array.isArray(value) ? { kind: 'set', value } : undefined
    } catch { return undefined }
  },
})

/** Stages the provider's connections, language model routes and embedding settings over its configuration entry. */
export class Controller {
  private readonly form: SettingsFormModel<OllamaSettings>
  private readonly store: SnapshotStore<State>
  private readonly abort = new AbortController()
  private unsubscribe = () => {}
  private status: Record<string, CredentialsPayload> = {}

  constructor(private readonly scope: SettingsFormScope<OllamaSettings>) {
    this.form = new SettingsFormModel(scope, [
      listField('connections'), listField('llmRoutes'), settingsNumberField('llmIdleTimeoutMs'),
      settingsTextField('embeddingConnection'), settingsTextField('embeddingModel'), settingsNumberField('embeddingDimensions'), settingsNumberField('embeddingNumCtx'),
      settingsTextField('embeddingOverflow'), settingsTextField('embeddingKeepAlive'), settingsNumberField('batchSize'), settingsNumberField('timeoutMs'),
    ])
    this.store = this.form.bind(() => this.project())
  }

  start(): void {
    this.unsubscribe = this.scope.subscribe(() => { void this.read() })
    void this.read()
  }

  private list<T>(field: string): T[] {
    try { return JSON.parse(this.form.field(field).text) as T[] } catch { return [] }
  }

  private project(): State {
    const field = (name: string) => this.form.field(name)
    return {
      ...this.form.shell(),
      connections: this.list('connections'),
      routes: this.list('llmRoutes'),
      status: this.status,
      llmIdleTimeoutMs: field('llmIdleTimeoutMs'),
      embeddingConnection: field('embeddingConnection'),
      embeddingModel: field('embeddingModel'),
      embeddingDimensions: field('embeddingDimensions'),
      embeddingNumCtx: field('embeddingNumCtx'),
      embeddingOverflow: field('embeddingOverflow'),
      embeddingKeepAlive: field('embeddingKeepAlive'),
      batchSize: field('batchSize'),
      timeoutMs: field('timeoutMs'),
    }
  }

  private set(field: string, value: unknown): void {
    this.form.actions().edit(field, JSON.stringify(value))
  }

  private async read(): Promise<void> {
    const refs = [...new Set(this.list<OllamaConnectionConfig>('connections').map(item => item.apiKeyRef.trim()).filter(Boolean))]
    const rows = await Promise.all(refs.map(async (ref) => {
      try {
        const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.credentials}?ref=${encodeURIComponent(ref)}`, { credentials: 'same-origin', signal: this.abort.signal })
        return response.ok ? [ref, await response.json() as CredentialsPayload] as const : undefined
      } catch { return undefined }
    }))
    this.status = Object.fromEntries(rows.filter(row => row !== undefined))
    this.store.set(this.project())
  }

  inject(): Face {
    return {
      hooks: { ollama: this.store },
      ...this.form.actions(),
      addConnection: () => {
        const id = crypto.randomUUID()
        this.set('connections', [...this.list('connections'), { id, name: 'Ollama', baseUrl: 'http://localhost:11434', apiKeyRef: '' }])
      },
      updateConnection: (id, field, value) => { this.set('connections', this.list<OllamaConnectionConfig>('connections').map(item => item.id === id ? { ...item, [field]: value } : item)) },
      removeConnection: (id) => { this.set('connections', this.list<OllamaConnectionConfig>('connections').filter(item => item.id !== id)) },
      saveKey: async (id, value) => {
        const ref = this.list<OllamaConnectionConfig>('connections').find(item => item.id === id)?.apiKeyRef.trim()
        if (!ref || !value.trim()) return false
        const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.credentials}`, { method: 'PUT', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ref, value }), signal: this.abort.signal })
        if (response.ok) this.status = { ...this.status, [ref]: await response.json() as CredentialsPayload }
        this.store.set(this.project())
        return response.ok
      },
      addRoute: () => {
        const id = crypto.randomUUID()
        const connection = this.list<OllamaConnectionConfig>('connections')[0]?.id ?? ''
        this.set('llmRoutes', [...this.list('llmRoutes'), { id: `ollama-${id.slice(0, 8)}`, name: 'Ollama', connection, models: [] }])
      },
      updateRoute: (id, value) => { this.set('llmRoutes', this.list<OllamaLlmRouteConfig>('llmRoutes').map(item => item.id === id ? value : item)) },
      removeRoute: (id) => { this.set('llmRoutes', this.list<OllamaLlmRouteConfig>('llmRoutes').filter(item => item.id !== id)) },
    }
  }

  dispose(): void {
    this.abort.abort()
    this.unsubscribe()
    this.form.dispose()
  }
}
