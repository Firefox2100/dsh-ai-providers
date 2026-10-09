import { useState } from 'react'
import { Button, SettingsForm, SettingsValueField } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { AI_API_PREFIX, AI_API_ROUTES, type LlmDiscoverPayload } from 'dsh-ai-core'
import type {} from 'dsh-ai-core/slots'
import { PROVIDER_ID } from '../ids.ts'
import css from './LlmEditor.module.css'
import type { OpenAiCardFace } from './controller.ts'
import { JsonField, ListField, NumberField, TextField } from './fields.tsx'
import { draftOf, EXAMPLE_LEVELS, freshId, SAMPLING_NUMBERS, setField, type ModelDraft, type RouteDraft, type SamplingDraft } from './llm-edit.ts'
import { formLabels, type OpenAiLocaleKey } from './locales.ts'

export type OpenAiLlmProps = PropsRuntime<'ai.provider.llm'> & PropsLocale<'ai.openai'> & InjectFace<OpenAiCardFace>
type T = OpenAiLlmProps['t']


const SAMPLING_LABELS: Record<(typeof SAMPLING_NUMBERS)[number][0], OpenAiLocaleKey> = {
  temperature: 'samplingTemperature', topP: 'samplingTopP', topK: 'samplingTopK', minP: 'samplingMinP', frequencyPenalty: 'samplingFrequencyPenalty',
  presencePenalty: 'samplingPresencePenalty', repetitionPenalty: 'samplingRepetitionPenalty', seed: 'samplingSeed', maxTokens: 'samplingMaxTokens',
}

/** The controls of requests, as a route or a model sets them; a field left empty stays the server's own default. */
function SamplingEditor(props: { sampling: SamplingDraft | undefined; disabled: boolean; t: T; onChange: (next: SamplingDraft | undefined) => void }) {
  const { t, disabled } = props
  const change = (apply: (draft: SamplingDraft) => void): void => {
    const draft: SamplingDraft = structuredClone(props.sampling ?? {})
    apply(draft)
    props.onChange(Object.keys(draft).length === 0 ? undefined : draft)
  }
  return (
    <div className={css.stack}>
      <div className={css.grid}>
        {SAMPLING_NUMBERS.map(([key, min, max, integer]) => (
          <NumberField key={key} label={t(SAMPLING_LABELS[key])} value={props.sampling?.[key]} disabled={disabled} invalid={t('invalidNumber')} integer={integer} min={min} {...max === undefined ? {} : { max }} onChange={(value) => { change((draft) => { setField(draft, key, value) }) }} />
        ))}
        <label className={css.field}>
          <span>{t('samplingToolChoice')}</span>
          <select value={props.sampling?.toolChoice ?? ''} disabled={disabled} onChange={(event) => { change((draft) => { setField(draft, 'toolChoice', event.target.value === '' ? undefined : event.target.value as 'auto' | 'none' | 'required') }) }}>
            <option value="">{t('samplingDefault')}</option>
            <option value="auto">auto</option>
            <option value="required">required</option>
            <option value="none">none</option>
          </select>
        </label>
      </div>
      <ListField label={t('samplingStop')} value={props.sampling?.stop} disabled={disabled} hint={t('samplingStopHint')} onChange={(value) => { change((draft) => { setField(draft, 'stop', value) }) }} />
      <JsonField label={t('samplingBody')} value={props.sampling?.body} disabled={disabled} invalid={t('invalidJson')} hint={t('samplingBodyHint')} onChange={(value) => { change((draft) => { setField(draft, 'body', value) }) }} />
    </div>
  )
}

