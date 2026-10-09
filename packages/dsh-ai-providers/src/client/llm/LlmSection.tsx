import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from 'dsh-ai-core/slots'
import type { LlmFace } from './controller.ts'
import css from './LlmSection.module.css'

export type LlmSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'ai.llm'> & PropsRenderSlots<'ai.provider.llm'> & InjectFace<LlmFace>

/** The language model routes DSH is served, each model testable, and the editors of the providers that offer them. */
export function LlmSection(props: LlmSectionProps) {
  const { t, renderSlot } = props
  const state = props.useLlm(snapshot => snapshot)
  return (
    <div className={css.section} data-testid="ai-llm">
      <h2 className={css.title}>{t('title')}</h2>
      <p className={css.description}>{t('description')}</p>
      <div className={css.routeHead}>
        <h3 className={css.heading}>{t('routes')}</h3>
        <Button variant="outline" size="sm" onClick={props.refresh}>{t('refresh')}</Button>
      </div>
      {state.status === 'failed' && <p className={css.error} role="alert">{t('loadFailed', { message: state.error ?? '' })}</p>}
      {state.status === 'ready' && state.routes.length === 0 && <p className={css.muted}>{t('noRoutes')}</p>}
      {state.routes.map(route => (
        <section key={`${route.provider}/${route.id}`} className={css.route} data-testid={`ai-llm-route-${route.id}`}>
          <div className={css.routeHead}>
            <span className={css.name}>{route.name}</span>
            <code className={css.muted}>{route.id}</code>
            <span className={css.muted}>{t('provider')}: {route.providerLabel}</span>
            <span className={route.active ? css.ok : css.error}>{route.active ? t('active') : t('inactive', { problem: route.problem ?? '' })}</span>
          </div>
          {route.models.length === 0 && <span className={css.muted}>{t('noModels')}</span>}
          {route.models.map((model) => {
            const key = `${route.id}/${model.id}`
            const probe = state.probes[key]
            return (
              <div key={model.id} className={css.model}>
                <span>{model.name}</span>
                <code className={css.muted}>{model.id}</code>
                {model.contextWindow !== undefined && <span className={css.muted}>{t('context', { tokens: model.contextWindow })}</span>}
                {model.maxTokens !== undefined && <span className={css.muted}>{t('output', { tokens: model.maxTokens })}</span>}
                <Button variant="outline" size="sm" disabled={!route.active || probe?.status === 'running'} onClick={() => { props.probe(route.id, model.id) }}>{probe?.status === 'running' ? t('testing') : t('test')}</Button>
                {probe?.status === 'done' && (probe.result.ok
                  ? <span className={css.ok} role="status">{t('testOk', { text: probe.result.text.slice(0, 60), milliseconds: probe.result.milliseconds, tokens: probe.result.outputTokens === undefined ? '' : `, ${probe.result.outputTokens} tokens` })}</span>
                  : <span className={css.error} role="status">{t('testFailed', { code: probe.result.code, message: probe.result.message })}</span>)}
              </div>
            )
          })}
        </section>
      ))}
      <div className={css.panel}>
        <h3 className={css.heading}>{t('configuration')}</h3>
        {renderSlot('ai.provider.llm', {})}
      </div>
    </div>
  )
}
