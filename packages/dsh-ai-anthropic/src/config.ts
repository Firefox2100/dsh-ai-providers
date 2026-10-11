import type {Volatile} from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

export interface AnthropicConnectionConfig {id: string; name: string; baseUrl: string; apiKeyRef: string}
export interface AnthropicSamplingConfig {
  temperature?: number; topP?: number; topK?: number; stop?: readonly string[]; maxTokens?: number; toolChoice?: 'auto' | 'none' | 'required'; body?: Readonly<Record<string, unknown>>
}
export interface AnthropicReasoningLevelConfig {id: string; name: string; body: Readonly<Record<string, unknown>>}
export interface AnthropicLlmModelConfig {
  id: string; name: string; contextWindow?: number; maxTokens?: number; vision?: boolean; reasoningLevels?: readonly AnthropicReasoningLevelConfig[]; defaultReasoning?: string; sampling?: AnthropicSamplingConfig
}
export interface AnthropicLlmRouteConfig {
  id: string; name: string; connection: string; models: readonly AnthropicLlmModelConfig[]; sampling?: AnthropicSamplingConfig; headers?: Readonly<Record<string, string>>
}
export interface Config {
  connections: Volatile<AnthropicConnectionConfig[]>; llmRoutes: Volatile<AnthropicLlmRouteConfig[]>; anthropicVersion: Volatile<string>; llmIdleTimeoutMs: Volatile<number>
}
const sampling = () => z.object({temperature: z.number().min(0).max(1), topP: z.number().min(0).max(1), topK: z.natural(), stop: z.array(z.string()), maxTokens: z.natural(), toolChoice: z.union(['auto', 'none', 'required'] as const), body: z.dict(z.any())})
export const Config = z.object({
  connections: z.array(z.object({id: z.string().required(), name: z.string().required(), baseUrl: z.string().required(), apiKeyRef: z.string().default('')})).default([{id: 'anthropic', name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', apiKeyRef: 'ANTHROPIC_API_KEY'}]).volatile(),
  llmRoutes: z.array(z.object({
    id: z.string().required(), name: z.string().required(), connection: z.string().required(),
    models: z.array(z.object({id: z.string().required(), name: z.string().required(), contextWindow: z.natural(), maxTokens: z.natural(), vision: z.boolean(), reasoningLevels: z.array(z.object({id: z.string().required(), name: z.string().required(), body: z.dict(z.any()).default({})})), defaultReasoning: z.string(), sampling: sampling()})).default([]),
    sampling: sampling(), headers: z.dict(z.string()),
  })).default([]).volatile(),
  anthropicVersion: z.string().default('2023-06-01').volatile(),
  llmIdleTimeoutMs: z.natural().default(300_000).volatile(),
})
