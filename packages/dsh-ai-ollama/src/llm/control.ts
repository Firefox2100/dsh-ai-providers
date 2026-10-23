import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, type LlmModelControl, type LlmModelRuntimeStatus } from '@dsh-ai-providers/core'
import { callJson } from '../api.ts'
import { connectionHeaders, type OllamaConnection } from '../connection.ts'
import { keepAliveOf } from './serialize.ts'

export interface OllamaControlDeps {
  /** The connection and the keep-alive a load should use, of the route; throws when the route does not exist. */
  route: (id: string) => { connection: OllamaConnection; keepAlive: string | undefined }
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  fetch?: typeof fetch
}

const TIMEOUT_MS = 120_000
/** A name without a tag is the `latest` one. */
const tagged = (name: string): string => name.includes(':') ? name : `${name}:latest`

/** Load, unload and residency of models, through `/api/ps` and a `/api/generate` request that has no prompt. */
export class OllamaModelControl implements LlmModelControl {
  readonly operations = ['status', 'load', 'unload'] as const
  private readonly send: typeof fetch

  constructor(private readonly deps: OllamaControlDeps) {
    this.send = deps.fetch ?? fetch
  }

  async status(route: string, model: string, signal?: AbortSignal): Promise<LlmModelRuntimeStatus> {
    const { connection } = this.deps.route(route)
    const body = await callJson<{ models?: { name?: unknown; model?: unknown; size?: unknown; size_vram?: unknown }[] }>(this.send, `${connection.apiUrl}/ps`, { headers: await connectionHeaders(connection, this.deps.credentials) }, TIMEOUT_MS, signal)
    const wanted = tagged(requiredModel(model))
    const resident = (body.models ?? []).find(item => [item.name, item.model].some(value => typeof value === 'string' && tagged(value) === wanted))
    if (resident === undefined) return { state: 'uninitialized' }
    const memory = typeof resident.size === 'number' ? resident.size : undefined
    return { state: 'ready', ...memory !== undefined && Number.isFinite(memory) && memory >= 0 ? { memoryBytes: memory } : {} }
  }

  async load(route: string, model: string, signal?: AbortSignal): Promise<void> {
    const { connection, keepAlive } = this.deps.route(route)
    await this.generate(connection, { model: requiredModel(model), ...keepAlive === undefined || keepAlive === '' ? {} : { keep_alive: keepAliveOf(keepAlive) } }, signal)
  }

  async unload(route: string, model: string, signal?: AbortSignal): Promise<void> {
    const { connection } = this.deps.route(route)
    await this.generate(connection, { model: requiredModel(model), keep_alive: 0 }, signal)
  }

  private async generate(connection: OllamaConnection, body: Record<string, unknown>, signal?: AbortSignal): Promise<void> {
    await callJson(this.send, `${connection.apiUrl}/generate`, { headers: await connectionHeaders(connection, this.deps.credentials), body: { ...body, stream: false } }, TIMEOUT_MS, signal)
  }
}

function requiredModel(model: string): string {
  if (model.trim() === '') throw new AiError('invalid-input', 'a model is required')
  return model
}
