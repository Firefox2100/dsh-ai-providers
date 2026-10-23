import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, TtsService, type RequestOption, type TtsOptions, type TtsResult } from '@dsh-ai-providers/core'
import { download, multimodalUrl, postJson } from './api.ts'
import { connectionHeaders, type DashScopeConnection } from './connection.ts'

export type DashScopeSpeechFormat = 'mp3' | 'wav' | 'pcm' | 'opus'

/** DashScope's own controls of one speech request. The first two are Qwen-TTS's, the rest CosyVoice's. */
export interface DashScopeTtsOptions extends TtsOptions {
  voice?: string
  /** The language of the text (`language_type`): `Auto`, `Chinese`, `English`, `German`, `Italian`, `Portuguese`, `Spanish`, `Japanese`, `Korean`, `French` or `Russian`. */
  languageType?: string
  format?: DashScopeSpeechFormat
  sampleRate?: number
  /** Loudness from 0 to 100 (`volume`). */
  volume?: number
  /** Speaking speed (`rate`), 1 being normal. */
  rate?: number
  /** Pitch (`pitch`), 1 being normal. */
  pitch?: number
  /** Whether the text is SSML (`enable_ssml`). */
  enableSsml?: boolean
  /** How the voice should speak, for the models that take a spoken-style instruction (`instruction`). */
  instruction?: string
}

export const TTS_REQUEST_OPTIONS: readonly RequestOption[] = [
  { key: 'voice', type: 'string', label: { en: 'Voice', zh: '声音' }, description: { en: 'The voice id, such as Cherry (Qwen-TTS) or longanyang (CosyVoice); leave empty to use the provider\'s setting.', zh: '声音标识，例如 Cherry（Qwen-TTS）或 longanyang（CosyVoice）；留空则使用提供方的设置。' } },
  { key: 'languageType', type: 'string', label: { en: 'Language', zh: '语言' }, description: { en: 'Qwen-TTS only: Auto, Chinese, English, German, Italian, Portuguese, Spanish, Japanese, Korean, French or Russian. Naming the language improves quality.', zh: '仅 Qwen-TTS：Auto、Chinese、English、German、Italian、Portuguese、Spanish、Japanese、Korean、French 或 Russian。指明语言可提升质量。' } },
  { key: 'format', type: 'string', label: { en: 'Audio format', zh: '音频格式' }, description: { en: 'CosyVoice only: mp3, wav, pcm or opus. Qwen-TTS always answers WAV.', zh: '仅 CosyVoice：mp3、wav、pcm 或 opus。Qwen-TTS 始终返回 WAV。' } },
  { key: 'sampleRate', type: 'integer', label: { en: 'Sample rate', zh: '采样率' }, description: { en: 'CosyVoice only, in Hz.', zh: '仅 CosyVoice，单位为 Hz。' }, min: 8000 },
  { key: 'volume', type: 'integer', label: { en: 'Volume', zh: '音量' }, description: { en: 'CosyVoice only, from 0 to 100.', zh: '仅 CosyVoice，范围为 0 到 100。' }, min: 0, max: 100 },
  { key: 'rate', type: 'number', label: { en: 'Speed', zh: '语速' }, description: { en: 'CosyVoice only: 1 is normal speed.', zh: '仅 CosyVoice：1 为正常语速。' }, min: 0.5, max: 2 },
  { key: 'pitch', type: 'number', label: { en: 'Pitch', zh: '音调' }, description: { en: 'CosyVoice only: 1 is the normal pitch.', zh: '仅 CosyVoice：1 为正常音调。' }, min: 0.5, max: 2 },
  { key: 'enableSsml', type: 'boolean', label: { en: 'SSML', zh: 'SSML' }, description: { en: 'CosyVoice only: the text is SSML markup.', zh: '仅 CosyVoice：文本是 SSML 标记。' } },
  { key: 'instruction', type: 'string', label: { en: 'Instruction', zh: '朗读指令' }, description: { en: 'CosyVoice only: how to speak the text, for the models that take one.', zh: '仅 CosyVoice：说明如何朗读文本，适用于支持指令的模型。' } },
]

