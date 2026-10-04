import { Button, SettingsForm } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { providerSlotId, providerSlotName, type Capability } from 'dsh-ai-core'
import type {} from 'dsh-ai-core/slots'
import css from './CapabilitySection.module.css'
import { formLabels } from './locales.ts'
import type { CapabilityFace } from './controller.ts'

/** The copy of the two capability tabs has the same keys, so one component serves both. */
export type CapabilitySectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'ai.embedding'>
  & PropsRenderSlots<'ai.provider.embedding' | 'ai.provider.rerank'>
  & InjectFace<CapabilityFace>

/** The tab of a capability, shown for the one it is registered for. */
export function capabilitySection(capability: Capability): (props: CapabilitySectionProps) => JSX.Element {
  return function CapabilitySection(props) {
    return <Section {...props} capability={capability} />
  }
}

function Section(props: CapabilitySectionProps & { capability: Capability }) {
  const { t, renderSlot, capability } = props
  const state = props.useCapability(snapshot => snapshot)
  const selected = state.selected.text
  const chosen = state.providers.find(provider => provider.id === selected)
  const testing = state.probe.status === 'running'
  const result = state.probe.result

  return (
    <div className={css.section} data-testid={`ai-${capability}`}>
      <h2 className={css.title}>{t('title')}</h2>
      <p className={css.description}>{t('description')}</p>

      <SettingsForm labels={formLabels(t)} state={state} onSave={props.save} onDiscard={props.discard}>
        <fieldset className={css.group} disabled={!state.writable}>
          <legend className={css.label}>{t('provider')}</legend>
          <label className={css.option}>
            <input type="radio" name={`ai-${capability}-provider`} checked={selected === ''} onChange={() => { props.edit(capability, '') }} />
            {t('providerNone')}
          </label>
          {state.providers.map(provider => (
            <label key={provider.id} className={css.option}>
              <input type="radio" name={`ai-${capability}-provider`} checked={selected === provider.id} onChange={() => { props.edit(capability, provider.id) }} />
              {provider.label}
              {state.status === 'ready' && !provider.loaded && <span className={css.muted}>({t('providerNotLoaded')})</span>}
            </label>
          ))}
          {state.providers.length === 0 && <p className={css.muted}>{t('noProviders')}</p>}
        </fieldset>
      </SettingsForm>

      <div className={css.status}>
        <div className={css.row}>
          <span>{t('status')}</span>
          <span className={state.available ? css.ok : undefined} data-testid={`ai-${capability}-status`}>{state.available ? t('statusAvailable') : t('statusUnavailable')}</span>
        </div>
        <div className={css.row}>
          <Button variant="outline" size="sm" disabled={testing || !state.available} onClick={props.runProbe}>{testing ? t('testing') : t('test')}</Button>
          {result !== undefined && (
            <span className={result.ok ? css.ok : css.error} role="status" data-testid={`ai-${capability}-probe`}>
              {result.ok
                ? t('testOk', { model: result.model, dimensions: result.dimensions ?? '', milliseconds: result.milliseconds })
                : t('testFailed', { code: result.code, message: result.message })}
            </span>
          )}
        </div>
        {state.status === 'failed' && <p className={css.error} role="alert">{t('loadFailed', { message: state.error ?? '' })}</p>}
      </div>

      <div className={css.panel}>
        {chosen === undefined
          ? <p className={css.muted}>{t('chooseProvider')}</p>
          : renderSlot(providerSlotName(capability), { capability }, { only: providerSlotId(capability, chosen.id) })}
      </div>
    </div>
  )
}
