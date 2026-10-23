import type { LlmModelSpec } from '@dsh-ai-providers/core'
import { callJson } from '../api.ts'

interface Listed {
  model?: unknown
  name?: unknown
  features?: unknown
  inference_metadata?: { request_modality?: unknown }
  model_info?: { context_window?: unknown; max_output_tokens?: unknown; max_reasoning_tokens?: unknown }
}

const TIMEOUT_MS = 15_000
const PAGE_SIZE = 100
const MAX_PAGES = 50

const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

/** The text-generation models the account can use, with the context window, output limit and image input DashScope reports, one page at a time. */
export async function discoverModels(send: typeof fetch, baseUrl: string, headers: Record<string, string>, signal?: AbortSignal): Promise<LlmModelSpec[]> {
  const found: LlmModelSpec[] = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await callJson<{ output?: { total?: unknown; models?: Listed[] } }>(send, `${baseUrl}/models?capabilities=TG&page_no=${page}&page_size=${PAGE_SIZE}`, { headers }, TIMEOUT_MS, signal)
    const models = body.output?.models ?? []
    for (const model of models) {
      if (typeof model.model !== 'string') continue
      const info = model.model_info
      found.push({
        id: model.model,
        name: typeof model.name === 'string' && model.name !== '' ? model.name : model.model,
        inputs: strings(model.inference_metadata?.request_modality).some(item => item.toLowerCase() === 'image') ? ['text', 'image'] : ['text'],
        ...typeof info?.context_window === 'number' && info.context_window > 0 ? { contextWindow: info.context_window } : {},
        ...typeof info?.max_output_tokens === 'number' && info.max_output_tokens > 0 ? { maxTokens: info.max_output_tokens } : {},
      })
    }
    const total = typeof body.output?.total === 'number' ? body.output.total : 0
    if (models.length < PAGE_SIZE || found.length >= total) break
  }
  return found
}
