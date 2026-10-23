import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, ImageGenerationService, type GeneratedImage, type ImageGenerationOptions, type ImageGenerationResult, type RequestOption } from '@dsh-ai-providers/core'
import { download, multimodalUrl, postJson } from './api.ts'
import { connectionHeaders, type DashScopeConnection } from './connection.ts'

/** DashScope's own controls of one image request. */
export interface DashScopeImageOptions extends ImageGenerationOptions {
  /** Output size as `width*height`, such as `1328*1328`. */
  size?: string
  /** What the image must not contain (`negative_prompt`, at most 500 characters). */
  negativePrompt?: string
  /** Whether the model may rewrite the prompt (`prompt_extend`). */
  promptExtend?: boolean
  watermark?: boolean
  /** The random seed, from 0 to 2147483647. */
  seed?: number
}

export const IMAGE_REQUEST_OPTIONS: readonly RequestOption[] = [
  { key: 'size', type: 'string', label: { en: 'Image size', zh: '图像尺寸' }, description: { en: 'width*height, such as 1328*1328; between 512*512 and 2048*2048 pixels in total. Leave empty to use the provider\'s setting.', zh: '宽*高，例如 1328*1328；总像素在 512*512 到 2048*2048 之间。留空则使用提供方的设置。' } },
  { key: 'negativePrompt', type: 'string', label: { en: 'Negative prompt', zh: '反向提示词' }, description: { en: 'What the image must not contain, up to 500 characters.', zh: '图像中不应出现的内容，最多 500 个字符。' } },
  { key: 'promptExtend', type: 'boolean', label: { en: 'Rewrite the prompt', zh: '改写提示词' }, description: { en: 'Let the model expand the prompt before drawing.', zh: '允许模型在绘制前扩写提示词。' } },
  { key: 'watermark', type: 'boolean', label: { en: 'Watermark', zh: '水印' }, description: { en: 'Add the provider\'s watermark.', zh: '添加提供方的水印。' } },
  { key: 'seed', type: 'integer', label: { en: 'Seed', zh: '随机种子' }, description: { en: 'For repeatable results, from 0 to 2147483647.', zh: '用于获得可重复的结果，范围为 0 到 2147483647。' }, min: 0, max: 2_147_483_647 },
]

export interface DashScopeImageSettings {
  imageModel: { get(): string }
  imageSize: { get(): string }
  imagePromptExtend: { get(): boolean }
  imageWatermark: { get(): boolean }
  timeoutMs: { get(): number }
}

export interface DashScopeImageDeps {
  config: DashScopeImageSettings
  provider: string
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  connection: () => DashScopeConnection
  /** Replaceable for tests. */
  fetch?: typeof fetch
}

interface Answer { output?: { choices?: { message?: { content?: { image?: unknown }[] } }[] } }

async function dataUrl(blob: Blob): Promise<string> {
  return `data:${blob.type || 'image/png'};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`
}

/**
 * Images from the multimodal generation endpoint, which serves the synchronous models (Qwen-Image, Wan 2.6): the prompt, with any
 * reference images before it, goes in as one user message, and the answer lists addresses of the pictures, which are downloaded
 * because they expire after 24 hours. With references the model edits instead of drawing; it takes up to three. Models that only
 * run as asynchronous tasks are not served.
 */
export class DashScopeImageService extends ImageGenerationService<DashScopeImageOptions> {
  private readonly send: typeof fetch

  constructor(private readonly deps: DashScopeImageDeps) {
    super()
    this.send = deps.fetch ?? fetch
  }

  get provider(): string { return this.deps.provider }

  get model(): string { return this.deps.config.imageModel.get() }

  async generate(prompt: string, options: DashScopeImageOptions = {}): Promise<ImageGenerationResult> {
    if (prompt.trim() === '') throw new AiError('invalid-input', 'the prompt is empty')
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    const { config, credentials } = this.deps
    const model = config.imageModel.get().trim()
    if (model === '') throw new AiError('not-configured', 'no image model is configured')
    const connection = this.deps.connection()
    const references = options.references ?? []
    const size = options.size ?? config.imageSize.get()
    const content = [...await Promise.all(references.map(async reference => ({ image: await dataUrl(reference.data) }))), { text: prompt }]
    const body = await postJson<Answer>(this.send, multimodalUrl(connection.baseUrl), await connectionHeaders(connection, credentials), {
      model,
      input: { messages: [{ role: 'user', content }] },
      parameters: {
        ...options.count === undefined ? {} : { n: options.count },
        ...size === '' ? {} : { size },
        ...options.negativePrompt === undefined ? {} : { negative_prompt: options.negativePrompt },
        prompt_extend: options.promptExtend ?? config.imagePromptExtend.get(),
        watermark: options.watermark ?? config.imageWatermark.get(),
        ...options.seed === undefined ? {} : { seed: options.seed },
      },
    }, config.timeoutMs.get(), options.signal)
    const addresses = (body.output?.choices?.[0]?.message?.content ?? []).flatMap(part => typeof part.image === 'string' ? [part.image] : [])
    if (addresses.length === 0) throw new AiError('unavailable', `${connection.baseUrl} answered without images`)
    const images = await Promise.all(addresses.map(async (address): Promise<GeneratedImage> => {
      const file = await download(this.send, address, config.timeoutMs.get(), options.signal)
      const data = await file.blob()
      const mediaType = file.headers.get('content-type')?.split(';', 1)[0]?.trim() || data.type || 'image/png'
      return { data, mediaType }
    }))
    return { images, model }
  }
}
