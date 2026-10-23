import { SettingsForm, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@dsh-ai-providers/core/slots'
import type { JinaCardFace } from './controller.ts'
import { formLabels } from './locales.ts'
import css from './JinaSurface.module.css'

export type JinaCardProps =
  PropsRuntime<'ai.provider.rerank'>
  & PropsLocale<'ai.jina'>
  & InjectFace<JinaCardFace>

/** The connection selection and model defaults of the Jina rerank provider. */
export function JinaCard(props: JinaCardProps) {
  const { t } = props
  const state = props.useJinaCard(snapshot => snapshot)
  const disabled = !state.writable
  const common = { overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidNumber'), disabled }
  return (
    <div data-testid="ai-jina" className={css.section}>
      <h3 className={css.providerTitle}>{t('title')}</h3>
      <p className={css.providerDescription}>{t('description')}</p>
      <SettingsForm labels={formLabels(t)} state={state} onSave={props.save} onDiscard={props.discard}>
        <label className={css.field}>
          <span>{t('connection')}</span>
          <select value={state.rerankConnection.text} disabled={disabled} onChange={event => { props.edit('rerankConnection', event.target.value) }}>
            <option value="">{t('connectionNone')}</option>
            {state.connections.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <small>{t('connectionHint')}</small>
        </label>
        <SettingsValueField id="ai-jina-model" label={t('rerankModel')} hint={t('rerankModelHint')} {...common} {...state.rerankModel} onEdit={(text) => { props.edit('rerankModel', text) }} onReset={() => { props.resetField('rerankModel') }} />
        <SettingsValueField id="ai-jina-timeout" label={t('timeoutMs')} hint={t('timeoutMsHint')} numeric {...common} {...state.timeoutMs} onEdit={(text) => { props.edit('timeoutMs', text) }} onReset={() => { props.resetField('timeoutMs') }} />
      </SettingsForm>
    </div>
  )
}

export type JinaEmbeddingCardProps =
  PropsRuntime<'ai.provider.embedding'>
  & PropsLocale<'ai.jina'>
  & InjectFace<JinaCardFace>

/** The connection selection and model defaults of the Jina embedding provider. */
export function JinaEmbeddingCard(props: JinaEmbeddingCardProps) {
  const { t } = props
  const state = props.useJinaCard(snapshot => snapshot)
  const disabled = !state.writable
  const common = { overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidNumber'), disabled }
  return (
    <div data-testid="ai-jina-embedding" className={css.section}>
      <h3 className={css.providerTitle}>{t('embeddingTitle')}</h3>
      <p className={css.providerDescription}>{t('embeddingDescription')}</p>
      <SettingsForm labels={formLabels(t)} state={state} onSave={props.save} onDiscard={props.discard}>
        <label className={css.field}>
          <span>{t('connection')}</span>
          <select value={state.embeddingConnection.text} disabled={disabled} onChange={event => { props.edit('embeddingConnection', event.target.value) }}>
            <option value="">{t('connectionNone')}</option>
            {state.connections.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <small>{t('connectionHint')}</small>
        </label>
        <SettingsValueField id="ai-jina-embedding-model" label={t('embeddingModel')} hint={t('embeddingModelHint')} {...common} {...state.embeddingModel} onEdit={(text) => { props.edit('embeddingModel', text) }} onReset={() => { props.resetField('embeddingModel') }} />
        <SettingsValueField id="ai-jina-embedding-dimensions" label={t('embeddingDimensions')} hint={t('embeddingDimensionsHint')} numeric {...common} {...state.embeddingDimensions} onEdit={(text) => { props.edit('embeddingDimensions', text) }} onReset={() => { props.resetField('embeddingDimensions') }} />
        <label className={css.field}>
          <span>{t('embeddingOverflow')}</span>
          <select value={state.embeddingOverflow.text} disabled={disabled} onChange={event => { props.edit('embeddingOverflow', event.target.value) }}>
            <option value="truncate">{t('overflowTruncate')}</option>
            <option value="error">{t('overflowError')}</option>
          </select>
          <small>{t('embeddingOverflowHint')}</small>
        </label>
        <SettingsValueField id="ai-jina-batch" label={t('batchSize')} hint={t('batchSizeHint')} numeric {...common} {...state.batchSize} onEdit={(text) => { props.edit('batchSize', text) }} onReset={() => { props.resetField('batchSize') }} />
        <SettingsValueField id="ai-jina-embedding-timeout" label={t('timeoutMs')} hint={t('timeoutMsHint')} numeric {...common} {...state.timeoutMs} onEdit={(text) => { props.edit('timeoutMs', text) }} onReset={() => { props.resetField('timeoutMs') }} />
      </SettingsForm>
    </div>
  )
}
