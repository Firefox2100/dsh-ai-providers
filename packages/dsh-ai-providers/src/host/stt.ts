import { AiError, SttService, type AiProviderRegistry, type SttLiveOptions, type SttLiveSession, type SttOptions, type SttResult } from 'dsh-ai-core'

interface Source { selected: () => string; registry: Pick<AiProviderRegistry, 'get'> }
const NONE = 'none'

export class ConfiguredStt extends SttService {
  constructor(private readonly source: Source) { super() }
  get provider(): string { return this.source.selected() || NONE }
  get model(): string { return this.current()?.model ?? NONE }

  async transcribe(audio: Blob, options: SttOptions = {}): Promise<SttResult> {
    const service = this.need()
    if (options.signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    if (audio.size === 0) throw new AiError('invalid-input', 'the audio file is empty')
    const answer = await service.transcribe(audio, options)
    if (typeof answer.text !== 'string') throw new AiError('unavailable', `${service.provider} returned no transcript`)
    return answer
  }

  startLive(options: SttLiveOptions = {}): Promise<SttLiveSession> {
    if (options.signal?.aborted === true) return Promise.reject(new AiError('cancelled', 'cancelled'))
    return this.need().startLive(options)
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
