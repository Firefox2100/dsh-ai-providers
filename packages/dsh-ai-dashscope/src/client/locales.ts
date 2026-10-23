import type { SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Dictionaries } from './i18n.ts'

export type Key = 'label' | 'connectionsNav' | 'connectionsTitle' | 'connectionsDescription' | 'addConnection' | 'remove' | 'name' | 'baseUrl' | 'keyRef' | 'key' | 'saveKey' | 'keySet' | 'keyUnset'
  | 'llmTitle' | 'llmDescription' | 'addRoute' | 'routeId' | 'connection' | 'models' | 'modelsHint' | 'discover' | 'discovering' | 'discoverHint' | 'discoverNone' | 'discoverHave' | 'discoverFailed' | 'add'
  | 'advanced' | 'advancedHint' | 'invalidJson' | 'idle' | 'idleHint'
  | 'rerankTitle' | 'rerankDescription' | 'rerankModel' | 'rerankModelHint' | 'rerankInstruct' | 'rerankInstructHint'
  | 'embeddingTitle' | 'embeddingDescription' | 'connectionNone' | 'connectionHint' | 'embeddingModel' | 'embeddingModelHint' | 'embeddingDimensions' | 'embeddingDimensionsHint'
  | 'embeddingInstruct' | 'embeddingInstructHint' | 'embeddingEndpoint' | 'embeddingEndpointHint' | 'endpointText' | 'endpointMultimodal'
  | 'ttsTitle' | 'ttsDescription' | 'ttsModel' | 'ttsModelHint' | 'ttsVoice' | 'ttsVoiceHint' | 'ttsLanguage' | 'ttsLanguageHint' | 'ttsFormat' | 'ttsFormatHint'
  | 'sttTitle' | 'sttDescription' | 'sttModel' | 'sttModelHint' | 'sttEnableItn' | 'sttEnableItnHint'
  | 'imageTitle' | 'imageDescription' | 'imageModel' | 'imageModelHint' | 'imageSize' | 'imageSizeHint' | 'imagePromptExtend' | 'imagePromptExtendHint' | 'imageWatermark' | 'imageWatermarkHint'
  | 'optionOn' | 'optionOff'
  | 'batchSize' | 'batchSizeHint' | 'timeoutMs' | 'timeoutMsHint'
  | 'empty' | 'overridden' | 'reset' | 'invalidNumber' | 'save' | 'saving' | 'readOnly' | 'unavailable' | 'saveFailed'