export interface SocketLike {
  addEventListener(type: string, listener: (event: { data?: unknown }) => void): void
  send(data: string): void
  close(): void
}
export type SocketFactory = (url: string, headers: Record<string, string>) => SocketLike

export interface DashScopeTtsSettings {
  ttsModel: { get(): string }
  ttsVoice: { get(): string }
  ttsLanguage: { get(): string }
  ttsFormat: { get(): DashScopeSpeechFormat }
  timeoutMs: { get(): number }
}

export interface DashScopeTtsDeps {
  config: DashScopeTtsSettings
  provider: string
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  connection: () => DashScopeConnection
  /** Replaceable for tests. */
  fetch?: typeof fetch
  socket?: SocketFactory
}

const MEDIA_TYPES: Record<DashScopeSpeechFormat, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', pcm: 'audio/L16', opus: 'audio/ogg' }

interface QwenSpeech { output?: { audio?: { url?: unknown } } }

/** The WebSocket address of the inference API beside the HTTP one: `…/api/v1` becomes `…/api-ws/v1/inference`. */
export function inferenceSocketUrl(baseUrl: string): string {
  const url = new URL(baseUrl)
  if (!url.pathname.replace(/\/+$/, '').endsWith('/api/v1')) throw new AiError('not-configured', `the base URL ${baseUrl} does not end with /api/v1, so the speech WebSocket address cannot be derived`)
  url.protocol = url.protocol === 'http:' ? 'ws:' : 'wss:'
  url.pathname = `${url.pathname.replace(/\/+$/, '').slice(0, -'/api/v1'.length)}/api-ws/v1/inference`
  return url.toString()
}

/** Whether the model is served by the CosyVoice WebSocket protocol rather than the Qwen-TTS HTTP one. */
export const isCosyVoice = (model: string): boolean => /^cosyvoice/i.test(model)

function binary(data: unknown): Uint8Array | undefined {
  if (typeof data === 'string') return undefined
  if (data instanceof Uint8Array) return new Uint8Array(data)
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (Array.isArray(data)) return new Uint8Array(Buffer.concat(data as Buffer[]))
  return undefined
}

/**
 * Speech from DashScope's two synthesis protocols, chosen by model. Qwen-TTS (`qwen*-tts*`) answers an HTTP request with the address of
 * a WAV file, which is then streamed on. CosyVoice (`cosyvoice*`) runs a task over a WebSocket and sends audio frames as they are
 * made, which are streamed on as they arrive.
 */
export class DashScopeTtsService extends TtsService<DashScopeTtsOptions> {
  private readonly send: typeof fetch

  constructor(private readonly deps: DashScopeTtsDeps) {
    super()
    this.send = deps.fetch ?? fetch
  }

  get provider(): string { return this.deps.provider }

  get model(): string { return this.deps.config.ttsModel.get() }

  async synthesize(text: string, options: DashScopeTtsOptions = {}): Promise<TtsResult> {
    if (text.trim() === '') throw new AiError('invalid-input', 'the text is empty')
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    const { config } = this.deps
    const model = config.ttsModel.get().trim()
    if (model === '') throw new AiError('not-configured', 'no text-to-speech model is configured')
    const voice = (options.voice ?? config.ttsVoice.get()).trim()
    if (voice === '') throw new AiError('not-configured', 'no text-to-speech voice is configured')
    return isCosyVoice(model) ? this.cosyVoice(text, model, voice, options) : this.qwen(text, model, voice, options)
  }

  private async qwen(text: string, model: string, voice: string, options: DashScopeTtsOptions): Promise<TtsResult> {
    const { config, credentials } = this.deps
    const connection = this.deps.connection()
    const language = options.languageType ?? config.ttsLanguage.get()
    const body = await postJson<QwenSpeech>(this.send, multimodalUrl(connection.baseUrl), await connectionHeaders(connection, credentials), {
      model,
      input: { text, voice, ...language === '' || language === 'Auto' ? {} : { language_type: language } },
    }, config.timeoutMs.get(), options.signal)
    const url = body.output?.audio?.url
    if (typeof url !== 'string' || url === '') throw new AiError('unavailable', `${connection.baseUrl} answered without an audio address`)
    const file = await download(this.send, url, config.timeoutMs.get(), options.signal)
    if (file.body === null) throw new AiError('unavailable', `${url} answered without audio`)
    return { audio: file.body, mediaType: file.headers.get('content-type')?.split(';', 1)[0]?.trim() || MEDIA_TYPES.wav, model }
  }

