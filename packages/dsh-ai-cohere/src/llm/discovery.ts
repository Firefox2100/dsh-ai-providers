import type { LlmModelSpec } from '@dsh-ai-providers/core'
import { callJson } from '../api.ts'

interface Listed { name?: unknown; context_length?: unknown; features?: unknown; finetuned?: unknown }

const TIMEOUT_MS = 15_000

/** The address of the model list: Cohere serves it at `/v1/models`, beside the versioned API the connection points at. */
export function modelsUrl(baseUrl: string): string {
  const root = baseUrl.replace(/\/v[12]$/, '')
  return `${root}/v1/models?endpoint=chat&page_size=1000`
}

/** The chat models the account can use, with the context length and vision support Cohere reports. */
export async function discoverModels(send: typeof fetch, baseUrl: string, headers: Record<string, string>, signal?: AbortSignal): Promise<LlmModelSpec[]> {
  const body = await callJson<{ models?: Listed[] }>(send, modelsUrl(baseUrl), { headers }, TIMEOUT_MS, signal)
  return (body.models ?? []).flatMap((model): LlmModelSpec[] => {
    if (typeof model.name !== 'string') return []
    const features = Array.isArray(model.features) ? model.features.filter((item): item is string => typeof item === 'string') : []
    return [{
      id: model.name,
      name: model.name,
      inputs: features.includes('vision') ? ['text', 'image'] : ['text'],
      ...typeof model.context_length === 'number' && model.context_length > 0 ? { contextWindow: model.context_length } : {},
    }]
  })
}
