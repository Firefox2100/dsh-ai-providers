import type { SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Dictionaries } from './i18n.ts'

export type Key = 'label' | 'connectionsNav' | 'connectionsTitle' | 'connectionsDescription' | 'addConnection' | 'remove' | 'name' | 'baseUrl' | 'keyRef' | 'key' | 'saveKey' | 'keySet' | 'keyUnset'
  | 'llmTitle' | 'llmDescription' | 'addRoute' | 'routeId' | 'connection' | 'models' | 'modelsHint' | 'discover' | 'discovering' | 'discoverHint' | 'discoverNone' | 'discoverHave' | 'discoverFailed' | 'add'
  | 'advanced' | 'advancedHint' | 'invalidJson' | 'idle' | 'idleHint'
  | 'embeddingTitle' | 'embeddingDescription' | 'connectionNone' | 'connectionHint' | 'embeddingModel' | 'embeddingModelHint' | 'embeddingDimensions' | 'embeddingDimensionsHint'
  | 'embeddingNumCtx' | 'embeddingNumCtxHint' | 'embeddingOverflow' | 'embeddingOverflowHint' | 'overflowTruncate' | 'overflowError' | 'embeddingKeepAlive' | 'embeddingKeepAliveHint'
  | 'batchSize' | 'batchSizeHint' | 'timeoutMs' | 'timeoutMsHint'
  | 'empty' | 'overridden' | 'reset' | 'invalidNumber' | 'save' | 'saving' | 'readOnly' | 'unavailable' | 'saveFailed'

