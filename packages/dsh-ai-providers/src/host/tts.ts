import type { RequestGate } from './gate.ts'
import { AiError, TtsService, type AiProviderRegistry, type CallOptions, type TtsOptions, type TtsResult, type TtsVoice } from 'dsh-ai-core'

interface Source {
  selected: () => string
  registry: Pick<AiProviderRegistry, 'get'>
  gate?: RequestGate
}

const NAME_OF_NONE = 'none'

/** What `ctx.textToSpeech` is: a live facade over the selected provider. */
export class ConfiguredTts extends TtsService {
  constructor(private readonly source: Source) { super() }

  get provider(): string { return this.source.selected() || NAME_OF_NONE }
  get model(): string { return this.current()?.model ?? NAME_OF_NONE }

  async synthesize(text: string, options: TtsOptions = {}): Promise<TtsResult> {
    const service = this.current()
    if (service === undefined) throw new AiError('not-configured', 'no text-to-speech provider is selected, or the selected one is not loaded')
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    if (text.trim() === '') throw new AiError('invalid-input', 'the text is empty')
    const release = await this.source.gate?.acquire({ capability: 'tts', priority: options.priority, signal: options.signal }) ?? (() => undefined)
    let answer: TtsResult
    try { answer = await service.synthesize(text, options) } catch (error) { release(); throw error }
    // The synthesis goes on while the audio is read, so the resource is held until the body ends or is dropped.
    answer = { ...answer, audio: releasing(answer.audio, release) }
    if (!(answer.audio instanceof ReadableStream)) throw new AiError('unavailable', `${service.provider} returned no audio stream`)
    if (answer.mediaType.trim() === '') throw new AiError('unavailable', `${service.provider} returned no audio media type`)
    return answer
  }

  override async voices(options: CallOptions = {}): Promise<TtsVoice[]> {
    const service = this.current()
    if (service === undefined) throw new AiError('not-configured', 'no text-to-speech provider is selected, or the selected one is not loaded')
    return await service.voices(options)
  }

  private current(): TtsService | undefined {
    const id = this.source.selected()
    const factory = id === '' ? undefined : this.source.registry.get(id)?.capabilities.tts
    return factory?.()
  }
}

/** The same stream; `release` is called once when it ends, fails or is cancelled. */
function releasing(stream: ReadableStream<Uint8Array>, release: () => void): ReadableStream<Uint8Array> {
  const reader = stream.getReader()
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const part = await reader.read()
        if (part.done) { release(); controller.close() } else controller.enqueue(part.value)
      } catch (error) { release(); controller.error(error) }
    },
    async cancel(reason) { release(); await reader.cancel(reason) },
  })
}
