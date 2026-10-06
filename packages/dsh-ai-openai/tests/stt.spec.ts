import { describe, expect, it } from 'vitest'
import { OpenAiSttService } from '../src/stt.ts'

class FakeSocket {
  sent: Record<string, unknown>[] = []
  private listeners = new Map<string, ((event: { data?: unknown }) => void)[]>()
  addEventListener(type: string, listener: (event: { data?: unknown }) => void): void { this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]) }
  send(data: string): void { this.sent.push(JSON.parse(data)) }
  close(): void { this.emit('close') }
  emit(type: string, data?: unknown): void { for (const listener of this.listeners.get(type) ?? []) listener({ data }) }
}

const setup = () => {
  const settings: Record<string, string | number> = { baseUrl: 'https://speech.example/v1/', apiKeyEnv: 'OPENAI_API_KEY', sttModel: 'whisper-1', sttRealtimeModel: 'gpt-4o-mini-transcribe', timeoutMs: 2000 }
  const field = (name: string) => ({ get: () => settings[name] })
  let request: { url: string; init: RequestInit } | undefined
  const socket = new FakeSocket()
  const service = new OpenAiSttService({
    config: { baseUrl: field('baseUrl'), apiKeyEnv: field('apiKeyEnv'), sttModel: field('sttModel'), sttRealtimeModel: field('sttRealtimeModel'), timeoutMs: field('timeoutMs') } as never,
    connection: () => ({ baseUrl: String(settings.baseUrl).replace(/\/+$/, ''), apiKeyRef: String(settings.apiKeyEnv) }),
    credentials: () => ({ resolve: () => Promise.resolve({ value: 'sk-test', source: 'file' }) }) as never,
    fetch: (async (url: string | URL | Request, init?: RequestInit) => { request = { url: String(url), init: init ?? {} }; return new Response(JSON.stringify({ text: 'Hello there.', duration: 1.2 }), { headers: { 'content-type': 'application/json' } }) }) as typeof fetch,
    socket: (url, headers) => { request = { url, init: { headers } }; queueMicrotask(() => socket.emit('open')); return socket },
  })
  return { service, settings, socket, request: () => request }
}

describe('OpenAI-compatible transcription', () => {
  it('uploads a completed audio file as multipart form data', async () => {
    const { service, request } = setup()
    const result = await service.transcribe(new Blob(['wav'], { type: 'audio/wav' }), { filename: 'clip.wav', language: 'en', prompt: 'Names: Ada' })
    expect(result).toEqual({ text: 'Hello there.', model: 'whisper-1', durationSeconds: 1.2 })
    expect(request()?.url).toBe('https://speech.example/v1/audio/transcriptions')
    expect(request()?.init.headers).toEqual({ authorization: 'Bearer sk-test' })
    const form = request()?.init.body as FormData
    expect(Object.fromEntries([...form.entries()].map(([key, value]) => [key, typeof value === 'string' ? value : value.name]))).toEqual({ file: 'clip.wav', model: 'whisper-1', response_format: 'json', language: 'en', prompt: 'Names: Ada' })
  })

  it('opens a realtime session, appends audio and yields delta and final events', async () => {
    const { service, socket, request } = setup()
    const session = await service.startLive({ language: 'en', prompt: 'Ada', format: 'pcm16' })
    expect(request()).toEqual({ url: 'wss://speech.example/v1/realtime?intent=transcription', init: { headers: { authorization: 'Bearer sk-test' } } })
    expect(socket.sent[0]).toMatchObject({ type: 'transcription_session.update', session: { input_audio_format: 'pcm16', input_audio_transcription: { model: 'gpt-4o-mini-transcribe', language: 'en', prompt: 'Ada' }, turn_detection: null } })
    session.append(new Uint8Array([1, 2, 3])); session.commit()
    expect(socket.sent.slice(1)).toEqual([{ type: 'input_audio_buffer.append', audio: 'AQID' }, { type: 'input_audio_buffer.commit' }])
    const iterator = session.events[Symbol.asyncIterator]()
    socket.emit('message', JSON.stringify({ type: 'conversation.item.input_audio_transcription.delta', delta: 'Hello' }))
    socket.emit('message', JSON.stringify({ type: 'conversation.item.input_audio_transcription.completed', transcript: 'Hello there.' }))
    expect((await iterator.next()).value).toEqual({ type: 'delta', text: 'Hello' })
    expect((await iterator.next()).value).toEqual({ type: 'final', text: 'Hello there.' })
    session.close()
  })

  it('rejects empty files and malformed provider answers', async () => {
    const { service } = setup()
    await expect(service.transcribe(new Blob([]))).rejects.toMatchObject({ code: 'invalid-input' })
  })
})
