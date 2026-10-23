import { useEffect, useState } from 'react'
import { Button, SettingsForm, SettingsSecretField, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { AI_API_PREFIX, AI_API_ROUTES, type LlmDiscoverPayload } from '@dsh-ai-providers/core'
import type { CohereLlmModelConfig, CohereLlmRouteConfig } from '../config.ts'
import { PROVIDER_ID } from '../ids.ts'
import type { Face, State } from './controller.ts'
import { formLabels } from './locales.ts'
import css from './Settings.module.css'

type P = PropsLocale<'ai.cohere'> & InjectFace<Face>

type ConnectionProps = P & PropsRuntime<'ai.provider.connection'>

export function Connections(props: ConnectionProps) {
  const state = props.useCohere(value => value)
  return (
    <div className={css.section} data-testid="ai-cohere-connections">
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
  )
}

function Connection(props: P & { connection: { id: string; name: string; baseUrl: string; apiKeyRef: string } }) {
  const state = props.useCohere(value => value)
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  const { connection } = props
  const disabled = !state.writable
  const input = (field: 'name' | 'baseUrl' | 'apiKeyRef', label: string, value: string) => (
    <label className={css.field}>
      <span>{label}</span>
      <input value={value} disabled={disabled} onChange={(event) => { props.updateConnection(connection.id, field, event.target.value) }} />
    </label>
  )
  const saveKey = async (): Promise<void> => {
    setSaving(true)
    try { if (await props.saveKey(connection.id, key)) setKey('') } finally { setSaving(false) }
  }
  const configured = state.status[connection.apiKeyRef]?.configured === true
  return (
    <section className={css.card}>
      {input('name', props.t('name'), connection.name)}
      {input('baseUrl', props.t('baseUrl'), connection.baseUrl)}
      {input('apiKeyRef', props.t('keyRef'), connection.apiKeyRef)}
      <SettingsSecretField id={`cohere-${connection.id}`} label={props.t('key')} hint={props.t('keyRef')} text={key}
        configured={configured} stateLabel={configured ? props.t('keySet') : props.t('keyUnset')}
        disabled={disabled || saving || connection.apiKeyRef.trim() === ''} onEdit={setKey} />
      <div className={css.actions}>
        <Button variant="outline" size="sm" disabled={disabled || saving || key.trim() === ''} onClick={() => { void saveKey() }}>{saving ? props.t('saving') : props.t('saveKey')}</Button>
        <Button variant="outline" size="sm" disabled={disabled} onClick={() => { props.removeConnection(connection.id) }}>{props.t('remove')}</Button>
      </div>
    </section>
  )
}

type Found = LlmDiscoverPayload['models'][number]

/** A model as the route stores it, keeping what the server said it can do. */
function adopted(found: Found): CohereLlmModelConfig {
  return {
    id: found.id,
    name: found.name,
    ...found.contextWindow === undefined ? {} : { contextWindow: found.contextWindow },
    ...found.maxTokens === undefined ? {} : { maxTokens: found.maxTokens },
    ...found.inputs?.includes('image') === true ? { vision: true } : {},
    ...found.reasoning === undefined ? {} : { reasoningLevels: found.reasoning.levels, ...found.reasoning.default === undefined ? {} : { defaultReasoning: found.reasoning.default } },
  }
}

function RouteCard({ route, state, props }: { route: CohereLlmRouteConfig; state: State; props: P }) {
  const { t } = props
  const [json, setJson] = useState(() => JSON.stringify(route, null, 2))
  const [invalid, setInvalid] = useState(false)
  const [found, setFound] = useState<Found[] | undefined>()
  const [problem, setProblem] = useState<string | undefined>()
  const [discovering, setDiscovering] = useState(false)
  useEffect(() => { setJson(JSON.stringify(route, null, 2)); setInvalid(false) }, [route])
  const disabled = !state.writable
  const update = (next: CohereLlmRouteConfig): void => { props.updateRoute(route.id, next) }
  const discover = async (): Promise<void> => {
    setDiscovering(true)
    setProblem(undefined)
    try {
      const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.llmDiscover}?provider=${PROVIDER_ID}&route=${encodeURIComponent(route.id)}`, { credentials: 'same-origin' })
      if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as { message?: string }).message ?? `${response.status}`)
      setFound(((await response.json()) as LlmDiscoverPayload).models)
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error))
    } finally { setDiscovering(false) }
  }
  return (
    <section className={css.card} data-testid={`ai-cohere-route-${route.id}`}>
      <div className={css.grid}>
        <label className={css.field}><span>{t('name')}</span><input value={route.name} disabled={disabled} onChange={(event) => { update({ ...route, name: event.target.value }) }} /></label>
        <label className={css.field}><span>{t('routeId')}</span><input value={route.id} disabled={disabled} onChange={(event) => { update({ ...route, id: event.target.value }) }} /></label>
        <label className={css.field}>
          <span>{t('connection')}</span>
          <select value={route.connection} disabled={disabled} onChange={(event) => { update({ ...route, connection: event.target.value }) }}>
            {state.connections.map(connection => <option key={connection.id} value={connection.id}>{connection.name}</option>)}
          </select>
        </label>
        <label className={css.field}>
          <span>{t('models')}</span>
          <input value={route.models.map(model => model.id).join(', ')} disabled={disabled} placeholder={t('modelsHint')}
            onChange={(event) => { update({ ...route, models: event.target.value.split(',').map(value => value.trim()).filter(Boolean).map(id => route.models.find(model => model.id === id) ?? { id, name: id }) }) }} />
        </label>
      </div>
      <div className={css.actions}>
        <Button variant="outline" size="sm" disabled={disabled || discovering} onClick={() => { void discover() }}>{discovering ? t('discovering') : t('discover')}</Button>
      </div>
      {problem !== undefined && <small className={css.error} role="alert">{t('discoverFailed', { message: problem })}</small>}
      {found !== undefined && (
        <div className={css.list}>
          <small>{t('discoverHint')}</small>
          {found.length === 0 && <small>{t('discoverNone')}</small>}
          {found.map((model) => {
            const have = route.models.some(candidate => candidate.id === model.id)
            return (
              <div key={model.id} className={css.actions}>
                <code>{model.id}</code>
                {model.contextWindow !== undefined && <small>{model.contextWindow}</small>}
                <Button variant="outline" size="sm" disabled={disabled || have} onClick={() => { update({ ...route, models: [...route.models, adopted(model)] }) }}>{have ? t('discoverHave') : t('add')}</Button>
              </div>
            )
          })}
        </div>
      )}
      <label className={css.field}>
        <span>{t('advanced')}</span>
        <textarea value={json} disabled={disabled} aria-invalid={invalid} aria-describedby={`cohere-route-${route.id}-hint`}
          onChange={(event) => { setJson(event.target.value); setInvalid(false) }}
          onBlur={() => {
            try {
              const value = JSON.parse(json) as CohereLlmRouteConfig
              if (value.id !== route.id) throw new Error('route id changed')
              setInvalid(false)
              update(value)
            } catch { setInvalid(true) }
          }} />
        <small id={`cohere-route-${route.id}-hint`}>{t('advancedHint')}</small>
        {invalid && <small className={css.error} role="alert">{t('invalidJson')}</small>}
      </label>
      <div className={css.actions}><Button variant="outline" size="sm" disabled={disabled} onClick={() => { props.removeRoute(route.id) }}>{t('remove')}</Button></div>
    </section>
  )
}

export function LlmSettings(props: P & PropsRuntime<'ai.provider.llm'>) {
  const { t } = props
  const state = props.useCohere(value => value)
  const common = { overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidNumber'), disabled: !state.writable }
  return (
    <div className={css.section} data-testid="ai-cohere-llm">
      <h3 className={css.providerTitle}>{t('llmTitle')}</h3>
      <p className={css.providerDescription}>{t('llmDescription')}</p>
      <SettingsForm labels={formLabels(t)} state={state} onSave={props.save} onDiscard={props.discard}>
        <div className={css.list}>
          <SettingsValueField id="cohere-idle" numeric label={t('idle')} hint={t('idleHint')} {...common} {...state.llmIdleTimeoutMs} onEdit={(value) => { props.edit('llmIdleTimeoutMs', value) }} onReset={() => { props.resetField('llmIdleTimeoutMs') }} />
          {state.routes.map(route => <RouteCard key={route.id} route={route} state={state} props={props} />)}
          {state.routes.length === 0 && <p className={css.empty}>{t('empty')}</p>}
          <div><Button variant="outline" size="sm" disabled={!state.writable} onClick={props.addRoute}>{t('addRoute')}</Button></div>
        </div>
      </SettingsForm>
    </div>
  )
}

export function EmbeddingSettings(props: P & PropsRuntime<'ai.provider.embedding'>) {
  const { t } = props
  const state = props.useCohere(value => value)
  const disabled = !state.writable
  const common = { overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidNumber'), disabled }
  return (
    <div className={css.section} data-testid="ai-cohere-embedding">
      <h3 className={css.providerTitle}>{t('embeddingTitle')}</h3>
      <p className={css.providerDescription}>{t('embeddingDescription')}</p>
      <SettingsForm labels={formLabels(t)} state={state} onSave={props.save} onDiscard={props.discard}>
        <div className={css.list}>
          <label className={css.field}>
            <span>{t('connection')}</span>
            <select value={state.embeddingConnection.text} disabled={disabled} onChange={(event) => { props.edit('embeddingConnection', event.target.value) }}>
              <option value="">{t('connectionNone')}</option>
              {state.connections.map(connection => <option key={connection.id} value={connection.id}>{connection.name}</option>)}
            </select>
            <small>{t('connectionHint')}</small>
          </label>
          <SettingsValueField id="cohere-embedding-model" label={t('embeddingModel')} hint={t('embeddingModelHint')} {...common} {...state.embeddingModel} onEdit={(value) => { props.edit('embeddingModel', value) }} onReset={() => { props.resetField('embeddingModel') }} />
          <SettingsValueField id="cohere-embedding-dimensions" numeric label={t('embeddingDimensions')} hint={t('embeddingDimensionsHint')} {...common} {...state.embeddingDimensions} onEdit={(value) => { props.edit('embeddingDimensions', value) }} onReset={() => { props.resetField('embeddingDimensions') }} />
          <label className={css.field}>
            <span>{t('embeddingOverflow')}</span>
            <select value={state.embeddingOverflow.text} disabled={disabled} onChange={(event) => { props.edit('embeddingOverflow', event.target.value) }}>
              <option value="truncate">{t('overflowTruncate')}</option>
              <option value="error">{t('overflowError')}</option>
            </select>
            <small>{t('embeddingOverflowHint')}</small>
          </label>
          <SettingsValueField id="cohere-batch" numeric label={t('batchSize')} hint={t('batchSizeHint')} {...common} {...state.batchSize} onEdit={(value) => { props.edit('batchSize', value) }} onReset={() => { props.resetField('batchSize') }} />
          <SettingsValueField id="cohere-timeout" numeric label={t('timeoutMs')} hint={t('timeoutMsHint')} {...common} {...state.timeoutMs} onEdit={(value) => { props.edit('timeoutMs', value) }} onReset={() => { props.resetField('timeoutMs') }} />
        </div>
      </SettingsForm>
    </div>
  )
}

export function RerankSettings(props: P & PropsRuntime<'ai.provider.rerank'>) {
  const { t } = props
  const state = props.useCohere(value => value)
  const disabled = !state.writable
  const common = { overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidNumber'), disabled }
  return (
    <div className={css.section} data-testid="ai-cohere-rerank">
      <h3 className={css.providerTitle}>{t('rerankTitle')}</h3>
      <p className={css.providerDescription}>{t('rerankDescription')}</p>
      <SettingsForm labels={formLabels(t)} state={state} onSave={props.save} onDiscard={props.discard}>
        <div className={css.list}>
          <label className={css.field}>
            <span>{t('connection')}</span>
            <select value={state.rerankConnection.text} disabled={disabled} onChange={(event) => { props.edit('rerankConnection', event.target.value) }}>
              <option value="">{t('connectionNone')}</option>
              {state.connections.map(connection => <option key={connection.id} value={connection.id}>{connection.name}</option>)}
            </select>
            <small>{t('connectionHint')}</small>
          </label>
          <SettingsValueField id="cohere-rerank-model" label={t('rerankModel')} hint={t('rerankModelHint')} {...common} {...state.rerankModel} onEdit={(value) => { props.edit('rerankModel', value) }} onReset={() => { props.resetField('rerankModel') }} />
          <SettingsValueField id="cohere-rerank-max-tokens" numeric label={t('rerankMaxTokens')} hint={t('rerankMaxTokensHint')} {...common} {...state.rerankMaxTokensPerDoc} onEdit={(value) => { props.edit('rerankMaxTokensPerDoc', value) }} onReset={() => { props.resetField('rerankMaxTokensPerDoc') }} />
          <SettingsValueField id="cohere-rerank-timeout" numeric label={t('timeoutMs')} hint={t('timeoutMsHintRerank')} {...common} {...state.timeoutMs} onEdit={(value) => { props.edit('timeoutMs', value) }} onReset={() => { props.resetField('timeoutMs') }} />
        </div>
      </SettingsForm>
    </div>
  )
}
