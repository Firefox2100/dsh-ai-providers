import type { ContentBlock, GenerateOptions, RequestMessage } from '@deepseek-ai/dsh-llm'
import type { LlmCall, LlmReasoningLevel } from '@dsh-ai-providers/core'
import type { CohereSampling } from '../config.ts'

type WireContent = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }
export type CohereWireMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | WireContent[] }
  | { role: 'assistant'; content?: string; tool_plan?: string; tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export type ImageLoader = (attachment: Extract<ContentBlock, { type: 'image' }>['attachment']) => Promise<{ data: Uint8Array; mediaType: string }>

const FILE_NOTE = '[a file is available through the provided tools]'
const IMAGE_NOTE = '[an image is attached but unavailable to this request]'

function textOf(blocks: readonly ContentBlock[]): string {
  return blocks.flatMap(block => block.type === 'text' ? [block.text] : block.type === 'file' ? [FILE_NOTE] : []).join('\n\n')
}

async function userContent(blocks: readonly ContentBlock[], loadImage?: ImageLoader): Promise<string | WireContent[]> {
  const out: WireContent[] = []
  for (const block of blocks) {
    if (block.type === 'text') out.push({ type: 'text', text: block.text })
    else if (block.type === 'file') out.push({ type: 'text', text: FILE_NOTE })
    else if (block.type === 'image') {
      if (block.offloaded === true || loadImage === undefined) out.push({ type: 'text', text: IMAGE_NOTE })
      else {
        const image = await loadImage(block.attachment)
        out.push({ type: 'image_url', image_url: { url: `data:${image.mediaType};base64,${Buffer.from(image.data).toString('base64')}` } })
      }
    }
  }
  return out.every(item => item.type === 'text') ? out.map(item => (item as { text: string }).text).join('\n\n') : out
}

/**
 * The conversation as Cohere reads it. The words an assistant says before it calls tools are its `tool_plan`, the field Cohere
 * streams them in and expects them back in; plain answers stay `content`.
 */
export async function wireMessages(options: GenerateOptions, loadImage?: ImageLoader): Promise<CohereWireMessage[]> {
  const out: CohereWireMessage[] = options.system ? [{ role: 'system', content: options.system }] : []
  for (const message of options.messages as readonly RequestMessage[]) {
    if (message.role === 'system' || message.role === 'developer') {
      const content = textOf(message.content)
      if (content !== '') out.push({ role: 'system', content })
    } else if (message.role === 'assistant') {
      const calls = message.content.flatMap(block => block.type === 'tool-call' ? [block] : [])
      const text = message.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('')
      if (text === '' && calls.length === 0) continue
      if (calls.length === 0) out.push({ role: 'assistant', content: text })
      else out.push({ role: 'assistant', ...text === '' ? {} : { tool_plan: text }, tool_calls: calls.map(call => ({ id: String(call.id), type: 'function', function: { name: call.name, arguments: call.arguments } })) })
    } else if (message.role === 'tool') {
      out.push({ role: 'tool', tool_call_id: String(message.toolCallId), content: textOf(message.content) })
    } else out.push({ role: 'user', content: await userContent(message.content, loadImage) })
  }
  return out
}

/** The controls of the request under the names Cohere gives them; what the API has no field for (`minP`, a repetition penalty) is left out. */
function controls(sampling: CohereSampling, maxTokens: number | undefined): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    temperature: sampling.temperature,
    p: sampling.topP,
    k: sampling.topK,
    max_tokens: maxTokens,
    stop_sequences: sampling.stop === undefined || sampling.stop.length === 0 ? undefined : sampling.stop,
    seed: sampling.seed,
    frequency_penalty: sampling.frequencyPenalty,
    presence_penalty: sampling.presencePenalty,
    thinking: sampling.thinking === undefined ? undefined : { type: sampling.thinking, ...sampling.thinkingBudget === undefined ? {} : { token_budget: sampling.thinkingBudget } },
    safety_mode: sampling.safetyMode,
    strict_tools: sampling.strictTools,
    citation_options: sampling.citationMode === undefined ? undefined : { mode: sampling.citationMode },
    response_format: sampling.responseFormat,
    priority: sampling.priority,
  }
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
}

/**
 * The chat request. `required` makes Cohere answer with a tool call; a named tool is the same with only that tool offered,
 * since the API cannot name one. `none` is sent as it is. Fields a reasoning level or `body` sets win over the typed ones.
 */
export async function wireBody(call: LlmCall, loadImage?: ImageLoader): Promise<Record<string, unknown>> {
  const { options } = call
  const sampling = call.sampling as CohereSampling
  const level: LlmReasoningLevel | undefined = options.reasoningEffort === undefined ? undefined : call.model?.reasoning?.levels.find(candidate => candidate.id === String(options.reasoningEffort))
  const choice = sampling.toolChoice
  const named = typeof choice === 'object' ? choice.name : undefined
  const offered = (options.tools ?? []).filter(tool => named === undefined || tool.name === named)
  const tools = choice === 'none' ? [] : offered
  return {
    model: options.model,
    messages: await wireMessages(options, loadImage),
    stream: true,
    ...tools.length === 0 ? {} : { tools: tools.map(tool => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.parameters } })) },
    ...tools.length === 0 ? {} : choice === 'required' || named !== undefined ? { tool_choice: 'REQUIRED' } : {},
    ...controls(sampling, sampling.maxTokens ?? call.model?.maxTokens),
    ...level?.body,
    ...sampling.body,
  }
}
