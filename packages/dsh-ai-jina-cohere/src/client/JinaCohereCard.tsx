import { SettingsForm, SettingsSecretField, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from 'dsh-ai-core/slots'
import type { JinaCohereCardFace } from './controller.ts'
import { formLabels } from './locales.ts'

export type JinaCohereCardProps =
  PropsRuntime<'ai.provider.rerank'>
  & PropsLocale<'ai.jina-cohere'>
  & InjectFace<JinaCohereCardFace>

/** The configuration of the Jina/Cohere-style rerank provider: where to connect, with which key, and which model. */
export function JinaCohereCard(props: JinaCohereCardProps) {
  const { t } = props
  const state = props.useJinaCohereCard(snapshot => snapshot)
  const disabled = !state.writable
  const common = { overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidNumber'), disabled }
  return (
    <div data-testid="ai-jina-cohere">
      <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500 }}>{t('title')}</h3>
      <p style={{ margin: '0 0 12px', fontSize: 12 }}>{t('description')}</p>
      <SettingsForm labels={formLabels(t)} state={state} onSave={props.save} onDiscard={props.discard}>
        <SettingsValueField id="ai-jina-cohere-base-url" label={t('baseUrl')} hint={t('baseUrlHint')} {...common} {...state.baseUrl} onEdit={(text) => { props.edit('baseUrl', text) }} onReset={() => { props.resetField('baseUrl') }} />
        <SettingsValueField id="ai-jina-cohere-key-name" label={t('apiKeyEnv')} hint={t('apiKeyEnvHint')} {...common} {...state.apiKeyEnv} onEdit={(text) => { props.edit('apiKeyEnv', text) }} onReset={() => { props.resetField('apiKeyEnv') }} />
        <SettingsSecretField
          id="ai-jina-cohere-key"
          label={t('apiKey')}
          hint={t('apiKeyHint')}
          disabled={!state.apiKeyWritable}
          text={state.apiKey.text}
          configured={state.apiKeyConfigured}
          stateLabel={state.apiKeyConfigured ? t('apiKeySet') : t('apiKeyUnset')}
          onEdit={(text) => { props.edit('apiKey', text) }}
        />
        <SettingsValueField id="ai-jina-cohere-model" label={t('rerankModel')} hint={t('rerankModelHint')} {...common} {...state.rerankModel} onEdit={(text) => { props.edit('rerankModel', text) }} onReset={() => { props.resetField('rerankModel') }} />
        <SettingsValueField id="ai-jina-cohere-timeout" label={t('timeoutMs')} hint={t('timeoutMsHint')} numeric {...common} {...state.timeoutMs} onEdit={(text) => { props.edit('timeoutMs', text) }} onReset={() => { props.resetField('timeoutMs') }} />
      </SettingsForm>
    </div>
  )
}
