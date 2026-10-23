import type { FinishReason, StreamChunk, TokenUsage } from '@deepseek-ai/dsh-llm'
import { LlmRequestError } from '@dsh-ai-providers/core'
import { streamError } from './errors.ts'

interface Event {
  type?: string
  index?: number
  delta?: {
    message?: {
      content?: { type?: string; text?: string; thinking?: string }
      tool_plan?: string
      tool_calls?: { id?: string; function?: { name?: string; arguments?: string } }
    }
    finish_reason?: string
    error?: string
    usage?: { billed_units?: { input_tokens?: number; output_tokens?: number }; tokens?: { input_tokens?: number; output_tokens?: number }; cached_tokens?: number }
  }
  error?: unknown
}

type Kind = 'text' | 'reasoning' | 'tool-call'
interface Open { index: number; kind: Kind; text: string; id: string; name: string }

function usageOf(usage: NonNullable<NonNullable<Event['delta']>['usage']>): TokenUsage | undefined {
  const counted = usage.tokens ?? usage.billed_units
  if (counted === undefined) return undefined
  return { inputTokens: counted.input_tokens ?? 0, outputTokens: counted.output_tokens ?? 0, ...usage.cached_tokens ? { cacheReadTokens: usage.cached_tokens } : {} }
}

/**
 * Turns Cohere's v2 chat events into DSH's chunks. Content, thinking, the plan an assistant states before calling tools, and each tool
 * call have their own numbering in Cohere, so every block is kept under a key of its own and numbered afresh for DSH.
 */
export async function* translate(events: AsyncIterable<string>): AsyncGenerator<StreamChunk> {
  const blocks = new Map<string, Open>()
  let next = 0
  let calls = 0
  let ended: NonNullable<Event['delta']> | undefined
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
    const block = blocks.get(key) ?? (yield* open(key, kind))
    block.text += text
    yield kind === 'reasoning' ? { type: 'reasoning-delta', index: block.index, text } : { type: 'text-delta', index: block.index, text }
  }

  for await (const data of events) {
    let event: Event
    try { event = JSON.parse(data) as Event } catch (error) { throw new LlmRequestError('TRANSPORT', 'the endpoint sent an event that is not JSON', {}, { cause: error }) }
    const message = event.delta?.message
    switch (event.type) {
      case 'content-start': {
        const kind = message?.content?.type === 'thinking' ? 'reasoning' : 'text'
        const key = `${kind}${event.index ?? 0}`
        yield* open(key, kind)
        yield* write(key, kind, kind === 'reasoning' ? message?.content?.thinking ?? '' : message?.content?.text ?? '')
        break
      }
      case 'content-delta':
        yield* write(`reasoning${event.index ?? 0}`, 'reasoning', message?.content?.thinking ?? '')
        yield* write(`text${event.index ?? 0}`, 'text', message?.content?.text ?? '')
        break
      case 'content-end':
        yield* close(`reasoning${event.index ?? 0}`)
        yield* close(`text${event.index ?? 0}`)
        break
      case 'tool-plan-delta':
        yield* write('plan', 'text', message?.tool_plan ?? '')
        break
      case 'tool-call-start': {
        yield* close('plan')
        const call = message?.tool_calls
        const key = `call${event.index ?? 0}`
        const id = call?.id ?? `call_${next}`
        const name = call?.function?.name ?? ''
        const block = yield* open(key, 'tool-call', id, name)
        calls += 1
        block.text = call?.function?.arguments ?? ''
        yield { type: 'tool-call-delta', index: block.index, id: id as never, name, argumentsDelta: block.text }
        break
      }
      case 'tool-call-delta': {
        const block = blocks.get(`call${event.index ?? 0}`)
        if (block === undefined) throw new LlmRequestError('TRANSPORT', 'the endpoint sent arguments for a tool call that was not started')
        const part = message?.tool_calls?.function?.arguments ?? ''
        block.text += part
        yield { type: 'tool-call-delta', index: block.index, id: block.id as never, argumentsDelta: part }
        break
      }
      case 'tool-call-end':
        yield* close(`call${event.index ?? 0}`)
        break
      case 'message-end':
        ended = event.delta ?? {}
        break
      default:
        if (event.error !== undefined) throw streamError(typeof event.error === 'string' ? event.error : JSON.stringify(event.error))
    }
    if (ended !== undefined) break
  }

  for (const key of [...blocks.keys()]) yield* close(key)
  if (ended === undefined) throw new LlmRequestError('TRANSPORT', 'the stream ended before the endpoint said the message was complete')
  if (ended.finish_reason === 'ERROR' || ended.finish_reason === 'TIMEOUT') throw streamError(ended.error ?? ended.finish_reason, ended.finish_reason === 'TIMEOUT')
  if (next === 0) throw new LlmRequestError('EMPTY_RESPONSE', 'the model answered with nothing')
  const usage = ended.usage === undefined ? undefined : usageOf(ended.usage)
  if (usage !== undefined) yield { type: 'usage', usage }
  const reason: FinishReason = ended.finish_reason === 'MAX_TOKENS' ? { kind: 'max-tokens' } : calls > 0 || ended.finish_reason === 'TOOL_CALL' ? { kind: 'tool-calls' } : { kind: 'stop' }
  yield { type: 'finish', reason }
}
