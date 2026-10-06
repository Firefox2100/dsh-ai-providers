import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import {
  SettingsFormModel,
  settingsNumberField,
  settingsTextField,
  type SettingsFieldState,
  type SettingsFormActions,
  type SettingsFormScope,
  type SettingsFormShell,
  type SettingsFieldSpec,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { AI_API_PREFIX, AI_API_ROUTES, type CredentialsPayload } from 'dsh-ai-core'
import type { OpenAiConnectionConfig } from '../config.ts'

/** The fields of the provider's configuration this form edits. */
export interface OpenAiSettings {
  connections?: OpenAiConnectionConfig[]
  embeddingConnection?: string
  ttsConnection?: string
  sttConnection?: string
  imageConnection?: string
  embeddingModel?: string
  embeddingDimensions?: number
  ttsModel?: string
  ttsVoice?: string
  ttsResponseFormat?: string
  ttsSpeed?: number
  sttModel?: string
  sttRealtimeModel?: string
  imageModel?: string
  imageSize?: string
  imageQuality?: string
  imageOutputFormat?: string
  imageOutputCompression?: number
  batchSize?: number
  timeoutMs?: number
}

export interface OpenAiCardState extends SettingsFormShell {
  connections: OpenAiConnectionConfig[]
  connectionStatus: Record<string, CredentialsPayload>
  embeddingConnection: SettingsFieldState
  ttsConnection: SettingsFieldState
  sttConnection: SettingsFieldState
  imageConnection: SettingsFieldState
  embeddingModel: SettingsFieldState
  embeddingDimensions: SettingsFieldState
  ttsModel: SettingsFieldState
  ttsVoice: SettingsFieldState
  ttsResponseFormat: SettingsFieldState
  ttsSpeed: SettingsFieldState
  sttModel: SettingsFieldState
  sttRealtimeModel: SettingsFieldState
  imageModel: SettingsFieldState
  imageSize: SettingsFieldState
  imageQuality: SettingsFieldState
  imageOutputFormat: SettingsFieldState
  imageOutputCompression: SettingsFieldState
  batchSize: SettingsFieldState
  timeoutMs: SettingsFieldState
}

export interface OpenAiCardFace extends SettingsFormActions {
  hooks: {
    /** Bound by the renderer as `useOpenAiCard`. */
    openAiCard: SnapshotStore<OpenAiCardState>
  }
  addConnection(): void
  updateConnection(id: string, field: 'name' | 'baseUrl' | 'apiKeyRef', value: string): void
  removeConnection(id: string): void
  saveKey(id: string, value: string): Promise<boolean>
}

const connectionListField: SettingsFieldSpec = {
  field: 'connections',
  format: value => JSON.stringify(Array.isArray(value) ? value : []),
  parse: text => {
    try {
      const value = JSON.parse(text) as unknown
      return Array.isArray(value) ? { kind: 'set', value } : undefined
    } catch { return undefined }
  },
}

/**
 * Stages the provider's models and reusable connections over its configuration entry.
 */
export class OpenAiCardController {
  private readonly form: SettingsFormModel<OpenAiSettings>
  private readonly store: SnapshotStore<OpenAiCardState>
  private readonly unsubscribe: () => void
  private readonly abort = new AbortController()
  private credentialStatus: Record<string, CredentialsPayload> = {}

  constructor(scope: SettingsFormScope<OpenAiSettings>) {
    this.form = new SettingsFormModel(
      scope,
      [
        connectionListField,
        settingsTextField('embeddingConnection'), settingsTextField('ttsConnection'), settingsTextField('sttConnection'), settingsTextField('imageConnection'),
        settingsTextField('embeddingModel'),
        settingsNumberField('embeddingDimensions'), settingsTextField('ttsModel'), settingsTextField('ttsVoice'),
        settingsTextField('ttsResponseFormat'), settingsNumberField('ttsSpeed'), settingsNumberField('batchSize'), settingsNumberField('timeoutMs'),
        settingsTextField('sttModel'), settingsTextField('sttRealtimeModel'),
        settingsTextField('imageModel'), settingsTextField('imageSize'), settingsTextField('imageQuality'), settingsTextField('imageOutputFormat'), settingsNumberField('imageOutputCompression'),
      ],
    )
    this.store = this.form.bind(() => this.projection())
    this.unsubscribe = scope.subscribe(() => { void this.readCredentials() })
    void this.readCredentials()
  }

  private projection(): OpenAiCardState {
    return {
      ...this.form.shell(),
      connections: this.connections(),
      connectionStatus: this.credentialStatus,
      embeddingConnection: this.form.field('embeddingConnection'),
      ttsConnection: this.form.field('ttsConnection'),
      sttConnection: this.form.field('sttConnection'),
      imageConnection: this.form.field('imageConnection'),
      embeddingModel: this.form.field('embeddingModel'),
      embeddingDimensions: this.form.field('embeddingDimensions'),
      ttsModel: this.form.field('ttsModel'),
      ttsVoice: this.form.field('ttsVoice'),
      ttsResponseFormat: this.form.field('ttsResponseFormat'),
      ttsSpeed: this.form.field('ttsSpeed'),
      sttModel: this.form.field('sttModel'),
      sttRealtimeModel: this.form.field('sttRealtimeModel'),
      imageModel: this.form.field('imageModel'),
      imageSize: this.form.field('imageSize'),
      imageQuality: this.form.field('imageQuality'),
      imageOutputFormat: this.form.field('imageOutputFormat'),
      imageOutputCompression: this.form.field('imageOutputCompression'),
      batchSize: this.form.field('batchSize'),
      timeoutMs: this.form.field('timeoutMs'),
    }
  }

  private connections(): OpenAiConnectionConfig[] {
    try { return JSON.parse(this.form.field('connections').text) as OpenAiConnectionConfig[] }
    catch { return [] }
  }

  private setConnections(connections: OpenAiConnectionConfig[]): void {
    this.form.actions().edit('connections', JSON.stringify(connections))
  }

  private async readCredentials(): Promise<void> {
    const refs = [...new Set(this.connections().map(connection => connection.apiKeyRef.trim()).filter(Boolean))]
    const statuses = await Promise.all(refs.map(async ref => {
      try {
        const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.credentials}?ref=${encodeURIComponent(ref)}`, { credentials: 'same-origin', signal: this.abort.signal })
        return response.ok ? [ref, await response.json() as CredentialsPayload] as const : undefined
      } catch { return undefined }
    }))
    this.credentialStatus = Object.fromEntries(statuses.filter(status => status !== undefined))
    this.store.set(this.projection())
  }

  private async writeKey(id: string, value: string): Promise<boolean> {
    const ref = this.connections().find(connection => connection.id === id)?.apiKeyRef.trim()
    if (ref === undefined || ref === '' || value.trim() === '') return false
    const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.credentials}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ref, value }),
      signal: this.abort.signal,
    })
    if (response.ok) this.credentialStatus = { ...this.credentialStatus, [ref]: await response.json() as CredentialsPayload }
    this.store.set(this.projection())
    return response.ok
  }

  inject(): OpenAiCardFace {
    return {
      hooks: { openAiCard: this.store }, ...this.form.actions(),
      addConnection: () => {
        const id = crypto.randomUUID()
        this.setConnections([...this.connections(), { id, name: 'New connection', baseUrl: 'https://api.openai.com/v1', apiKeyRef: `OPENAI_API_KEY_${id.slice(0, 8).toUpperCase()}` }])
      },
      updateConnection: (id, field, value) => { this.setConnections(this.connections().map(connection => connection.id === id ? { ...connection, [field]: value } : connection)) },
      removeConnection: id => {
        this.setConnections(this.connections().filter(connection => connection.id !== id))
        for (const capability of ['embedding', 'tts', 'stt', 'image'] as const) {
          const field = `${capability}Connection`
          if (this.form.field(field).text === id) this.form.actions().edit(field, '')
        }
      },
      saveKey: (id, value) => this.writeKey(id, value),
    }
  }

  dispose(): void {
    this.abort.abort()
    this.unsubscribe()
    this.form.dispose()
  }
}
