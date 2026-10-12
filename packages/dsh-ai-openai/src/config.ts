import { Config as ConfigSchema } from '@dsh-ai-providers/openai-compatible/config'
import type { Config as OpenAiCompatibleConfig } from '@dsh-ai-providers/openai-compatible/config'

export const Config = ConfigSchema
export interface Config extends OpenAiCompatibleConfig {}
export type { OpenAiConnectionConfig, OpenAiLlmModelConfig, OpenAiLlmRouteConfig, OpenAiReasoningLevelConfig, OpenAiSamplingConfig } from '@dsh-ai-providers/openai-compatible/config'
