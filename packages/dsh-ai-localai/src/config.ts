import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { Config as OpenAiConfig, type Config as OpenAiConfigType } from 'dsh-ai-openai'

export interface Config extends OpenAiConfigType {
  rerankConnection: Volatile<string>
  rerankModel: Volatile<string>
  rerankBody: Volatile<Record<string, unknown>>
  embeddingBody: Volatile<Record<string, unknown>>
  ttsBody: Volatile<Record<string, unknown>>
  imageBody: Volatile<Record<string, unknown>>
  /** How existing images are given to the model: not at all, as the image to repaint (`files`), or as reference images for models that take them (`ref_images`). */
  imageReferences: Volatile<'ignore' | 'img2img' | 'ref_images'>
  imageHighresScale: Volatile<number>
  /** Sampling steps of the second pass; 0 leaves it to the model. */
  imageHighresSteps: Volatile<number>
}

const localConnection = [{ id: 'localai', name: 'LocalAI', baseUrl: 'http://localhost:8080/v1', apiKeyRef: '' }]

export const Config = z.object({
    ...OpenAiConfig.dict,
    connections: z.array(z.object({
      id: z.string().required(),
      name: z.string().required(),
      baseUrl: z.string().required(),
      apiKeyRef: z.string().default(''),
    })).default(localConnection).volatile(),
    embeddingConnection: z.string().default('localai').volatile(),
    ttsConnection: z.string().default('localai').volatile(),
    sttConnection: z.string().default('localai').volatile(),
    imageConnection: z.string().default('localai').volatile(),
    rerankConnection: z.string().default('localai').volatile(),
    rerankModel: z.string().default('').volatile(),
    rerankBody: z.dict(z.any()).default({}).volatile(),
    embeddingBody: z.dict(z.any()).default({}).volatile(),
    ttsBody: z.dict(z.any()).default({}).volatile(),
    imageBody: z.dict(z.any()).default({}).volatile(),
    imageReferences: z.union(['ignore', 'img2img', 'ref_images'] as const).default('ignore').volatile(),
    imageHighresScale: z.number().min(1).max(4).default(1.5).volatile(),
    imageHighresSteps: z.natural().default(0).volatile(),
    embeddingModel: z.string().default('').volatile(),
    ttsModel: z.string().default('').volatile(),
    ttsVoice: z.string().default('').volatile(),
    sttModel: z.string().default('').volatile(),
    sttRealtimeModel: z.string().default('').volatile(),
    imageModel: z.string().default('').volatile(),
}) as unknown as z<Config>
