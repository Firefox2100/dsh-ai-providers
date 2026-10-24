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
import { AI_API_PREFIX, AI_API_ROUTES, type CredentialsPayload } from '@dsh-ai-providers/core'
import type { TypeSafeConnectionConfig } from '../config.ts'

/** The fields of the provider's configuration this form edits. */
export interface TypeSafeSettings {
  connections?: TypeSafeConnectionConfig[]
  decisionConnection?: string
  decisionModel?: string
  longContext?: boolean
  timeoutMs?: number
}

export interface TypeSafeCardState extends SettingsFormShell {
  connections: TypeSafeConnectionConfig[]
  connectionStatus: Record<string, CredentialsPayload>
  decisionConnection: SettingsFieldState
  decisionModel: SettingsFieldState
  longContext: SettingsFieldState
  timeoutMs: SettingsFieldState
}

export interface TypeSafeCardFace extends SettingsFormActions {
  hooks: {
    /** Bound by the renderer as `useTypeSafeCard`. */
    typeSafeCard: SnapshotStore<TypeSafeCardState>
  }
  addConnection(): void
  updateConnection(id: string, field: 'name' | 'baseUrl' | 'apiKeyRef', value: string): void
  removeConnection(id: string): void
  saveKey(id: string, value: string): Promise<boolean>
}

const longContextField: SettingsFieldSpec = {
  field: 'longContext',
  format: value => (value === true ? 'true' : 'false'),
  parse: text => (text === 'true' || text === 'false' ? { kind: 'set', value: text === 'true' } : undefined),
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
 * Stages the provider's model and reusable connections over its configuration entry.
 */
export class TypeSafeCardController {
  private readonly form: SettingsFormModel<TypeSafeSettings>
  private readonly store: SnapshotStore<TypeSafeCardState>
  private unsubscribe = () => {}
  private readonly abort = new AbortController()
  private credentialStatus: Record<string, CredentialsPayload> = {}

  constructor(private readonly scope: SettingsFormScope<TypeSafeSettings>) {
    this.form = new SettingsFormModel(
      scope,
      [
        connectionListField, settingsTextField('decisionConnection'), settingsTextField('decisionModel'), longContextField,
        settingsNumberField('timeoutMs'),
      ],
    )
    this.store = this.form.bind(() => this.projection())
  }

  start(): void {
    this.unsubscribe = this.scope.subscribe(() => { void this.readCredentials() })
    void this.readCredentials()
  }

  private projection(): TypeSafeCardState {
    return {
      ...this.form.shell(),
      connections: this.connections(),
      connectionStatus: this.credentialStatus,
      decisionConnection: this.form.field('decisionConnection'),
      decisionModel: this.form.field('decisionModel'),
      longContext: this.form.field('longContext'),
      timeoutMs: this.form.field('timeoutMs'),
    }
  }

  private connections(): TypeSafeConnectionConfig[] {
    try { return JSON.parse(this.form.field('connections').text) as TypeSafeConnectionConfig[] }
    catch { return [] }
  }

  private setConnections(connections: TypeSafeConnectionConfig[]): void { this.form.actions().edit('connections', JSON.stringify(connections)) }

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

  inject(): TypeSafeCardFace {
    return {
      hooks: { typeSafeCard: this.store }, ...this.form.actions(),
      addConnection: () => {
        const id = crypto.randomUUID()
        this.setConnections([...this.connections(), { id, name: 'New connection', baseUrl: 'https://api.typesafe.ai/v1', apiKeyRef: `TYPESAFE_API_KEY_${id.slice(0, 8).toUpperCase()}` }])
      },
      updateConnection: (id, field, value) => { this.setConnections(this.connections().map(connection => connection.id === id ? { ...connection, [field]: value } : connection)) },
      removeConnection: id => {
        this.setConnections(this.connections().filter(connection => connection.id !== id))
        if (this.form.field('decisionConnection').text === id) this.form.actions().edit('decisionConnection', '')
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
