import { Button, SettingsForm, type SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConcurrencyFace } from './controller.ts'
import type { ConcurrencyLocaleKey } from './locales.ts'
import css from './ConcurrencySection.module.css'

export type ConcurrencySectionProps = PropsRuntime<'settings.section'> & PropsLocale<'ai.concurrency'> & InjectFace<ConcurrencyFace>

const seconds = (ms: number): string => `${Math.round(ms / 1000)}`

/** The limits on how many calls a shared resource serves at once, edited like the rest of the plugin's settings, with what each is doing now. */
export function ConcurrencySection(props: ConcurrencySectionProps) {
  const { t } = props
  const state = props.useConcurrency(snapshot => snapshot)
  const labels: SettingsFormLabels = { unavailable: t('unavailable'), readOnly: t('readOnly'), saveFailed: t('saveFailed'), save: t('save'), saving: t('saving') }
  const toggle = <T extends string>(list: readonly T[], value: T, on: boolean): T[] => (on ? [...list.filter(entry => entry !== value), value] : list.filter(entry => entry !== value))

  return (
    <div className={css.section} data-testid="ai-concurrency">
      <h2 className={css.title}>{t('title')}</h2>
      <p className={css.description}>{t('description')}</p>
      <SettingsForm labels={labels} state={state} onSave={props.save} onDiscard={props.discard}>
        <div className={css.section}>
          {state.limits.length === 0 && <p className={css.muted}>{t('none')}</p>}
          {state.limits.map((rule, index) => {
            const live = state.live[rule.id]
            return (
              <section key={index} className={css.limit} data-testid={`ai-limit-${rule.id}`}>
                <div className={css.head}>
                  <input className={`${css.input} ${css.name}`} value={rule.id} disabled={!state.writable} aria-label={t('name')} placeholder={t('name')} onChange={(event) => { props.updateLimit(index, { id: event.target.value }) }} />
                  <label className={css.control}>
                    <span className={css.label}>{t('max')}</span>
                    <input className={`${css.input} ${css.number}`} type="number" min={1} step={1} value={rule.max} disabled={!state.writable} onChange={(event) => { props.updateLimit(index, { max: Math.max(1, Math.round(Number(event.target.value) || 1)) }) }} />
                  </label>
                  <label className={css.control}>
                    <span className={css.label}>{t('reserve')}</span>
                    <input className={`${css.input} ${css.number}`} type="number" min={0} max={rule.max - 1} step={1} value={rule.reserve ?? 0} disabled={!state.writable} onChange={(event) => { props.updateLimit(index, { reserve: Math.max(0, Math.min(rule.max - 1, Math.round(Number(event.target.value) || 0))) }) }} />
                  </label>
                  <Button variant="outline" size="sm" disabled={!state.writable} onClick={() => { props.removeLimit(index) }}>{t('remove')}</Button>
                </div>
                <span className={css.label}>{t('routes')}</span>
                <div className={css.choices}>
                  {state.routes.length === 0 && <span className={css.muted}>{t('noRoutes')}</span>}
                  {state.routes.map(route => (
                    <label key={route.id} className={css.choice}>
                      <input type="checkbox" checked={rule.routes.includes(route.id)} disabled={!state.writable} onChange={(event) => { props.updateLimit(index, { routes: toggle(rule.routes, route.id, event.target.checked) }) }} />
                      {route.name}
                    </label>
                  ))}
                </div>
                <span className={css.label}>{t('capabilities')}</span>
                <div className={css.choices}>
                  {state.capabilities.map(capability => (
                    <label key={capability} className={css.choice}>
                      <input type="checkbox" checked={rule.capabilities.includes(capability)} disabled={!state.writable} onChange={(event) => { props.updateLimit(index, { capabilities: toggle(rule.capabilities, capability, event.target.checked) }) }} />
                      {t(`capability.${capability}` as ConcurrencyLocaleKey)}
                    </label>
                  ))}
                </div>
                <span className={`${css.live} ${live !== undefined && live.active > 0 ? css.busy : ''}`}>
                  {live === undefined
                    ? t('notSaved')
                    : t('live', { active: live.active, max: live.max, foreground: live.queued.foreground, background: live.queued.background, wait: seconds(live.oldestWaitMs) })}
                </span>
              </section>
            )
          })}
          <div className={css.row}>
            <Button variant="outline" size="sm" disabled={!state.writable} onClick={props.addLimit}>{t('add')}</Button>
          </div>
          <label className={css.row}>
            {t('maxWait')}
            <input className={`${css.input} ${css.number}`} type="number" min={0} step={1} value={state.maxWait.text} disabled={!state.writable} onChange={(event) => { props.edit('maxWaitSeconds', event.target.value) }} />
          </label>
          <p className={css.muted}>{t('maxWaitHelp')}</p>
        </div>
      </SettingsForm>
    </div>
  )
}
