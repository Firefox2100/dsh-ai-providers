import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, httpFailure, readJson, type LlmModelControl, type LlmModelRuntimeStatus } from '@dsh-ai-providers/core'
import { OpenAiLlmService, connectionHeaders, validateConnection, type OpenAiConnection, type OpenAiLlmDeps } from '@dsh-ai-providers/openai-compatible'
import type { Config } from './config.ts'

export interface LocalAiLlmDeps extends OpenAiLlmDeps {
  config: Config
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
}

/** OpenAI-compatible inference plus LocalAI's administrative backend controls. */
export class LocalAiLlmService extends OpenAiLlmService {
  override readonly modelControl: LlmModelControl

  constructor(deps: LocalAiLlmDeps) {
    super(deps)
    this.modelControl = new LocalAiModelControl(deps)
  }
}

class LocalAiModelControl implements LlmModelControl {
  readonly operations = ['status', 'load', 'unload'] as const
  private readonly send: typeof fetch

  constructor(private readonly deps: LocalAiLlmDeps) {
    this.send = deps.fetch ?? fetch
  }

  async status(route: string, model: string, signal?: AbortSignal): Promise<LlmModelRuntimeStatus> {
    const connection = this.connection(route)
    const url = new URL(`${connection.baseUrl}/backend/monitor`)
    url.searchParams.set('model', requiredModel(model))
    const response = await this.request(url, connection, signal === undefined ? {} : { signal })
    const body = await readJson<{ state?: unknown; memory?: { total?: unknown } }>(response)
    if (body === undefined || typeof body.state !== 'number') throw new AiError('unavailable', 'LocalAI returned an invalid backend status')
    const memory = body.memory?.total
    return {
      state: body.state === 0 ? 'uninitialized' : body.state === 1 ? 'busy' : body.state === 2 ? 'ready' : body.state === -1 ? 'error' : 'unknown',
      ...typeof memory === 'number' && Number.isFinite(memory) && memory >= 0 ? { memoryBytes: memory } : {},
    }
  }

  async load(route: string, model: string, signal?: AbortSignal): Promise<void> {
    await this.change(route, model, 'load', signal)
  }

  async unload(route: string, model: string, signal?: AbortSignal): Promise<void> {
    await this.change(route, model, 'shutdown', signal)
  }

  private async change(route: string, model: string, operation: 'load' | 'shutdown', signal?: AbortSignal): Promise<void> {
    const connection = this.connection(route)
    await this.request(`${connection.baseUrl}/backend/${operation}`, connection, {
      method: 'POST', ...signal === undefined ? {} : { signal }, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: requiredModel(model) }),
    })
  }

  private connection(routeId: string): OpenAiConnection {
    const route = this.deps.config.llmRoutes.get().find(candidate => candidate.id === routeId)
    if (route === undefined) throw new AiError('not-configured', `there is no language model route "${routeId}"`)
    const connection = this.deps.config.connections.get().find(candidate => candidate.id === route.connection)
    if (connection === undefined) throw new AiError('not-configured', `the route "${route.name}" uses the connection "${route.connection}", which does not exist`)
    return validateConnection(connection)
  }

  private async request(url: string | URL, connection: OpenAiConnection, init: RequestInit): Promise<Response> {
    let response: Response
    try {
      response = await this.send(url, { ...init, headers: { ...init.headers, ...await connectionHeaders(connection, this.deps.credentials) } })
    } catch (error) {
      if (init.signal?.aborted === true) throw new AiError('cancelled', 'the LocalAI model operation was cancelled', { cause: error })
      throw new AiError('unavailable', `${connection.baseUrl} could not be reached: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    }
    if (!response.ok) {
      const body = await readJson<{ message?: unknown; error?: { message?: unknown } | string }>(response)
      const said = typeof body?.message === 'string' ? body.message : typeof body?.error === 'string' ? body.error : typeof body?.error?.message === 'string' ? body.error.message : undefined
      throw httpFailure(response, said)
    }
    return response
  }
}

function requiredModel(model: string): string {
  const value = model.trim()
  if (value === '') throw new AiError('invalid-input', 'a model name is required')
  return value
}
