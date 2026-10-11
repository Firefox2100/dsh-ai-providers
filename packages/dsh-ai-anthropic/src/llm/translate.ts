import type {ContentBlock, FinishReason, StreamChunk, TokenUsage} from '@deepseek-ai/dsh-llm'
import {LlmRequestError} from 'dsh-ai-core'
import {streamError} from './errors.ts'

interface OpenBlock {index: number; type: 'text' | 'reasoning' | 'tool-call'; text: string; id: string; name: string}
type Event = {type?: string; index?: number; content_block?: {type?: string; text?: string; thinking?: string; id?: string; name?: string; input?: unknown}; delta?: {type?: string; text?: string; thinking?: string; partial_json?: string; stop_reason?: string}; message?: {usage?: Usage}; usage?: Usage; error?: unknown}
interface Usage {input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number}
const usageOf = (usage: Usage): TokenUsage => ({inputTokens: usage.input_tokens ?? 0, outputTokens: usage.output_tokens ?? 0, ...usage.cache_creation_input_tokens ? {cacheWriteTokens: usage.cache_creation_input_tokens} : {}, ...usage.cache_read_input_tokens ? {cacheReadTokens: usage.cache_read_input_tokens} : {}})
const finishOf = (reason: string | undefined, tools: boolean): FinishReason => reason === 'max_tokens' ? {kind: 'max-tokens'} : tools || reason === 'tool_use' ? {kind: 'tool-calls'} : {kind: 'stop'}

export async function* translate(events: AsyncIterable<string>): AsyncGenerator<StreamChunk> {
  const blocks = new Map<number, OpenBlock>()
  let usage: TokenUsage | undefined
  let stop: string | undefined
  let ended = false
  for await (const data of events) {
    let event: Event
    try { event = JSON.parse(data) as Event } catch (error) { throw new LlmRequestError('TRANSPORT', 'the endpoint sent an event that is not JSON', {}, {cause: error}) }
    if (event.type === 'error') throw streamError(event)
    if (event.type === 'message_start' && event.message?.usage) usage = usageOf(event.message.usage)
    if (event.type === 'content_block_start') {
      const wire = event.content_block
      const index = event.index ?? blocks.size
      const type: OpenBlock['type'] = wire?.type === 'thinking' ? 'reasoning' : wire?.type === 'tool_use' ? 'tool-call' : 'text'
      const block: OpenBlock = {index, type, text: type === 'text' ? wire?.text ?? '' : type === 'reasoning' ? wire?.thinking ?? '' : '', id: wire?.id ?? `tool_${index}`, name: wire?.name ?? ''}
      blocks.set(index, block)
      yield {type: 'block-start', index, blockType: type}
      if (block.text !== '') yield type === 'reasoning' ? {type: 'reasoning-delta', index, text: block.text} : {type: 'text-delta', index, text: block.text}
      if (type === 'tool-call') {
        const initial = wire?.input === undefined || JSON.stringify(wire.input) === '{}' ? '' : JSON.stringify(wire.input)
        block.text = initial
        yield {type: 'tool-call-delta', index, id: block.id as never, name: block.name, argumentsDelta: initial}
      }
    } else if (event.type === 'content_block_delta') {
      const block = blocks.get(event.index ?? -1)
      if (block === undefined) throw new LlmRequestError('TRANSPORT', 'the endpoint sent a delta for an unopened block')
      const delta = event.delta
      const value = delta?.type === 'thinking_delta' ? delta.thinking ?? '' : delta?.type === 'input_json_delta' ? delta.partial_json ?? '' : delta?.text ?? ''
      block.text += value
      if (block.type === 'tool-call') yield {type: 'tool-call-delta', index: block.index, id: block.id as never, argumentsDelta: value}
      else if (block.type === 'reasoning') yield {type: 'reasoning-delta', index: block.index, text: value}
      else yield {type: 'text-delta', index: block.index, text: value}
    } else if (event.type === 'content_block_stop') {
      const block = blocks.get(event.index ?? -1)
      if (block === undefined) throw new LlmRequestError('TRANSPORT', 'the endpoint stopped an unopened block')
      const finished: ContentBlock = block.type === 'tool-call' ? {type: 'tool-call', id: block.id as never, name: block.name, arguments: block.text || '{}'} : {type: block.type, text: block.text}
      yield {type: 'block-end', index: block.index, block: finished}
    } else if (event.type === 'message_delta') {
      stop = event.delta?.stop_reason
      if (event.usage) {
        const next = usageOf(event.usage)
        usage = {...(usage ?? {inputTokens: 0, outputTokens: 0}), ...(event.usage.input_tokens === undefined ? {} : {inputTokens: next.inputTokens}), ...(event.usage.output_tokens === undefined ? {} : {outputTokens: next.outputTokens}), ...(next.cacheWriteTokens === undefined ? {} : {cacheWriteTokens: next.cacheWriteTokens}), ...(next.cacheReadTokens === undefined ? {} : {cacheReadTokens: next.cacheReadTokens})}
      }
    } else if (event.type === 'message_stop') ended = true
  }
  if (!ended) throw new LlmRequestError('TRANSPORT', 'the stream ended before the endpoint said the message was complete')
  if (blocks.size === 0) throw new LlmRequestError('EMPTY_RESPONSE', 'the model answered with nothing')
  if (usage) yield {type: 'usage', usage}
  yield {type: 'finish', reason: finishOf(stop, [...blocks.values()].some(block => block.type === 'tool-call'))}
}
