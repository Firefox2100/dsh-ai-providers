import { SettingsForm, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { Face, FieldKey } from './controller.ts'
import css from './Card.module.css'

type Capability = 'embedding' | 'rerank' | 'tts' | 'stt' | 'image' | 'decision'
type Props = PropsRuntime<'ai.provider.embedding'> & PropsLocale<'ai.localai'> & InjectFace<Face>
type T = Props['t']

const CONNECTION_FIELD: Record<Capability, FieldKey> = {
  embedding: 'embeddingConnection', rerank: 'rerankConnection', tts: 'ttsConnection', stt: 'sttConnection', image: 'imageConnection', decision: 'decisionConnection',
}
const SERVICE_FIELDS: Record<Capability, readonly [FieldKey, string, boolean?][]> = {
  embedding: [['embeddingModel', 'embeddingModel'], ['embeddingDimensions', 'embeddingDimensions', true], ['batchSize', 'batchSize', true], ['embeddingBody', 'requestBody']],
  rerank: [['rerankModel', 'rerankModel'], ['rerankBody', 'requestBody']],
  decision: [['decisionModel', 'decisionModel'], ['decisionBody', 'requestBody']],
  tts: [['ttsModel', 'ttsModel'], ['ttsVoice', 'ttsVoice'], ['ttsResponseFormat', 'ttsResponseFormat'], ['ttsSpeed', 'ttsSpeed', true], ['ttsBody', 'requestBody']],
  stt: [['sttModel', 'sttModel'], ['sttRealtimeModel', 'sttRealtimeModel']],
  image: [['imageModel', 'imageModel'], ['imageSize', 'imageSize'], ['imageQuality', 'imageQuality'], ['imageOutputFormat', 'imageOutputFormat'], ['imageOutputCompression', 'imageOutputCompression', true], ['imageReferences', 'imageReferences'], ['imageHighresScale', 'imageHighresScale', true], ['imageHighresSteps', 'imageHighresSteps', true], ['imageBody', 'requestBody']],
}

const labels = (t: T) => ({ unavailable: t('unavailable'), readOnly: t('readOnly'), saveFailed: t('saveFailed'), save: t('save'), saving: t('saving') })

export function Card(props: Props) {
  const { t, capability } = props
  const kind = capability as Capability
  const state = props.useLocalAiSettings(value => value)
  const disabled = !state.writable
  const connectionField = CONNECTION_FIELD[kind]
  const common = { overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidNumber'), disabled }
  return <div data-testid="ai-localai" className={css.card}>
    <h3 className={css.title}>{t('title')}</h3><p className={css.text}>{t('description')}</p>
    <SettingsForm labels={labels(t)} state={state} onSave={props.save} onDiscard={props.discard}>
      <label className={css.field}><span>{t('connection')}</span><select value={state.fields[connectionField].text} disabled={disabled} onChange={event => { props.edit(connectionField, event.target.value) }}><option value="">{t('connectionNone')}</option>{state.connections.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><small>{t('connectionHint')}</small></label>
      {SERVICE_FIELDS[kind].map(([field, label, numeric]) => field.endsWith('Body')
        ? <label className={css.field} key={field}><span>{t(label as never)}</span><textarea rows={5} value={state.fields[field].text} disabled={disabled} aria-invalid={state.fields[field].invalid} onChange={event => { props.edit(field, event.target.value) }} /><small>{t('requestBodyHint')}</small></label>
        : <SettingsValueField key={field} id={`ai-localai-${field}`} label={t(label as never)} {...numeric === true ? { numeric: true } : {}} {...common} {...state.fields[field]} onEdit={text => { props.edit(field, text) }} onReset={() => { props.resetField(field) }} />)}
      <SettingsValueField id="ai-localai-timeout" label={t('timeoutMs')} numeric {...common} {...state.fields.timeoutMs} onEdit={text => { props.edit('timeoutMs', text) }} onReset={() => { props.resetField('timeoutMs') }} />
    </SettingsForm>
  </div>
}

export function LlmCard(props: PropsLocale<'ai.localai'> & PropsRuntime<'ai.provider.llm'> & InjectFace<Face>) {
  const state = props.useLocalAiSettings(value => value)
  const disabled = !state.writable
  const common = { overriddenLabel: props.t('overridden'), resetLabel: props.t('reset'), invalidLabel: props.t('invalidNumber'), disabled }
  return <div data-testid="ai-localai-llm" className={css.card}>
    <h3 className={css.title}>{props.t('title')}</h3><p className={css.text}>{props.t('llmDescription')}</p>
    <SettingsForm labels={labels(props.t)} state={state} onSave={props.save} onDiscard={props.discard}>
      <label className={css.field}><span>{props.t('llmRoutes')}</span><textarea rows={12} value={state.llmRoutesField.text} disabled={disabled} aria-invalid={state.llmRoutesField.invalid} onChange={event => { props.edit('llmRoutes', event.target.value) }} /><small>{props.t('llmRoutesHint')}</small></label>
      <SettingsValueField id="ai-localai-idle" label={props.t('llmIdleTimeoutMs')} numeric {...common} {...state.fields.llmIdleTimeoutMs} onEdit={text => { props.edit('llmIdleTimeoutMs', text) }} onReset={() => { props.resetField('llmIdleTimeoutMs') }} />
    </SettingsForm>
  </div>
}
