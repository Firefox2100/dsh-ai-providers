import { AiService, type CallOptions } from './service.ts'

export interface ImageGenerationOptions extends CallOptions {
  /** Number of images requested; providers may impose their own upper bound. */
  count?: number
  /** Existing images whose identity or composition the result should preserve. */
  references?: ImageReference[]
}

export interface ImageReference {
  data: Blob
  /** A short provider-neutral instruction for how this image is used. */
  description?: string
}

export interface GeneratedImage {
  data: Blob
  mediaType: string
  revisedPrompt?: string
}

export interface ImageGenerationResult {
  images: GeneratedImage[]
  model: string
}

/** Generates bitmap images from a text prompt. */
export abstract class ImageGenerationService<Options extends ImageGenerationOptions = ImageGenerationOptions> extends AiService {
  readonly capability = 'image' as const
  abstract generate(prompt: string, options?: Options): Promise<ImageGenerationResult>
}
