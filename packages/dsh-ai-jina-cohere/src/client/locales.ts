import type { SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Dictionaries } from './i18n.ts'

export type JinaCohereLocaleKey =
  | 'label' | 'title' | 'description'
  | 'baseUrl' | 'baseUrlHint' | 'apiKeyEnv' | 'apiKeyEnvHint' | 'apiKey' | 'apiKeyHint' | 'apiKeySet' | 'apiKeyUnset'
  | 'rerankModel' | 'rerankModelHint' | 'timeoutMs' | 'timeoutMsHint'
  | 'overridden' | 'reset' | 'invalidNumber'
  | 'readOnly' | 'unavailable' | 'save' | 'saving' | 'saveFailed'

export const dictionaries: Dictionaries<JinaCohereLocaleKey> = {
  en: {
    label: 'Jina / Cohere (rerank API)',
    title: 'Jina / Cohere rerank API',
    description: 'Any server that speaks the rerank API Jina and Cohere share: Jina AI, Cohere, or a local one such as LocalAI or vLLM.',
    baseUrl: 'Base URL',
    baseUrlHint: 'The API root, for example https://api.jina.ai/v1, https://api.cohere.com/v2 or http://localhost:8081/v1. Requests go to {base URL}/rerank.',
    apiKeyEnv: 'Key name',
    apiKeyEnvHint: 'The name the key is stored under. It can also be supplied by an environment variable of this name, which then takes precedence.',
    apiKey: 'API key',
    apiKeyHint: 'Typed here, kept by DSH\'s credentials store and never written to the profile or shown again. A server that needs no key can be left without one.',
    apiKeySet: 'Key stored',
    apiKeyUnset: 'No key',
    rerankModel: 'Model',
    rerankModelHint: 'The rerank model, as the API names it, for example jina-reranker-v2-base-multilingual, rerank-v3.5 or bge-reranker-v2-m3.',
    timeoutMs: 'Timeout (ms)',
    timeoutMsHint: 'How long a request may take before it is given up.',
    overridden: 'Changed',
    reset: 'Reset',
    invalidNumber: 'Enter a whole number.',
    readOnly: 'This deployment stores settings read-only.',
    unavailable: 'The Jina / Cohere provider is not loaded, so it cannot be configured right now.',
    save: 'Save',
    saving: 'Saving…',
    saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
  },
  zh: {
    label: 'Jina / Cohere（重排序接口）',
    title: 'Jina / Cohere 重排序接口',
    description: '任何遵循 Jina 与 Cohere 共用的重排序接口的服务：Jina AI、Cohere，或 LocalAI、vLLM 之类的本地服务。',
    baseUrl: '基础 URL',
    baseUrlHint: '接口根地址，例如 https://api.jina.ai/v1、https://api.cohere.com/v2 或 http://localhost:8081/v1。请求会发往 {基础 URL}/rerank。',
    apiKeyEnv: '密钥名称',
    apiKeyEnvHint: '密钥存放所用的名称。也可以由同名环境变量提供，此时环境变量优先。',
    apiKey: 'API 密钥',
    apiKeyHint: '在此输入，由 DSH 的凭据存储保管，不会写入配置，也不会再次显示。不需要密钥的服务可以留空。',
    apiKeySet: '已保存密钥',
    apiKeyUnset: '无密钥',
    rerankModel: '模型',
    rerankModelHint: '重排序模型在接口中的名称，例如 jina-reranker-v2-base-multilingual、rerank-v3.5 或 bge-reranker-v2-m3。',
    timeoutMs: '超时（毫秒）',
    timeoutMsHint: '一次请求最长等待多久后放弃。',
    overridden: '已更改',
    reset: '重置',
    invalidNumber: '请输入整数。',
    readOnly: '本部署的设置为只读。',
    unavailable: 'Jina / Cohere 提供方未加载，暂时无法配置。',
    save: '保存',
    saving: '正在保存…',
    saveFailed: '本部署没有接受这些值，已保留供你修改。',
  },
}

export const formLabels = (t: (key: JinaCohereLocaleKey) => string): SettingsFormLabels => ({
  unavailable: t('unavailable'),
  readOnly: t('readOnly'),
  saveFailed: t('saveFailed'),
  save: t('save'),
  saving: t('saving'),
})
