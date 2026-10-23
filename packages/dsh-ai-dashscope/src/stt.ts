import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { AiError, SttService, type RequestOption, type SpeechInput, type SpeechProviderInfo, type Transcript } from '@dsh-ai-providers/core'
import { multimodalUrl, postJson } from './api.ts'
import { connectionHeaders, type DashScopeConnection } from './connection.ts'

export const STT_REQUEST_OPTIONS: readonly RequestOption[] = [
  { key: 'language', type: 'string', label: { en: 'Language', zh: '语言' }, description: { en: 'Language code of the speech, such as zh or en, when known; leave empty to let the model detect it.', zh: '已知时填写语音的语言代码，例如 zh 或 en；留空则由模型自动检测。' } },
]

export interface DashScopeSttSettings {
  sttModel: { get(): string }
  sttEnableItn: { get(): boolean }
  timeoutMs: { get(): number }
}

export interface DashScopeSttDeps {
  config: DashScopeSttSettings
  provider: string
  credentials: () => Pick<CredentialProvider, 'resolve'> | undefined
  connection: () => DashScopeConnection
  /** Replaceable for tests. */
  fetch?: typeof fetch
}

interface Answer {
  output?: {
    text?: unknown
    output?: { sentence?: { text?: unknown } }
    choices?: { message?: { content?: unknown } }[]
  }
  usage?: { seconds?: unknown; input_tokens_details?: { audio_tokens?: unknown } }
}

/** The transcript wherever the answer puts it: as plain `text`, as a `sentence`, or as the message of a chat-style answer (a string or parts). */
export function transcriptOf(body: Answer): string | undefined {
  const output = body.output
  if (typeof output?.text === 'string') return output.text
  const sentence = output?.output?.sentence?.text
  if (typeof sentence === 'string') return sentence
  const content = output?.choices?.[0]?.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map(part => typeof (part as { text?: unknown }).text === 'string' ? (part as { text: string }).text : '').join('')
  return undefined
}

function waveSeconds(audio: Uint8Array): number {
  if (audio.byteLength < 44) return 0
  const view = new DataView(audio.buffer, audio.byteOffset, audio.byteLength)
  const bytesPerSecond = view.getUint32(28, true)
  return bytesPerSecond === 0 ? 0 : view.getUint32(40, true) / bytesPerSecond
}

/**
 * Speech recognition for a finished recording from Qwen-ASR, through the multimodal generation endpoint: the recording goes in as a
 * data URL and the transcript comes back in the answer. The model takes recordings of up to 5 minutes and 10 MB. Live recognition is
 * a separate DashScope protocol that this provider does not offer.
 */
export class DashScopeSttService extends SttService {
  private readonly send: typeof fetch

  constructor(private readonly deps: DashScopeSttDeps) {
    super()
    this.send = deps.fetch ?? fetch
  }

  get provider(): string { return this.deps.provider }

  get model(): string { return this.deps.config.sttModel.get() }

  get info(): SpeechProviderInfo {
    return { id: this.provider, name: 'DashScope', location: 'cloud', languages: ['auto', 'zh', 'en', 'yue', 'ja', 'ko'] }
  }

  async transcribe(input: SpeechInput, signal: AbortSignal): Promise<Transcript> {
    if (input.audio.byteLength === 0) throw new AiError('invalid-input', 'the audio recording is empty')
    if (signal.aborted) throw new AiError('cancelled', 'cancelled')
    const { config, credentials } = this.deps
    const model = config.sttModel.get().trim()
    if (model === '') throw new AiError('not-configured', 'no speech-to-text model is configured')
    const connection = this.deps.connection()
    const headers = await connectionHeaders(connection, credentials)
    const started = performance.now()
    const body = await postJson<Answer>(this.send, multimodalUrl(connection.baseUrl), headers, {
      model,
      input: { messages: [{ role: 'user', content: [{ type: 'input_audio', input_audio: { data: `data:audio/wav;base64,${Buffer.from(input.audio).toString('base64')}` } }] }] },
      parameters: { asr_options: { enable_itn: config.sttEnableItn.get(), ...input.language === 'auto' ? {} : { language: input.language } } },
    }, config.timeoutMs.get(), signal)
    const text = transcriptOf(body)
    if (text === undefined) throw new AiError('unavailable', `${connection.baseUrl} answered without a transcript`)
    const seconds = body.usage?.seconds
    return { text, audioSeconds: typeof seconds === 'number' ? seconds : waveSeconds(input.audio), inferenceSeconds: (performance.now() - started) / 1000 }
  }
}
