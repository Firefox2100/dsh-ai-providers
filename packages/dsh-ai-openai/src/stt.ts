import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, SttService, httpFailure, readJson, type SttLiveEvent, type SttLiveOptions, type SttLiveSession, type SttOptions, type SttResult } from 'dsh-ai-core'
import type { Config } from './config.ts'
import { PROVIDER_ID } from './ids.ts'
import { connectionHeaders, type OpenAiConnection } from './connection.ts'

export interface OpenAiSttOptions extends SttOptions { filename?: string; temperature?: number }
export interface OpenAiLiveSttOptions extends SttLiveOptions { model?: string }

interface SocketLike {
  addEventListener(type: string, listener: (event: { data?: unknown }) => void): void
  send(data: string): void
  close(): void
}
type SocketFactory = (url: string, headers: Record<string, string>) => SocketLike

export interface OpenAiSttDeps {
  config: Config
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  connection: () => OpenAiConnection
  fetch?: typeof fetch
  socket?: SocketFactory
}

interface TranscriptionResponse { text?: unknown; duration?: unknown; model?: unknown; error?: { message?: unknown } }

class EventQueue implements AsyncIterable<SttLiveEvent> {
  private values: SttLiveEvent[] = []
  private waiters: ((value: IteratorResult<SttLiveEvent>) => void)[] = []
  private ended = false
  push(value: SttLiveEvent): void {
    if (this.ended) return
    const waiter = this.waiters.shift()
    if (waiter === undefined) this.values.push(value)
    else waiter({ value, done: false })
  }
  end(): void {
    if (this.ended) return
    this.ended = true
    for (const waiter of this.waiters.splice(0)) waiter({ value: undefined, done: true })
  }
  [Symbol.asyncIterator](): AsyncIterator<SttLiveEvent> {
    return { next: () => this.values.length > 0 ? Promise.resolve({ value: this.values.shift()!, done: false }) : this.ended ? Promise.resolve({ value: undefined, done: true }) : new Promise(resolve => this.waiters.push(resolve)) }
  }
}

class OpenAiLiveSession implements SttLiveSession {
  readonly events: AsyncIterable<SttLiveEvent>
  constructor(private readonly socket: SocketLike, private readonly queue: EventQueue) { this.events = queue }
  append(audio: Uint8Array): void {
    if (audio.byteLength === 0) return
    this.socket.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: Buffer.from(audio).toString('base64') }))
  }
  commit(): void { this.socket.send(JSON.stringify({ type: 'input_audio_buffer.commit' })) }
  close(): void { this.socket.close(); this.queue.end() }
}

export class OpenAiSttService extends SttService<OpenAiSttOptions, OpenAiLiveSttOptions> {
  readonly provider = PROVIDER_ID
  private readonly send: typeof fetch
  constructor(private readonly deps: OpenAiSttDeps) { super(); this.send = deps.fetch ?? fetch }
  get model(): string { return this.deps.config.sttModel.get() }

  async transcribe(audio: Blob, options: OpenAiSttOptions = {}): Promise<SttResult> {
    if (audio.size === 0) throw new AiError('invalid-input', 'the audio file is empty')
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    const model = this.deps.config.sttModel.get().trim()
    if (model === '') throw new AiError('not-configured', 'no speech-to-text model is configured')
    const connection = this.connection()
    const root = connection.baseUrl
    const headers = await connectionHeaders(connection, this.deps.credentials)
    const form = new FormData()
    form.set('file', audio, options.filename ?? `audio.${extension(audio.type)}`)
    form.set('model', model); form.set('response_format', 'json')
    if (options.language !== undefined) form.set('language', options.language)
    if (options.prompt !== undefined) form.set('prompt', options.prompt)
    if (options.temperature !== undefined) form.set('temperature', String(options.temperature))
    const response = await this.request(`${root}/audio/transcriptions`, { method: 'POST', headers, body: form }, options.signal)
    const body = await readJson<TranscriptionResponse>(response)
    if (!response.ok) throw httpFailure(response, typeof body?.error?.message === 'string' ? body.error.message : undefined)
    if (typeof body?.text !== 'string') throw new AiError('unavailable', `${root} answered without a transcript`)
    return { text: body.text, model: typeof body.model === 'string' ? body.model : model, ...(typeof body.duration === 'number' ? { durationSeconds: body.duration } : {}) }
  }

  async startLive(options: OpenAiLiveSttOptions = {}): Promise<SttLiveSession> {
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    const model = (options.model ?? this.deps.config.sttRealtimeModel.get()).trim()
    if (model === '') throw new AiError('not-configured', 'no live speech-to-text model is configured')
    const connection = this.connection()
    const headers = await connectionHeaders(connection, this.deps.credentials)
    const url = `${connection.baseUrl.replace(/^http/, 'ws')}/realtime?intent=transcription`
    const socket = this.deps.socket?.(url, headers) ?? await defaultSocket(url, headers)
    const queue = new EventQueue()
    let opened = false
    const ready = new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => {
        opened = true
        socket.send(JSON.stringify({ type: 'transcription_session.update', session: { input_audio_format: options.format ?? 'pcm16', input_audio_transcription: { model, ...(options.language === undefined ? {} : { language: options.language }), ...(options.prompt === undefined ? {} : { prompt: options.prompt }) }, turn_detection: null } }))
        resolve()
      })
      socket.addEventListener('error', () => {
        const error = new AiError('unavailable', opened ? 'the live transcription connection failed' : `${url} could not open a live transcription session`)
        if (!opened) reject(error)
        else { queue.push({ type: 'error', error }); queue.end() }
      })
    })
    socket.addEventListener('message', event => handleLive(event.data, queue))
    socket.addEventListener('close', () => queue.end())
    options.signal?.addEventListener('abort', () => { queue.push({ type: 'error', error: new AiError('cancelled', 'cancelled') }); queue.end(); socket.close() }, { once: true })
    await ready
    return new OpenAiLiveSession(socket, queue)
  }

  private connection(): OpenAiConnection {
    return this.deps.connection()
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

const extension = (type: string): string => ({ 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/webm': 'webm', 'audio/flac': 'flac' })[type] ?? 'wav'

function handleLive(raw: unknown, queue: EventQueue): void {
  try {
    const event = JSON.parse(typeof raw === 'string' ? raw : Buffer.from(raw as ArrayBuffer).toString('utf8')) as { type?: string; delta?: unknown; transcript?: unknown; error?: { message?: unknown } }
    if (event.type === 'conversation.item.input_audio_transcription.delta' && typeof event.delta === 'string') queue.push({ type: 'delta', text: event.delta })
    else if (event.type === 'conversation.item.input_audio_transcription.completed' && typeof event.transcript === 'string') queue.push({ type: 'final', text: event.transcript })
    else if (event.type === 'error') queue.push({ type: 'error', error: new AiError('rejected', typeof event.error?.message === 'string' ? event.error.message : 'live transcription failed') })
  } catch (error) { queue.push({ type: 'error', error: new AiError('unavailable', 'live transcription returned an invalid event', { cause: error }) }) }
}

async function defaultSocket(url: string, headers: Record<string, string>): Promise<SocketLike> {
  const { WebSocket } = await import('ws')
  return new WebSocket(url, { headers: { ...headers, 'OpenAI-Beta': 'realtime=v1' } }) as unknown as SocketLike
}
