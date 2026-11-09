import type { RequestGate } from './gate.ts'
import { observeCall } from './trace/observe.ts'
import type { Tracer } from './trace/tracer.ts'
import { AiError, ImageGenerationService, type AiProviderRegistry, type ImageGenerationOptions, type ImageGenerationResult } from '@dsh-ai-providers/core'

interface Source { selected: () => string; registry: Pick<AiProviderRegistry, 'get'>; gate?: RequestGate; trace?: Tracer }
const NONE = 'none'

export class ConfiguredImageGeneration extends ImageGenerationService {
  constructor(private readonly source: Source) { super() }
  get provider(): string { return this.source.selected() || NONE }
  get model(): string { return this.current()?.model ?? NONE }

  async generate(prompt: string, options: ImageGenerationOptions = {}): Promise<ImageGenerationResult> {
    const service = this.current()
    if (service === undefined) throw new AiError('not-configured', 'no image generation provider is selected, or the selected one is not loaded')
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    if (prompt.trim() === '') throw new AiError('invalid-input', 'the image prompt is empty')
    if (options.count !== undefined && (!Number.isInteger(options.count) || options.count < 1)) throw new AiError('invalid-input', 'count must be a whole number from 1')
    const { signal: _signal, ...settings } = options
    const call = (): Promise<ImageGenerationResult> => observeCall(this.source.trace, { capability: 'image', provider: service.provider, model: service.model, input: { prompt, options: { ...settings, references: settings.references?.length } } }, () => service.generate(prompt, options), found => ({ output: found.images.map(image => ({ mediaType: image.mediaType, bytes: image.data.size })) }))
    const answer = this.source.gate === undefined ? await call() : await this.source.gate.run({ capability: 'image', priority: options.priority, signal: options.signal }, call)
    if (answer.images.length === 0) throw new AiError('unavailable', `${service.provider} returned no images`)
    for (const image of answer.images) {
      if (image.data.size === 0 || image.mediaType.trim() === '') throw new AiError('unavailable', `${service.provider} returned an empty image or no media type`)
    }
    return answer
  }

  private current(): ImageGenerationService | undefined {
    const id = this.source.selected()
    return (id === '' ? undefined : this.source.registry.get(id)?.capabilities.image)?.()
  }
}
