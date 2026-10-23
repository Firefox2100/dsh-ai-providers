import type { LlmModelSpec } from '@dsh-ai-providers/core'
import { callJson } from '../api.ts'

interface Tag { name?: unknown; model?: unknown }
interface Show { capabilities?: unknown; model_info?: Record<string, unknown> }

const TIMEOUT_MS = 15_000
const PARALLEL = 4

/** gpt-oss takes a level of thinking and cannot turn it off; other thinking models take on or off. */
function reasoningOf(architecture: unknown): LlmModelSpec['reasoning'] {
  if (architecture === 'gptoss') return { levels: [{ id: 'low', name: 'Low', body: { think: 'low' } }, { id: 'medium', name: 'Medium', body: { think: 'medium' } }, { id: 'high', name: 'High', body: { think: 'high' } }], default: 'medium' }
  return { levels: [{ id: 'off', name: 'Off', body: { think: false } }, { id: 'on', name: 'On', body: { think: true } }] }
}

function specOf(name: string, show: Show | undefined): LlmModelSpec | undefined {
  const capabilities = Array.isArray(show?.capabilities) ? show.capabilities.filter((item): item is string => typeof item === 'string') : undefined
  if (capabilities !== undefined && !capabilities.includes('completion')) return undefined
  const info = show?.model_info ?? {}
  const architecture = info['general.architecture']
  const window = typeof architecture === 'string' ? info[`${architecture}.context_length`] : undefined
  return {
    id: name,
    name,
    inputs: capabilities?.includes('vision') === true ? ['text', 'image'] : ['text'],
    ...typeof window === 'number' && window > 0 ? { contextWindow: window } : {},
    ...capabilities?.includes('thinking') === true ? { reasoning: reasoningOf(architecture)! } : {},
  }
}

/**
 * The models the server has, with what `/api/show` says each can do. A model whose details cannot be read is still listed, as plain text;
 * one that only embeds is left out, since a route is for chat. The window is the model's own maximum, not what the server allocates (see `numCtx`).
 */
export async function discoverModels(send: typeof fetch, apiUrl: string, headers: Record<string, string>, signal?: AbortSignal): Promise<LlmModelSpec[]> {
  const tags = await callJson<{ models?: Tag[] }>(send, `${apiUrl}/tags`, { headers }, TIMEOUT_MS, signal)
  const names = (tags.models ?? []).flatMap(item => typeof item.name === 'string' ? [item.name] : typeof item.model === 'string' ? [item.model] : [])
  const out: (LlmModelSpec | undefined)[] = new Array<LlmModelSpec | undefined>(names.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(PARALLEL, names.length) }, async () => {
    while (next < names.length) {
      const at = next++
      const name = names[at]!
      const show = await callJson<Show>(send, `${apiUrl}/show`, { headers, body: { model: name } }, TIMEOUT_MS, signal).catch((error: unknown) => {
        if (signal?.aborted === true) throw error
        return undefined
      })
      out[at] = specOf(name, show)
    }
  }))
  return out.filter((item): item is LlmModelSpec => item !== undefined)
}
