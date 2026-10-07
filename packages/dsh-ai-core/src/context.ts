import type {} from '@deepseek-ai/cordis'
import type { AiProviderRegistry } from './provider.ts'
import type { CapabilityServices } from './capabilities.ts'
import type { StreamingSttService } from './stt.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Offered by the main plugin; vendor plugins register their providers here. */
    aiProviders: AiProviderRegistry
    /**
     * The embedding service the profile has selected. It exists only while a provider is
     * selected and loaded, so look it up with `ctx.get('embeddings')`.
     */
    embeddings: CapabilityServices['embedding']
    /** The reranking service the profile has selected; exists only while a provider is selected and loaded. */
    rerankers: CapabilityServices['rerank']
    /** The text-to-speech service the profile has selected; exists only while its provider is selected and loaded. */
    textToSpeech: CapabilityServices['tts']
    /** The API speech recognizer the profile selected; DSH reserves `speechToText` for its provider registry. */
    apiSpeechToText: CapabilityServices['stt']
    /** Optional realtime transcription, separate from DSH's completed-recording provider contract. */
    streamingSpeechToText: StreamingSttService
    /** The image generation service the profile has selected. */
    imageGeneration: CapabilityServices['image']
  }
}
