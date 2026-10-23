import type { SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Dictionaries } from './i18n.ts'

export type Key = 'label' | 'connectionsNav' | 'connectionsTitle' | 'connectionsDescription' | 'addConnection' | 'remove' | 'name' | 'baseUrl' | 'keyRef' | 'key' | 'saveKey' | 'keySet' | 'keyUnset'
  | 'llmTitle' | 'llmDescription' | 'addRoute' | 'routeId' | 'connection' | 'models' | 'modelsHint' | 'discover' | 'discovering' | 'discoverHint' | 'discoverNone' | 'discoverHave' | 'discoverFailed' | 'add'
  | 'advanced' | 'advancedHint' | 'invalidJson' | 'idle' | 'idleHint'
  | 'rerankTitle' | 'rerankDescription' | 'rerankModel' | 'rerankModelHint' | 'rerankMaxTokens' | 'rerankMaxTokensHint' | 'timeoutMsHintRerank'
  | 'embeddingTitle' | 'embeddingDescription' | 'connectionNone' | 'connectionHint' | 'embeddingModel' | 'embeddingModelHint' | 'embeddingDimensions' | 'embeddingDimensionsHint'
  | 'embeddingOverflow' | 'embeddingOverflowHint' | 'overflowTruncate' | 'overflowError'
  | 'batchSize' | 'batchSizeHint' | 'timeoutMs' | 'timeoutMsHint'
  | 'empty' | 'overridden' | 'reset' | 'invalidNumber' | 'save' | 'saving' | 'readOnly' | 'unavailable' | 'saveFailed'

