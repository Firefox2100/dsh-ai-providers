import { AiService, type CallOptions } from './service.ts'

export interface SttOptions extends CallOptions {
  language?: string
  prompt?: string
}

export interface SttResult { text: string; model: string; durationSeconds?: number }

export type SttLiveEvent =
  | { type: 'delta'; text: string }
  | { type: 'final'; text: string }
  | { type: 'error'; error: Error }

export interface SttLiveOptions extends SttOptions {
  /** Encoding of chunks sent to the live session. OpenAI-compatible services use 24 kHz mono PCM16 by default. */
  format?: 'pcm16' | 'g711_ulaw' | 'g711_alaw'
}

export interface SttLiveSession {
  readonly events: AsyncIterable<SttLiveEvent>
  append(audio: Uint8Array): void
  commit(): void
  close(): void
}

/** Transcribes completed audio files and live audio streams. */
export abstract class SttService<FileOptions extends SttOptions = SttOptions, LiveOptions extends SttLiveOptions = SttLiveOptions> extends AiService {
  readonly capability = 'stt' as const
  abstract transcribe(audio: Blob, options?: FileOptions): Promise<SttResult>
  abstract startLive(options?: LiveOptions): Promise<SttLiveSession>
}
