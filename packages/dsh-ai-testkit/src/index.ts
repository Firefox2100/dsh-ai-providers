import { Context } from '@deepseek-ai/cordis'
// The runtime exports no declarations: a plugin package's types are not published, so the testkit reads its source.
import { AiProviders } from '../../dsh-ai-providers/src/host/registry.ts'
// Type-only: declares ctx.aiProviders.
import type {} from '@dsh-ai-providers/core'
import { expect } from 'vitest'

/** The capabilities a provider can offer the runtime. `llm` is asked separately: it is served to DSH, not to consumers. */
export type ContractCapability = 'embedding' | 'rerank' | 'tts' | 'stt' | 'image' | 'decision'

/** What every provider plugin owes the runtime, written once so each vendor test states only its own facts. */
export interface ProviderContract {
  /** The plugin module: `apply` plus the configuration schema. */
  plugin: { apply(ctx: Context, config: never): void }
  /** The provider id it registers. */
  id: string
  /** The name a selector shows. */
  label: string
  /** The settings entry that configures it. */
  configEntryId: string
  /** The capability factories it must offer. */
  capabilities: readonly ContractCapability[]
  /** Whether it serves language models to DSH. */
  llm?: boolean
}

/** Lets Cordis finish the fibers a step started. */
const settle = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 40))

/** The languages the settings UI ships; DSH requires `zh` and `en` and falls back to English for a missing key. */
export const UI_LOCALES = ['en', 'zh', 'ja', 'es', 'fr', 'de', 'ru', 'pt'] as const

/** Sorts in the dictionary's own order, so two languages can be compared regardless of the engine's default. */
const byName = (a: string, b: string): number => a.localeCompare(b)

/** The placeholder names in a string, in a fixed order so two languages can be compared. */
const placeholdersOf = (value: string): string[] =>
  [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]!).sort(byName)

/** The keys of a dictionary in a fixed order, so two languages can be compared. */
const keysOf = (dictionary: Record<string, string>): string[] => Object.keys(dictionary).sort(byName)

/**
 * Checks that a client half's copy covers every language the settings UI ships, with the same keys and the same
 * `{placeholders}` as English. A locale added without a translation would otherwise fall back to English silently, and
 * a placeholder dropped in one language would show up as a literal brace in the panel.
 * @param dictionaries - the locale map a `src/client/locales.ts` exports.
 */
export function expectLocaleCoverage(dictionaries: Record<string, Record<string, string>>): void {
  for (const locale of UI_LOCALES) expect(dictionaries[locale], `missing the ${locale} dictionary`).toBeDefined()
  const reference = dictionaries.en!
  for (const locale of UI_LOCALES) {
    const entries = dictionaries[locale]!
    expect(keysOf(entries), `${locale} keys`).toEqual(keysOf(reference))
    for (const [key, value] of Object.entries(entries)) {
      expect(placeholdersOf(value), `${locale}.${key} placeholders`).toEqual(placeholdersOf(reference[key]!))
    }
  }
}

/**
 * Mounts one provider plugin the way DSH does — the runtime registry first, the plugin over it — and checks the
 * contract a provider owes: nothing before the runtime exists, one registration with its identity, a factory for each
 * declared capability, and complete removal when its fiber is disposed.
 * @param contract - the plugin and the facts its package declares.
 */
export async function expectProviderContract(contract: ProviderContract): Promise<void> {
  const ctx = new Context()
  try {
    const fiber = ctx.plugin(contract.plugin as never, {} as never) as unknown as { dispose(): void }
    await settle()
    expect(ctx.get('aiProviders')).toBeUndefined()
    new AiProviders(ctx)
    await settle()
    const provider = ctx.aiProviders.get(contract.id)
    expect(provider).toMatchObject({ label: contract.label, configEntryId: contract.configEntryId })
    for (const capability of contract.capabilities) await expect(provider?.capabilities[capability]?.()).toBeDefined()
    if (contract.llm === true) await expect(provider?.llm?.()).toBeDefined()
    fiber.dispose()
    await settle()
    expect(ctx.aiProviders.list()).toEqual([])
  } finally {
    await ctx.fiber.dispose()
  }
}