function ModelCard(props: { model: ModelDraft; disabled: boolean; t: T; onChange: (apply: (model: ModelDraft) => void) => void; onRemove: () => void }) {
  const { model, t, disabled } = props
  const levels = model.reasoningLevels ?? []
  return (
    <section className={`${css.card} ${css.inner}`}>
      <div className={css.grid}>
        <TextField label={t('modelId')} value={model.id} disabled={disabled} hint={t('modelIdHint')} onChange={(value) => { props.onChange((draft) => { draft.id = value }) }} />
        <TextField label={t('modelName')} value={model.name} disabled={disabled} onChange={(value) => { props.onChange((draft) => { draft.name = value }) }} />
        <NumberField label={t('contextWindow')} value={model.contextWindow} disabled={disabled} invalid={t('invalidNumber')} integer min={1} onChange={(value) => { props.onChange((draft) => { setField(draft, 'contextWindow', value) }) }} />
        <NumberField label={t('modelMaxTokens')} value={model.maxTokens} disabled={disabled} invalid={t('invalidNumber')} integer min={1} onChange={(value) => { props.onChange((draft) => { setField(draft, 'maxTokens', value) }) }} />
      </div>
      <label className={css.check}>
        <input type="checkbox" checked={model.vision === true} disabled={disabled} onChange={(event) => { props.onChange((draft) => { setField(draft, 'vision', event.target.checked ? true : undefined) }) }} />
        {t('modelVision')}
      </label>
      <fieldset className={`${css.card} ${css.fieldset}`}>
        <legend className={css.legend}>{t('reasoningLevels')}</legend>
        <small>{t('reasoningLevelsHint')}</small>
        {levels.map((level, index) => (
          <div key={index} className={css.levelRow}>
            <TextField label={t('levelId')} value={level.id} disabled={disabled} onChange={(value) => { props.onChange((draft) => { draft.reasoningLevels![index]!.id = value }) }} />
            <TextField label={t('levelName')} value={level.name} disabled={disabled} onChange={(value) => { props.onChange((draft) => { draft.reasoningLevels![index]!.name = value }) }} />
            <JsonField label={t('levelBody')} value={level.body} disabled={disabled} invalid={t('invalidJson')} onChange={(value) => { props.onChange((draft) => { draft.reasoningLevels![index]!.body = value ?? {} }) }} />
            <Button variant="outline" size="sm" disabled={disabled} onClick={() => { props.onChange((draft) => { draft.reasoningLevels!.splice(index, 1); if (draft.reasoningLevels!.length === 0) { delete draft.reasoningLevels; delete draft.defaultReasoning } }) }}>{t('remove')}</Button>
          </div>
        ))}
        <div className={css.row}>
          <Button variant="outline" size="sm" disabled={disabled} onClick={() => { props.onChange((draft) => { draft.reasoningLevels = [...draft.reasoningLevels ?? [], { id: '', name: '', body: {} }] }) }}>{t('levelAdd')}</Button>
          {levels.length === 0 && <Button variant="outline" size="sm" disabled={disabled} onClick={() => { props.onChange((draft) => { draft.reasoningLevels = structuredClone(EXAMPLE_LEVELS) as never }) }}>{t('levelExample')}</Button>}
          {levels.length > 0 && (
            <label className={css.field}>
              <span>{t('levelDefault')}</span>
              <select value={model.defaultReasoning ?? ''} disabled={disabled} onChange={(event) => { props.onChange((draft) => { setField(draft, 'defaultReasoning', event.target.value) }) }}>
                <option value="">{t('samplingDefault')}</option>
                {levels.filter(level => level.id !== '').map(level => <option key={level.id} value={level.id}>{level.name || level.id}</option>)}
              </select>
            </label>
          )}
        </div>
      </fieldset>
      <details>
        <summary>{t('modelSampling')}</summary>
        <SamplingEditor sampling={model.sampling} disabled={disabled} t={t} onChange={(next) => { props.onChange((draft) => { setField(draft, 'sampling', next) }) }} />
      </details>
      <div><Button variant="outline" size="sm" disabled={disabled} onClick={props.onRemove}>{t('modelRemove')}</Button></div>
    </section>
  )
}

