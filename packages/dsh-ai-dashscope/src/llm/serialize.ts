import type { ContentBlock, GenerateOptions, RequestMessage } from '@deepseek-ai/dsh-llm'
import type { LlmCall, LlmReasoningLevel } from '@dsh-ai-providers/core'
import type { DashScopeSampling } from '../config.ts'

type Part = { text: string } | { image: string }
export type DashScopeWireMessage =
  | { role: 'system'; content: string | Part[] }
  | { role: 'user'; content: string | Part[] }
  | { role: 'assistant'; content: string | Part[]; tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string }; index: number }[] }
  | { role: 'tool'; tool_call_id: string; content: string | Part[] }

export type ImageLoader = (attachment: Extract<ContentBlock, { type: 'image' }>['attachment']) => Promise<{ data: Uint8Array; mediaType: string }>

const FILE_NOTE = '[a file is available through the provided tools]'
const IMAGE_NOTE = '[an image is attached but unavailable to this request]'

/** Vision models are served by their own endpoint, which reads content as parts; the text endpoint reads a string. */
export function isMultimodal(call: Pick<LlmCall, 'model'>): boolean {
  return call.model?.inputs?.includes('image') === true
}

function textOf(blocks: readonly ContentBlock[]): string {
  return blocks.flatMap(block => block.type === 'text' ? [block.text] : block.type === 'file' ? [FILE_NOTE] : []).join('\n\n')
}

async function partsOf(blocks: readonly ContentBlock[], loadImage?: ImageLoader): Promise<Part[]> {
  const out: Part[] = []
  for (const block of blocks) {
    if (block.type === 'text') out.push({ text: block.text })
    else if (block.type === 'file') out.push({ text: FILE_NOTE })
    else if (block.type === 'image') {
      if (block.offloaded === true || loadImage === undefined) out.push({ text: IMAGE_NOTE })
      else {
        const image = await loadImage(block.attachment)
        out.push({ image: `data:${image.mediaType};base64,${Buffer.from(image.data).toString('base64')}` })
      }
    }
  }
  return out
}

/** The conversation as DashScope reads it: a string per message for text models, parts for the vision endpoint. */
export async function wireMessages(options: GenerateOptions, multimodal: boolean, loadImage?: ImageLoader): Promise<DashScopeWireMessage[]> {
  const content = async (blocks: readonly ContentBlock[]): Promise<string | Part[]> => multimodal ? partsOf(blocks, loadImage) : textOf(blocks)
  const out: DashScopeWireMessage[] = options.system ? [{ role: 'system', content: multimodal ? [{ text: options.system }] : options.system }] : []
  for (const message of options.messages as readonly RequestMessage[]) {
    if (message.role === 'system' || message.role === 'developer') {
      const body = textOf(message.content)
      if (body !== '') out.push({ role: 'system', content: multimodal ? [{ text: body }] : body })
    } else if (message.role === 'assistant') {
      const calls = message.content.flatMap(block => block.type === 'tool-call' ? [block] : [])
      const text = message.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('')
      if (text === '' && calls.length === 0) continue
      out.push({
        role: 'assistant',
        content: multimodal && text !== '' ? [{ text }] : text,
        ...calls.length === 0 ? {} : { tool_calls: calls.map((call, index) => ({ id: String(call.id), type: 'function' as const, function: { name: call.name, arguments: call.arguments }, index })) },
      })
    } else if (message.role === 'tool') {
      out.push({ role: 'tool', tool_call_id: String(message.toolCallId), content: await content(message.content) })
    } else out.push({ role: 'user', content: await content(message.content) })
  }
  return out
}

/** The controls of the request under the names DashScope gives them; what the API has no field for (`minP`, a frequency penalty) is left out. */
function controls(sampling: DashScopeSampling, maxTokens: number | undefined): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    temperature: sampling.temperature,
    top_p: sampling.topP,
    top_k: sampling.topK,
    repetition_penalty: sampling.repetitionPenalty,
    presence_penalty: sampling.presencePenalty,
    max_tokens: maxTokens,
    seed: sampling.seed,
    stop: sampling.stop === undefined || sampling.stop.length === 0 ? undefined : sampling.stop,
    enable_thinking: sampling.enableThinking,
    thinking_budget: sampling.thinkingBudget,
    reasoning_effort: sampling.reasoningEffort,
    preserve_thinking: sampling.preserveThinking,
    enable_search: sampling.enableSearch,
    search_options: sampling.searchOptions,
    enable_code_interpreter: sampling.enableCodeInterpreter,
    parallel_tool_calls: sampling.parallelToolCalls,
    tool_stream: sampling.toolStream,
    response_format: sampling.responseFormat,
    vl_high_resolution_images: sampling.vlHighResolutionImages,
    min_pixels: sampling.minPixels,
    max_pixels: sampling.maxPixels,
    total_pixels: sampling.totalPixels,
  }
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
}

function toolChoiceOf(choice: DashScopeSampling['toolChoice']): unknown {
  if (choice === undefined) return undefined
  return typeof choice === 'object' ? { type: 'function', function: { name: choice.name } } : choice
}

/**
 * The generation request: `input.messages`, and every control in `parameters`, where DashScope reads them. Streaming is always
 * incremental and in message format, which the translation relies on. Fields a reasoning level or `body` sets win over the typed ones.
 */
export async function wireBody(call: LlmCall, loadImage?: ImageLoader): Promise<Record<string, unknown>> {
  const { options } = call
  const sampling = call.sampling as DashScopeSampling
  const level: LlmReasoningLevel | undefined = options.reasoningEffort === undefined ? undefined : call.model?.reasoning?.levels.find(candidate => candidate.id === String(options.reasoningEffort))
  const tools = options.tools ?? []
  return {
    model: options.model,
    input: { messages: await wireMessages(options, isMultimodal(call), loadImage) },
    parameters: {
      result_format: 'message',
      incremental_output: true,
      ...tools.length === 0 ? {} : {
        tools: tools.map(tool => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.parameters } })),
        ...sampling.toolChoice === undefined ? {} : { tool_choice: toolChoiceOf(sampling.toolChoice) },
      },
      ...controls(sampling, sampling.maxTokens ?? call.model?.maxTokens),
      ...level?.body,
      ...sampling.body,
    },
  }
}
