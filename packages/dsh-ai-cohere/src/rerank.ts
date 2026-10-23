import type { RequestOption, RerankOptions } from '@dsh-ai-providers/core'

/** Cohere's own controls of one rerank request. */
export interface CohereRerankOptions extends RerankOptions {
  /** Truncate each document to this many tokens; the configuration's value is used when left out. */
  maxTokensPerDoc?: number
  /** Cohere's queue priority: lower numbers are served first. */
  queuePriority?: number
}

export const RERANK_REQUEST_OPTIONS: readonly RequestOption[] = [
  {
    key: 'maxTokensPerDoc',
    type: 'integer',
    label: { en: 'Tokens per document', zh: '每篇文档的词元数' },
    description: { en: 'Cut each document to this many tokens before scoring. Leave empty to use the provider\'s setting; Cohere\'s own default is 4096.', zh: '评分前把每篇文档截断到这个词元数。留空则使用提供方的设置；Cohere 自身的默认值是 4096。' },
    min: 1,
  },
  {
    key: 'queuePriority',
    type: 'integer',
    label: { en: 'Queue priority', zh: '队列优先级' },
    description: { en: 'Where the request queues when Cohere is busy: lower numbers are served first.', zh: 'Cohere 繁忙时请求的排队位置：数字越小越先处理。' },
    default: 0,
    min: 0,
    max: 999,
  },
]

/** The native fields of a rerank request: the call's options, else the configured token limit. */
export function rerankBody(defaultMaxTokensPerDoc: number, { maxTokensPerDoc = defaultMaxTokensPerDoc, queuePriority }: CohereRerankOptions): Record<string, number> {
  return {
    ...maxTokensPerDoc > 0 ? { max_tokens_per_doc: maxTokensPerDoc } : {},
    ...queuePriority === undefined ? {} : { priority: queuePriority },
  }
}