  private async cosyVoice(text: string, model: string, voice: string, options: DashScopeTtsOptions): Promise<TtsResult> {
    const { config, credentials } = this.deps
    const connection = this.deps.connection()
    const url = inferenceSocketUrl(connection.baseUrl)
    const headers = await connectionHeaders(connection, credentials)
    const format = options.format ?? config.ttsFormat.get()
    const taskId = crypto.randomUUID()
    const message = (action: string, payload: Record<string, unknown>): string => JSON.stringify({ header: { action, task_id: taskId, streaming: 'duplex' }, payload })
    const socket = this.deps.socket?.(url, headers) ?? await defaultSocket(url, headers)

    let output!: ReadableStreamDefaultController<Uint8Array>
    const audio = new ReadableStream<Uint8Array>({ start: (controller) => { output = controller }, cancel: () => { socket.close() } })
    let started = false
    let finished = false
    let resolveStarted!: () => void
    let rejectStarted!: (error: AiError) => void
    const ready = new Promise<void>((resolve, reject) => { resolveStarted = resolve; rejectStarted = reject })
    const timer = setTimeout(() => { fail(new AiError('unavailable', `${url} did not start the speech task within ${config.timeoutMs.get()} ms`)) }, Math.max(1, config.timeoutMs.get()))
    const fail = (error: AiError): void => {
      clearTimeout(timer)
      if (started) { if (!finished) output.error(error) } else rejectStarted(error)
      finished = true
      socket.close()
    }
    socket.addEventListener('open', () => {
      socket.send(message('run-task', {
        task_group: 'audio', task: 'tts', function: 'SpeechSynthesizer', model,
        parameters: {
          text_type: 'PlainText', voice, format,
          ...options.sampleRate === undefined ? {} : { sample_rate: options.sampleRate },
          ...options.volume === undefined ? {} : { volume: options.volume },
          ...options.rate === undefined ? {} : { rate: options.rate },
          ...options.pitch === undefined ? {} : { pitch: options.pitch },
          ...options.enableSsml === undefined ? {} : { enable_ssml: options.enableSsml },
          ...options.instruction === undefined ? {} : { instruction: options.instruction },
        },
        input: {},
      }))
    })
    socket.addEventListener('message', (event) => {
      const frame = binary(event.data)
      if (frame !== undefined) { if (started && !finished) output.enqueue(frame); return }
      let header: { event?: string; error_code?: string; error_message?: string }
      try { header = (JSON.parse(String(event.data)) as { header?: typeof header }).header ?? {} } catch (error) { fail(new AiError('unavailable', 'the speech service sent a message that is not JSON', { cause: error })); return }
      if (header.event === 'task-started') {
        clearTimeout(timer)
        started = true
        socket.send(message('continue-task', { input: { text } }))
        socket.send(message('finish-task', { input: {} }))
        resolveStarted()
      } else if (header.event === 'task-finished') {
        finished = true
        output.close()
        socket.close()
      } else if (header.event === 'task-failed') {
        const said = [header.error_code, header.error_message].filter(Boolean).join(': ')
        fail(new AiError(/InvalidApiKey|Unauthorized|AccessDenied/i.test(header.error_code ?? '') ? 'rejected' : /Throttling|Rate/i.test(header.error_code ?? '') ? 'unavailable' : 'rejected', `the speech task failed${said === '' ? '' : `: ${said}`}`))
      }
    })
    socket.addEventListener('error', () => { fail(new AiError('unavailable', `${url} could not run the speech task`)) })
    socket.addEventListener('close', () => { if (!finished) fail(new AiError('unavailable', `${url} closed before the speech was complete`)) })
    options.signal?.addEventListener('abort', () => { fail(new AiError('cancelled', 'cancelled')) }, { once: true })

    await ready
    return { audio, mediaType: MEDIA_TYPES[format], model }
  }
}

async function defaultSocket(url: string, headers: Record<string, string>): Promise<SocketLike> {
  const { WebSocket } = await import('ws')
  return new WebSocket(url, { headers }) as unknown as SocketLike
}