export const dictionaries: Dictionaries<Key> = {
  en: {
    label: 'DashScope', connectionsNav: 'DashScope connections', connectionsTitle: 'DashScope connections',
    connectionsDescription: 'DashScope API endpoints and credentials, shared by language models, embeddings, reranking, speech and image generation. The base URL includes the version, for example https://dashscope.aliyuncs.com/api/v1 (China) or https://dashscope-intl.aliyuncs.com/api/v1 (international). A key works only in its own region.',
    addConnection: 'Add connection', remove: 'Remove', name: 'Name', baseUrl: 'Base URL', keyRef: 'Credential name', key: 'API key', saveKey: 'Store key', keySet: 'Key stored', keyUnset: 'No key',
    llmTitle: 'DashScope language models',
    llmDescription: 'Routes over the native generation API. Besides the common controls (top-k and the repetition penalty included), a route or model can set DashScope\'s own: enableThinking, thinkingBudget, reasoningEffort, preserveThinking, enableSearch and searchOptions, enableCodeInterpreter, parallelToolCalls, toolStream, responseFormat and the vision limits. DashScope has no min-p or frequency penalty; those are ignored. Models marked for images use the multimodal endpoint.',
    addRoute: 'Add route', routeId: 'Route id', connection: 'Connection', models: 'Models', modelsHint: 'Comma-separated model names, such as qwen-plus.',
    discover: 'List models on the account', discovering: 'Listing…', discoverHint: 'Text-generation models the account can use, with the context window and output limit DashScope reports.', discoverNone: 'The API lists no text-generation models.', discoverHave: 'Added', discoverFailed: 'The API could not be asked: {message}', add: 'Add',
    advanced: 'Advanced route JSON', advancedHint: 'Edit model metadata, reasoning levels, controls (sampling), headers and request fields.', invalidJson: 'Enter valid route JSON without changing its route id.',
    idle: 'Silence limit (ms)', idleHint: 'How long a model may stay silent before the request is given up.',
    rerankTitle: 'DashScope reranking', rerankDescription: 'Reranking through the native rerank API. Documents are text.',
    rerankModel: 'Rerank model', rerankModelHint: 'The model name, such as qwen3-rerank.',
    rerankInstruct: 'Instruction', rerankInstructHint: 'Tells a Qwen reranker what a good match is (instruct). Empty keeps the model\'s default of question-answer retrieval.',
    embeddingTitle: 'DashScope embeddings', embeddingDescription: 'Embeddings through the native text-embedding API. A query or a document is sent as DashScope\'s text type. Only dense vectors are requested.',
    connectionNone: 'None', connectionHint: 'The connection this capability uses.',
    embeddingModel: 'Embedding model', embeddingModelHint: 'The model name, such as text-embedding-v4.',
    embeddingDimensions: 'Vector dimensions', embeddingDimensionsHint: '0 leaves it to the model (1024). The model accepts only some sizes, for example 64 to 2048 for text-embedding-v4; vectors of different sizes cannot be compared.',
    embeddingInstruct: 'Instruction', embeddingInstructHint: 'Describes the task to models that read one (instruct); English works best. Empty sends none.',
    embeddingEndpoint: 'Embedding API', embeddingEndpointHint: 'The text API, or the multimodal one for models such as qwen3-vl-embedding. Texts are sent either way; images and video cannot be sent through the shared embedding interface.', endpointText: 'Text embedding', endpointMultimodal: 'Multimodal embedding',
    ttsTitle: 'DashScope speech synthesis', ttsDescription: 'Speech from Qwen-TTS (over HTTP) or CosyVoice (over a WebSocket), chosen by the model name: qwen…-tts… or cosyvoice….',
    ttsModel: 'Speech model', ttsModelHint: 'For example qwen3-tts-flash or cosyvoice-v3-flash.', ttsVoice: 'Default voice', ttsVoiceHint: 'The voice id used unless a request chooses another, for example Cherry (Qwen-TTS) or longanyang (CosyVoice).',
    ttsLanguage: 'Qwen-TTS language', ttsLanguageHint: 'Auto, or a language name such as English or Chinese. Naming it improves quality.', ttsFormat: 'CosyVoice audio format', ttsFormatHint: 'Qwen-TTS always answers WAV.',
    sttTitle: 'DashScope speech recognition', sttDescription: 'Transcription of finished recordings with Qwen-ASR (up to 5 minutes and 10 MB). Live transcription is not offered.',
    sttModel: 'Recognition model', sttModelHint: 'For example qwen3-asr-flash.', sttEnableItn: 'Normalize numbers and dates', sttEnableItnHint: 'Write numbers and dates in their usual form (enable_itn).',
    imageTitle: 'DashScope image generation', imageDescription: 'Pictures from the synchronous image models (Qwen-Image, Wan 2.6). With reference images the model edits instead of drawing. Models that only run as asynchronous tasks are not served.',
    imageModel: 'Image model', imageModelHint: 'For example qwen-image-2.0-pro.', imageSize: 'Image size', imageSizeHint: 'width*height, such as 1328*1328. Empty leaves it to the model.',
    imagePromptExtend: 'Rewrite the prompt', imagePromptExtendHint: 'Let the model expand the prompt before drawing (prompt_extend).', imageWatermark: 'Watermark', imageWatermarkHint: 'Add the provider\'s watermark.', optionOn: 'On', optionOff: 'Off',
    batchSize: 'Batch size', batchSizeHint: 'The most texts sent in one request. DashScope accepts 10 at most for most models, 20 for qwen3.7.', timeoutMs: 'Timeout (ms)', timeoutMsHint: 'How long a rerank, embedding, speech or image request may take.',
    empty: 'None configured.', overridden: 'Changed', reset: 'Reset', invalidNumber: 'Enter a whole number.', save: 'Save', saving: 'Saving…', readOnly: 'Settings are read-only.', unavailable: 'The provider is unavailable.', saveFailed: 'The settings were not accepted.',
  },
  zh: {
    label: 'DashScope', connectionsNav: 'DashScope 连接', connectionsTitle: 'DashScope 连接',
    connectionsDescription: '供语言模型、嵌入、重排、语音与图像生成共用的 DashScope API 端点与凭据。基础 URL 需包含版本，例如 https://dashscope.aliyuncs.com/api/v1（中国）或 https://dashscope-intl.aliyuncs.com/api/v1（国际）。密钥只在所属地域有效。',
    addConnection: '添加连接', remove: '移除', name: '名称', baseUrl: '基础 URL', keyRef: '凭据名称', key: 'API 密钥', saveKey: '保存密钥', keySet: '已保存密钥', keyUnset: '无密钥',
    llmTitle: 'DashScope 语言模型',
    llmDescription: '基于原生生成 API 的路由。除通用控制项（包括 top-k 和重复惩罚）外，路由或模型还可以设置 DashScope 自己的参数：enableThinking、thinkingBudget、reasoningEffort、preserveThinking、enableSearch 与 searchOptions、enableCodeInterpreter、parallelToolCalls、toolStream、responseFormat 以及视觉限制。DashScope 没有 min-p 和频率惩罚，这两项会被忽略。标记为支持图像的模型会使用多模态端点。',
    addRoute: '添加路由', routeId: '路由标识', connection: '连接', models: '模型', modelsHint: '用逗号分隔模型名称，例如 qwen-plus。',
    discover: '列出账户可用的模型', discovering: '正在列出…', discoverHint: '账户可用的文本生成模型，附带 DashScope 报告的上下文窗口和输出上限。', discoverNone: 'API 没有列出文本生成模型。', discoverHave: '已添加', discoverFailed: '无法询问 API：{message}', add: '添加',
    advanced: '高级路由 JSON', advancedHint: '编辑模型元数据、推理等级、控制项（sampling）、请求头和请求字段。', invalidJson: '请输入有效的路由 JSON，且不要修改路由标识。',
    idle: '静默上限（毫秒）', idleHint: '模型沉默多久后放弃请求。',
    rerankTitle: 'DashScope 重排', rerankDescription: '通过原生重排 API 进行重排。文档为文本。',
    rerankModel: '重排模型', rerankModelHint: '模型名称，例如 qwen3-rerank。',
    rerankInstruct: '任务指令', rerankInstructHint: '告诉 Qwen 重排模型怎样算好的匹配（instruct）。留空则沿用模型默认的问答检索。',
    embeddingTitle: 'DashScope 嵌入', embeddingDescription: '通过原生 text-embedding API 生成嵌入向量。查询和文档会按 DashScope 的 text_type 发送，只请求稠密向量。',
    connectionNone: '无', connectionHint: '此能力使用的连接。',
    embeddingModel: '嵌入模型', embeddingModelHint: '模型名称，例如 text-embedding-v4。',
    embeddingDimensions: '向量维度', embeddingDimensionsHint: '0 表示由模型决定（1024）。模型只接受部分尺寸，例如 text-embedding-v4 为 64 到 2048；不同长度的向量无法比较。',
    embeddingInstruct: '任务指令', embeddingInstructHint: '向会读取指令的模型描述任务（instruct），英文效果最好。留空则不发送。',
    embeddingEndpoint: '嵌入 API', embeddingEndpointHint: '文本 API，或 qwen3-vl-embedding 等模型使用的多模态 API。两种方式发送的都是文本；图像和视频无法通过共享的嵌入接口发送。', endpointText: '文本嵌入', endpointMultimodal: '多模态嵌入',
    ttsTitle: 'DashScope 语音合成', ttsDescription: '由模型名称决定使用 Qwen-TTS（HTTP）还是 CosyVoice（WebSocket）：qwen…-tts… 或 cosyvoice…。',
    ttsModel: '语音模型', ttsModelHint: '例如 qwen3-tts-flash 或 cosyvoice-v3-flash。', ttsVoice: '默认声音', ttsVoiceHint: '请求未指定时使用的声音标识，例如 Cherry（Qwen-TTS）或 longanyang（CosyVoice）。',
    ttsLanguage: 'Qwen-TTS 语言', ttsLanguageHint: 'Auto，或 English、Chinese 等语言名称。指明语言可提升质量。', ttsFormat: 'CosyVoice 音频格式', ttsFormatHint: 'Qwen-TTS 始终返回 WAV。',
    sttTitle: 'DashScope 语音识别', sttDescription: '用 Qwen-ASR 转写已完成的录音（最长 5 分钟、10 MB）。不提供实时转写。',
    sttModel: '识别模型', sttModelHint: '例如 qwen3-asr-flash。', sttEnableItn: '规范化数字和日期', sttEnableItnHint: '按通常写法输出数字和日期（enable_itn）。',
    imageTitle: 'DashScope 图像生成', imageDescription: '使用同步图像模型（Qwen-Image、Wan 2.6）出图。提供参考图像时，模型会编辑而不是重新绘制。仅支持异步任务的模型不在支持范围内。',
    imageModel: '图像模型', imageModelHint: '例如 qwen-image-2.0-pro。', imageSize: '图像尺寸', imageSizeHint: '宽*高，例如 1328*1328。留空则由模型决定。',
    imagePromptExtend: '改写提示词', imagePromptExtendHint: '允许模型在绘制前扩写提示词（prompt_extend）。', imageWatermark: '水印', imageWatermarkHint: '添加提供方的水印。', optionOn: '开', optionOff: '关',
    batchSize: '批大小', batchSizeHint: '单次请求发送的最大文本数。多数模型最多 10 条，qwen3.7 为 20 条。', timeoutMs: '超时（毫秒）', timeoutMsHint: '一次重排、嵌入、语音或图像请求允许的最长时间。',
    empty: '尚未配置。', overridden: '已更改', reset: '重置', invalidNumber: '请输入整数。', save: '保存', saving: '正在保存…', readOnly: '设置为只读。', unavailable: '提供方不可用。', saveFailed: '设置未被接受。',
  },
}

export const formLabels = (t: (key: Key) => string): SettingsFormLabels => ({ unavailable: t('unavailable'), readOnly: t('readOnly'), saveFailed: t('saveFailed'), save: t('save'), saving: t('saving') })
