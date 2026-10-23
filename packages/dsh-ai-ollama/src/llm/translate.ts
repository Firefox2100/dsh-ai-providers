import { randomUUID } from 'node:crypto'
import type { StreamChunk, TokenUsage } from '@deepseek-ai/dsh-llm'
import { LlmRequestError } from '@dsh-ai-providers/core'
import { streamError } from './errors.ts'

interface Part {
  error?: unknown
  message?: { content?: string; thinking?: string; tool_calls?: { function?: { name?: string; arguments?: unknown } }[] }
  done?: boolean
  done_reason?: string
  prompt_eval_count?: number
  eval_count?: number
}

type Open = { index: number; type: 'text' | 'reasoning'; text: string }

/**
 * Turns Ollama's newline-delimited chat objects into DSH's chunks. Thinking comes before the answer, so a block
 * is closed when the other kind starts. A tool call arrives whole, with no id and with object arguments.
 */
export async function* translate(lines: AsyncIterable<string>): AsyncGenerator<StreamChunk> {
  let open: Open | undefined
  let index = 0
  let calls = 0
  let final: Part | undefined
  const close = function* (): Generator<StreamChunk> {
    if (open === undefined) return
    yield { type: 'block-end', index: open.index, block: { type: open.type, text: open.text } }
    open = undefined
  }
  const write = function* (type: 'text' | 'reasoning', text: string): Generator<StreamChunk> {
    if (text === '') return
    if (open?.type !== type) {
      yield* close()
      open = { index: index++, type, text: '' }
      yield { type: 'block-start', index: open.index, blockType: type }
    }
    open.text += text
    yield type === 'reasoning' ? { type: 'reasoning-delta', index: open.index, text } : { type: 'text-delta', index: open.index, text }
  }

  for await (const line of lines) {
    let part: Part
    try { part = JSON.parse(line) as Part } catch (error) { throw new LlmRequestError('TRANSPORT', 'the endpoint sent a line that is not JSON', {}, { cause: error }) }
    if (part.error !== undefined) throw streamError(part)
    yield* write('reasoning', part.message?.thinking ?? '')
    yield* write('text', part.message?.content ?? '')
    for (const call of part.message?.tool_calls ?? []) {
      yield* close()
      const at = index++
      const id = `call_${randomUUID().slice(0, 12)}`
      const name = call.function?.name ?? ''
      const args = typeof call.function?.arguments === 'string' ? call.function.arguments : JSON.stringify(call.function?.arguments ?? {})
      calls += 1
      yield { type: 'block-start', index: at, blockType: 'tool-call' }
      yield { type: 'tool-call-delta', index: at, id: id as never, name, argumentsDelta: args }
      yield { type: 'block-end', index: at, block: { type: 'tool-call', id: id as never, name, arguments: args } }
    }
    if (part.done === true) { final = part; break }
  }

  yield* close()
  if (final === undefined) throw new LlmRequestError('TRANSPORT', 'the stream ended before the endpoint said the answer was complete')
  if (index === 0) throw new LlmRequestError('EMPTY_RESPONSE', 'the model answered with nothing')
  if (final.prompt_eval_count !== undefined || final.eval_count !== undefined) {
    const usage: TokenUsage = { inputTokens: final.prompt_eval_count ?? 0, outputTokens: final.eval_count ?? 0 }
    yield { type: 'usage', usage }
  }
  yield { type: 'finish', reason: final.done_reason === 'length' ? { kind: 'max-tokens' } : calls > 0 ? { kind: 'tool-calls' } : { kind: 'stop' } }
}
