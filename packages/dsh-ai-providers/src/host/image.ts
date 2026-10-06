import { AiError, ImageGenerationService, type AiProviderRegistry, type ImageGenerationOptions, type ImageGenerationResult } from 'dsh-ai-core'

interface Source { selected: () => string; registry: Pick<AiProviderRegistry, 'get'> }
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
    const answer = await service.generate(prompt, options)
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
