import { AiError, EmbeddingService, type AiProviderRegistry, type EmbedOptions, type EmbeddingResult } from 'dsh-ai-core'

interface Source {
  /** The id of the selected provider; empty for none. */
  selected: () => string
  registry: Pick<AiProviderRegistry, 'get'>
  /** How long a prepared vector waits to be retrieved, in milliseconds. */
  holdMs: () => number
}

/** A vector with the model that made it. */
interface Computed { vector: number[]; model: string }

/** Work in progress for one text. `hold` is whether the result is kept for a later `embed` once it is done. */
interface Pending { promise: Promise<Computed>; hold: boolean }

const NAME_OF_NONE = 'none'

/**
 * What `ctx.embeddings` is: the service of the selected provider, as the consumer should meet
 * it. It asks for no more than is needed and keeps nothing for good: persisting vectors is for
 * whoever stores them next to its own data. What it does hold is work in flight and what was
 * asked for ahead of time:
 *
 * - a text already being computed is not asked for twice, by one call or by two at once;
 * - what is missing goes to the provider in one call;
 * - `prefetch` starts the work and the result waits until `embed` retrieves it (once, and for a
 *   limited time, so that nothing piles up if it never is); a text nobody prefetched is computed
 *   when asked for and handed over, not kept.
 *
 * Whatever the path, a vector the consumer receives is ready for use.
 */
export class ConfiguredEmbedding extends EmbeddingService {
  private readonly pending = new Map<string, Pending>()
  private readonly ready = new Map<string, { value: Computed; expires: number }>()

  constructor(private readonly source: Source) {
    super()
  }

  get provider(): string {
    return this.source.selected() || NAME_OF_NONE
  }

  get model(): string {
    return this.current()?.service.model ?? NAME_OF_NONE
  }

  /** How many vectors are prepared and waiting to be retrieved. */
  get waiting(): number {
    this.sweep()
    return this.ready.size
  }

  /** Forget what is prepared. */
  clear(): void {
    this.ready.clear()
  }

  async embed(texts: readonly string[], options: EmbedOptions = {}): Promise<EmbeddingResult> {
    const { signal } = options
    const current = this.current()
    if (current === undefined) throw new AiError('not-configured', 'no embedding provider is selected, or the selected one is not loaded')
    if (signal?.aborted === true) throw new AiError('cancelled', 'cancelled')
    const { service } = current
    const prefix = this.prefixOf(current, options)
    this.sweep()

    const found: (Computed | undefined)[] = texts.map((text) => {
      const key = prefix + text
      const held = this.ready.get(key)
      if (held === undefined) return undefined
      this.ready.delete(key)
      return held.value
    })
    const missing = texts.filter((text, index) => found[index] === undefined && !this.pending.has(prefix + text))
    if (missing.length > 0) this.compute(prefix, [...new Set(missing)], service, options, false)

    await Promise.all(texts.map(async (text, index) => {
      if (found[index] !== undefined) return
      const entry = this.pending.get(prefix + text)
      // Someone is retrieving it now, so it is not kept when it is done.
      if (entry !== undefined) entry.hold = false
      const value = await cancellable(entry?.promise, signal)
      if (value === undefined) throw new AiError('unavailable', 'the embedding was not produced')
      found[index] = value
    }))

    const vectors = found.map(entry => entry!.vector)
    return { vectors, model: found[0]?.model ?? service.model, dimensions: vectors[0]?.length ?? 0 }
  }

  override prefetch(texts: readonly string[], options: EmbedOptions = {}): void {
    const current = this.current()
    if (current === undefined) return
    const prefix = this.prefixOf(current, options)
    this.sweep()
    const wanted = [...new Set(texts)].filter(text => !this.ready.has(prefix + text) && !this.pending.has(prefix + text))
    if (wanted.length > 0) this.compute(prefix, wanted, current.service, options, true)
  }

  /** Send these texts to the provider in one call, and share the answer with everyone waiting for one of them. */
  private compute(prefix: string, texts: string[], service: EmbeddingService, options: EmbedOptions, hold: boolean): void {
    const { signal: _signal, ...request } = options
    // The call is shared, so it does not stop when one caller does: callers stop waiting instead.
    const call = service.embed(texts, request).then((answer) => {
      if (answer.vectors.length !== texts.length) throw new AiError('unavailable', `${service.provider} returned ${answer.vectors.length} vectors for ${texts.length} texts`)
      return answer
    })
    texts.forEach((text, index) => {
      const key = prefix + text
      const entry: Pending = { hold, promise: call.then(answer => ({ vector: answer.vectors[index]!, model: answer.model })) }
      this.pending.set(key, entry)
      entry.promise.then(
        (value) => {
          if (this.pending.get(key) === entry) this.pending.delete(key)
          if (entry.hold) this.ready.set(key, { value, expires: Date.now() + this.source.holdMs() })
        },
        () => { if (this.pending.get(key) === entry) this.pending.delete(key) },
      )
    })
  }

  private sweep(): void {
    const now = Date.now()
    for (const [key, held] of this.ready) if (held.expires <= now) this.ready.delete(key)
  }

  /** What tells two requests apart besides the text: who computes them, with which model and which options. */
  private prefixOf(current: { id: string; service: EmbeddingService }, options: EmbedOptions): string {
    const { signal: _signal, ...request } = options
    return `${current.id}\u0000${current.service.model}\u0000${JSON.stringify(sorted(request))}\u0000`
  }

  private current(): { id: string; service: EmbeddingService } | undefined {
    const id = this.source.selected()
    const factory = id === '' ? undefined : this.source.registry.get(id)?.capabilities.embedding
    return factory === undefined ? undefined : { id, service: factory() }
  }
}

const sorted = (value: object): object => Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined).sort(([a], [b]) => (a < b ? -1 : 1)))

/** Wait for a shared computation, but let one caller stop waiting when it is cancelled. */
function cancellable<T>(promise: Promise<T> | undefined, signal: AbortSignal | undefined): Promise<T | undefined> {
  if (promise === undefined || signal === undefined) return promise ?? Promise.resolve(undefined)
  return new Promise<T>((resolve, reject) => {
    const abort = (): void => { reject(new AiError('cancelled', 'cancelled')) }
    if (signal.aborted) return abort()
    signal.addEventListener('abort', abort, { once: true })
    promise.then(resolve, reject).finally(() => { signal.removeEventListener('abort', abort) })
  })
}