function RouteCard(props: OpenAiLlmProps & { route: RouteDraft; index: number; disabled: boolean; editRoutes: (apply: (routes: RouteDraft[]) => void) => void }) {
  const { route, t, disabled } = props
  const state = props.useOpenAiCard(snapshot => snapshot)
  const [found, setFound] = useState<LlmDiscoverPayload['models'] | undefined>()
  const [problem, setProblem] = useState<string | undefined>()
  const [discovering, setDiscovering] = useState(false)
  const edit = (apply: (route: RouteDraft) => void): void => { props.editRoutes((routes) => { apply(routes[props.index]!) }) }
  const discover = async (): Promise<void> => {
    setDiscovering(true); setProblem(undefined)
    try {
      const response = await fetch(`${AI_API_PREFIX}${AI_API_ROUTES.llmDiscover}?provider=${PROVIDER_ID}&route=${encodeURIComponent(route.id)}`, { credentials: 'same-origin' })
      if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as { message?: string }).message ?? `${response.status}`)
      setFound(((await response.json()) as LlmDiscoverPayload).models)
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error))
    } finally { setDiscovering(false) }
  }
  return (
    <section className={css.card} data-testid={`ai-openai-route-${route.id}`}>
      <div className={css.grid}>
        <TextField label={t('routeName')} value={route.name} disabled={disabled} onChange={(value) => { edit((draft) => { draft.name = value }) }} />
        <TextField label={t('routeId')} value={route.id} disabled={disabled} hint={t('routeIdHint')} onChange={(value) => { edit((draft) => { draft.id = value }) }} />
        <label className={css.field}>
          <span>{t('connection')}</span>
          <select value={route.connection} disabled={disabled} onChange={(event) => { edit((draft) => { draft.connection = event.target.value }) }}>
            <option value="">{t('connectionNone')}</option>
            {state.connections.map(connection => <option key={connection.id} value={connection.id}>{connection.name}</option>)}
          </select>
        </label>
        <label className={css.field}>
          <span>{t('reasoningTags')}</span>
          <select value={route.reasoningTags ?? 'tags'} disabled={disabled} onChange={(event) => { edit((draft) => { setField(draft, 'reasoningTags', event.target.value === 'tags' ? undefined : event.target.value as 'none' | 'implicit') }) }}>
            <option value="tags">{t('reasoningTagsTags')}</option>
            <option value="implicit">{t('reasoningTagsImplicit')}</option>
            <option value="none">{t('reasoningTagsNone')}</option>
          </select>
          <small>{t('reasoningTagsHint')}</small>
        </label>
      </div>
      <div className={css.row}>
        <label className={css.check}>
          <input type="checkbox" checked={route.maxCompletionTokens === true} disabled={disabled} onChange={(event) => { edit((draft) => { setField(draft, 'maxCompletionTokens', event.target.checked ? true : undefined) }) }} />
          {t('maxCompletionTokens')}
        </label>
        <label className={css.check}>
          <input type="checkbox" checked={route.replayReasoning === true} disabled={disabled} onChange={(event) => { edit((draft) => { setField(draft, 'replayReasoning', event.target.checked ? true : undefined) }) }} />
          {t('replayReasoning')}
        </label>
      </div>
      <JsonField label={t('routeHeaders')} value={route.headers} disabled={disabled} invalid={t('invalidJson')} hint={t('routeHeadersHint')} onChange={(value) => { edit((draft) => { setField(draft, 'headers', value as Record<string, string> | undefined) }) }} />
      <details>
        <summary>{t('routeSampling')}</summary>
        <SamplingEditor sampling={route.sampling} disabled={disabled} t={t} onChange={(next) => { edit((draft) => { setField(draft, 'sampling', next) }) }} />
      </details>
      <h4 className={css.heading}>{t('models')}</h4>
      {route.models.map((model, at) => (
        <ModelCard key={at} model={model} disabled={disabled} t={t} onChange={(apply) => { edit((draft) => { apply(draft.models[at]!) }) }} onRemove={() => { edit((draft) => { draft.models.splice(at, 1) }) }} />
      ))}
      <div className={css.row}>
        <Button variant="outline" size="sm" disabled={disabled} onClick={() => { edit((draft) => { draft.models.push({ id: '', name: '' }) }) }}>{t('modelAdd')}</Button>
        <Button variant="outline" size="sm" disabled={disabled || discovering} onClick={() => { void discover() }}>{discovering ? t('discovering') : t('discover')}</Button>
        <Button variant="outline" size="sm" disabled={disabled} onClick={() => { props.editRoutes((routes) => { routes.splice(props.index, 1) }) }}>{t('routeRemove')}</Button>
      </div>
      {problem !== undefined && <p role="alert" className={`${css.note} ${css.error}`}>{t('discoverFailed', { message: problem })}</p>}
      {found !== undefined && (
        <div className={css.stack}>
          <small>{t('discoverHint')}</small>
          {found.length === 0 && <small>{t('discoverNone')}</small>}
          {found.map((model) => {
            const have = route.models.some(candidate => candidate.id === model.id)
            return (
              <div key={model.id} className={css.row}>
                <code>{model.id}</code>
                {model.contextWindow !== undefined && <small>{model.contextWindow}</small>}
                <Button variant="outline" size="sm" disabled={disabled || have} onClick={() => { edit((draft) => { draft.models.push({ id: model.id, name: model.name, ...model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow } }) }) }}>{have ? t('discoverHave') : t('modelAdd')}</Button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/** The editor of the language model routes this provider serves to DSH. */
export function OpenAiLlm(props: OpenAiLlmProps) {
  const { t } = props
  const state = props.useOpenAiCard(snapshot => snapshot)
  const disabled = !state.writable
  const routes = draftOf(state.llmRoutes)
  const editRoutes = (apply: (routes: RouteDraft[]) => void): void => {
    const next = draftOf(state.llmRoutes)
    apply(next)
    props.setLlmRoutes(next)
  }
  return (
    <div data-testid="ai-openai-llm" className={css.stack}>
      <h3 className={css.heading}>{t('llmTitle')}</h3>
      <p className={css.note}>{t('llmDescription')}</p>
      <SettingsForm labels={formLabels(t)} state={state} onSave={props.save} onDiscard={props.discard}>
        <div className={css.stack}>
          {routes.map((route, index) => <RouteCard key={index} {...props} route={route} index={index} disabled={disabled} editRoutes={editRoutes} />)}
          {routes.length === 0 && <p>{t('routesEmpty')}</p>}
          <div>
            <Button variant="outline" size="sm" disabled={disabled} onClick={() => { editRoutes((next) => { const name = t('routeNew'); next.push({ id: freshId(name, next.map(route => route.id)), name, connection: state.connections[0]?.id ?? '', models: [] }) }) }}>{t('routeAdd')}</Button>
          </div>
          <SettingsValueField id="ai-openai-llm-idle" label={t('llmIdleTimeoutMs')} hint={t('llmIdleTimeoutMsHint')} numeric overriddenLabel={t('overridden')} resetLabel={t('reset')} invalidLabel={t('invalidNumber')} disabled={disabled} {...state.llmIdleTimeoutMs} onEdit={(text) => { props.edit('llmIdleTimeoutMs', text) }} onReset={() => { props.resetField('llmIdleTimeoutMs') }} />
        </div>
      </SettingsForm>
    </div>
  )
}
