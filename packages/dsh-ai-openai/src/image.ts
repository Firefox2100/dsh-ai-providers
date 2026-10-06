import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, ImageGenerationService, httpFailure, readJson, type ImageGenerationOptions, type ImageGenerationResult } from 'dsh-ai-core'
import type { Config } from './config.ts'
import { PROVIDER_ID } from './ids.ts'
import { connectionHeaders, type OpenAiConnection } from './connection.ts'

export type OpenAiImageFormat = 'png' | 'jpeg' | 'webp'
export interface OpenAiImageOptions extends ImageGenerationOptions {
  size?: string
  quality?: string
  style?: string
  background?: 'transparent' | 'opaque' | 'auto'
  outputFormat?: OpenAiImageFormat
  outputCompression?: number
  user?: string
}

export interface OpenAiImageDeps {
  config: Config
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  connection: () => OpenAiConnection
  fetch?: typeof fetch
}

interface ImagesResponse {
  data?: { b64_json?: unknown; url?: unknown; revised_prompt?: unknown }[]
  model?: unknown
  error?: { message?: unknown }
}

const MEDIA_TYPES: Record<OpenAiImageFormat, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }

/** Images from `POST {baseUrl}/images/generations`; URL responses are downloaded so callers receive self-contained data. */
export class OpenAiImageGenerationService extends ImageGenerationService<OpenAiImageOptions> {
  readonly provider = PROVIDER_ID
  private readonly send: typeof fetch
  constructor(private readonly deps: OpenAiImageDeps) { super(); this.send = deps.fetch ?? fetch }
  get model(): string { return this.deps.config.imageModel.get() }

  async generate(prompt: string, options: OpenAiImageOptions = {}): Promise<ImageGenerationResult> {
    if (prompt.trim() === '') throw new AiError('invalid-input', 'the image prompt is empty')
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    const model = this.deps.config.imageModel.get().trim()
    if (model === '') throw new AiError('not-configured', 'no image generation model is configured')
    const count = options.count ?? 1
    if (!Number.isInteger(count) || count < 1) throw new AiError('invalid-input', 'count must be a whole number from 1')
    const compression = options.outputCompression ?? this.deps.config.imageOutputCompression.get()
    if (!Number.isInteger(compression) || compression < 0 || compression > 100) throw new AiError('invalid-input', 'output compression must be a whole number from 0 to 100')
    const connection = this.deps.connection()
    const root = connection.baseUrl
    if (root === '') throw new AiError('not-configured', 'no base URL is configured')
    const outputFormat = options.outputFormat ?? this.deps.config.imageOutputFormat.get()
    const headers = await connectionHeaders(connection, this.deps.credentials)
    const fields = {
      model, prompt, n: count,
      size: options.size ?? this.deps.config.imageSize.get(), quality: options.quality ?? this.deps.config.imageQuality.get(),
      output_format: outputFormat, output_compression: compression,
      ...(options.style === undefined ? {} : { style: options.style }), ...(options.background === undefined ? {} : { background: options.background }),
      ...(options.user === undefined ? {} : { user: options.user }),
    }
    let endpoint = `${root}/images/generations`
    let requestBody: RequestInit['body']
    if (options.references === undefined || options.references.length === 0) {
      headers['content-type'] = 'application/json'
      requestBody = JSON.stringify(fields)
    } else {
      endpoint = `${root}/images/edits`
      const form = new FormData()
      for (const [key, value] of Object.entries(fields)) form.append(key, String(value))
      for (const [index, reference] of options.references.entries()) {
        if (reference.data.size === 0) throw new AiError('invalid-input', `reference image ${index + 1} is empty`)
        form.append('image[]', reference.data, `reference-${index + 1}.${extensionOf(reference.data.type)}`)
      }
      requestBody = form
    }
    const response = await this.request(endpoint, { method: 'POST', headers, body: requestBody }, options.signal)
    const responseBody = await readJson<ImagesResponse>(response)
    if (!response.ok) throw httpFailure(response, typeof responseBody?.error?.message === 'string' ? responseBody.error.message : undefined)
    if (!Array.isArray(responseBody?.data) || responseBody.data.length === 0) throw new AiError('unavailable', `${root} answered without images`)
    const images = await Promise.all(responseBody.data.map(async (entry) => {
      let data: Blob
      if (typeof entry.b64_json === 'string') data = new Blob([Buffer.from(entry.b64_json, 'base64')], { type: MEDIA_TYPES[outputFormat] })
      else if (typeof entry.url === 'string') data = await this.download(entry.url, options.signal)
      else throw new AiError('unavailable', `${root} answered with an image that has no data`)
      return { data, mediaType: data.type || MEDIA_TYPES[outputFormat], ...(typeof entry.revised_prompt === 'string' ? { revisedPrompt: entry.revised_prompt } : {}) }
    }))
    return { images, model: typeof responseBody.model === 'string' ? responseBody.model : model }
  }

  private async download(url: string, signal?: AbortSignal): Promise<Blob> {
    const response = await this.request(url, {}, signal)
    if (!response.ok) throw httpFailure(response)
    return response.blob()
  }

  private async request(url: string, init: RequestInit, caller?: AbortSignal): Promise<Response> {
    const timeout = AbortSignal.timeout(Math.max(1, this.deps.config.timeoutMs.get()))
    init.signal = caller === undefined ? timeout : AbortSignal.any([caller, timeout])
    try { return await this.send(url, init) }
    catch (error) {
      if ((caller as AbortSignal | undefined)?.aborted === true) throw new AiError('cancelled', 'cancelled', { cause: error })
      if (timeout.aborted) throw new AiError('unavailable', `${url} did not answer within ${this.deps.config.timeoutMs.get()} ms`, { cause: error })
      throw new AiError('unavailable', `${url} could not be reached: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    }
  }
}

function extensionOf(mediaType: string): string {
  if (mediaType === 'image/jpeg') return 'jpg'
  if (mediaType === 'image/webp') return 'webp'
  return 'png'
}
