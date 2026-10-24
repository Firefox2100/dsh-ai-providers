import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { providerSlotId, providerSlotName } from '@dsh-ai-providers/core'
import type {} from '@dsh-ai-providers/core/slots'
import { ENTRY_ID, PROVIDER_ID } from '../ids.ts'
import { Card, LlmCard } from './Card.tsx'
import { Connections } from './Connections.tsx'
import { Controller } from './controller.ts'

type Key =
  | 'label' | 'title' | 'description' | 'llmDescription'
  | 'connectionsTitle' | 'connectionsDescription' | 'connectionsEmpty' | 'name' | 'baseUrl' | 'keyRef' | 'key' | 'keyHint' | 'saveKey' | 'keySet' | 'keyUnset' | 'addConnection' | 'remove'
  | 'connection' | 'connectionNone' | 'connectionHint' | 'embeddingModel' | 'embeddingDimensions' | 'batchSize' | 'rerankModel' | 'decisionModel'
  | 'ttsModel' | 'ttsVoice' | 'ttsResponseFormat' | 'ttsSpeed' | 'sttModel' | 'sttRealtimeModel'
  | 'imageModel' | 'imageSize' | 'imageQuality' | 'imageOutputFormat' | 'imageOutputCompression' | 'imageReferences' | 'imageHighresScale' | 'imageHighresSteps'
  | 'requestBody' | 'requestBodyHint' | 'timeoutMs' | 'llmRoutes' | 'llmRoutesHint' | 'llmIdleTimeoutMs'
  | 'overridden' | 'reset' | 'invalidNumber' | 'save' | 'saving' | 'saveFailed' | 'readOnly' | 'unavailable'

