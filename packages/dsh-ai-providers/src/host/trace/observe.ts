import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import type { LlmCall } from '@dsh-ai-providers/core'
import type { SpanKind, SpanResult } from '@dsh-ai-providers/core'
import type { Tracer } from './tracer.ts'

export interface CallFacts {
  capability: string
  provider: string
  model: string
  kind?: SpanKind
  input: unknown
}

/** Records one capability call as a span; what `summarize` makes of the answer is its output (never media bytes or whole vectors). */
export function observeCall<T>(tracer: Tracer | undefined, facts: CallFacts, work: () => Promise<T>, summarize: (answer: T) => SpanResult): Promise<T> {
  if (tracer === undefined || !tracer.active) return work()
  return tracer.run({ name: facts.capability, kind: facts.kind ?? 'span', input: facts.input, model: facts.model, metadata: { capability: facts.capability, provider: facts.provider } }, async (span) => {
    const answer = await work()
    span.update(summarize(answer))
    return answer
  })
}

const secondsSince = (start: number, now: number): number => Math.round((now - start) / 10) / 100

/**
 * The same stream, recorded as a generation: what was asked (the messages as the provider's service receives them, the merged sampling),
 * what came back (text, thinking, tool calls), token usage and when the first part arrived. It nests under the span linked to the
 * request's session, else the span current where the request is made.
 */
export async function * observeLlm(tracer: Tracer | undefined, call: LlmCall, stream: () => AsyncIterable<StreamChunk>): AsyncGenerator<StreamChunk> {
  if (tracer === undefined || !tracer.active) { yield * stream(); return }
  const { options } = call
  const parent = tracer.linked(options.sessionId) ?? tracer.current()
  const span = tracer.start({
    name: `llm ${options.model}`, kind: 'generation', model: options.model, parent,
    input: { ...options.system === undefined ? {} : { system: options.system }, messages: options.messages, tools: options.tools?.map(tool => ({ name: tool.name, description: tool.description, parameters: tool.parameters })) },
    modelParameters: { ...call.sampling, ...options.reasoningEffort === undefined ? {} : { reasoningEffort: options.reasoningEffort } },
    metadata: { route: call.route.id, ...options.purpose === undefined ? {} : { purpose: options.purpose }, ...options.sessionId === undefined ? {} : { session: String(options.sessionId) } },
    ...parent === undefined ? { trace: { name: `llm ${options.model}` } } : {},
  })
  let wire: unknown
  call.wire = (body) => { wire = body }
  const started = Date.now()
  let text = '', thinking = ''
  let first: number | undefined
  const calls = new Map<string, { name: string; arguments: string }>()
  const result: SpanResult = {}
  try {
    for await (const chunk of stream()) {
      if (chunk.type === 'text-delta' || chunk.type === 'reasoning-delta' || chunk.type === 'tool-call-delta') first ??= Date.now()
      if (chunk.type === 'text-delta') text += chunk.text
      else if (chunk.type === 'reasoning-delta') thinking += chunk.text
      else if (chunk.type === 'tool-call-delta') {
        const held = calls.get(String(chunk.id)) ?? { name: '', arguments: '' }
        if (chunk.name !== undefined) held.name = chunk.name
        held.arguments += chunk.argumentsDelta
        calls.set(String(chunk.id), held)
      } else if (chunk.type === 'usage') {
        const { inputTokens, outputTokens, totalTokens, cacheReadTokens, reasoningTokens } = chunk.usage
        result.usage = { input: inputTokens, output: outputTokens, ...totalTokens === undefined ? {} : { total: totalTokens }, ...cacheReadTokens === undefined ? {} : { cache_read: cacheReadTokens }, ...reasoningTokens === undefined ? {} : { reasoning: reasoningTokens } }
      } else if (chunk.type === 'finish') result.metadata = { finish: String(chunk.reason) }
      yield chunk
    }
    span.end({ ...result, ...wire === undefined ? {} : { wire }, output: { text, ...thinking === '' ? {} : { thinking }, ...calls.size === 0 ? {} : { toolCalls: [...calls.values()] } }, ...first === undefined ? {} : { firstTokenAt: first }, metadata: { ...result.metadata, seconds: secondsSince(started, Date.now()), ...first === undefined ? {} : { secondsToFirstToken: secondsSince(started, first) } } })
  } catch (error) {
    span.end({ ...result, ...wire === undefined ? {} : { wire }, output: { text, ...thinking === '' ? {} : { thinking } }, level: 'ERROR', statusMessage: error instanceof Error ? error.message : String(error) })
    throw error
  } finally {
    span.end({ metadata: { incomplete: true } })
  }
}
