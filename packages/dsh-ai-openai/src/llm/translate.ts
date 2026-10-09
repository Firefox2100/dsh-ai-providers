import type { ContentBlock, FinishReason, StreamChunk, TokenUsage } from '@deepseek-ai/dsh-llm'
import { LlmRequestError } from 'dsh-ai-core'
import { streamError } from './errors.ts'

/** How the reasoning of a model is marked in its text when the endpoint does not separate it: not at all, by `<think>` tags, or as text that starts inside a think block. */
export type ReasoningTags = 'none' | 'tags' | 'implicit'

const OPEN = '<think>'
const CLOSE = '</think>'

/** Splits streamed text into the answer and the reasoning marked in it, holding back a partial tag until the next piece shows what it is. */
class ThinkSplitter {
  private inside: boolean
  private held = ''

  constructor(private readonly tags: ReasoningTags) {
    this.inside = tags === 'implicit'
  }

  feed(text: string, flush = false): { reasoning: boolean; text: string }[] {
    if (this.tags === 'none') return text === '' ? [] : [{ reasoning: false, text }]
    const out: { reasoning: boolean; text: string }[] = []
    let rest = this.held + text
    this.held = ''
    while (rest !== '') {
      const tag = this.inside ? CLOSE : OPEN
      const at = rest.indexOf(tag)
      if (at >= 0) {
        if (at > 0) out.push({ reasoning: this.inside, text: rest.slice(0, at) })
        const closing = this.inside
        rest = rest.slice(at + tag.length)
        if (closing) rest = rest.replace(/^\n+/, '')
        this.inside = !closing
        continue
      }
      let keep = 0
      if (!flush) for (let size = Math.min(tag.length - 1, rest.length); size > 0; size -= 1) if (rest.endsWith(tag.slice(0, size))) { keep = size; break }
      if (rest.length > keep) out.push({ reasoning: this.inside, text: rest.slice(0, rest.length - keep) })
      this.held = rest.slice(rest.length - keep)
      rest = ''
    }
    return out
  }
}

interface OpenBlock {
  index: number
  type: 'text' | 'reasoning' | 'tool-call'
  text: string
  id: string
  name: string
}

interface WireDelta {
  content?: string | null
  reasoning_content?: string | null
  reasoning?: string | null
  tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[]
}

interface WireEvent {
  error?: unknown
  choices?: { delta?: WireDelta; finish_reason?: string | null }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; prompt_tokens_details?: { cached_tokens?: number }; completion_tokens_details?: { reasoning_tokens?: number } } | null
}

const usageOf = (usage: NonNullable<WireEvent['usage']>): TokenUsage => ({
  inputTokens: usage.prompt_tokens ?? 0,
  outputTokens: usage.completion_tokens ?? 0,
  ...usage.total_tokens === undefined ? {} : { totalTokens: usage.total_tokens },
  ...usage.prompt_tokens_details?.cached_tokens ? { cacheReadTokens: usage.prompt_tokens_details.cached_tokens } : {},
  ...usage.completion_tokens_details?.reasoning_tokens ? { reasoningTokens: usage.completion_tokens_details.reasoning_tokens } : {},
})

function finishOf(wire: string | undefined, calls: boolean): FinishReason {
  if (wire === 'length') return { kind: 'max-tokens' }
  if (calls || wire === 'tool_calls' || wire === 'function_call') return { kind: 'tool-calls' }
  return { kind: 'stop' }
}

/**
 * The chunks of DSH's stream vocabulary for the events of a chat completions stream. Blocks are opened as they first appear and
 * closed together at the end, which is when the whole answer is known.
 * @throws {LlmRequestError} for an error event, an answer with nothing in it, or a stream that ended before it said it was done.
 */
export async function * translate(events: AsyncIterable<string>, tags: ReasoningTags): AsyncGenerator<StreamChunk> {
  const splitter = new ThinkSplitter(tags)
  const blocks: OpenBlock[] = []
  const tools = new Map<number, OpenBlock>()
  let text: OpenBlock | undefined
  let reasoning: OpenBlock | undefined
  let usage: TokenUsage | undefined
  let wireFinish: string | undefined
  let done = false

  const open = (type: OpenBlock['type']): OpenBlock => {
    const block: OpenBlock = { index: blocks.length, type, text: '', id: '', name: '' }
    blocks.push(block)
    return block
  }

  function * emit(parts: { reasoning: boolean; text: string }[]): Generator<StreamChunk> {
    for (const part of parts) {
      if (part.reasoning) {
        if (reasoning === undefined) { reasoning = open('reasoning'); yield { type: 'block-start', index: reasoning.index, blockType: 'reasoning' } }
        reasoning.text += part.text
        yield { type: 'reasoning-delta', index: reasoning.index, text: part.text }
      } else {
        if (text === undefined) { text = open('text'); yield { type: 'block-start', index: text.index, blockType: 'text' } }
        text.text += part.text
        yield { type: 'text-delta', index: text.index, text: part.text }
      }
    }
  }

  for await (const data of events) {
    if (data === '[DONE]') { done = true; break }
    let event: WireEvent
    try { event = JSON.parse(data) as WireEvent } catch (error) { throw new LlmRequestError('TRANSPORT', `the endpoint sent an event that is not JSON: ${data.slice(0, 120)}`, {}, { cause: error }) }
    if (event.error !== undefined && event.error !== null) throw streamError(event)
    if (event.usage !== undefined && event.usage !== null) usage = usageOf(event.usage)
    const choice = event.choices?.[0]
    if (choice === undefined) continue
    const delta = choice.delta ?? {}
    const thought = delta.reasoning_content ?? delta.reasoning
    if (typeof thought === 'string' && thought !== '') yield * emit([{ reasoning: true, text: thought }])
    if (typeof delta.content === 'string' && delta.content !== '') yield * emit(splitter.feed(delta.content))
    for (const call of delta.tool_calls ?? []) {
      const key = call.index ?? 0
      let block = tools.get(key)
      if (block === undefined) {
        block = open('tool-call')
        block.id = call.id ?? `call_${block.index}`
        tools.set(key, block)
        yield { type: 'block-start', index: block.index, blockType: 'tool-call' }
      }
      if (call.function?.name) block.name += call.function.name
      const arguments_ = call.function?.arguments ?? ''
      block.text += arguments_
      yield { type: 'tool-call-delta', index: block.index, id: block.id as never, ...call.function?.name ? { name: call.function.name } : {}, argumentsDelta: arguments_ }
    }
    if (choice.finish_reason) wireFinish = choice.finish_reason
  }
  yield * emit(splitter.feed('', true))
  if (!done && wireFinish === undefined) throw new LlmRequestError('TRANSPORT', 'the stream ended before the endpoint said the answer was complete')
  if (blocks.length === 0) throw new LlmRequestError('EMPTY_RESPONSE', 'the model answered with nothing')

  for (const block of blocks) {
    const finished: ContentBlock = block.type === 'tool-call'
      ? { type: 'tool-call', id: block.id as never, name: block.name, arguments: block.text === '' ? '{}' : block.text }
      : { type: block.type, text: block.text }
    yield { type: 'block-end', index: block.index, block: finished }
  }
  if (usage !== undefined) yield { type: 'usage', usage }
  yield { type: 'finish', reason: finishOf(wireFinish, tools.size > 0) }
}
