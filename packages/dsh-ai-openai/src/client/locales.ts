import type { SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Dictionaries } from './i18n.ts'

export type OpenAiLocaleKey =
  | 'label' | 'title' | 'description'
  | 'baseUrl' | 'baseUrlHint' | 'apiKeyEnv' | 'apiKeyEnvHint' | 'apiKey' | 'apiKeyHint' | 'apiKeySet' | 'apiKeyUnset'
  | 'embeddingModel' | 'embeddingModelHint' | 'embeddingDimensions' | 'embeddingDimensionsHint' | 'batchSize' | 'batchSizeHint' | 'timeoutMs' | 'timeoutMsHint'
  | 'overridden' | 'reset' | 'invalidNumber'
  | 'readOnly' | 'unavailable' | 'save' | 'saving' | 'saveFailed'

export const dictionaries: Dictionaries<OpenAiLocaleKey> = {
  en: {
    label: 'OpenAI-compatible',
    title: 'OpenAI-compatible API',
    description: 'Any server that speaks the OpenAI embeddings API: OpenAI itself, or a local one such as LocalAI or vLLM.',
    baseUrl: 'Base URL',
    baseUrlHint: 'The API root, for example https://api.openai.com/v1 or http://localhost:8081/v1. Requests go to {base URL}/embeddings.',
    apiKeyEnv: 'Key name',
    apiKeyEnvHint: 'The name the key is stored under. It can also be supplied by an environment variable of this name, which then takes precedence.',
    apiKey: 'API key',
    apiKeyHint: 'Typed here, kept by DSH\'s credentials store and never written to the profile or shown again. A server that needs no key can be left without one.',
    apiKeySet: 'Key stored',
    apiKeyUnset: 'No key',
    embeddingModel: 'Model',
    embeddingModelHint: 'The embedding model, as the API names it, for example text-embedding-3-small or bge-m3.',
    embeddingDimensions: 'Dimensions',
    embeddingDimensionsHint: 'Shorter vectors, for models that can shorten theirs (such as text-embedding-3). 0 leaves it to the model.',
    batchSize: 'Texts per request',
    batchSizeHint: 'The most texts sent in one request; more are sent in several.',
    timeoutMs: 'Timeout (ms)',
    timeoutMsHint: 'How long a request may take before it is given up.',
    overridden: 'Changed',
    reset: 'Reset',
    invalidNumber: 'Enter a whole number.',
    readOnly: 'This deployment stores settings read-only.',
    unavailable: 'The OpenAI-compatible provider is not loaded, so it cannot be configured right now.',
    save: 'Save',
    saving: 'Saving…',
    saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
  },
  zh: {
    label: 'OpenAI 兼容',
    title: 'OpenAI 兼容接口',
    description: '任何遵循 OpenAI 嵌入接口的服务：OpenAI 本身，或 LocalAI、vLLM 之类的本地服务。',
    baseUrl: '基础 URL',
    baseUrlHint: '接口根地址，例如 https://api.openai.com/v1 或 http://localhost:8081/v1。请求会发往 {基础 URL}/embeddings。',
    apiKeyEnv: '密钥名称',
    apiKeyEnvHint: '密钥存放所用的名称。也可以由同名环境变量提供，此时环境变量优先。',
    apiKey: 'API 密钥',
    apiKeyHint: '在此输入，由 DSH 的凭据存储保管，不会写入配置，也不会再次显示。不需要密钥的服务可以留空。',
    apiKeySet: '已保存密钥',
    apiKeyUnset: '无密钥',
    embeddingModel: '模型',
    embeddingModelHint: '嵌入模型在接口中的名称，例如 text-embedding-3-small 或 bge-m3。',
    embeddingDimensions: '维度',
    embeddingDimensionsHint: '缩短向量长度，适用于支持缩短的模型（如 text-embedding-3）。0 表示由模型决定。',
    batchSize: '每次请求的文本数',
    batchSizeHint: '一次请求最多发送的文本数；更多时会分多次发送。',
    timeoutMs: '超时（毫秒）',
    timeoutMsHint: '一次请求最长等待多久后放弃。',
    overridden: '已更改',
    reset: '重置',
    invalidNumber: '请输入整数。',
    readOnly: '本部署的设置为只读。',
    unavailable: 'OpenAI 兼容提供方未加载，暂时无法配置。',
    save: '保存',
    saving: '正在保存…',
    saveFailed: '本部署没有接受这些值，已保留供你修改。',
  },
}

export const formLabels = (t: (key: OpenAiLocaleKey) => string): SettingsFormLabels => ({
  unavailable: t('unavailable'),
  readOnly: t('readOnly'),
  saveFailed: t('saveFailed'),
  save: t('save'),
  saving: t('saving'),
})
