import { SettingsForm, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from 'dsh-ai-core/slots'
import type { OpenAiCardFace } from './controller.ts'
import { formLabels } from './locales.ts'

export type OpenAiCardProps =
  PropsRuntime<'ai.provider.embedding'>
  & PropsLocale<'ai.openai'>
  & InjectFace<OpenAiCardFace>

/** The shared connection settings and the fields relevant to the capability being configured. */
export function OpenAiCard(props: OpenAiCardProps) {
  const { t } = props
  const state = props.useOpenAiCard(snapshot => snapshot)
  const disabled = !state.writable
  const common = { overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidNumber'), disabled }
  const connection = state[`${props.capability}Connection` as 'embeddingConnection' | 'ttsConnection' | 'sttConnection' | 'imageConnection']
  return (
    <div data-testid="ai-openai">
      <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500 }}>{t('title')}</h3>
      <p style={{ margin: '0 0 12px', fontSize: 12 }}>{t('description')}</p>
      <SettingsForm labels={formLabels(t)} state={state} onSave={props.save} onDiscard={props.discard}>
        <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
          <span>{t('connection')}</span>
          <select value={connection.text} disabled={disabled} onChange={event => { props.edit(`${props.capability}Connection`, event.target.value) }}>
            <option value="">{t('connectionNone')}</option>
            {state.connections.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <small>{t('connectionHint')}</small>
        </label>
        {props.capability === 'embedding' && <>
          <SettingsValueField id="ai-openai-model" label={t('embeddingModel')} hint={t('embeddingModelHint')} {...common} {...state.embeddingModel} onEdit={(text) => { props.edit('embeddingModel', text) }} onReset={() => { props.resetField('embeddingModel') }} />
          <SettingsValueField id="ai-openai-dimensions" label={t('embeddingDimensions')} hint={t('embeddingDimensionsHint')} numeric {...common} {...state.embeddingDimensions} onEdit={(text) => { props.edit('embeddingDimensions', text) }} onReset={() => { props.resetField('embeddingDimensions') }} />
          <SettingsValueField id="ai-openai-batch" label={t('batchSize')} hint={t('batchSizeHint')} numeric {...common} {...state.batchSize} onEdit={(text) => { props.edit('batchSize', text) }} onReset={() => { props.resetField('batchSize') }} />
        </>}
        {props.capability === 'tts' && <>
          <SettingsValueField id="ai-openai-tts-model" label={t('ttsModel')} hint={t('ttsModelHint')} {...common} {...state.ttsModel} onEdit={(text) => { props.edit('ttsModel', text) }} onReset={() => { props.resetField('ttsModel') }} />
          <SettingsValueField id="ai-openai-tts-voice" label={t('ttsVoice')} hint={t('ttsVoiceHint')} {...common} {...state.ttsVoice} onEdit={(text) => { props.edit('ttsVoice', text) }} onReset={() => { props.resetField('ttsVoice') }} />
          <SettingsValueField id="ai-openai-tts-format" label={t('ttsResponseFormat')} hint={t('ttsResponseFormatHint')} {...common} {...state.ttsResponseFormat} onEdit={(text) => { props.edit('ttsResponseFormat', text) }} onReset={() => { props.resetField('ttsResponseFormat') }} />
          <SettingsValueField id="ai-openai-tts-speed" label={t('ttsSpeed')} hint={t('ttsSpeedHint')} numeric {...common} {...state.ttsSpeed} onEdit={(text) => { props.edit('ttsSpeed', text) }} onReset={() => { props.resetField('ttsSpeed') }} />
        </>}
        {props.capability === 'stt' && <>
          <SettingsValueField id="ai-openai-stt-model" label={t('sttModel')} hint={t('sttModelHint')} {...common} {...state.sttModel} onEdit={(text) => { props.edit('sttModel', text) }} onReset={() => { props.resetField('sttModel') }} />
          <SettingsValueField id="ai-openai-stt-realtime-model" label={t('sttRealtimeModel')} hint={t('sttRealtimeModelHint')} {...common} {...state.sttRealtimeModel} onEdit={(text) => { props.edit('sttRealtimeModel', text) }} onReset={() => { props.resetField('sttRealtimeModel') }} />
        </>}
        {props.capability === 'image' && <>
          <SettingsValueField id="ai-openai-image-model" label={t('imageModel')} hint={t('imageModelHint')} {...common} {...state.imageModel} onEdit={(text) => { props.edit('imageModel', text) }} onReset={() => { props.resetField('imageModel') }} />
          <SettingsValueField id="ai-openai-image-size" label={t('imageSize')} hint={t('imageSizeHint')} {...common} {...state.imageSize} onEdit={(text) => { props.edit('imageSize', text) }} onReset={() => { props.resetField('imageSize') }} />
          <SettingsValueField id="ai-openai-image-quality" label={t('imageQuality')} hint={t('imageQualityHint')} {...common} {...state.imageQuality} onEdit={(text) => { props.edit('imageQuality', text) }} onReset={() => { props.resetField('imageQuality') }} />
          <SettingsValueField id="ai-openai-image-format" label={t('imageOutputFormat')} hint={t('imageOutputFormatHint')} {...common} {...state.imageOutputFormat} onEdit={(text) => { props.edit('imageOutputFormat', text) }} onReset={() => { props.resetField('imageOutputFormat') }} />
          <SettingsValueField id="ai-openai-image-compression" label={t('imageOutputCompression')} hint={t('imageOutputCompressionHint')} numeric {...common} {...state.imageOutputCompression} onEdit={(text) => { props.edit('imageOutputCompression', text) }} onReset={() => { props.resetField('imageOutputCompression') }} />
        </>}
        <SettingsValueField id="ai-openai-timeout" label={t('timeoutMs')} hint={t('timeoutMsHint')} numeric {...common} {...state.timeoutMs} onEdit={(text) => { props.edit('timeoutMs', text) }} onReset={() => { props.resetField('timeoutMs') }} />
      </SettingsForm>
    </div>
  )
}