declare module '@deepseek-ai/dsh-client-ui-slots' { interface LocaleNamespaceMap { 'ai.localai': Key } }
const locale = 'ai.localai'
const dictionaries = {
  en: {
    label: 'LocalAI', title: 'LocalAI', description: 'Configure LocalAI for this service.', llmDescription: 'Configure the LocalAI language-model routes exposed to DSH.',
    connectionsTitle: 'LocalAI connections', connectionsDescription: 'LocalAI endpoints and optional bearer credentials, reusable across its services.', connectionsEmpty: 'No LocalAI connections are configured.',
    name: 'Name', baseUrl: 'Base URL', keyRef: 'Credential name', key: 'API key', keyHint: 'Stored by DSH and never written to the profile. Leave it empty when the server needs no key.', saveKey: 'Store key', keySet: 'Key stored', keyUnset: 'No key', addConnection: 'Add connection', remove: 'Remove',
    connection: 'Connection', connectionNone: 'No connection', connectionHint: 'Create and manage connections on the Providers page.',
    embeddingModel: 'Embedding model', embeddingDimensions: 'Dimensions', batchSize: 'Texts per request', rerankModel: 'Reranking model', decisionModel: 'Decision model',
    ttsModel: 'Speech model', ttsVoice: 'Default voice', ttsResponseFormat: 'Audio format', ttsSpeed: 'Speech speed', sttModel: 'Transcription model', sttRealtimeModel: 'Live transcription model',
    imageModel: 'Image model', imageSize: 'Image size', imageQuality: 'Image quality', imageOutputFormat: 'Image format', imageOutputCompression: 'Compression', imageReferences: 'Reference-image mode', imageHighresScale: 'High-resolution scale', imageHighresSteps: 'High-resolution steps',
    requestBody: 'Extra request fields (JSON)', requestBodyHint: 'LocalAI-specific fields merged into the request body.', timeoutMs: 'Timeout (ms)',
    llmRoutes: 'Routes (JSON)', llmRoutesHint: 'An array of routes, models, sampling controls and LocalAI-specific request fields.', llmIdleTimeoutMs: 'Silence limit (ms)',
    overridden: 'Changed', reset: 'Reset', invalidNumber: 'Enter a valid number.', save: 'Save', saving: 'Saving…', saveFailed: 'The settings were not accepted.', readOnly: 'Settings are read-only.', unavailable: 'The provider is unavailable.',
  },
  zh: {
    label: 'LocalAI', title: 'LocalAI', description: '为此项服务配置 LocalAI。', llmDescription: '配置向 DSH 提供的 LocalAI 语言模型路由。',
    connectionsTitle: 'LocalAI 连接', connectionsDescription: '供各项服务复用的 LocalAI 端点和可选 Bearer 凭据。', connectionsEmpty: '尚未配置 LocalAI 连接。',
    name: '名称', baseUrl: '基础 URL', keyRef: '凭据名称', key: 'API 密钥', keyHint: '由 DSH 保存，不会写入配置档案。不需要密钥时可留空。', saveKey: '保存密钥', keySet: '已保存密钥', keyUnset: '无密钥', addConnection: '添加连接', remove: '移除',
    connection: '连接', connectionNone: '无连接', connectionHint: '请在“提供方”页面创建和管理连接。',
    embeddingModel: '嵌入模型', embeddingDimensions: '维度', batchSize: '每次请求的文本数', rerankModel: '重排模型', decisionModel: '决策模型',
    ttsModel: '语音模型', ttsVoice: '默认声音', ttsResponseFormat: '音频格式', ttsSpeed: '语速', sttModel: '转录模型', sttRealtimeModel: '实时转录模型',
    imageModel: '图像模型', imageSize: '图像尺寸', imageQuality: '图像质量', imageOutputFormat: '图像格式', imageOutputCompression: '压缩率', imageReferences: '参考图像模式', imageHighresScale: '高分辨率放大倍数', imageHighresSteps: '高分辨率采样步数',
    requestBody: '额外请求字段（JSON）', requestBodyHint: '合并到请求正文中的 LocalAI 专用字段。', timeoutMs: '超时（毫秒）',
    llmRoutes: '路由（JSON）', llmRoutesHint: '由路由、模型、采样控制和 LocalAI 专用请求字段组成的数组。', llmIdleTimeoutMs: '静默上限（毫秒）',
    overridden: '已更改', reset: '重置', invalidNumber: '请输入有效数字。', save: '保存', saving: '正在保存…', saveFailed: '设置未被接受。', readOnly: '设置为只读。', unavailable: '提供方不可用。',
  },
}

export const inject = ['slots', 'locale', 'configForms']
export function apply(ctx: Context): void {
  const t = ctx.locale.bind(locale)
  ctx.effect(() => ctx.locale.register(locale, dictionaries), 'dsh-ai-localai: dictionaries')
  const controller = new Controller(ctx.configForms.get(ENTRY_ID))
  controller.start()
  ctx.effect(() => () => { controller.dispose() }, 'dsh-ai-localai: form')
  ctx.effect(() => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('ai.provider.connection', () => ctx.slots.register({ name: 'ai.provider.connection', id: `connection:${PROVIDER_ID}`, order: 5, label: () => t('label'), locale, inject: () => controller.inject() }, Connections as never))), 'dsh-ai-localai: provider connection entry')
  ctx.effect(() => ctx.slots.inject('ai.provider.llm', () => ctx.slots.register({ name: 'ai.provider.llm', id: `llm:${PROVIDER_ID}`, order: 2, label: () => t('label'), locale, inject: () => controller.inject() }, LlmCard as never)), 'dsh-ai-localai: llm entry')
  for (const capability of ['embedding', 'rerank', 'tts', 'stt', 'image', 'decision'] as const) {
    ctx.effect(() => ctx.slots.inject(providerSlotName(capability), () => ctx.slots.register({ name: providerSlotName(capability), id: providerSlotId(capability, PROVIDER_ID), order: 2, label: () => t('label'), locale, inject: () => controller.inject() }, Card as never)), `dsh-ai-localai: ${capability} entry`)
  }
}
