import { useState } from 'react'
import { Button, SettingsForm, type SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { KeyName, ObservabilityFace } from './controller.ts'
import type { ObservabilityLocaleKey } from './locales.ts'
import css from './ObservabilitySection.module.css'

export type ObservabilitySectionProps = PropsRuntime<'settings.section'> & PropsLocale<'ai.observability'> & InjectFace<ObservabilityFace>

type Translate = ObservabilitySectionProps['t']

/** One Langfuse key: the credential's name (a setting) and a write-only box for its value, which goes to the credential store and is never shown again. */
function KeyBox(props: { name: KeyName; label: string; refText: string; refField: 'langfusePublicKeyRef' | 'langfuseSecretKeyRef'; status: { configured: boolean; writable: boolean; source?: string } | undefined; writable: boolean; t: Translate; edit: (field: string, text: string) => void; store: (name: KeyName, value: string) => Promise<boolean> }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const { t, status } = props
  const locked = !props.writable || busy || (status !== undefined && !status.writable)
  const store = (next: string): void => {
    setBusy(true)
    void props.store(props.name, next).then((stored) => { if (stored) setValue('') }).finally(() => { setBusy(false) })
  }
  return (
    <div className={css.key} data-testid={`ai-observability-${props.name}`}>
      <span className={css.label}>{props.label}</span>
      <label className={css.row}>
        {t('keyName')}
        <input className={css.input} value={props.refText} disabled={!props.writable} onChange={(event) => { props.edit(props.refField, event.target.value) }} />
      </label>
      <div className={css.row}>
        <input className={css.input} type="password" autoComplete="off" value={value} disabled={locked} aria-label={props.label} onChange={(event) => { setValue(event.target.value) }} />
        <Button variant="outline" size="sm" disabled={locked || value === ''} onClick={() => { store(value) }}>{busy ? t('keySaving') : t('keySave')}</Button>
        <Button variant="ghost" size="sm" disabled={locked || status?.configured !== true} onClick={() => { store('') }}>{t('keyRemove')}</Button>
      </div>
      <span className={css.muted} role="status">
        {status === undefined ? t('keyChecking') : status.configured ? `${t('keySet')}${status.source === undefined ? '' : ` (${t('keySource', { source: status.source })})`}` : t('keyUnset')}
        {locked ? ` ${t('keyReadOnly')}` : ''}
      </span>
    </div>
  )
}

/** Whether calls are recorded and where the records go. */
export function ObservabilitySection(props: ObservabilitySectionProps) {
  const { t } = props
  const state = props.useObservability(snapshot => snapshot)
  const labels: SettingsFormLabels = { unavailable: t('unavailable'), readOnly: t('readOnly'), saveFailed: t('saveFailed'), save: t('save'), saving: t('saving') }
  const choose = (field: string, options: readonly ObservabilityLocaleKey[], current: string, prefix: string) => (
    <select className={css.input} value={current} disabled={!state.writable} onChange={(event) => { props.edit(field, event.target.value) }}>
      {options.map(option => <option key={option} value={option.slice(prefix.length + 1)}>{t(option)}</option>)}
    </select>
  )
  const usesLangfuse = state.sink.text !== 'jsonl'
  const usesFiles = state.sink.text !== 'langfuse'
  return (
    <div className={css.section} data-testid="ai-observability">
      <h2 className={css.title}>{t('title')}</h2>
      <p className={css.description}>{t('description')}</p>
      <p className={css.notice}>{t('warning')}</p>
      <SettingsForm labels={labels} state={state} onSave={props.save} onDiscard={props.discard}>
        <div className={css.section}>
          <label className={css.row}>
            <input type="checkbox" checked={state.enabled} disabled={!state.writable} onChange={(event) => { props.setEnabled(event.target.checked) }} />
            {t('enabled')}
          </label>
          <label className={css.row}>{t('sink')}{choose('traceSink', ['sink.jsonl', 'sink.langfuse', 'sink.both'], state.sink.text, 'sink')}</label>
          <label className={css.row}>{t('capture')}{choose('traceCapture', ['capture.summary', 'capture.full'], state.capture.text, 'capture')}</label>
          {state.capture.text !== 'full' && (
            <>
              <label className={css.row}>
                {t('summaryChars')}
                <input className={`${css.input} ${css.number}`} type="number" min={1} step={50} value={state.summaryChars.text} disabled={!state.writable} onChange={(event) => { props.edit('traceSummaryChars', event.target.value) }} />
              </label>
              <p className={css.muted}>{t('summaryCharsHelp')}</p>
            </>
          )}
          <label className={css.row}>
            <input type="checkbox" checked={state.wire} disabled={!state.writable} onChange={(event) => { props.setWire(event.target.checked) }} />
            {t('wire')}
          </label>
          <p className={css.muted}>{t('wireHelp')}</p>
          <label className={css.field}>{t('redact')}<textarea className={`${css.input} ${css.wide} ${css.area}`} rows={4} value={state.redact.text} disabled={!state.writable} onChange={(event) => { props.edit('traceRedact', event.target.value) }} /></label>
          <p className={css.muted}>{t('redactHelp')}</p>
          {usesFiles && (
            <>
              <label className={css.row}>{t('directory')}<input className={`${css.input} ${css.wide}`} value={state.directory.text} disabled={!state.writable} onChange={(event) => { props.edit('traceDirectory', event.target.value) }} /></label>
              <p className={css.muted}>{t('directoryHelp')}</p>
            </>
          )}
          {usesLangfuse && (
            <section className={css.group}>
              <h3 className={css.subtitle}>{t('langfuse')}</h3>
              <label className={css.row}>{t('host')}<input className={`${css.input} ${css.wide}`} value={state.host.text} disabled={!state.writable} onChange={(event) => { props.edit('langfuseHost', event.target.value) }} /></label>
              <label className={css.row}>{t('environment')}<input className={css.input} value={state.environment.text} disabled={!state.writable} onChange={(event) => { props.edit('langfuseEnvironment', event.target.value) }} /></label>
              <p className={css.muted}>{t('environmentHelp')}</p>
              <KeyBox name="publicKey" label={t('publicKey')} refText={state.publicKeyRef.text} refField="langfusePublicKeyRef" status={state.keys.publicKey} writable={state.writable} t={t} edit={props.edit} store={props.storeKey} />
              <KeyBox name="secretKey" label={t('secretKey')} refText={state.secretKeyRef.text} refField="langfuseSecretKeyRef" status={state.keys.secretKey} writable={state.writable} t={t} edit={props.edit} store={props.storeKey} />
              <p className={css.muted}>{t('keyHelp')}</p>
              {state.keyError !== undefined && <p className={css.error} role="alert">{state.keyError}</p>}
            </section>
          )}
        </div>
      </SettingsForm>
    </div>
  )
}
