import { useEffect, useState } from 'react'
import { Button, SettingsForm, SettingsSecretField, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { AnthropicLlmRouteConfig } from '../config.ts'
import type { Face, State } from './controller.ts'
import { formLabels } from './locales.ts'
import css from './Settings.module.css'

type P = PropsLocale<'ai.anthropic'> & InjectFace<Face>
type Route = AnthropicLlmRouteConfig

type ConnectionProps = P & PropsRuntime<'ai.provider.connection'>

export function Connections(props: ConnectionProps) {
  const state = props.useAnthropic(value => value)
  return <div className={css.section} data-testid="ai-anthropic-connections">
    <h3 className={css.providerTitle}>{props.t('connectionsTitle')}</h3>
    <p className={css.description}>{props.t('connectionsDescription')}</p>
    <SettingsForm labels={formLabels(props.t)} state={state} onSave={props.save} onDiscard={props.discard}>
      <div className={css.list}>
        {state.connections.map(connection => <Connection key={connection.id} {...props} connection={connection} />)}
        {state.connections.length === 0 && <p className={css.empty}>{props.t('empty')}</p>}
        <div><Button variant="outline" size="sm" disabled={!state.writable} onClick={props.addConnection}>{props.t('addConnection')}</Button></div>
      </div>
    </SettingsForm>
  </div>
}

function Connection(props: P & { connection: { id: string; name: string; baseUrl: string; apiKeyRef: string } }) {
  const state = props.useAnthropic(value => value)
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  const connection = props.connection
  const disabled = !state.writable
  const input = (field: 'name' | 'baseUrl' | 'apiKeyRef', label: string, value: string) => <label className={css.field}>
    <span>{label}</span>
    <input value={value} disabled={disabled} onChange={event => { props.updateConnection(connection.id, field, event.target.value) }} />
  </label>
  const saveKey = async (): Promise<void> => {
    setSaving(true)
    try { if (await props.saveKey(connection.id, key)) setKey('') }
    finally { setSaving(false) }
  }
  return <section className={css.card}>
    {input('name', props.t('name'), connection.name)}
    {input('baseUrl', props.t('baseUrl'), connection.baseUrl)}
    {input('apiKeyRef', props.t('keyRef'), connection.apiKeyRef)}
    <SettingsSecretField id={`anthropic-${connection.id}`} label={props.t('key')} hint={props.t('keyRef')} text={key}
      configured={state.status[connection.apiKeyRef]?.configured === true}
      stateLabel={state.status[connection.apiKeyRef]?.configured === true ? props.t('keySet') : props.t('keyUnset')}
      disabled={disabled || saving || connection.apiKeyRef.trim() === ''} onEdit={setKey} />
    <div className={css.actions}>
      <Button variant="outline" size="sm" disabled={disabled || saving || key.trim() === ''} onClick={() => { void saveKey() }}>{saving ? props.t('saving') : props.t('saveKey')}</Button>
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => { props.removeConnection(connection.id) }}>{props.t('remove')}</Button>
    </div>
  </section>
}

function RouteCard({ route, state, props }: { route: Route; state: State; props: P }) {
  const [json, setJson] = useState(() => JSON.stringify(route, null, 2))
  const [invalid, setInvalid] = useState(false)
  useEffect(() => { setJson(JSON.stringify(route, null, 2)); setInvalid(false) }, [route])
  const update = (next: Route): void => { props.updateRoute(route.id, next) }
  return <section className={css.card}>
    <div className={css.grid}>
      <label className={css.field}><span>{props.t('name')}</span><input value={route.name} disabled={!state.writable} onChange={event => { update({ ...route, name: event.target.value }) }} /></label>
      <label className={css.field}><span>{props.t('routeId')}</span><input value={route.id} disabled={!state.writable} onChange={event => { update({ ...route, id: event.target.value }) }} /></label>
      <label className={css.field}><span>{props.t('connection')}</span><select value={route.connection} disabled={!state.writable} onChange={event => { update({ ...route, connection: event.target.value }) }}>{state.connections.map(connection => <option key={connection.id} value={connection.id}>{connection.name}</option>)}</select></label>
      <label className={css.field}><span>{props.t('models')}</span><input value={route.models.map(model => model.id).join(', ')} disabled={!state.writable} placeholder={props.t('modelsHint')} onChange={event => { const models = event.target.value.split(',').map(value => value.trim()).filter(Boolean).map(id => route.models.find(model => model.id === id) ?? { id, name: id, vision: true }); update({ ...route, models }) }} /></label>
    </div>
    <label className={css.field}>
      <span>{props.t('advanced')}</span>
      <textarea value={json} disabled={!state.writable} aria-invalid={invalid} aria-describedby={`anthropic-route-${route.id}-hint`} onChange={event => { setJson(event.target.value); setInvalid(false) }} onBlur={() => { try { const value = JSON.parse(json) as Route; if (value.id !== route.id) throw new Error('route id changed'); setInvalid(false); update(value) } catch { setInvalid(true) } }} />
      <small id={`anthropic-route-${route.id}-hint`}>{props.t('advancedHint')}</small>
      {invalid && <small className={css.error} role="alert">{props.t('invalidJson')}</small>}
    </label>
    <div className={css.actions}><Button variant="outline" size="sm" disabled={!state.writable} onClick={() => { props.removeRoute(route.id) }}>{props.t('remove')}</Button></div>
  </section>
}

export function LlmSettings(props: P & PropsRuntime<'ai.provider.llm'>) {
  const state = props.useAnthropic(value => value)
  const common = { overriddenLabel: props.t('overridden'), resetLabel: props.t('reset'), invalidLabel: props.t('invalidNumber'), disabled: !state.writable }
  return <div className={css.section} data-testid="ai-anthropic-llm">
    <h3 className={css.providerTitle}>{props.t('llmTitle')}</h3>
    <p className={css.providerDescription}>{props.t('llmDescription')}</p>
    <SettingsForm labels={formLabels(props.t)} state={state} onSave={props.save} onDiscard={props.discard}>
      <div className={css.list}>
        <SettingsValueField id="anthropic-version" label={props.t('version')} {...common} {...state.anthropicVersion} onEdit={value => { props.edit('anthropicVersion', value) }} onReset={() => { props.resetField('anthropicVersion') }} />
        <SettingsValueField id="anthropic-idle" numeric label={props.t('idle')} {...common} {...state.llmIdleTimeoutMs} onEdit={value => { props.edit('llmIdleTimeoutMs', value) }} onReset={() => { props.resetField('llmIdleTimeoutMs') }} />
        {state.routes.map(route => <RouteCard key={route.id} route={route} state={state} props={props} />)}
        {state.routes.length === 0 && <p className={css.empty}>{props.t('empty')}</p>}
        <div><Button variant="outline" size="sm" disabled={!state.writable} onClick={props.addRoute}>{props.t('addRoute')}</Button></div>
      </div>
    </SettingsForm>
  </div>
}
