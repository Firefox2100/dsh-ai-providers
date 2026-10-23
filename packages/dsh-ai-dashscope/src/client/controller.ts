import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { SettingsFormModel, settingsNumberField, settingsTextField, type SettingsFieldSpec, type SettingsFieldState, type SettingsFormActions, type SettingsFormScope, type SettingsFormShell } from '@deepseek-ai/dsh-client-ui-primitives'
import { AI_API_PREFIX, AI_API_ROUTES, type CredentialsPayload } from '@dsh-ai-providers/core'
import type { DashScopeConnectionConfig, DashScopeLlmRouteConfig } from '../config.ts'

/** The fields of the provider's configuration this form edits. */
export interface DashScopeSettings {
  connections?: DashScopeConnectionConfig[]
  llmRoutes?: DashScopeLlmRouteConfig[]
  llmIdleTimeoutMs?: number
  rerankConnection?: string
  rerankModel?: string
  rerankInstruct?: string
  embeddingConnection?: string
  embeddingModel?: string
  embeddingDimensions?: number
  embeddingInstruct?: string
  embeddingEndpoint?: string
  ttsConnection?: string
  ttsModel?: string
  ttsVoice?: string
  ttsLanguage?: string
  ttsFormat?: string
  sttConnection?: string
  sttModel?: string
  sttEnableItn?: boolean
  imageConnection?: string
  imageModel?: string
  imageSize?: string
  imagePromptExtend?: boolean
  imageWatermark?: boolean
  batchSize?: number
  timeoutMs?: number
}

export interface State extends SettingsFormShell {
  connections: DashScopeConnectionConfig[]
  routes: DashScopeLlmRouteConfig[]
  status: Record<string, CredentialsPayload>
  llmIdleTimeoutMs: SettingsFieldState
  rerankConnection: SettingsFieldState
  rerankModel: SettingsFieldState
  rerankInstruct: SettingsFieldState
  embeddingConnection: SettingsFieldState
  embeddingModel: SettingsFieldState
  embeddingDimensions: SettingsFieldState
  embeddingInstruct: SettingsFieldState
  embeddingEndpoint: SettingsFieldState
  ttsConnection: SettingsFieldState
  ttsModel: SettingsFieldState
  ttsVoice: SettingsFieldState
  ttsLanguage: SettingsFieldState
  ttsFormat: SettingsFieldState
  sttConnection: SettingsFieldState
  sttModel: SettingsFieldState
  sttEnableItn: SettingsFieldState
  imageConnection: SettingsFieldState
  imageModel: SettingsFieldState
  imageSize: SettingsFieldState
  imagePromptExtend: SettingsFieldState
  imageWatermark: SettingsFieldState
  batchSize: SettingsFieldState
  timeoutMs: SettingsFieldState
}

export interface Face extends SettingsFormActions {
  hooks: {
    /** Bound by the renderer as `useDashscope`. */
    dashscope: SnapshotStore<State>
  }
  addConnection(): void
  updateConnection(id: string, field: 'name' | 'baseUrl' | 'apiKeyRef', value: string): void
  removeConnection(id: string): void
  saveKey(id: string, value: string): Promise<boolean>
  addRoute(): void
  updateRoute(id: string, value: DashScopeLlmRouteConfig): void
  removeRoute(id: string): void
}

