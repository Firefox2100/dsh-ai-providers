import { SegmentedTabs, type SegmentedTab } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useSyncExternalStore, useState } from 'react'
import css from './page.module.css'

/** Every provider panel a page may render, so one section can own all of their slots. */
export type ProviderPanel = 'ai.provider.connection' | 'ai.provider.llm' | 'ai.provider.embedding' | 'ai.provider.rerank' | 'ai.provider.tts' | 'ai.provider.stt' | 'ai.provider.image' | 'ai.provider.decision'

/** What the settings section's renderer hands to the section, and to every page inside it. */
export type SectionProps = PropsRuntime<'settings.section'> & PropsRenderSlots<ProviderPanel> & PropsLocale<'ai.providers'>

/** One page of the section: its tab and how to draw it. */
export interface FeaturePage {
  id: string
  label: string
  render: (props: SectionProps) => JSX.Element
}

/**
 * The tab strip of a page set. DSH's `SegmentedTabs` owns the keyboard model and the selection indicator; the panels
 * stay caller-owned, which is why this renders only the strip.
 * @param props.pages - ordered pages, non-empty.
 * @param props.label - accessible name for the tab list.
 * @param props.selected - id of the page shown now.
 * @param props.onSelect - called with the page a click or key selects.
 * @param props.size - `sm` for a nested strip.
 * @returns the tab list.
 */
export function PageTabs(props: { pages: readonly FeaturePage[]; label: string; selected: string; onSelect: (id: string) => void; size?: 'sm' | 'md' }) {
  const items = props.pages.map(page => ({ value: page.id, label: page.label, id: `ai-page-${page.id}`, panelId: `ai-panel-${page.id}` }))
  return (
    <SegmentedTabs
      items={items as [SegmentedTab, ...SegmentedTab[]]}
      value={props.selected}
      onChange={props.onSelect}
      label={props.label}
      size={props.size}
      className={css.tabs}
    />
  )
}

/** One selected page of a set, with its panel wired to the tab that names it. */
export function pageBody(pages: readonly FeaturePage[], selected: string, props: SectionProps): JSX.Element {
  const page = pages.find(candidate => candidate.id === selected) ?? pages[0]!
  return (
    <div id={`ai-panel-${page.id}`} role="tabpanel" aria-labelledby={`ai-page-${page.id}`}>
      {page.render(props)}
    </div>
  )
}

/**
 * The settings section that holds every AI provider page, one page per subject.
 * @param pages - the ordered pages.
 * @param label - accessible name for the outer tab list.
 * @returns the section component the slot registration mounts.
 */
export function settingsSection(pages: readonly FeaturePage[], label: string) {
  return function AiProvidersSection(props: SectionProps) {
    const [selected, setSelected] = useState(pages[0]!.id)
    return (
      <div>
        <PageTabs pages={pages} label={label} selected={selected} onSelect={setSelected} />
        {pageBody(pages, selected, props)}
      </div>
    )
  }
}

/**
 * A page set shown inside one page: the same tab strip, one level smaller. Used where a subject has its own facets,
 * such as the capability pages inside the provider settings.
 * @param pages - the ordered pages.
 * @param label - accessible name for the nested tab list.
 * @returns the component the outer page renders.
 */
export function nestedSection(pages: readonly FeaturePage[], label: string) {
  return function NestedPages(props: SectionProps) {
    const [selected, setSelected] = useState(pages[0]!.id)
    return (
      <div>
        <PageTabs pages={pages} label={label} selected={selected} onSelect={setSelected} size="sm" />
        {pageBody(pages, selected, props)}
      </div>
    )
  }
}

/**
 * A snapshot selector hook over one store, for a page that brings its own store instead of receiving one synthesized by
 * the slot renderer. The selector runs on every render; a store that returns the same snapshot object until it changes
 * keeps that cheap.
 * @param store - the store to read.
 * @returns the selector hook bound to it.
 */
export function storeHook<T>(store: { getSnapshot(): T; subscribe(listener: () => void): () => void }) {
  return function useStoreSnapshot<R>(selector: (snapshot: T) => R): R {
    return useSyncExternalStore(store.subscribe, () => selector(store.getSnapshot()))
  }
}