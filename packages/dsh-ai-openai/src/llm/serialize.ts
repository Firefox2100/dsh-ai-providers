import type { ContentBlock, GenerateOptions, RequestMessage } from '@deepseek-ai/dsh-llm'
import type { LlmCall, LlmReasoningLevel, LlmSampling } from 'dsh-ai-core'

/** A part of a message that carries a picture, as the endpoint takes it. */
export type WirePart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }

/** The pictures of a request, by the id of the attachment, as data URLs a vision model can be sent. */
export type WireImages = ReadonlyMap<string, string>

export type WireMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | WirePart[] }
  | { role: 'assistant'; content?: string; reasoning_content?: string; tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[] }
  | { role: 'tool'; tool_call_id: string; content: string }

/** What a route says about how its endpoint wants a request written. */
export interface WireStyle {
  /** The name of the output limit: OpenAI's newer models want `max_completion_tokens`. */
  maxTokensField: 'max_tokens' | 'max_completion_tokens'
  /** Send the reasoning of earlier answers back to the model; most chat templates drop it, so the default is not to. */
  replayReasoning: boolean
}

/** The pictures a request carries, whose bytes the caller reads. */
export function imageRefsOf(options: Pick<GenerateOptions, 'messages'>): { attachmentId: string; mediaType: string }[] {
  return (options.messages as readonly RequestMessage[]).flatMap(message => (message.role === 'user' || message.role === 'developer' || message.role === 'tool' ? message.content.flatMap(block => (block.type === 'image' ? [{ attachmentId: String(block.attachment.attachmentId), mediaType: block.attachment.mediaType }] : [])) : []))
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
/** @param images - the pictures of the request that the model can see; any other picture is told as text. */
export function wireMessages(options: GenerateOptions, style: Pick<WireStyle, 'replayReasoning'>, images: WireImages = new Map()): WireMessage[] {
  const out: WireMessage[] = []
  // The API takes pictures in a user message only, so the pictures of tool results follow the run of tool messages they belong to, in a user message of their own.
  let shown: WirePart[] = []
  const flush = (): void => {
    if (shown.length > 0) out.push({ role: 'user', content: [{ type: 'text', text: 'The pictures that the tool results above refer to:' }, ...shown] })
    shown = []
  }
  if (options.system !== undefined && options.system !== '') out.push({ role: 'system', content: options.system })
  for (const message of options.messages as readonly RequestMessage[]) {
    if (message.role !== 'tool') flush()
    switch (message.role) {
      case 'system': {
        const content = textOf(message.content)
        if (content !== '') out.push({ role: 'system', content })
        break
      }
      case 'developer':
      case 'user': {
        const parts = message.content.flatMap((block): WirePart[] => {
          if (block.type === 'image') {
            const url = images.get(String(block.attachment.attachmentId))
            return url === undefined ? [{ type: 'text', text: '[an image that this model cannot see]' }] : [{ type: 'image_url', image_url: { url } }]
          }
          return block.type === 'text' ? [{ type: 'text', text: block.text }] : block.type === 'file' ? [{ type: 'text', text: '[a file that this model cannot read]' }] : []
        })
        const seen = parts.some(part => part.type === 'image_url')
        out.push({ role: 'user', content: seen ? parts : textOf(message.content) })
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
      case 'tool': {
        const seen = message.content.flatMap((block): WirePart[] => (block.type === 'image' && images.has(String(block.attachment.attachmentId)) ? [{ type: 'image_url', image_url: { url: images.get(String(block.attachment.attachmentId))! } }] : []))
        shown.push(...seen)
        out.push({ role: 'tool', tool_call_id: String(message.toolCallId), content: message.content.flatMap(block => (block.type === 'image' ? [images.has(String(block.attachment.attachmentId)) ? '[a picture, shown below]' : '[an image that this model cannot see]'] : block.type === 'text' ? [block.text] : block.type === 'file' ? ['[a file that this model cannot read]'] : [])).join('\n\n') })
        break
      }
    }
  }
  flush()
  return out
}

function toolChoice(choice: NonNullable<LlmSampling['toolChoice']>): unknown {
  return typeof choice === 'string' ? choice : { type: 'function', function: { name: choice.name } }
}

/** The request body for one call: the conversation, the tools and every control that applies. */
export function wireBody(call: LlmCall, style: WireStyle, images: WireImages = new Map()): Record<string, unknown> {
  const { options, sampling } = call
  const level: LlmReasoningLevel | undefined = options.reasoningEffort === undefined ? undefined : call.model?.reasoning?.levels.find(candidate => candidate.id === String(options.reasoningEffort))
  const limit = sampling.maxTokens ?? call.model?.maxTokens
  const tools = options.tools ?? []
  return {
    model: options.model,
    messages: wireMessages(options, style, images),
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
