import { SettingsForm, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from 'dsh-ai-core/slots'
import type { JinaCohereCardFace } from './controller.ts'
import { formLabels } from './locales.ts'

export type JinaCohereCardProps =
  PropsRuntime<'ai.provider.rerank'>
  & PropsLocale<'ai.jina-cohere'>
  & InjectFace<JinaCohereCardFace>

/** The connection selection and model defaults of the Jina/Cohere-style rerank provider. */
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
        <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
          <span>{t('connection')}</span>
          <select value={state.rerankConnection.text} disabled={disabled} onChange={event => { props.edit('rerankConnection', event.target.value) }}>
            <option value="">{t('connectionNone')}</option>
            {state.connections.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <small>{t('connectionHint')}</small>
        </label>
        <SettingsValueField id="ai-jina-cohere-model" label={t('rerankModel')} hint={t('rerankModelHint')} {...common} {...state.rerankModel} onEdit={(text) => { props.edit('rerankModel', text) }} onReset={() => { props.resetField('rerankModel') }} />
        <SettingsValueField id="ai-jina-cohere-timeout" label={t('timeoutMs')} hint={t('timeoutMsHint')} numeric {...common} {...state.timeoutMs} onEdit={(text) => { props.edit('timeoutMs', text) }} onReset={() => { props.resetField('timeoutMs') }} />
      </SettingsForm>
    </div>
  )
}
