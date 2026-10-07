import { AiService } from './service.ts'

export interface SpeechProviderInfo {
  readonly id: string
  readonly name: string
  readonly location: 'host-local' | 'cloud'
  readonly languages: readonly string[]
}

export interface SpeechInput {
  readonly audio: Uint8Array
  readonly language: string
}

export interface Transcript {
  readonly text: string
  readonly audioSeconds: number
  readonly inferenceSeconds: number
}

export type SttLiveEvent =
  | { type: 'delta'; text: string }
  | { type: 'final'; text: string }
  | { type: 'error'; error: Error }

export interface SttLiveOptions {
  signal?: AbortSignal
  language?: string
  prompt?: string
  /** Encoding of chunks sent to the live session. OpenAI-compatible services use 24 kHz mono PCM16 by default. */
  format?: 'pcm16' | 'g711_ulaw' | 'g711_alaw'
}

export interface SttLiveSession {
  readonly events: AsyncIterable<SttLiveEvent>
  append(audio: Uint8Array): void
  commit(): void
  close(): void
}

/** A completed-recording provider compatible with DSH's speech registry. */
export abstract class SttService extends AiService {
  readonly capability = 'stt' as const
  abstract readonly info: SpeechProviderInfo
  abstract transcribe(input: SpeechInput, signal: AbortSignal): Promise<Transcript>
}

/** Separate realtime capability; completed-recording providers need not implement it. */
export interface StreamingSttService<Options extends SttLiveOptions = SttLiveOptions> {
  startStreaming(options?: Options): Promise<SttLiveSession>
}

export function supportsStreamingStt(service: SttService): service is SttService & StreamingSttService {
  return typeof Reflect.get(service, 'startStreaming') === 'function'
}
