import type {ContentBlock, GenerateOptions, RequestMessage} from '@deepseek-ai/dsh-llm'
import type {LlmCall, LlmReasoningLevel, LlmSampling} from 'dsh-ai-core'

type WireBlock = {type: 'text'; text: string} | {type: 'image'; source: {type: 'base64'; media_type: string; data: string}} | {type: 'tool_use'; id: string; name: string; input: unknown} | {type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean}
export interface AnthropicWireMessage {role: 'user' | 'assistant'; content: WireBlock[]}

export type ImageLoader = (attachment: Extract<ContentBlock, {type: 'image'}>['attachment']) => Promise<{data: Uint8Array; mediaType: string}>
const text = (blocks: readonly ContentBlock[]): string => blocks.flatMap(block => block.type === 'text' ? [block.text] : block.type === 'file' ? ['[a file is available through the provided tools]'] : []).join('\n\n')
async function userContent(blocks: readonly ContentBlock[], loadImage?: ImageLoader): Promise<WireBlock[]> {
  const out: WireBlock[] = []
  for (const block of blocks) {
    if (block.type === 'text') out.push({type: 'text', text: block.text})
    else if (block.type === 'file') out.push({type: 'text', text: '[a file is available through the provided tools]'})
    else if (block.type === 'image') {
      if (block.offloaded === true || loadImage === undefined) out.push({type: 'text', text: '[an image is attached but unavailable to this request]'})
      else { const image = await loadImage(block.attachment); out.push({type: 'image', source: {type: 'base64', media_type: image.mediaType, data: Buffer.from(image.data).toString('base64')}}) }
    }
  }
  return out
}
function argumentsOf(value: string): unknown { try { return JSON.parse(value) } catch { return {} } }

export async function wireConversation(options: GenerateOptions, loadImage?: ImageLoader): Promise<{system?: string; messages: AnthropicWireMessage[]}> {
  const system: string[] = options.system ? [options.system] : []
  const messages: AnthropicWireMessage[] = []
  for (const message of options.messages as readonly RequestMessage[]) {
    if (message.role === 'system' || message.role === 'developer') {
      const value = text(message.content)
      if (value !== '') system.push(value)
    } else if (message.role === 'assistant') {
      const content: WireBlock[] = message.content.flatMap((block): WireBlock[] => block.type === 'text' ? [{type: 'text', text: block.text}] : block.type === 'tool-call' ? [{type: 'tool_use', id: String(block.id), name: block.name, input: argumentsOf(block.arguments)}] : [])
      if (content.length > 0) messages.push({role: 'assistant', content})
    } else if (message.role === 'tool') {
      messages.push({role: 'user', content: [{type: 'tool_result', tool_use_id: String(message.toolCallId), content: text(message.content), ...(message.isError === true ? {is_error: true} : {})}]})
    } else messages.push({role: 'user', content: await userContent(message.content, loadImage)})
  }
  return {messages, ...(system.length === 0 ? {} : {system: system.join('\n\n')})}
}

function toolChoice(choice: NonNullable<LlmSampling['toolChoice']>): unknown {
  if (choice === 'required') return {type: 'any'}
  if (typeof choice === 'object') return {type: 'tool', name: choice.name}
  return {type: 'auto'}
}
export async function wireBody(call: LlmCall, loadImage?: ImageLoader): Promise<Record<string, unknown>> {
  const {options, sampling} = call
  const level: LlmReasoningLevel | undefined = options.reasoningEffort === undefined ? undefined : call.model?.reasoning?.levels.find(candidate => candidate.id === String(options.reasoningEffort))
  const tools = sampling.toolChoice === 'none' ? [] : options.tools ?? []
  const limit = sampling.maxTokens ?? call.model?.maxTokens ?? 4096
  return {
    model: options.model, ...await wireConversation(options, loadImage), stream: true, max_tokens: limit,
    ...(tools.length === 0 ? {} : {tools: tools.map(tool => ({name: tool.name, description: tool.description, input_schema: tool.parameters}))}),
    ...(tools.length === 0 || sampling.toolChoice === undefined ? {} : {tool_choice: toolChoice(sampling.toolChoice)}),
    ...(sampling.temperature === undefined ? {} : {temperature: sampling.temperature}),
    ...(sampling.topP === undefined ? {} : {top_p: sampling.topP}),
    ...(sampling.topK === undefined ? {} : {top_k: sampling.topK}),
    ...(sampling.stop === undefined || sampling.stop.length === 0 ? {} : {stop_sequences: sampling.stop}),
    ...level?.body, ...sampling.body,
  }
}
