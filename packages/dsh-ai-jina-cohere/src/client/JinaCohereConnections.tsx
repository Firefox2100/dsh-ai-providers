import { useState } from 'react'
import { Button, SettingsForm, SettingsSecretField } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { JinaCohereCardFace } from './controller.ts'
import { formLabels } from './locales.ts'

export type JinaCohereConnectionsProps = PropsRuntime<'settings.section'> & PropsLocale<'ai.jina-cohere'> & InjectFace<JinaCohereCardFace>

export function JinaCohereConnections(props: JinaCohereConnectionsProps) {
  const state = props.useJinaCohereCard(snapshot => snapshot)
  const { t } = props
  return <div data-testid="ai-jina-cohere-connections">
    <h2 style={{ marginTop: 0 }}>{t('connectionsTitle')}</h2>
    <p>{t('connectionsDescription')}</p>
    <SettingsForm labels={formLabels(t)} state={state} onSave={props.save} onDiscard={props.discard}>
      <div style={{ display: 'grid', gap: 16 }}>
        {state.connections.map(connection => {
          const status = state.connectionStatus[connection.apiKeyRef]
          return <ConnectionRow key={connection.id} {...props} connection={connection} {...(status === undefined ? {} : { status })} disabled={!state.writable} />
        })}
        {state.connections.length === 0 && <p>{t('connectionsEmpty')}</p>}
        <div><Button variant="outline" size="sm" disabled={!state.writable} onClick={props.addConnection}>{t('connectionAdd')}</Button></div>
      </div>
    </SettingsForm>
  </div>
}

function ConnectionRow(props: JinaCohereConnectionsProps & { connection: { id: string; name: string; baseUrl: string; apiKeyRef: string }; status?: { configured: boolean; writable: boolean }; disabled: boolean }) {
  const { connection, status, t, disabled } = props
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  const saveKey = async () => {
    setSaving(true)
    try { if (await props.saveKey(connection.id, key)) setKey('') }
    finally { setSaving(false) }
  }
  const input = (field: 'name' | 'baseUrl' | 'apiKeyRef', label: string, value: string) => <label style={{ display: 'grid', gap: 5 }}>
    <span>{label}</span>
    <input value={value} disabled={disabled} onChange={event => { props.updateConnection(connection.id, field, event.target.value) }} />
  </label>
  return <section style={{ border: '1px solid var(--border, #4444)', borderRadius: 8, padding: 14, display: 'grid', gap: 12 }}>
    {input('name', t('connectionName'), connection.name)}
    {input('baseUrl', t('baseUrl'), connection.baseUrl)}
    {input('apiKeyRef', t('apiKeyEnv'), connection.apiKeyRef)}
    <SettingsSecretField id={`ai-jina-cohere-key-${connection.id}`} label={t('apiKey')} hint={t('apiKeyHint')}
      disabled={disabled || saving || status?.writable === false || connection.apiKeyRef.trim() === ''} text={key}
      configured={status?.configured ?? false} stateLabel={status?.configured === true ? t('apiKeySet') : t('apiKeyUnset')} onEdit={setKey} />
    <div style={{ display: 'flex', gap: 8 }}>
      <Button variant="outline" size="sm" disabled={key.trim() === '' || saving || status?.writable === false} onClick={() => { void saveKey() }}>{saving ? t('saving') : t('apiKeySave')}</Button>
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => { props.removeConnection(connection.id) }}>{t('connectionRemove')}</Button>
    </div>
  </section>
}
