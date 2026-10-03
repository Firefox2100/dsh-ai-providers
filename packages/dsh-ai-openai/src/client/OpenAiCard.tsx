import { SettingsForm, SettingsSecretField, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from 'dsh-ai-core/slots'
import type { OpenAiCardFace } from './controller.ts'
import { formLabels } from './locales.ts'

export type OpenAiCardProps =
  PropsRuntime<'ai.provider'>
  & PropsLocale<'ai.openai'>
  & InjectFace<OpenAiCardFace>

/** The configuration of the OpenAI-compatible provider: where to connect, with which key, and which model. */
export function OpenAiCard(props: OpenAiCardProps) {
  const { t } = props
  const state = props.useOpenAiCard(snapshot => snapshot)
  const disabled = !state.writable
  const common = { overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidNumber'), disabled }
  return (
    <div data-testid="ai-openai">
      <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500 }}>{t('title')}</h3>
      <p style={{ margin: '0 0 12px', fontSize: 12 }}>{t('description')}</p>
      <SettingsForm labels={formLabels(t)} state={state} onSave={props.save} onDiscard={props.discard}>
        <SettingsValueField id="ai-openai-base-url" label={t('baseUrl')} hint={t('baseUrlHint')} {...common} {...state.baseUrl} onEdit={(text) => { props.edit('baseUrl', text) }} onReset={() => { props.resetField('baseUrl') }} />
        <SettingsValueField id="ai-openai-key-name" label={t('apiKeyEnv')} hint={t('apiKeyEnvHint')} {...common} {...state.apiKeyEnv} onEdit={(text) => { props.edit('apiKeyEnv', text) }} onReset={() => { props.resetField('apiKeyEnv') }} />
        <SettingsSecretField
          id="ai-openai-key"
          label={t('apiKey')}
          hint={t('apiKeyHint')}
          disabled={!state.apiKeyWritable}
          text={state.apiKey.text}
          configured={state.apiKeyConfigured}
          stateLabel={state.apiKeyConfigured ? t('apiKeySet') : t('apiKeyUnset')}
          onEdit={(text) => { props.edit('apiKey', text) }}
        />
        <SettingsValueField id="ai-openai-model" label={t('embeddingModel')} hint={t('embeddingModelHint')} {...common} {...state.embeddingModel} onEdit={(text) => { props.edit('embeddingModel', text) }} onReset={() => { props.resetField('embeddingModel') }} />
        <SettingsValueField id="ai-openai-dimensions" label={t('embeddingDimensions')} hint={t('embeddingDimensionsHint')} numeric {...common} {...state.embeddingDimensions} onEdit={(text) => { props.edit('embeddingDimensions', text) }} onReset={() => { props.resetField('embeddingDimensions') }} />
        <SettingsValueField id="ai-openai-batch" label={t('batchSize')} hint={t('batchSizeHint')} numeric {...common} {...state.batchSize} onEdit={(text) => { props.edit('batchSize', text) }} onReset={() => { props.resetField('batchSize') }} />
        <SettingsValueField id="ai-openai-timeout" label={t('timeoutMs')} hint={t('timeoutMsHint')} numeric {...common} {...state.timeoutMs} onEdit={(text) => { props.edit('timeoutMs', text) }} onReset={() => { props.resetField('timeoutMs') }} />
      </SettingsForm>
    </div>
  )
}
