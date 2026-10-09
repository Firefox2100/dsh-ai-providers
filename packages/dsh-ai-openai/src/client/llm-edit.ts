import type { OpenAiLlmRouteConfig, OpenAiReasoningLevelConfig, OpenAiSamplingConfig } from '../config.ts'

type DeepMutable<T> = T extends readonly (infer U)[] ? DeepMutable<U>[] : T extends object ? { -readonly [K in keyof T]: DeepMutable<T[K]> } : T

export type RouteDraft = DeepMutable<OpenAiLlmRouteConfig>
export type ModelDraft = RouteDraft['models'][number]
export type SamplingDraft = DeepMutable<OpenAiSamplingConfig>

/** A copy of the routes that can be edited in place. */
export const draftOf = (routes: readonly OpenAiLlmRouteConfig[]): RouteDraft[] => structuredClone(routes) as unknown as RouteDraft[]

/** Sets a field, or removes it when the value is empty, so that what the user did not choose stays the server's default. */
export function setField<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined): void {
  if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) delete target[key]
  else target[key] = value as T[K]
}

export const SAMPLING_NUMBERS = [
  ['temperature', 0, 2, false], ['topP', 0, 1, false], ['topK', 0, undefined, true], ['minP', 0, 1, false],
  ['frequencyPenalty', -2, 2, false], ['presencePenalty', -2, 2, false], ['repetitionPenalty', 0, undefined, false], ['seed', 0, undefined, true], ['maxTokens', 1, undefined, true],
] as const satisfies readonly (readonly [keyof OpenAiSamplingConfig, number, number | undefined, boolean])[]

/** An id made of the letters and digits of a name, unused among `taken`. */
export function freshId(name: string, taken: readonly string[]): string {
  const base = name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'route'
  let id = base
  for (let n = 2; taken.includes(id); n += 1) id = `${base}-${n}`
  return id
}

/** The reasoning levels most local servers offer, selecting by `reasoning_effort`. */
export const EXAMPLE_LEVELS: readonly OpenAiReasoningLevelConfig[] = [
  { id: 'off', name: 'Off', body: { reasoning_effort: 'none' } },
  { id: 'high', name: 'High', body: { reasoning_effort: 'high' } },
]
