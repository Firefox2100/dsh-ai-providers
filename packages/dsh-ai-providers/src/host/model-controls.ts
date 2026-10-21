import { Service, type Context } from '@deepseek-ai/cordis'
import { AiError, type AiModelControls, type LlmModelControl, type LlmModelOperation, type LlmModelRuntimeStatus } from '@dsh-ai-providers/core'
import type { AiProviders } from './registry.ts'

/** Resolves a DSH route to the optional model administration offered by its provider. */
export class ModelControls extends Service implements AiModelControls {
  constructor(ctx: Context, private readonly registry: AiProviders) {
    super(ctx, 'aiModels')
  }

  operations(route: string): readonly LlmModelOperation[] {
    return this.control(route).operations
  }

  status(route: string, model: string, signal?: AbortSignal): Promise<LlmModelRuntimeStatus> {
    return this.operation(route, 'status')(route, model, signal)
  }

  load(route: string, model: string, signal?: AbortSignal): Promise<void> {
    return this.operation(route, 'load')(route, model, signal)
  }

  unload(route: string, model: string, signal?: AbortSignal): Promise<void> {
    return this.operation(route, 'unload')(route, model, signal)
  }

  private control(route: string): LlmModelControl {
    for (const provider of this.registry.llmProviders()) {
      const service = provider.llm!()
      if (service.routes().some(candidate => candidate.id === route)) {
        if (service.modelControl === undefined) throw new AiError('unsupported', `the language model route "${route}" does not offer model administration`)
        return service.modelControl
      }
    }
    throw new AiError('not-configured', `there is no language model route "${route}"`)
  }

  private operation<K extends 'status' | 'load' | 'unload'>(route: string, name: K): NonNullable<LlmModelControl[K]> {
    const control = this.control(route)
    const operation = control[name]
    if (operation === undefined) throw new AiError('unsupported', `the language model route "${route}" does not support ${name}`)
    return operation.bind(control) as NonNullable<LlmModelControl[K]>
  }
}