const booleanField = (field: string): SettingsFieldSpec => ({
  field,
  format: value => String(value === true),
  parse: text => text === 'true' ? { kind: 'set', value: true } : text === 'false' ? { kind: 'set', value: false } : undefined,
})

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
  private readonly form: SettingsFormModel<DashScopeSettings>
  private readonly store: SnapshotStore<State>
  private readonly abort = new AbortController()
  private unsubscribe = () => {}
  private status: Record<string, CredentialsPayload> = {}

  constructor(private readonly scope: SettingsFormScope<DashScopeSettings>) {
    this.form = new SettingsFormModel(scope, [
      listField('connections'), listField('llmRoutes'), settingsNumberField('llmIdleTimeoutMs'),
      settingsTextField('rerankConnection'), settingsTextField('rerankModel'), settingsTextField('rerankInstruct'),
      settingsTextField('embeddingConnection'), settingsTextField('embeddingModel'), settingsNumberField('embeddingDimensions'),
      settingsTextField('embeddingInstruct'), settingsTextField('embeddingEndpoint'),
      settingsTextField('ttsConnection'), settingsTextField('ttsModel'), settingsTextField('ttsVoice'), settingsTextField('ttsLanguage'), settingsTextField('ttsFormat'),
      settingsTextField('sttConnection'), settingsTextField('sttModel'), booleanField('sttEnableItn'),
      settingsTextField('imageConnection'), settingsTextField('imageModel'), settingsTextField('imageSize'), booleanField('imagePromptExtend'), booleanField('imageWatermark'), settingsNumberField('batchSize'), settingsNumberField('timeoutMs'),
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
      rerankConnection: field('rerankConnection'),
      rerankModel: field('rerankModel'),
      rerankInstruct: field('rerankInstruct'),
      embeddingConnection: field('embeddingConnection'),
      embeddingModel: field('embeddingModel'),
      embeddingDimensions: field('embeddingDimensions'),
      embeddingInstruct: field('embeddingInstruct'),
      embeddingEndpoint: field('embeddingEndpoint'),
      ttsConnection: field('ttsConnection'),
      ttsModel: field('ttsModel'),
      ttsVoice: field('ttsVoice'),
      ttsLanguage: field('ttsLanguage'),
      ttsFormat: field('ttsFormat'),
      sttConnection: field('sttConnection'),
      sttModel: field('sttModel'),
      sttEnableItn: field('sttEnableItn'),
      imageConnection: field('imageConnection'),
      imageModel: field('imageModel'),
      imageSize: field('imageSize'),
      imagePromptExtend: field('imagePromptExtend'),
      imageWatermark: field('imageWatermark'),
      batchSize: field('batchSize'),
      timeoutMs: field('timeoutMs'),
    }
  }

  private set(field: string, value: unknown): void {
    this.form.actions().edit(field, JSON.stringify(value))
  }

  private async read(): Promise<void> {
    const refs = [...new Set(this.list<DashScopeConnectionConfig>('connections').map(item => item.apiKeyRef.trim()).filter(Boolean))]
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
      hooks: { dashscope: this.store },
      ...this.form.actions(),
      addConnection: () => {
        const id = crypto.randomUUID()
        this.set('connections', [...this.list('connections'), { id, name: 'DashScope', baseUrl: 'https://dashscope.aliyuncs.com/api/v1', apiKeyRef: `DASHSCOPE_API_KEY_${id.slice(0, 8).toUpperCase()}` }])
      },
      updateConnection: (id, field, value) => { this.set('connections', this.list<DashScopeConnectionConfig>('connections').map(item => item.id === id ? { ...item, [field]: value } : item)) },
      removeConnection: (id) => {
        this.set('connections', this.list<DashScopeConnectionConfig>('connections').filter(item => item.id !== id))
        for (const field of ['rerankConnection', 'embeddingConnection', 'ttsConnection', 'sttConnection', 'imageConnection'] as const) {
          if (this.form.field(field).text === id) this.form.actions().edit(field, '')
        }
      },
      saveKey: async (id, value) => {
        const ref = this.list<DashScopeConnectionConfig>('connections').find(item => item.id === id)?.apiKeyRef.trim()
        if (!ref || !value.trim()) return false
        const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.credentials}`, { method: 'PUT', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ref, value }), signal: this.abort.signal })
        if (response.ok) this.status = { ...this.status, [ref]: await response.json() as CredentialsPayload }
        this.store.set(this.project())
        return response.ok
      },
      addRoute: () => {
        const id = crypto.randomUUID()
        const connection = this.list<DashScopeConnectionConfig>('connections')[0]?.id ?? ''
        this.set('llmRoutes', [...this.list('llmRoutes'), { id: `dashscope-${id.slice(0, 8)}`, name: 'DashScope', connection, models: [] }])
      },
      updateRoute: (id, value) => { this.set('llmRoutes', this.list<DashScopeLlmRouteConfig>('llmRoutes').map(item => item.id === id ? value : item)) },
      removeRoute: (id) => { this.set('llmRoutes', this.list<DashScopeLlmRouteConfig>('llmRoutes').filter(item => item.id !== id)) },
    }
  }

  dispose(): void {
    this.abort.abort()
    this.unsubscribe()
    this.form.dispose()
  }
}
