import { describe, expect, it } from 'vitest'
import { dictionariesOf } from '../src/client/capability/locales.ts'
import { dictionaries as concurrency } from '../src/client/concurrency/locales.ts'
import { dictionaries as llm } from '../src/client/llm/locales.ts'
import { dictionaries as observability } from '../src/client/observability/locales.ts'
import { dictionaries as providers } from '../src/client/providers/locales.ts'

const LOCALES = ['zh', 'en', 'ja', 'es', 'fr', 'de', 'ru', 'pt'] as const
const VARIABLES = /\{[^{}]+\}/gu

function variables(value: string): string[] {
  return [...value.matchAll(VARIABLES)].map(match => match[0]).sort()
}

function expectComplete(dictionaries: Record<string, Record<string, string>>): void {
  expect(Object.keys(dictionaries).sort()).toEqual([...LOCALES].sort())
  const english = dictionaries.en!
  for (const locale of LOCALES) {
    const dictionary = dictionaries[locale]!
    expect(Object.keys(dictionary).sort()).toEqual(Object.keys(english).sort())
    for (const key of Object.keys(english)) {
      expect(dictionary[key]!.trim(), `${locale}.${key}`).not.toBe('')
      expect(variables(dictionary[key]!), `${locale}.${key}`).toEqual(variables(english[key]!))
    }
  }
}

describe('client translations', () => {
  it('covers every runtime page and preserves interpolation variables', () => {
    for (const dictionaries of [providers, llm, concurrency, observability]) expectComplete(dictionaries)
    for (const dictionaries of Object.values(dictionariesOf)) expectComplete(dictionaries)
  })
})