export const dictionaries: Dictionaries<Key> = {
  en: {
    label: 'Cohere', connectionsNav: 'Cohere connections', connectionsTitle: 'Cohere connections',
    connectionsDescription: 'Cohere API endpoints and credentials, used by language models, embeddings and reranking. The base URL includes the version, for example https://api.cohere.com/v2.',
    addConnection: 'Add connection', remove: 'Remove', name: 'Name', baseUrl: 'Base URL', keyRef: 'Credential name', key: 'API key', saveKey: 'Store key', keySet: 'Key stored', keyUnset: 'No key',
    llmTitle: 'Cohere language models',
    llmDescription: 'Routes over the native v2 chat API. Besides the common controls, a route or model can set Cohere\'s own: safetyMode, thinking and thinkingBudget, strictTools, citationMode, responseFormat and priority. Cohere has no min-p or repetition penalty; those are ignored.',
    addRoute: 'Add route', routeId: 'Route id', connection: 'Connection', models: 'Models', modelsHint: 'Comma-separated model names, such as command-a-03-2025.',
    discover: 'List models on the account', discovering: 'Listing…', discoverHint: 'Chat models the account can use, with the context length Cohere reports.', discoverNone: 'The API lists no chat models.', discoverHave: 'Added', discoverFailed: 'The API could not be asked: {message}', add: 'Add',
    advanced: 'Advanced route JSON', advancedHint: 'Edit model metadata, reasoning levels, controls (sampling), headers and request fields.', invalidJson: 'Enter valid route JSON without changing its route id.',
    idle: 'Silence limit (ms)', idleHint: 'How long a model may stay silent before the request is given up.',
    rerankTitle: 'Cohere reranking', rerankDescription: 'Reranking through the v2 rerank API.',
    rerankModel: 'Rerank model', rerankModelHint: 'The model name, such as rerank-v3.5.',
    rerankMaxTokens: 'Tokens per document', rerankMaxTokensHint: 'The most tokens of a document the model reads (max_tokens_per_doc). 0 leaves it to the model.',
    timeoutMsHintRerank: 'How long a rerank request may take.',
    embeddingTitle: 'Cohere embeddings', embeddingDescription: 'Embeddings through the v2 embed API. A query or a document is sent as Cohere\'s input type, so retrieval models embed each the way they were trained to.',
    connectionNone: 'None', connectionHint: 'The connection this capability uses.',
    embeddingModel: 'Embedding model', embeddingModelHint: 'The model name, such as embed-v4.0 or embed-multilingual-v3.0.',
    embeddingDimensions: 'Vector dimensions', embeddingDimensionsHint: '0 leaves it to the model. Shorter vectors work only for embed-v4 and newer; vectors of different sizes cannot be compared.',
    embeddingOverflow: 'Texts longer than the input', embeddingOverflowHint: 'Cut to fit, or refuse the request.', overflowTruncate: 'Cut to fit', overflowError: 'Refuse',
    batchSize: 'Batch size', batchSizeHint: 'The most texts sent in one request. Cohere accepts at most 96.', timeoutMs: 'Timeout (ms)', timeoutMsHint: 'How long an embedding request may take.',
    empty: 'None configured.', overridden: 'Changed', reset: 'Reset', invalidNumber: 'Enter a whole number.', save: 'Save', saving: 'Saving…', readOnly: 'Settings are read-only.', unavailable: 'The provider is unavailable.', saveFailed: 'The settings were not accepted.',
  },
  zh: {
    label: 'Cohere', connectionsNav: 'Cohere 连接', connectionsTitle: 'Cohere 连接',
    connectionsDescription: '供语言模型、嵌入和重排共用的 Cohere API 端点与凭据。基础 URL 需包含版本，例如 https://api.cohere.com/v2。',
    addConnection: '添加连接', remove: '移除', name: '名称', baseUrl: '基础 URL', keyRef: '凭据名称', key: 'API 密钥', saveKey: '保存密钥', keySet: '已保存密钥', keyUnset: '无密钥',
    llmTitle: 'Cohere 语言模型',
    llmDescription: '基于原生 v2 聊天 API 的路由。除通用控制项外，路由或模型还可以设置 Cohere 自己的参数：safetyMode、thinking 与 thinkingBudget、strictTools、citationMode、responseFormat 和 priority。Cohere 没有 min-p 和重复惩罚，这两项会被忽略。',
    addRoute: '添加路由', routeId: '路由标识', connection: '连接', models: '模型', modelsHint: '用逗号分隔模型名称，例如 command-a-03-2025。',
    discover: '列出账户可用的模型', discovering: '正在列出…', discoverHint: '账户可用的聊天模型，附带 Cohere 报告的上下文长度。', discoverNone: 'API 没有列出聊天模型。', discoverHave: '已添加', discoverFailed: '无法询问 API：{message}', add: '添加',
    advanced: '高级路由 JSON', advancedHint: '编辑模型元数据、推理等级、控制项（sampling）、请求头和请求字段。', invalidJson: '请输入有效的路由 JSON，且不要修改路由标识。',
    idle: '静默上限（毫秒）', idleHint: '模型沉默多久后放弃请求。',
    rerankTitle: 'Cohere 重排', rerankDescription: '通过 v2 重排 API 进行重排。',
    rerankModel: '重排模型', rerankModelHint: '模型名称，例如 rerank-v3.5。',
    rerankMaxTokens: '每篇文档的 token 数', rerankMaxTokensHint: '模型读取每篇文档的最大 token 数（max_tokens_per_doc）。0 表示由模型决定。',
    timeoutMsHintRerank: '一次重排请求允许的最长时间。',
    embeddingTitle: 'Cohere 嵌入', embeddingDescription: '通过 v2 嵌入 API 生成嵌入向量。查询和文档会按 Cohere 的输入类型发送，检索模型即可按训练时的方式分别处理。',
    connectionNone: '无', connectionHint: '此能力使用的连接。',
    embeddingModel: '嵌入模型', embeddingModelHint: '模型名称，例如 embed-v4.0 或 embed-multilingual-v3.0。',
    embeddingDimensions: '向量维度', embeddingDimensionsHint: '0 表示由模型决定。仅 embed-v4 及更新版本支持缩短向量；不同长度的向量无法比较。',
    embeddingOverflow: '超出输入长度的文本', embeddingOverflowHint: '截断以适应，或拒绝请求。', overflowTruncate: '截断', overflowError: '拒绝',
    batchSize: '批大小', batchSizeHint: '单次请求发送的最大文本数。Cohere 最多接受 96 条。', timeoutMs: '超时（毫秒）', timeoutMsHint: '一次嵌入请求允许的最长时间。',
    empty: '尚未配置。', overridden: '已更改', reset: '重置', invalidNumber: '请输入整数。', save: '保存', saving: '正在保存…', readOnly: '设置为只读。', unavailable: '提供方不可用。', saveFailed: '设置未被接受。',
  },
}

export const formLabels = (t: (key: Key) => string): SettingsFormLabels => ({ unavailable: t('unavailable'), readOnly: t('readOnly'), saveFailed: t('saveFailed'), save: t('save'), saving: t('saving') })
