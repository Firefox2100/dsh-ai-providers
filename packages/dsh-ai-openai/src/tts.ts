import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, TtsService, httpFailure, readJson, type CallOptions, type TtsOptions, type TtsResult, type TtsVoice } from 'dsh-ai-core'
import type { Config } from './config.ts'
import { PROVIDER_ID } from './ids.ts'
import { connectionHeaders, type OpenAiConnection } from './connection.ts'

export type OpenAiSpeechFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm'

export interface OpenAiTtsOptions extends TtsOptions {
  voice?: string
  responseFormat?: OpenAiSpeechFormat
  speed?: number
  instructions?: string
  user?: string
}

export interface OpenAiTtsDeps {
  config: Config
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  connection: () => OpenAiConnection
  fetch?: typeof fetch
}

interface ErrorResponse { error?: { message?: unknown } }

const MEDIA_TYPES: Record<OpenAiSpeechFormat, string> = {
  mp3: 'audio/mpeg', opus: 'audio/ogg', aac: 'audio/aac', flac: 'audio/flac', wav: 'audio/wav', pcm: 'audio/L16',
}

/** Speech audio from `POST {baseUrl}/audio/speech`, streamed without collecting it in memory. */
export class OpenAiTtsService extends TtsService<OpenAiTtsOptions> {
  readonly provider = PROVIDER_ID
  private readonly send: typeof fetch

  constructor(private readonly deps: OpenAiTtsDeps) {
    super()
    this.send = deps.fetch ?? fetch
  }

  get model(): string { return this.deps.config.ttsModel.get() }

  override async voices(options: CallOptions = {}): Promise<TtsVoice[]> {
    const connection = this.deps.connection(); const root = connection.baseUrl
    if (root === '') throw new AiError('not-configured', 'no base URL is configured')
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    const timeout = AbortSignal.timeout(Math.max(1, this.deps.config.timeoutMs.get()))
    const signal = options.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout])
    let response: Response
    try {
      response = await this.send(`${root}/audio/voices`, { headers: await connectionHeaders(connection, this.deps.credentials), signal })
    } catch (error) {
      if ((options.signal as AbortSignal | undefined)?.aborted === true) throw new AiError('cancelled', 'cancelled', { cause: error })
      if (timeout.aborted) throw new AiError('unavailable', `${root} did not answer within ${this.deps.config.timeoutMs.get()} ms`, { cause: error })
      throw new AiError('unavailable', `${root} could not be reached: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    }
    if (response.status === 404 || response.status === 405) return []
    if (!response.ok) throw httpFailure(response)
    const body = await readJson<{ data?: unknown; voices?: unknown }>(response)
    const rows = Array.isArray(body?.data) ? body.data : Array.isArray(body?.voices) ? body.voices : []
    return rows.flatMap((entry): TtsVoice[] => {
      if (typeof entry === 'string') return [{ id: entry }]
      if (typeof entry !== 'object' || entry === null) return []
      const row = entry as Record<string, unknown>; const id = typeof row['id'] === 'string' ? row['id'] : typeof row['voice_id'] === 'string' ? row['voice_id'] : undefined
      return id === undefined ? [] : [{ id, ...(typeof row['name'] === 'string' ? { name: row['name'] } : {}), ...(typeof row['description'] === 'string' ? { description: row['description'] } : {}) }]
    })
  }

  async synthesize(text: string, options: OpenAiTtsOptions = {}): Promise<TtsResult> {
    if (text.trim() === '') throw new AiError('invalid-input', 'the text is empty')
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    const { config, credentials } = this.deps
    const connection = this.deps.connection()
    const root = connection.baseUrl
    if (root === '') throw new AiError('not-configured', 'no base URL is configured')
    const model = config.ttsModel.get().trim()
    if (model === '') throw new AiError('not-configured', 'no text-to-speech model is configured')
    const voice = (options.voice ?? config.ttsVoice.get()).trim()
    if (voice === '') throw new AiError('not-configured', 'no text-to-speech voice is configured')
    const responseFormat = options.responseFormat ?? config.ttsResponseFormat.get()
    const speed = options.speed ?? config.ttsSpeed.get()
    if (!Number.isFinite(speed) || speed < 0.25 || speed > 4) throw new AiError('invalid-input', 'speed must be from 0.25 to 4')

    const headers: Record<string, string> = { 'content-type': 'application/json', ...await connectionHeaders(connection, credentials) }
    const timeout = AbortSignal.timeout(Math.max(1, config.timeoutMs.get()))
    const signal = options.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout])
    let response: Response
    try {
      response = await this.send(`${root}/audio/speech`, {
        method: 'POST', headers, signal,
        body: JSON.stringify({ model, input: text, voice, response_format: responseFormat, speed, ...(options.instructions === undefined ? {} : { instructions: options.instructions }), ...(options.user === undefined ? {} : { user: options.user }) }),
      })
    } catch (error) {
      if ((options.signal as AbortSignal | undefined)?.aborted === true) throw new AiError('cancelled', 'cancelled', { cause: error })
      if (timeout.aborted) throw new AiError('unavailable', `${root} did not answer within ${config.timeoutMs.get()} ms`, { cause: error })
      throw new AiError('unavailable', `${root} could not be reached: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    }
    if (!response.ok) {
      const body = await readJson<ErrorResponse>(response)
      throw httpFailure(response, typeof body?.error?.message === 'string' ? body.error.message : undefined)
    }
    if (response.body === null) throw new AiError('unavailable', `${root} answered without audio`)
    const mediaType = response.headers.get('content-type')?.split(';', 1)[0]?.trim() || MEDIA_TYPES[responseFormat]
    return { audio: response.body, mediaType, model }
  }
}
