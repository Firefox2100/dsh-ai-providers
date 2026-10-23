import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import {
  SettingsFormModel, settingsNumberField, settingsTextField,
  type SettingsFieldSpec, type SettingsFieldState, type SettingsFormActions,
  type SettingsFormScope, type SettingsFormShell,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { AI_API_PREFIX, AI_API_ROUTES, type CredentialsPayload } from '@dsh-ai-providers/core'
import type { OpenAiConnectionConfig, OpenAiLlmRouteConfig } from '@dsh-ai-providers/openai-compatible/config'

export interface Settings {
  connections?: OpenAiConnectionConfig[]
  embeddingConnection?: string; rerankConnection?: string; ttsConnection?: string; sttConnection?: string; imageConnection?: string
  embeddingModel?: string; embeddingDimensions?: number; embeddingBody?: Record<string, unknown>
  rerankModel?: string; rerankBody?: Record<string, unknown>
  ttsModel?: string; ttsVoice?: string; ttsResponseFormat?: string; ttsSpeed?: number; ttsBody?: Record<string, unknown>
  sttModel?: string; sttRealtimeModel?: string
  imageModel?: string; imageSize?: string; imageQuality?: string; imageOutputFormat?: string; imageOutputCompression?: number
  imageBody?: Record<string, unknown>; imageReferences?: string; imageHighresScale?: number; imageHighresSteps?: number
  llmRoutes?: OpenAiLlmRouteConfig[]; llmIdleTimeoutMs?: number; batchSize?: number; timeoutMs?: number
}

type TextKey = 'embeddingConnection' | 'rerankConnection' | 'ttsConnection' | 'sttConnection' | 'imageConnection' | 'embeddingModel' | 'rerankModel' | 'ttsModel' | 'ttsVoice' | 'ttsResponseFormat' | 'sttModel' | 'sttRealtimeModel' | 'imageModel' | 'imageSize' | 'imageQuality' | 'imageOutputFormat' | 'imageReferences'
type NumberKey = 'embeddingDimensions' | 'ttsSpeed' | 'imageOutputCompression' | 'imageHighresScale' | 'imageHighresSteps' | 'llmIdleTimeoutMs' | 'batchSize' | 'timeoutMs'
type JsonKey = 'embeddingBody' | 'rerankBody' | 'ttsBody' | 'imageBody'
export type FieldKey = TextKey | NumberKey | JsonKey

export interface State extends SettingsFormShell {
  connections: OpenAiConnectionConfig[]
  status: Record<string, CredentialsPayload>
  llmRoutes: readonly OpenAiLlmRouteConfig[]
  llmRoutesField: SettingsFieldState
  fields: Record<FieldKey, SettingsFieldState>
}

export interface Face extends SettingsFormActions {
  hooks: { localAiSettings: SnapshotStore<State> }
  addConnection(): void
  updateConnection(id: string, field: 'name' | 'baseUrl' | 'apiKeyRef', value: string): void
  removeConnection(id: string): void
  saveKey(id: string, value: string): Promise<boolean>
  setLlmRoutes(routes: readonly OpenAiLlmRouteConfig[]): void
}

const jsonField = (field: string): SettingsFieldSpec => ({
  field, format: value => JSON.stringify(value ?? {}, null, 2),
  parse: text => {
    try { const value = JSON.parse(text) as unknown; return value !== null && typeof value === 'object' && !Array.isArray(value) ? { kind: 'set', value } : undefined }
    catch { return undefined }
  },
})
const listField = (field: string): SettingsFieldSpec => ({
  field, format: value => JSON.stringify(Array.isArray(value) ? value : []),
  parse: text => {
    try { const value = JSON.parse(text) as unknown; return Array.isArray(value) ? { kind: 'set', value } : undefined }
    catch { return undefined }
  },
})

const TEXT_FIELDS: readonly TextKey[] = ['embeddingConnection', 'rerankConnection', 'ttsConnection', 'sttConnection', 'imageConnection', 'embeddingModel', 'rerankModel', 'ttsModel', 'ttsVoice', 'ttsResponseFormat', 'sttModel', 'sttRealtimeModel', 'imageModel', 'imageSize', 'imageQuality', 'imageOutputFormat', 'imageReferences']
const NUMBER_FIELDS: readonly NumberKey[] = ['embeddingDimensions', 'ttsSpeed', 'imageOutputCompression', 'imageHighresScale', 'imageHighresSteps', 'llmIdleTimeoutMs', 'batchSize', 'timeoutMs']
const JSON_FIELDS: readonly JsonKey[] = ['embeddingBody', 'rerankBody', 'ttsBody', 'imageBody']

export class Controller {
  private readonly form: SettingsFormModel<Settings>
  private readonly store: SnapshotStore<State>
  private status: Record<string, CredentialsPayload> = {}
  private unsubscribe = () => {}
  private readonly abort = new AbortController()

  constructor(private readonly scope: SettingsFormScope<Settings>) {
    this.form = new SettingsFormModel(scope, [listField('connections'), listField('llmRoutes'), ...TEXT_FIELDS.map(settingsTextField), ...NUMBER_FIELDS.map(settingsNumberField), ...JSON_FIELDS.map(jsonField)])
    this.store = this.form.bind(() => this.projection())
  }
  start(): void { this.unsubscribe = this.scope.subscribe(() => { void this.readCredentials() }); void this.readCredentials() }
  private connections(): OpenAiConnectionConfig[] { try { return JSON.parse(this.form.field('connections').text) as OpenAiConnectionConfig[] } catch { return [] } }
  private routes(): OpenAiLlmRouteConfig[] { try { return JSON.parse(this.form.field('llmRoutes').text) as OpenAiLlmRouteConfig[] } catch { return [] } }
  private projection(): State {
    return { ...this.form.shell(), connections: this.connections(), status: this.status, llmRoutes: this.routes(), llmRoutesField: this.form.field('llmRoutes'), fields: Object.fromEntries([...TEXT_FIELDS, ...NUMBER_FIELDS, ...JSON_FIELDS].map(field => [field, this.form.field(field)])) as State['fields'] }
  }
  private setConnections(value: OpenAiConnectionConfig[]): void { this.form.actions().edit('connections', JSON.stringify(value)) }
  private async readCredentials(): Promise<void> {
    const refs = [...new Set(this.connections().map(connection => connection.apiKeyRef.trim()).filter(Boolean))]
    const values = await Promise.all(refs.map(async ref => {
      try { const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.credentials}?ref=${encodeURIComponent(ref)}`, { credentials: 'same-origin', signal: this.abort.signal }); return response.ok ? [ref, await response.json() as CredentialsPayload] as const : undefined }
      catch { return undefined }
    }))
    this.status = Object.fromEntries(values.filter(value => value !== undefined)); this.store.set(this.projection())
  }
  private async writeKey(id: string, value: string): Promise<boolean> {
    const ref = this.connections().find(connection => connection.id === id)?.apiKeyRef.trim()
    if (ref === undefined || ref === '' || value.trim() === '') return false
    const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.credentials}`, { method: 'PUT', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ref, value }), signal: this.abort.signal })
    if (response.ok) this.status = { ...this.status, [ref]: await response.json() as CredentialsPayload }
    this.store.set(this.projection()); return response.ok
  }
  inject(): Face {
    return {
      hooks: { localAiSettings: this.store }, ...this.form.actions(),
      addConnection: () => { const id = crypto.randomUUID(); this.setConnections([...this.connections(), { id, name: 'New connection', baseUrl: 'http://localhost:8080/v1', apiKeyRef: '' }]) },
      updateConnection: (id, field, value) => { this.setConnections(this.connections().map(connection => connection.id === id ? { ...connection, [field]: value } : connection)) },
      removeConnection: id => {
        this.setConnections(this.connections().filter(connection => connection.id !== id))
        for (const capability of ['embedding', 'rerank', 'tts', 'stt', 'image'] as const) if (this.form.field(`${capability}Connection`).text === id) this.form.actions().edit(`${capability}Connection`, '')
      },
      saveKey: (id, value) => this.writeKey(id, value),
      setLlmRoutes: routes => { this.form.actions().edit('llmRoutes', JSON.stringify(routes)) },
    }
  }
  dispose(): void { this.abort.abort(); this.unsubscribe(); this.form.dispose() }
}
