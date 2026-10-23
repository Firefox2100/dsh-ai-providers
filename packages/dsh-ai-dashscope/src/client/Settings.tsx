import { useEffect, useState, type ReactNode } from 'react'
import { Button, SettingsForm, SettingsSecretField, SettingsValueField, type SettingsFieldState } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { AI_API_PREFIX, AI_API_ROUTES, type LlmDiscoverPayload } from '@dsh-ai-providers/core'
import type { DashScopeLlmModelConfig, DashScopeLlmRouteConfig } from '../config.ts'
import { PROVIDER_ID } from '../ids.ts'
import type { Face, State } from './controller.ts'
import { formLabels, type Key } from './locales.ts'
import css from './Settings.module.css'

type P = PropsLocale<'ai.dashscope'> & InjectFace<Face>

type ConnectionProps = P & PropsRuntime<'ai.provider.connection'>

export function Connections(props: ConnectionProps) {
  const state = props.useDashscope(value => value)
  return (
    <div className={css.section} data-testid="ai-dashscope-connections">
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
  const state = props.useDashscope(value => value)
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
      <SettingsSecretField id={`dashscope-${connection.id}`} label={props.t('key')} hint={props.t('keyRef')} text={key}
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
function adopted(found: Found): DashScopeLlmModelConfig {
  return {
    id: found.id,
    name: found.name,
    ...found.contextWindow === undefined ? {} : { contextWindow: found.contextWindow },
    ...found.maxTokens === undefined ? {} : { maxTokens: found.maxTokens },
    ...found.inputs?.includes('image') === true ? { vision: true } : {},
    ...found.reasoning === undefined ? {} : { reasoningLevels: found.reasoning.levels, ...found.reasoning.default === undefined ? {} : { defaultReasoning: found.reasoning.default } },
  }
}

function RouteCard({ route, state, props }: { route: DashScopeLlmRouteConfig; state: State; props: P }) {
  const { t } = props
  const [json, setJson] = useState(() => JSON.stringify(route, null, 2))
  const [invalid, setInvalid] = useState(false)
  const [found, setFound] = useState<Found[] | undefined>()
  const [problem, setProblem] = useState<string | undefined>()
  const [discovering, setDiscovering] = useState(false)
  useEffect(() => { setJson(JSON.stringify(route, null, 2)); setInvalid(false) }, [route])
  const disabled = !state.writable
  const update = (next: DashScopeLlmRouteConfig): void => { props.updateRoute(route.id, next) }
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
    <section className={css.card} data-testid={`ai-dashscope-route-${route.id}`}>
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
        <textarea value={json} disabled={disabled} aria-invalid={invalid} aria-describedby={`dashscope-route-${route.id}-hint`}
          onChange={(event) => { setJson(event.target.value); setInvalid(false) }}
          onBlur={() => {
            try {
              const value = JSON.parse(json) as DashScopeLlmRouteConfig
              if (value.id !== route.id) throw new Error('route id changed')
              setInvalid(false)
              update(value)
            } catch { setInvalid(true) }
          }} />
        <small id={`dashscope-route-${route.id}-hint`}>{t('advancedHint')}</small>
        {invalid && <small className={css.error} role="alert">{t('invalidJson')}</small>}
      </label>
      <div className={css.actions}><Button variant="outline" size="sm" disabled={disabled} onClick={() => { props.removeRoute(route.id) }}>{t('remove')}</Button></div>
    </section>
  )
}

export function LlmSettings(props: P & PropsRuntime<'ai.provider.llm'>) {
  const { t } = props
  const state = props.useDashscope(value => value)
  const common = { overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidNumber'), disabled: !state.writable }
  return (
    <div className={css.section} data-testid="ai-dashscope-llm">
      <h3 className={css.providerTitle}>{t('llmTitle')}</h3>
      <p className={css.providerDescription}>{t('llmDescription')}</p>
      <SettingsForm labels={formLabels(t)} state={state} onSave={props.save} onDiscard={props.discard}>
        <div className={css.list}>
          <SettingsValueField id="dashscope-idle" numeric label={t('idle')} hint={t('idleHint')} {...common} {...state.llmIdleTimeoutMs} onEdit={(value) => { props.edit('llmIdleTimeoutMs', value) }} onReset={() => { props.resetField('llmIdleTimeoutMs') }} />
          {state.routes.map(route => <RouteCard key={route.id} route={route} state={state} props={props} />)}
          {state.routes.length === 0 && <p className={css.empty}>{t('empty')}</p>}
          <div><Button variant="outline" size="sm" disabled={!state.writable} onClick={props.addRoute}>{t('addRoute')}</Button></div>
        </div>
      </SettingsForm>
    </div>
  )
}

type FieldName = 'rerankConnection' | 'embeddingConnection' | 'ttsConnection' | 'sttConnection' | 'imageConnection'
type Text = (key: Key) => string

function ConnectionSelect({ field, state, props }: { field: FieldName; state: State; props: P }) {
  return (
    <label className={css.field}>
      <span>{props.t('connection')}</span>
      <select value={state[field].text} disabled={!state.writable} onChange={(event) => { props.edit(field, event.target.value) }}>
        <option value="">{props.t('connectionNone')}</option>
        {state.connections.map(connection => <option key={connection.id} value={connection.id}>{connection.name}</option>)}
      </select>
      <small>{props.t('connectionHint')}</small>
    </label>
  )
}

function Choice({ field, state, props, label, hint, options }: { field: keyof State & string; state: State; props: P; label: string; hint: string; options: [string, string][] }) {
  const current = (state[field] as { text: string }).text
  return (
    <label className={css.field}>
      <span>{label}</span>
      <select value={current} disabled={!state.writable} onChange={(event) => { props.edit(field, event.target.value) }}>
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
      <small>{hint}</small>
    </label>
  )
}

const onOff = (t: Text): [string, string][] => [['true', t('optionOn')], ['false', t('optionOff')]]

function useCommon(props: P, state: State) {
  return { overriddenLabel: props.t('overridden'), resetLabel: props.t('reset'), invalidLabel: props.t('invalidNumber'), disabled: !state.writable }
}

function Card({ id, title, description, props, state, children }: { id: string; title: string; description: string; props: P; state: State; children: ReactNode }) {
  return (
    <div className={css.section} data-testid={`ai-dashscope-${id}`}>
      <h3 className={css.providerTitle}>{title}</h3>
      <p className={css.providerDescription}>{description}</p>
      <SettingsForm labels={formLabels(props.t)} state={state} onSave={props.save} onDiscard={props.discard}>
        <div className={css.list}>{children}</div>
      </SettingsForm>
    </div>
  )
}

function Text({ id, field, label, hint, state, props, numeric }: { id: string; field: keyof State & string; label: string; hint: string; state: State; props: P; numeric?: boolean }) {
  const common = useCommon(props, state)
  const value = state[field] as unknown as SettingsFieldState
  return <SettingsValueField id={`dashscope-${id}`} {...numeric === true ? { numeric: true } : {}} label={label} hint={hint} {...common} {...value} onEdit={(next) => { props.edit(field, next) }} onReset={() => { props.resetField(field) }} />
}

export function EmbeddingSettings(props: P & PropsRuntime<'ai.provider.embedding'>) {
  const { t } = props
  const state = props.useDashscope(value => value)
  return (
    <Card id="embedding" title={t('embeddingTitle')} description={t('embeddingDescription')} props={props} state={state}>
      <ConnectionSelect field="embeddingConnection" state={state} props={props} />
      <Text id="embedding-model" field="embeddingModel" label={t('embeddingModel')} hint={t('embeddingModelHint')} state={state} props={props} />
      <Choice field="embeddingEndpoint" state={state} props={props} label={t('embeddingEndpoint')} hint={t('embeddingEndpointHint')} options={[['text', t('endpointText')], ['multimodal', t('endpointMultimodal')]]} />
      <Text id="embedding-dimensions" field="embeddingDimensions" numeric label={t('embeddingDimensions')} hint={t('embeddingDimensionsHint')} state={state} props={props} />
      <Text id="embedding-instruct" field="embeddingInstruct" label={t('embeddingInstruct')} hint={t('embeddingInstructHint')} state={state} props={props} />
      <Text id="batch" field="batchSize" numeric label={t('batchSize')} hint={t('batchSizeHint')} state={state} props={props} />
      <Text id="timeout" field="timeoutMs" numeric label={t('timeoutMs')} hint={t('timeoutMsHint')} state={state} props={props} />
    </Card>
  )
}

export function RerankSettings(props: P & PropsRuntime<'ai.provider.rerank'>) {
  const { t } = props
  const state = props.useDashscope(value => value)
  return (
    <Card id="rerank" title={t('rerankTitle')} description={t('rerankDescription')} props={props} state={state}>
      <ConnectionSelect field="rerankConnection" state={state} props={props} />
      <Text id="rerank-model" field="rerankModel" label={t('rerankModel')} hint={t('rerankModelHint')} state={state} props={props} />
      <Text id="rerank-instruct" field="rerankInstruct" label={t('rerankInstruct')} hint={t('rerankInstructHint')} state={state} props={props} />
      <Text id="rerank-timeout" field="timeoutMs" numeric label={t('timeoutMs')} hint={t('timeoutMsHint')} state={state} props={props} />
    </Card>
  )
}

export function TtsSettings(props: P & PropsRuntime<'ai.provider.tts'>) {
  const { t } = props
  const state = props.useDashscope(value => value)
  return (
    <Card id="tts" title={t('ttsTitle')} description={t('ttsDescription')} props={props} state={state}>
      <ConnectionSelect field="ttsConnection" state={state} props={props} />
      <Text id="tts-model" field="ttsModel" label={t('ttsModel')} hint={t('ttsModelHint')} state={state} props={props} />
      <Text id="tts-voice" field="ttsVoice" label={t('ttsVoice')} hint={t('ttsVoiceHint')} state={state} props={props} />
      <Text id="tts-language" field="ttsLanguage" label={t('ttsLanguage')} hint={t('ttsLanguageHint')} state={state} props={props} />
      <Choice field="ttsFormat" state={state} props={props} label={t('ttsFormat')} hint={t('ttsFormatHint')} options={[['mp3', 'MP3'], ['wav', 'WAV'], ['pcm', 'PCM'], ['opus', 'Opus']]} />
      <Text id="tts-timeout" field="timeoutMs" numeric label={t('timeoutMs')} hint={t('timeoutMsHint')} state={state} props={props} />
    </Card>
  )
}

export function SttSettings(props: P & PropsRuntime<'ai.provider.stt'>) {
  const { t } = props
  const state = props.useDashscope(value => value)
  return (
    <Card id="stt" title={t('sttTitle')} description={t('sttDescription')} props={props} state={state}>
      <ConnectionSelect field="sttConnection" state={state} props={props} />
      <Text id="stt-model" field="sttModel" label={t('sttModel')} hint={t('sttModelHint')} state={state} props={props} />
      <Choice field="sttEnableItn" state={state} props={props} label={t('sttEnableItn')} hint={t('sttEnableItnHint')} options={onOff(t)} />
      <Text id="stt-timeout" field="timeoutMs" numeric label={t('timeoutMs')} hint={t('timeoutMsHint')} state={state} props={props} />
    </Card>
  )
}

export function ImageSettings(props: P & PropsRuntime<'ai.provider.image'>) {
  const { t } = props
  const state = props.useDashscope(value => value)
  return (
    <Card id="image" title={t('imageTitle')} description={t('imageDescription')} props={props} state={state}>
      <ConnectionSelect field="imageConnection" state={state} props={props} />
      <Text id="image-model" field="imageModel" label={t('imageModel')} hint={t('imageModelHint')} state={state} props={props} />
      <Text id="image-size" field="imageSize" label={t('imageSize')} hint={t('imageSizeHint')} state={state} props={props} />
      <Choice field="imagePromptExtend" state={state} props={props} label={t('imagePromptExtend')} hint={t('imagePromptExtendHint')} options={onOff(t)} />
      <Choice field="imageWatermark" state={state} props={props} label={t('imageWatermark')} hint={t('imageWatermarkHint')} options={onOff(t)} />
      <Text id="image-timeout" field="timeoutMs" numeric label={t('timeoutMs')} hint={t('timeoutMsHint')} state={state} props={props} />
    </Card>
  )
}
