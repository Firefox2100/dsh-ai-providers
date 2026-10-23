import type { FinishReason, StreamChunk, TokenUsage } from '@deepseek-ai/dsh-llm'
import { LlmRequestError } from '@dsh-ai-providers/core'
import { streamError } from './errors.ts'

interface Event {
  code?: unknown
  message?: unknown
  output?: {
    choices?: {
      finish_reason?: string | null
      message?: {
        content?: string | { text?: string }[] | null
        reasoning_content?: string | null
        tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[]
      }
    }[]
  }
  usage?: {
    input_tokens?: number
    output_tokens?: number
    prompt_tokens_details?: { cached_tokens?: number }
    output_tokens_details?: { reasoning_tokens?: number }
  }
}

type Kind = 'text' | 'reasoning' | 'tool-call'
interface Open { index: number; kind: Kind; text: string; id: string; name: string }

function usageOf(usage: NonNullable<Event['usage']>): TokenUsage {
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    ...usage.prompt_tokens_details?.cached_tokens ? { cacheReadTokens: usage.prompt_tokens_details.cached_tokens } : {},
    ...usage.output_tokens_details?.reasoning_tokens === undefined ? {} : { reasoningTokens: usage.output_tokens_details.reasoning_tokens },
  }
}

/** The text of a delta, which the text endpoint sends as a string and the vision endpoint as parts. */
function textOf(content: string | { text?: string }[] | null | undefined): string {
  if (typeof content === 'string') return content
  return Array.isArray(content) ? content.map(part => part.text ?? '').join('') : ''
}

/**
 * Turns DashScope's incremental generation events into DSH's chunks. Thinking, the answer and each tool call (numbered by `index`)
 * are blocks of their own, opened on their first fragment and closed when the next kind starts or the answer ends. A stream is
 * read to its end, because the usage arrives in the event after the one that carries the finish reason.
 */
export async function* translate(events: AsyncIterable<string>): AsyncGenerator<StreamChunk> {
  const blocks = new Map<string, Open>()
  let next = 0
  let calls = 0
  let finish: string | undefined
  let usage: TokenUsage | undefined
  const open = function* (key: string, kind: Kind, id = '', name = ''): Generator<StreamChunk, Open> {
    const block: Open = { index: next++, kind, text: '', id, name }
    blocks.set(key, block)
    yield { type: 'block-start', index: block.index, blockType: kind }
    return block
  }
  const close = function* (key: string): Generator<StreamChunk> {
    const block = blocks.get(key)
    if (block === undefined) return
    blocks.delete(key)
    yield { type: 'block-end', index: block.index, block: block.kind === 'tool-call' ? { type: 'tool-call', id: block.id as never, name: block.name, arguments: block.text || '{}' } : { type: block.kind, text: block.text } }
  }
  const write = function* (key: string, kind: 'text' | 'reasoning', text: string): Generator<StreamChunk> {
    if (text === '') return
    if (kind === 'text') yield* close('reasoning')
    const block = blocks.get(key) ?? (yield* open(key, kind))
    block.text += text
    yield kind === 'reasoning' ? { type: 'reasoning-delta', index: block.index, text } : { type: 'text-delta', index: block.index, text }
  }

  for await (const data of events) {
    let event: Event
    try { event = JSON.parse(data) as Event } catch (error) { throw new LlmRequestError('TRANSPORT', 'the endpoint sent an event that is not JSON', {}, { cause: error }) }
    if (typeof event.code === 'string' && event.code !== '') throw streamError(event.code, typeof event.message === 'string' ? event.message : '')
    if (event.usage !== undefined) usage = usageOf(event.usage)
    const choice = event.output?.choices?.[0]
    if (choice === undefined) continue
    const message = choice.message
    yield* write('reasoning', 'reasoning', message?.reasoning_content ?? '')
    yield* write('text', 'text', textOf(message?.content))
    for (const fragment of message?.tool_calls ?? []) {
      const key = `call${fragment.index ?? 0}`
      let block = blocks.get(key)
      if (block === undefined) {
        yield* close('reasoning')
        yield* close('text')
        calls += 1
        const id = fragment.id ?? `call_${next}`
        block = yield* open(key, 'tool-call', id, fragment.function?.name ?? '')
      } else if (fragment.function?.name !== undefined && block.name === '') block.name = fragment.function.name
      const part = fragment.function?.arguments ?? ''
      block.text += part
      yield { type: 'tool-call-delta', index: block.index, id: block.id as never, ...fragment.function?.name === undefined ? {} : { name: fragment.function.name }, argumentsDelta: part }
    }
    if (typeof choice.finish_reason === 'string' && choice.finish_reason !== 'null') finish = choice.finish_reason
  }

  for (const key of [...blocks.keys()]) yield* close(key)
  if (finish === undefined) throw new LlmRequestError('TRANSPORT', 'the stream ended before the endpoint said the message was complete')
  if (next === 0) throw new LlmRequestError('EMPTY_RESPONSE', 'the model answered with nothing')
  if (usage !== undefined) yield { type: 'usage', usage }
  const reason: FinishReason = finish === 'length' ? { kind: 'max-tokens' } : calls > 0 || finish === 'tool_calls' ? { kind: 'tool-calls' } : { kind: 'stop' }
  yield { type: 'finish', reason }
}
