import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, ImageGenerationService, httpFailure, readJson, type ImageGenerationOptions, type ImageGenerationResult, type GeneratedImage } from '@dsh-ai-providers/core'
import { connectionHeaders, type OpenAiConnection } from '@dsh-ai-providers/openai-compatible'
import type { Config } from './config.ts'
import { PROVIDER_ID } from './ids.ts'

export interface LocalAiImageOptions extends ImageGenerationOptions {
  size?: string
  steps?: number
  negativePrompt?: string
  seed?: number
}

export interface LocalAiImageDeps {
  config: Config
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  connection: () => OpenAiConnection
  fetch?: typeof fetch
}

interface ImagesResponse {
  data?: { b64_json?: unknown; url?: unknown }[]
  error?: { message?: unknown }
}

interface Pass {
  prompt: string
  size: string
  steps?: number | undefined
  /** Images given to the model, in the field the configuration names. */
  given: { field: 'files' | 'ref_images'; images: Blob[] }
}

const SIZE = /^(\d{2,5})x(\d{2,5})$/
const MULTIPLE = 64

/** The size a second pass renders at: every side scaled and rounded to a multiple the diffusion backends accept. */
export function scaledSize(size: string, scale: number): string {
  const match = SIZE.exec(size)
  if (match === null) throw new AiError('invalid-input', `the image size "${size}" is not WIDTHxHEIGHT`)
  const side = (value: string): number => Math.max(MULTIPLE, Math.round(Number(value) * scale / MULTIPLE) * MULTIPLE)
  return `${side(match[1]!)}x${side(match[2]!)}`
}

/**
 * Images from LocalAI's own `POST {baseUrl}/images/generations`, which has no `/images/edits`. Existing images go in `files` (LocalAI repaints
 * the first one: image to image) or `ref_images` (models made for references), as configured; the default leaves them out, because a model
 * that does not take references can fail its backend on them. `highRes` renders at the size asked, then repaints that result larger.
 */
export class LocalAiImageGenerationService extends ImageGenerationService<LocalAiImageOptions> {
  readonly provider = PROVIDER_ID
  private readonly send: typeof fetch
  constructor(private readonly deps: LocalAiImageDeps) { super(); this.send = deps.fetch ?? fetch }
  get model(): string { return this.deps.config.imageModel.get() }

  async generate(prompt: string, options: LocalAiImageOptions = {}): Promise<ImageGenerationResult> {
    if (prompt.trim() === '') throw new AiError('invalid-input', 'the image prompt is empty')
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    const model = this.model.trim()
    if (model === '') throw new AiError('not-configured', 'no image generation model is configured')
    const count = options.count ?? 1
    if (!Number.isInteger(count) || count < 1) throw new AiError('invalid-input', 'count must be a whole number from 1')
    const connection = this.deps.connection()
    if (connection.baseUrl === '') throw new AiError('not-configured', 'no base URL is configured')
    const headers = { ...await connectionHeaders(connection, this.deps.credentials), 'content-type': 'application/json' }
    const size = options.size ?? this.deps.config.imageSize.get()
    const mode = this.deps.config.imageReferences.get()
    const references = mode === 'ignore' ? [] : (options.references ?? []).map(reference => reference.data)
    for (const [index, image] of references.entries()) if (image.size === 0) throw new AiError('invalid-input', `reference image ${index + 1} is empty`)
    const first: Pass = { prompt, size, steps: options.steps, given: { field: mode === 'ref_images' ? 'ref_images' : 'files', images: mode === 'img2img' ? references.slice(0, 1) : references } }
    const images: GeneratedImage[] = []
    for (let n = 0; n < count; n += 1) {
      let image = await this.render(connection.baseUrl, headers, model, first, options)
      if (options.highRes === true) {
        const steps = this.deps.config.imageHighresSteps.get()
        image = await this.render(connection.baseUrl, headers, model, { prompt, size: scaledSize(size, this.deps.config.imageHighresScale.get()), steps: steps > 0 ? steps : options.steps, given: { field: 'files', images: [image.data] } }, options)
      }
      images.push(image)
    }
    return { images, model }
  }

  private async render(root: string, headers: Record<string, string>, model: string, pass: Pass, options: LocalAiImageOptions): Promise<GeneratedImage> {
    const given = await Promise.all(pass.given.images.map(async blob => Buffer.from(await blob.arrayBuffer()).toString('base64')))
    const body = {
      ...this.deps.config.imageBody.get(),
      model, prompt: pass.prompt, n: 1, size: pass.size, response_format: 'b64_json',
      ...(pass.steps === undefined ? {} : { step: pass.steps }),
      ...(options.negativePrompt === undefined ? {} : { negative_prompt: options.negativePrompt }),
      ...(options.seed === undefined ? {} : { seed: options.seed }),
      ...(given.length === 0 ? {} : { [pass.given.field]: given }),
    }
    const response = await this.request(`${root}/images/generations`, { method: 'POST', headers, body: JSON.stringify(body) }, options.signal)
    const parsed = await readJson<ImagesResponse>(response)
    if (!response.ok) throw httpFailure(response, typeof parsed?.error?.message === 'string' ? parsed.error.message : undefined)
    const entry = parsed?.data?.[0]
    if (entry === undefined) throw new AiError('unavailable', `${root} answered without images`)
    if (typeof entry.b64_json === 'string') return { data: new Blob([Buffer.from(entry.b64_json, 'base64')], { type: 'image/png' }), mediaType: 'image/png' }
    if (typeof entry.url === 'string') {
      const download = await this.request(entry.url, {}, options.signal)
      if (!download.ok) throw httpFailure(download)
      const data = await download.blob()
      return { data, mediaType: data.type || 'image/png' }
    }
    throw new AiError('unavailable', `${root} answered with an image that has no data`)
  }

  private async request(url: string, init: RequestInit, caller?: AbortSignal): Promise<Response> {
    const timeout = AbortSignal.timeout(Math.max(1, this.deps.config.timeoutMs.get()))
    init.signal = caller === undefined ? timeout : AbortSignal.any([caller, timeout])
    try { return await this.send(url, init) } catch (error) {
      if (caller?.aborted === true) throw new AiError('cancelled', 'cancelled', { cause: error })
      if (timeout.aborted) throw new AiError('unavailable', `${url} did not answer within ${this.deps.config.timeoutMs.get()} ms`, { cause: error })
      throw new AiError('unavailable', `${url} could not be reached: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    }
  }
}
