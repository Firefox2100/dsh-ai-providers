import { refreshOn } from '../subscriptions.ts'
import type { Context } from '@deepseek-ai/cordis'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import {
  SettingsFormModel,
  settingsNumberField,
  settingsTextField,
  type SettingsFieldSpec,
  type SettingsFieldState,
  type SettingsFormActions,
  type SettingsFormScope,
  type SettingsFormShell,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { AI_API_PREFIX, AI_API_ROUTES, type CredentialStatus } from '@dsh-ai-providers/core'

export interface ObservabilitySettings {
  traceEnabled?: boolean
  traceSink?: string
  traceCapture?: string
  traceSummaryChars?: number
  traceDirectory?: string
  traceWire?: boolean
  traceRedact?: string[]
  langfuseHost?: string
  langfuseEnvironment?: string
  langfusePublicKeyRef?: string
  langfuseSecretKeyRef?: string
}

/** Which of the two Langfuse keys a box writes. */
export type KeyName = 'publicKey' | 'secretKey'

export interface ObservabilityState extends SettingsFormShell {
  enabled: boolean
  sink: SettingsFieldState
  capture: SettingsFieldState
  summaryChars: SettingsFieldState
  directory: SettingsFieldState
  wire: boolean
  redact: SettingsFieldState
  host: SettingsFieldState
  environment: SettingsFieldState
  publicKeyRef: SettingsFieldState
  secretKeyRef: SettingsFieldState
  /** What the credential store says about each key, never its value; absent until read. */
  keys: Partial<Record<KeyName, CredentialStatus>>
  keyError?: string
}

export interface ObservabilityFace extends SettingsFormActions {
  hooks: {
    /** Bound by the renderer as `useObservability`. */
    observability: SnapshotStore<ObservabilityState>
  }
  setEnabled(on: boolean): void
  setWire(on: boolean): void
  /** Stores a key (an empty value removes it) and reads its status again. */
  storeKey(name: KeyName, value: string): Promise<boolean>
}

const enabledField: SettingsFieldSpec = {
  field: 'traceEnabled',
  format: value => (value === true ? 'true' : 'false'),
  parse: text => (text === 'true' ? { kind: 'set', value: true } : text === 'false' ? { kind: 'set', value: false } : undefined),
}

const wireField: SettingsFieldSpec = {
  field: 'traceWire',
  format: value => (value === true ? 'true' : 'false'),
  parse: text => (text === 'true' ? { kind: 'set', value: true } : text === 'false' ? { kind: 'set', value: false } : undefined),
}

/** One pattern a line; a blank line is nothing, and the setting keeps the patterns as a list. */
const redactField: SettingsFieldSpec = {
  field: 'traceRedact',
  format: value => (Array.isArray(value) ? value.join('\n') : ''),
  parse: text => ({ kind: 'set', value: text.split('\n').map(line => line.trim()).filter(line => line !== '') }),
}

const REFS: Record<KeyName, { field: 'langfusePublicKeyRef' | 'langfuseSecretKeyRef'; fallback: string }> = {
  publicKey: { field: 'langfusePublicKeyRef', fallback: 'AI_PROVIDERS_LANGFUSE_PUBLIC_KEY' },
  secretKey: { field: 'langfuseSecretKeyRef', fallback: 'AI_PROVIDERS_LANGFUSE_SECRET_KEY' },
}

/** The tab of observability: whether calls are recorded, where, how much of them, and the Langfuse keys, which live in the credential store. */
export class ObservabilityController {
  private readonly form: SettingsFormModel<ObservabilitySettings>
  private readonly store: SnapshotStore<ObservabilityState>
  private readonly abort = new AbortController()
  private keys: ObservabilityState['keys'] = {}
  private keyError: string | undefined

  constructor(scope: SettingsFormScope<ObservabilitySettings>) {
    this.form = new SettingsFormModel(scope, [enabledField, wireField, redactField, settingsTextField('traceSink'), settingsTextField('traceCapture'), settingsNumberField('traceSummaryChars'), settingsTextField('traceDirectory'), settingsTextField('langfuseHost'), settingsTextField('langfuseEnvironment'), settingsTextField('langfusePublicKeyRef'), settingsTextField('langfuseSecretKeyRef')])
    this.store = this.form.bind(() => this.projection())
  }

  start(ctx: Context): void {
    refreshOn(ctx, ['credentials/record-updated', 'credentials/reference-updated', 'settings/document-updated'], () => { void this.readKeys() })
    void this.readKeys()
    ctx.effect(() => () => { this.dispose() }, 'dsh-ai-providers: observability tab')
  }

  private refOf(name: KeyName): string {
    return this.form.field(REFS[name].field).text.trim() || REFS[name].fallback
  }

  private projection(): ObservabilityState {
    return {
      ...this.form.shell(), enabled: this.form.field('traceEnabled').text === 'true',
      sink: this.form.field('traceSink'), capture: this.form.field('traceCapture'), summaryChars: this.form.field('traceSummaryChars'), directory: this.form.field('traceDirectory'), wire: this.form.field('traceWire').text === 'true', redact: this.form.field('traceRedact'),
      host: this.form.field('langfuseHost'), environment: this.form.field('langfuseEnvironment'), publicKeyRef: this.form.field('langfusePublicKeyRef'), secretKeyRef: this.form.field('langfuseSecretKeyRef'),
      keys: this.keys, ...this.keyError === undefined ? {} : { keyError: this.keyError },
    }
  }

  private async readKeys(): Promise<void> {
    for (const name of ['publicKey', 'secretKey'] as const) {
      try {
        const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.credentials}?ref=${encodeURIComponent(this.refOf(name))}`, { credentials: 'same-origin', signal: this.abort.signal })
        if (response.ok) this.keys = { ...this.keys, [name]: await response.json() as CredentialStatus }
      } catch { /* the next read tries again */ }
    }
    this.store.set(this.projection())
  }

  inject(): ObservabilityFace {
    return {
      hooks: { observability: this.store },
      ...this.form.actions(),
      setEnabled: (on) => { this.form.actions().edit('traceEnabled', on ? 'true' : 'false') },
      setWire: (on) => { this.form.actions().edit('traceWire', on ? 'true' : 'false') },
      storeKey: async (name, value) => {
        this.keyError = undefined
        let stored = false
        try {
          const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.credentials}`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ref: this.refOf(name), value }), signal: this.abort.signal })
          if (!response.ok) this.keyError = ((await response.json().catch(() => ({}))) as { error?: string }).error ?? `the key could not be stored (${response.status})`
          else stored = true
        } catch (error) { this.keyError = error instanceof Error ? error.message : String(error) }
        await this.readKeys()
        return stored
      },
    }
  }

  dispose(): void {
    this.abort.abort()
    this.form.dispose()
  }
}
