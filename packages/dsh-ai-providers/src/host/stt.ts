import { AiError, SttService, supportsStreamingStt, type AiProviderRegistry, type SpeechInput, type SpeechProviderInfo, type SttLiveOptions, type SttLiveSession, type Transcript } from 'dsh-ai-core'

interface Source { selected: () => string; registry: Pick<AiProviderRegistry, 'get'> }
const NONE = 'none'

export class ConfiguredStt extends SttService {
  constructor(private readonly source: Source) { super() }
  get provider(): string { return this.source.selected() || NONE }
  get model(): string { return this.current()?.model ?? NONE }
  get info(): SpeechProviderInfo { return this.need().info }

  async transcribe(input: SpeechInput, signal: AbortSignal): Promise<Transcript> {
    const service = this.need()
    if (signal.aborted) throw new AiError('cancelled', 'cancelled')
    if (input.audio.byteLength === 0) throw new AiError('invalid-input', 'the audio recording is empty')
    const answer = await service.transcribe(input, signal)
    if (typeof answer.text !== 'string') throw new AiError('unavailable', `${service.provider} returned no transcript`)
    return answer
  }

  startStreaming(options: SttLiveOptions = {}): Promise<SttLiveSession> {
    if (options.signal?.aborted === true) return Promise.reject(new AiError('cancelled', 'cancelled'))
    const service = this.need()
    if (!supportsStreamingStt(service)) return Promise.reject(new AiError('unsupported', 'the selected speech-to-text provider does not support live transcription'))
    return service.startStreaming(options)
  }

  private need(): SttService {
    const service = this.current()
    if (service === undefined) throw new AiError('not-configured', 'no speech-to-text provider is selected, or the selected one is not loaded')
    return service
  }

  private current(): SttService | undefined {
    const id = this.source.selected()
    return (id === '' ? undefined : this.source.registry.get(id)?.capabilities.stt)?.()
  }
}
