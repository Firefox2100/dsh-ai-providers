import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import {
  SettingsFormModel,
  settingsNumberField,
  settingsTextField,
  type SettingsFieldState,
  type SettingsFormActions,
  type SettingsFormScope,
  type SettingsFormScopeSnapshot,
  type SettingsFormShell,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { AI_API_PREFIX, AI_API_ROUTES, type CredentialsPayload } from 'dsh-ai-core'

/** The fields of the provider's configuration this form edits. */
export interface OpenAiSettings {
  baseUrl?: string
  apiKeyEnv?: string
  embeddingModel?: string
  embeddingDimensions?: number
  batchSize?: number
  timeoutMs?: number
}

export interface OpenAiCardState extends SettingsFormShell {
  baseUrl: SettingsFieldState
  apiKeyEnv: SettingsFieldState
  /** The key being typed; it starts blank on every load and is never read back. */
  apiKey: SettingsFieldState
  embeddingModel: SettingsFieldState
  embeddingDimensions: SettingsFieldState
  batchSize: SettingsFieldState
  timeoutMs: SettingsFieldState
  /** Whether a key is stored or supplied under the name. */
  apiKeyConfigured: boolean
  /** Whether a key can be stored from here; false when the environment supplies it. */
  apiKeyWritable: boolean
}

export interface OpenAiCardFace extends SettingsFormActions {
  hooks: {
    /** Bound by the renderer as `useOpenAiCard`. */
    openAiCard: SnapshotStore<OpenAiCardState>
  }
}

/** The credential name the provider uses when the configuration names none. */
const DEFAULT_REF = 'OPENAI_API_KEY'
const API_KEY_FIELD = 'apiKey'

const refOf = (snapshot: SettingsFormScopeSnapshot<OpenAiSettings>): string => {
  const declared = snapshot.value?.apiKeyEnv
  return declared !== undefined && declared.length > 0 ? declared : DEFAULT_REF
}

/**
 * Stages the provider's form over its configuration entry. The key is the one control that is not in
 * the configuration: it is written to the credentials service through the main plugin's API, under the
 * name the form gives it, so that the key itself never reaches a profile or comes back in a response.
 */
export class OpenAiCardController {
  private readonly form: SettingsFormModel<OpenAiSettings>
  private readonly store: SnapshotStore<OpenAiCardState>
  private readonly unsubscribe: () => void
  private readonly abort = new AbortController()
  private credential = { ref: '', configured: false, writable: true }

  constructor(private readonly scope: SettingsFormScope<OpenAiSettings>) {
    this.form = new SettingsFormModel(
      scope,
      [
        settingsTextField('baseUrl'), settingsTextField('apiKeyEnv'), settingsTextField('embeddingModel'),
        settingsNumberField('embeddingDimensions'), settingsNumberField('batchSize'), settingsNumberField('timeoutMs'),
      ],
      [{ field: API_KEY_FIELD, write: text => this.writeKey(text) }],
    )
    this.store = this.form.bind(() => this.projection())
    this.unsubscribe = scope.subscribe(() => { void this.readCredential() })
    void this.readCredential()
  }

  private projection(): OpenAiCardState {
    return {
      ...this.form.shell(),
      baseUrl: this.form.field('baseUrl'),
      apiKeyEnv: this.form.field('apiKeyEnv'),
      apiKey: this.form.field(API_KEY_FIELD),
      embeddingModel: this.form.field('embeddingModel'),
      embeddingDimensions: this.form.field('embeddingDimensions'),
      batchSize: this.form.field('batchSize'),
      timeoutMs: this.form.field('timeoutMs'),
      apiKeyConfigured: this.credential.configured,
      apiKeyWritable: this.credential.writable,
    }
  }

  /** Ask whether a value exists under the name the form currently gives; an answer for another name is dropped. */
  private async readCredential(): Promise<void> {
    const ref = refOf(this.scope.getSnapshot())
    if (ref !== this.credential.ref) {
      // A new name knows nothing yet; keeping the old answer would claim a key exists under a name nobody asked about.
      this.credential = { ref, configured: false, writable: true }
      this.store.set(this.projection())
    }
    try {
      const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.credentials}?ref=${encodeURIComponent(ref)}`, { credentials: 'same-origin', signal: this.abort.signal })
      if (!response.ok || ref !== refOf(this.scope.getSnapshot())) return
      const status = await response.json() as CredentialsPayload
      if (status.configured === this.credential.configured && status.writable === this.credential.writable) return
      this.credential = { ref, configured: status.configured, writable: status.writable }
      this.store.set(this.projection())
    } catch {
      // Unreachable or aborted: the badge keeps what it knew, and the form is still usable.
    }
  }

  /** Store the typed key, then ask again whether one exists: the host is the only authority on that. */
  private async writeKey(value: string): Promise<boolean> {
    const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.credentials}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ref: refOf(this.scope.getSnapshot()), value }),
      signal: this.abort.signal,
    })
    if (response.ok) this.credential = { ...(await response.json() as CredentialsPayload), ref: this.credential.ref }
    await this.readCredential()
    return this.credential.configured
  }

  inject(): OpenAiCardFace {
    return { hooks: { openAiCard: this.store }, ...this.form.actions() }
  }

  dispose(): void {
    this.abort.abort()
    this.unsubscribe()
    this.form.dispose()
  }
}
