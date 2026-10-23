import type { ContentBlock, GenerateOptions, RequestMessage } from '@deepseek-ai/dsh-llm'
import type { LlmCall, LlmReasoningLevel } from '@dsh-ai-providers/core'
import type { OllamaSampling } from '../config.ts'

export interface OllamaWireMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  images?: string[]
  tool_calls?: { function: { name: string; arguments: unknown } }[]
  tool_name?: string
}

export type ImageLoader = (attachment: Extract<ContentBlock, { type: 'image' }>['attachment']) => Promise<{ data: Uint8Array }>

const FILE_NOTE = '[a file is available through the provided tools]'
const IMAGE_NOTE = '[an image is attached but unavailable to this request]'

function textOf(blocks: readonly ContentBlock[]): string {
  return blocks.flatMap(block => block.type === 'text' ? [block.text] : block.type === 'file' ? [FILE_NOTE] : []).join('\n\n')
}

function argumentsOf(value: string): unknown {
  try { return JSON.parse(value) } catch { return {} }
}

async function userMessage(blocks: readonly ContentBlock[], loadImage?: ImageLoader): Promise<OllamaWireMessage> {
  const text: string[] = []
  const images: string[] = []
  for (const block of blocks) {
    if (block.type === 'text') text.push(block.text)
    else if (block.type === 'file') text.push(FILE_NOTE)
    else if (block.type === 'image') {
      if (block.offloaded === true || loadImage === undefined) text.push(IMAGE_NOTE)
      else images.push(Buffer.from((await loadImage(block.attachment)).data).toString('base64'))
    }
  }
  return { role: 'user', content: text.join('\n\n'), ...images.length === 0 ? {} : { images } }
}

/** The conversation as Ollama reads it. A tool result names its tool rather than a call id, so the names of earlier calls are remembered by id. */
export async function wireMessages(options: GenerateOptions, loadImage?: ImageLoader): Promise<OllamaWireMessage[]> {
  const out: OllamaWireMessage[] = options.system ? [{ role: 'system', content: options.system }] : []
  const names = new Map<string, string>()
  for (const message of options.messages as readonly RequestMessage[]) {
    if (message.role === 'system' || message.role === 'developer') {
      const content = textOf(message.content)
      if (content !== '') out.push({ role: 'system', content })
    } else if (message.role === 'assistant') {
      const calls = message.content.flatMap(block => block.type === 'tool-call' ? [block] : [])
      for (const call of calls) names.set(String(call.id), call.name)
      const content = message.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('')
      if (content === '' && calls.length === 0) continue
      out.push({ role: 'assistant', content, ...calls.length === 0 ? {} : { tool_calls: calls.map(call => ({ function: { name: call.name, arguments: argumentsOf(call.arguments) } })) } })
    } else if (message.role === 'tool') {
      const name = names.get(String(message.toolCallId))
      out.push({ role: 'tool', content: textOf(message.content), ...name === undefined ? {} : { tool_name: name } })
    } else out.push(await userMessage(message.content, loadImage))
  }
  return out
}

/** The sampling fields that go in the request's `options`, under the names Ollama gives them. */
export function wireOptions(sampling: OllamaSampling): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    temperature: sampling.temperature,
    top_p: sampling.topP,
    top_k: sampling.topK,
    min_p: sampling.minP,
    frequency_penalty: sampling.frequencyPenalty,
    presence_penalty: sampling.presencePenalty,
    repeat_penalty: sampling.repetitionPenalty,
    seed: sampling.seed,
    stop: sampling.stop === undefined || sampling.stop.length === 0 ? undefined : sampling.stop,
    num_predict: sampling.maxTokens,
    num_ctx: sampling.numCtx,
    repeat_last_n: sampling.repeatLastN,
    typical_p: sampling.typicalP,
    penalize_newline: sampling.penalizeNewline,
    mirostat: sampling.mirostat,
    mirostat_tau: sampling.mirostatTau,
    mirostat_eta: sampling.mirostatEta,
    num_keep: sampling.numKeep,
    num_batch: sampling.numBatch,
    num_gpu: sampling.numGpu,
    main_gpu: sampling.mainGpu,
    num_thread: sampling.numThread,
    use_mmap: sampling.useMmap,
  }
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
}

/** `-1` and `0` are durations to Ollama, not text: it reads a string only with a unit. */
export function keepAliveOf(value: string): string | number {
  const trimmed = value.trim()
  return /^-?\d+$/.test(trimmed) ? Number(trimmed) : trimmed
}

/**
 * The chat request. Ollama has no tool choice: `none` withholds the tools, and `required` or a named tool cannot be enforced, so the model decides.
 * Fields a reasoning level or `body` sets win over the typed ones, as everywhere else.
 */
export async function wireBody(call: LlmCall, loadImage?: ImageLoader): Promise<Record<string, unknown>> {
  const { options } = call
  const sampling = call.sampling as OllamaSampling
  const level: LlmReasoningLevel | undefined = options.reasoningEffort === undefined ? undefined : call.model?.reasoning?.levels.find(candidate => candidate.id === String(options.reasoningEffort))
  const tools = sampling.toolChoice === 'none' ? [] : options.tools ?? []
  const wireOpts = wireOptions({ ...sampling, maxTokens: sampling.maxTokens ?? call.model?.maxTokens })
  return {
    model: options.model,
    messages: await wireMessages(options, loadImage),
    stream: true,
    ...tools.length === 0 ? {} : { tools: tools.map(tool => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.parameters } })) },
    ...Object.keys(wireOpts).length === 0 ? {} : { options: wireOpts },
    ...sampling.think === undefined ? {} : { think: sampling.think },
    ...sampling.format === undefined ? {} : { format: sampling.format },
    ...sampling.keepAlive === undefined || sampling.keepAlive === '' ? {} : { keep_alive: keepAliveOf(sampling.keepAlive) },
    ...level?.body,
    ...sampling.body,
  }
}
