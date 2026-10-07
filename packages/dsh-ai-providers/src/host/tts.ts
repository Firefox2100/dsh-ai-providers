import { AiError, TtsService, type AiProviderRegistry, type CallOptions, type TtsOptions, type TtsResult, type TtsVoice } from 'dsh-ai-core'

interface Source {
  selected: () => string
  registry: Pick<AiProviderRegistry, 'get'>
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
    const answer = await service.synthesize(text, options)
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
