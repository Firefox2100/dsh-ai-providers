import type { ContentBlock, GenerateOptions, RequestMessage } from '@deepseek-ai/dsh-llm'
import type { LlmCall, LlmReasoningLevel, LlmSampling } from 'dsh-ai-core'

export type WireMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content?: string; reasoning_content?: string; tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[] }
  | { role: 'tool'; tool_call_id: string; content: string }

/** What a route says about how its endpoint wants a request written. */
export interface WireStyle {
  /** The name of the output limit: OpenAI's newer models want `max_completion_tokens`. */
  maxTokensField: 'max_tokens' | 'max_completion_tokens'
  /** Send the reasoning of earlier answers back to the model; most chat templates drop it, so the default is not to. */
  replayReasoning: boolean
}

const textOf = (blocks: readonly ContentBlock[]): string => blocks.flatMap((block) => {
  switch (block.type) {
    case 'text': return [block.text]
    case 'image': return ['[an image that this model cannot see]']
    case 'file': return ['[a file that this model cannot read]']
    default: return []
  }
}).join('\n\n')

/** The conversation as the chat completions API takes it. */
export function wireMessages(options: GenerateOptions, style: Pick<WireStyle, 'replayReasoning'>): WireMessage[] {
  const out: WireMessage[] = []
  if (options.system !== undefined && options.system !== '') out.push({ role: 'system', content: options.system })
  for (const message of options.messages as readonly RequestMessage[]) {
    switch (message.role) {
      case 'system': {
        const content = textOf(message.content)
        if (content !== '') out.push({ role: 'system', content })
        break
      }
      case 'developer':
      case 'user': {
        const content = textOf(message.content)
        out.push({ role: 'user', content })
        break
      }
      case 'assistant': {
        const calls = message.content.flatMap(block => (block.type === 'tool-call' ? [{ id: String(block.id), type: 'function' as const, function: { name: block.name, arguments: block.arguments } }] : []))
        const content = message.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('')
        const reasoning = style.replayReasoning ? message.content.flatMap(block => (block.type === 'reasoning' ? [block.text] : [])).join('') : ''
        out.push({
          role: 'assistant',
          ...content === '' ? {} : { content },
          ...reasoning === '' ? {} : { reasoning_content: reasoning },
          ...calls.length === 0 ? {} : { tool_calls: calls },
        })
        break
      }
      case 'tool':
        out.push({ role: 'tool', tool_call_id: String(message.toolCallId), content: textOf(message.content) })
        break
    }
  }
  return out
}

function toolChoice(choice: NonNullable<LlmSampling['toolChoice']>): unknown {
  return typeof choice === 'string' ? choice : { type: 'function', function: { name: choice.name } }
}

/** The request body for one call: the conversation, the tools and every control that applies. */
export function wireBody(call: LlmCall, style: WireStyle): Record<string, unknown> {
  const { options, sampling } = call
  const level: LlmReasoningLevel | undefined = options.reasoningEffort === undefined ? undefined : call.model?.reasoning?.levels.find(candidate => candidate.id === String(options.reasoningEffort))
  const limit = sampling.maxTokens ?? call.model?.maxTokens
  const tools = options.tools ?? []
  return {
    model: options.model,
    messages: wireMessages(options, style),
    stream: true,
    stream_options: { include_usage: true },
    ...tools.length === 0 ? {} : { tools: tools.map(tool => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.parameters } })) },
    ...tools.length === 0 || sampling.toolChoice === undefined ? {} : { tool_choice: toolChoice(sampling.toolChoice) },
    ...limit === undefined ? {} : { [style.maxTokensField]: limit },
    ...sampling.temperature === undefined ? {} : { temperature: sampling.temperature },
    ...sampling.topP === undefined ? {} : { top_p: sampling.topP },
    ...sampling.topK === undefined ? {} : { top_k: sampling.topK },
    ...sampling.minP === undefined ? {} : { min_p: sampling.minP },
    ...sampling.frequencyPenalty === undefined ? {} : { frequency_penalty: sampling.frequencyPenalty },
    ...sampling.presencePenalty === undefined ? {} : { presence_penalty: sampling.presencePenalty },
    ...sampling.repetitionPenalty === undefined ? {} : { repetition_penalty: sampling.repetitionPenalty },
    ...sampling.seed === undefined ? {} : { seed: sampling.seed },
    ...sampling.stop === undefined || sampling.stop.length === 0 ? {} : { stop: sampling.stop },
    ...level?.body,
    ...sampling.body,
  }
}
