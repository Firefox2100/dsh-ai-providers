import { useState } from 'react'
import { Button, SettingsForm, SettingsSecretField } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { TypeSafeCardFace } from './controller.ts'
import { formLabels } from './locales.ts'
import css from './TypeSafeSurface.module.css'

export type TypeSafeConnectionsProps = PropsRuntime<'ai.provider.connection'> & PropsLocale<'ai.typesafe'> & InjectFace<TypeSafeCardFace>

export function TypeSafeConnections(props: TypeSafeConnectionsProps) {
  const state = props.useTypeSafeCard(snapshot => snapshot)
  const { t } = props
  return <div data-testid="ai-typesafe-connections" className={css.section}>
    <h3 className={css.providerTitle}>{t('connectionsTitle')}</h3>
    <p className={css.description}>{t('connectionsDescription')}</p>
    <SettingsForm labels={formLabels(t)} state={state} onSave={props.save} onDiscard={props.discard}>
      <div className={css.list}>
        {state.connections.map(connection => {
          const status = state.connectionStatus[connection.apiKeyRef]
          return <ConnectionRow key={connection.id} {...props} connection={connection} {...(status === undefined ? {} : { status })} disabled={!state.writable} />
        })}
        {state.connections.length === 0 && <p className={css.empty}>{t('connectionsEmpty')}</p>}
        <div><Button variant="outline" size="sm" disabled={!state.writable} onClick={props.addConnection}>{t('connectionAdd')}</Button></div>
      </div>
    </SettingsForm>
  </div>
}

function ConnectionRow(props: TypeSafeConnectionsProps & { connection: { id: string; name: string; baseUrl: string; apiKeyRef: string }; status?: { configured: boolean; writable: boolean }; disabled: boolean }) {
  const { connection, status, t, disabled } = props
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  const saveKey = async () => {
    setSaving(true)
    try { if (await props.saveKey(connection.id, key)) setKey('') }
    finally { setSaving(false) }
  }
  const input = (field: 'name' | 'baseUrl' | 'apiKeyRef', label: string, value: string) => <label className={css.field}>
    <span>{label}</span>
    <input value={value} disabled={disabled} onChange={event => { props.updateConnection(connection.id, field, event.target.value) }} />
  </label>
  return <section className={css.card}>
    {input('name', t('connectionName'), connection.name)}
    {input('baseUrl', t('baseUrl'), connection.baseUrl)}
    {input('apiKeyRef', t('apiKeyEnv'), connection.apiKeyRef)}
    <SettingsSecretField id={`ai-typesafe-key-${connection.id}`} label={t('apiKey')} hint={t('apiKeyHint')}
      disabled={disabled || saving || status?.writable === false || connection.apiKeyRef.trim() === ''} text={key}
      configured={status?.configured ?? false} stateLabel={status?.configured === true ? t('apiKeySet') : t('apiKeyUnset')} onEdit={setKey} />
    <div className={css.actions}>
      <Button variant="outline" size="sm" disabled={disabled || key.trim() === '' || saving || status?.writable === false} onClick={() => { void saveKey() }}>{saving ? t('saving') : t('apiKeySave')}</Button>
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => { props.removeConnection(connection.id) }}>{t('connectionRemove')}</Button>
    </div>
  </section>
}
