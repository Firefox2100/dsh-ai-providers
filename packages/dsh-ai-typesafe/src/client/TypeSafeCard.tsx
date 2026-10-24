import { SettingsForm, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@dsh-ai-providers/core/slots'
import type { TypeSafeCardFace } from './controller.ts'
import { formLabels } from './locales.ts'
import css from './TypeSafeSurface.module.css'

export type TypeSafeCardProps =
  PropsRuntime<'ai.provider.decision'>
  & PropsLocale<'ai.typesafe'>
  & InjectFace<TypeSafeCardFace>

/** The connection selection and model defaults of the TypeSafe decision provider. */
export function TypeSafeCard(props: TypeSafeCardProps) {
  const { t } = props
  const state = props.useTypeSafeCard(snapshot => snapshot)
  const disabled = !state.writable
  const common = { overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('invalidNumber'), disabled }
  return (
    <div data-testid="ai-typesafe" className={css.section}>
      <h3 className={css.providerTitle}>{t('title')}</h3>
      <p className={css.providerDescription}>{t('description')}</p>
      <SettingsForm labels={formLabels(t)} state={state} onSave={props.save} onDiscard={props.discard}>
        <label className={css.field}>
          <span>{t('connection')}</span>
          <select value={state.decisionConnection.text} disabled={disabled} onChange={event => { props.edit('decisionConnection', event.target.value) }}>
            <option value="">{t('connectionNone')}</option>
            {state.connections.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <small>{t('connectionHint')}</small>
        </label>
        <SettingsValueField id="ai-typesafe-model" label={t('decisionModel')} hint={t('decisionModelHint')} {...common} {...state.decisionModel} onEdit={(text) => { props.edit('decisionModel', text) }} onReset={() => { props.resetField('decisionModel') }} />
        <label className={css.field}>
          <span>
            <input type="checkbox" checked={state.longContext.text === 'true'} disabled={disabled} onChange={event => { props.edit('longContext', event.target.checked ? 'true' : 'false') }} /> {t('longContext')}
          </span>
          <small>{t('longContextHint')}</small>
        </label>
        <SettingsValueField id="ai-typesafe-timeout" label={t('timeoutMs')} hint={t('timeoutMsHint')} numeric {...common} {...state.timeoutMs} onEdit={(text) => { props.edit('timeoutMs', text) }} onReset={() => { props.resetField('timeoutMs') }} />
      </SettingsForm>
    </div>
  )
}
