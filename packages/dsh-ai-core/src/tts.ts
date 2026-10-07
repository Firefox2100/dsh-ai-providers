import { AiService, type CallOptions } from './service.ts'

export interface TtsOptions extends CallOptions { voice?: string }

export interface TtsVoice {
  id: string
  name?: string
  description?: string
}

export interface TtsResult {
  /** Audio bytes as the provider produces them; consumers may play or persist them without buffering the whole response. */
  audio: ReadableStream<Uint8Array>
  /** The response media type, such as `audio/mpeg`. */
  mediaType: string
  /** The model that produced the speech. */
  model: string
}

/** Turns text into streamed speech audio. Provider-specific voices and formats extend the request options. */
export abstract class TtsService<Options extends TtsOptions = TtsOptions> extends AiService {
  readonly capability = 'tts' as const

  /** @throws {AiError} with a code that says why synthesis could not start. */
  abstract synthesize(text: string, options?: Options): Promise<TtsResult>

  /** Voices the provider can enumerate. An empty list means callers should accept a manually entered id. */
  async voices(_options: CallOptions = {}): Promise<TtsVoice[]> { return [] }
}