export const dictionaries: Dictionaries<Key> = {
  en: {
    label: 'Ollama', connectionsNav: 'Ollama connections', connectionsTitle: 'Ollama connections',
    connectionsDescription: 'Servers that speak the native Ollama API. A local server needs only its address; a hosted or proxied one also takes a bearer token, stored as a credential.',
    addConnection: 'Add connection', remove: 'Remove', name: 'Name', baseUrl: 'Base URL', keyRef: 'Credential name', key: 'API key', saveKey: 'Store key', keySet: 'Key stored', keyUnset: 'No key',
    llmTitle: 'Ollama language models',
    llmDescription: 'Routes over the native chat API. Besides the common controls, a route or model can set Ollama\'s own: numCtx, keepAlive, think, format, mirostat and the other options of the request. Set numCtx: without it the server allocates its own default context, often far below the model\'s window.',
    addRoute: 'Add route', routeId: 'Route id', connection: 'Connection', models: 'Models', modelsHint: 'Comma-separated model names, such as qwen3:8b.',
    discover: 'List models on the server', discovering: 'Listing…', discoverHint: 'Models the server has. Adding one keeps what the server says it can do: images, thinking and its context window.', discoverNone: 'The server lists no chat models.', discoverHave: 'Added', discoverFailed: 'The server could not be asked: {message}', add: 'Add',
    advanced: 'Advanced route JSON', advancedHint: 'Edit model metadata, reasoning levels, controls (sampling), headers and request fields.', invalidJson: 'Enter valid route JSON without changing its route id.',
    idle: 'Silence limit (ms)', idleHint: 'How long a model may stay silent before the request is given up. Loading a large model can take a while.',
    embeddingTitle: 'Ollama embeddings', embeddingDescription: 'Embeddings from the native /api/embed endpoint.',
    connectionNone: 'None', connectionHint: 'The connection this capability uses.',
    embeddingModel: 'Embedding model', embeddingModelHint: 'The model name as Ollama lists it, such as nomic-embed-text or bge-m3.',
    embeddingDimensions: 'Vector dimensions', embeddingDimensionsHint: '0 leaves it to the model. Shorter vectors work only for models that support it; vectors of different sizes cannot be compared.',
    embeddingNumCtx: 'Context (num_ctx)', embeddingNumCtxHint: '0 leaves it to the server. Raise it for models with a long input, or longer texts are cut.',
    embeddingOverflow: 'Texts longer than the context', embeddingOverflowHint: 'Cut to fit, or refuse the request.', overflowTruncate: 'Cut to fit', overflowError: 'Refuse',
    embeddingKeepAlive: 'Keep loaded', embeddingKeepAliveHint: 'How long the model stays in memory after a request: 5m, 1h, -1 for ever, 0 to unload at once. Empty leaves it to the server.',
    batchSize: 'Batch size', batchSizeHint: 'The most texts sent in one request.', timeoutMs: 'Timeout (ms)', timeoutMsHint: 'How long an embedding request may take.',
    empty: 'None configured.', overridden: 'Changed', reset: 'Reset', invalidNumber: 'Enter a whole number.', save: 'Save', saving: 'Saving…', readOnly: 'Settings are read-only.', unavailable: 'The provider is unavailable.', saveFailed: 'The settings were not accepted.',
  },
  zh: {
    label: 'Ollama', connectionsNav: 'Ollama 连接', connectionsTitle: 'Ollama 连接',
    connectionsDescription: '使用 Ollama 原生 API 的服务器。本地服务器只需地址；托管或经代理的服务器还需要一个 Bearer 令牌，作为凭据保存。',
    addConnection: '添加连接', remove: '移除', name: '名称', baseUrl: '基础 URL', keyRef: '凭据名称', key: 'API 密钥', saveKey: '保存密钥', keySet: '已保存密钥', keyUnset: '无密钥',
    llmTitle: 'Ollama 语言模型',
    llmDescription: '基于原生聊天 API 的路由。除通用控制项外，路由或模型还可以设置 Ollama 自己的参数：numCtx、keepAlive、think、format、mirostat 以及请求中的其他选项。请设置 numCtx：不设置时服务器会使用自己的默认上下文长度，往往远小于模型的窗口。',
    addRoute: '添加路由', routeId: '路由标识', connection: '连接', models: '模型', modelsHint: '用逗号分隔模型名称，例如 qwen3:8b。',
    discover: '列出服务器上的模型', discovering: '正在列出…', discoverHint: '服务器上已有的模型。添加时会保留服务器报告的能力：图像、思考和上下文窗口。', discoverNone: '服务器没有可用于聊天的模型。', discoverHave: '已添加', discoverFailed: '无法询问服务器：{message}', add: '添加',
    advanced: '高级路由 JSON', advancedHint: '编辑模型元数据、推理等级、控制项（sampling）、请求头和请求字段。', invalidJson: '请输入有效的路由 JSON，且不要修改路由标识。',
    idle: '静默上限（毫秒）', idleHint: '模型沉默多久后放弃请求。加载大模型可能需要一段时间。',
    embeddingTitle: 'Ollama 嵌入', embeddingDescription: '通过原生 /api/embed 接口生成嵌入向量。',
    connectionNone: '无', connectionHint: '此能力使用的连接。',
    embeddingModel: '嵌入模型', embeddingModelHint: 'Ollama 列出的模型名称，例如 nomic-embed-text 或 bge-m3。',
    embeddingDimensions: '向量维度', embeddingDimensionsHint: '0 表示由模型决定。仅支持缩短向量的模型可用；不同长度的向量无法比较。',
    embeddingNumCtx: '上下文（num_ctx）', embeddingNumCtxHint: '0 表示由服务器决定。输入较长的模型请调高，否则较长的文本会被截断。',
    embeddingOverflow: '超出上下文的文本', embeddingOverflowHint: '截断以适应，或拒绝请求。', overflowTruncate: '截断', overflowError: '拒绝',
    embeddingKeepAlive: '保持加载', embeddingKeepAliveHint: '请求后模型在内存中保留多久：5m、1h，-1 表示一直保留，0 表示立即卸载。留空则由服务器决定。',
    batchSize: '批大小', batchSizeHint: '单次请求发送的最大文本数。', timeoutMs: '超时（毫秒）', timeoutMsHint: '一次嵌入请求允许的最长时间。',
    empty: '尚未配置。', overridden: '已更改', reset: '重置', invalidNumber: '请输入整数。', save: '保存', saving: '正在保存…', readOnly: '设置为只读。', unavailable: '提供方不可用。', saveFailed: '设置未被接受。',
  },
}

export const formLabels = (t: (key: Key) => string): SettingsFormLabels => ({ unavailable: t('unavailable'), readOnly: t('readOnly'), saveFailed: t('saveFailed'), save: t('save'), saving: t('saving') })
