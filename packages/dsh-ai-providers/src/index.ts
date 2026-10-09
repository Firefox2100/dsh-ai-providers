import type { Context } from '@deepseek-ai/cordis'
// Type-only: declares `ctx.aiProviders` and `ctx.embeddings`.
import type {} from 'dsh-ai-core'
import { Config } from './host/config.ts'
import { registerApi } from './host/http.ts'
import { AiProviders } from './host/registry.ts'
import { AiServices } from './host/services.ts'
import { LlmRoutes } from './host/llm.ts'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type {} from '@deepseek-ai/dsh-llm'

interface DshSpeechRegistry {
  register(provider: { readonly info: { readonly id: string; readonly name: string; readonly location: 'host-local' | 'cloud'; readonly languages: readonly string[] }; transcribe(input: { audio: Uint8Array; language: string }, signal: AbortSignal): Promise<{ text: string; audioSeconds: number; inferenceSeconds: number }> }): () => Promise<void>
}

export { Config } from './host/config.ts'
export { AiProviders } from './host/registry.ts'
export { ConfiguredEmbedding } from './host/embedding.ts'
export { ConfiguredRerank } from './host/rerank.ts'
export { ConfiguredTts } from './host/tts.ts'
export { ConfiguredStt } from './host/stt.ts'
export { ConfiguredImageGeneration } from './host/image.ts'
export { AiServices } from './host/services.ts'
export { AiLlmAdapter, LlmRoutes, mergeSampling } from './host/llm.ts'
export const name = 'dsh-ai-providers'

export function apply(ctx: Context, config: Config): void {
  const registry = new AiProviders(ctx)
  const services = new AiServices(ctx, registry, config)
  const llm = new LlmRoutes(ctx, registry, (message) => { ctx.logger.warn(message) })
  registerLlm(ctx, registry, llm)
  registerApi(ctx, { registry, services, llm })
  registerDshSpeechProvider(ctx, services, registry)
}

/** Serves the providers' language model routes to DSH while its model service is there, and follows providers and settings as they change. */
function registerLlm(ctx: Context, registry: AiProviders, llm: LlmRoutes): void {
  ctx.inject(['llm'], (llmCtx) => {
    const sync = (): void => { llm.sync() }
    sync()
    const unsubscribe = registry.subscribe(sync)
    const stopVolatile = ctx.on('loader/volatile-update', sync)
    llmCtx.effect(() => () => { unsubscribe(); stopVolatile(); llm.dispose() }, 'dsh-ai-providers: language model routes')
  })
}

/** Contribute API transcription to DSH Voice Input without owning its provider registry. */
function registerDshSpeechProvider(ctx: Context, services: AiServices, registry: AiProviders): void {
  ctx.inject(['speechToText'], (speechCtx) => {
    const speech = Reflect.get(speechCtx, 'speechToText') as DshSpeechRegistry
    let selected = '', remove: (() => Promise<void>) | undefined
    let pending = Promise.resolve()
    const reconcile = (): void => {
      pending = pending.then(async () => {
        const next = services.available('stt') ? services.selected('stt') : ''
        if (next === selected) return
        await remove?.(); remove = undefined; selected = ''
        if (next === '') return
        // The registry reads `info` again when the provider is removed, by which time the service may have no provider behind it.
        const stt = services.stt
        const info = { ...stt.info }
        remove = speech.register({ info, transcribe: (input, signal) => stt.transcribe(input, signal) })
        selected = next
      })
    }
    reconcile()
    const unsubscribe = registry.subscribe(reconcile)
    const volatile = (): void => { reconcile() }
    const stopVolatile = ctx.on('loader/volatile-update', volatile)
    speechCtx.effect(() => async () => { unsubscribe(); stopVolatile(); await pending; await remove?.() }, 'dsh-ai-providers: DSH speech provider')
  })
}
