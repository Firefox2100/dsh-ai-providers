import { useState } from 'react'
import { Button, SettingsForm, SettingsSecretField } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { Face } from './controller.ts'
import css from './Connections.module.css'

type Props = PropsRuntime<'ai.provider.connection'> & PropsLocale<'ai.localai'> & InjectFace<Face>

export function Connections(props: Props) {
  const state = props.useLocalAiSettings(value => value)
  const labels = { unavailable: props.t('unavailable'), readOnly: props.t('readOnly'), saveFailed: props.t('saveFailed'), save: props.t('save'), saving: props.t('saving') }
  return <div className={css.section} data-testid="ai-localai-connections">
    <h3 className={css.title}>{props.t('connectionsTitle')}</h3><p className={css.description}>{props.t('connectionsDescription')}</p>
    <SettingsForm labels={labels} state={state} onSave={props.save} onDiscard={props.discard}><div className={css.list}>
      {state.connections.map(connection => <Connection key={connection.id} {...props} connection={connection} />)}
      {state.connections.length === 0 && <p className={css.description}>{props.t('connectionsEmpty')}</p>}
      <div><Button variant="outline" size="sm" disabled={!state.writable} onClick={props.addConnection}>{props.t('addConnection')}</Button></div>
    </div></SettingsForm>
  </div>
}

function Connection(props: Props & { connection: { id: string; name: string; baseUrl: string; apiKeyRef: string } }) {
  const state = props.useLocalAiSettings(value => value); const [key, setKey] = useState(''); const [saving, setSaving] = useState(false); const { connection } = props; const disabled = !state.writable
  const input = (field: 'name' | 'baseUrl' | 'apiKeyRef', label: string, value: string) => <label className={css.field}><span>{label}</span><input value={value} disabled={disabled} onChange={event => { props.updateConnection(connection.id, field, event.target.value) }} /></label>
  const saveKey = async (): Promise<void> => { setSaving(true); try { if (await props.saveKey(connection.id, key)) setKey('') } finally { setSaving(false) } }
  const configured = state.status[connection.apiKeyRef]?.configured === true
  return <section className={css.card}>{input('name', props.t('name'), connection.name)}{input('baseUrl', props.t('baseUrl'), connection.baseUrl)}{input('apiKeyRef', props.t('keyRef'), connection.apiKeyRef)}<SettingsSecretField id={`localai-${connection.id}`} label={props.t('key')} hint={props.t('keyHint')} text={key} configured={configured} stateLabel={configured ? props.t('keySet') : props.t('keyUnset')} disabled={disabled || saving || connection.apiKeyRef.trim() === ''} onEdit={setKey} /><div className={css.actions}><Button variant="outline" size="sm" disabled={disabled || saving || key.trim() === ''} onClick={() => { void saveKey() }}>{saving ? props.t('saving') : props.t('saveKey')}</Button><Button variant="outline" size="sm" disabled={disabled} onClick={() => { props.removeConnection(connection.id) }}>{props.t('remove')}</Button></div></section>
}
