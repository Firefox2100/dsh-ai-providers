import type { SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Dictionaries } from '../i18n.ts'

export type EmbeddingLocaleKey =
  | 'nav' | 'title' | 'description'
  | 'provider' | 'providerNone' | 'providerNotLoaded' | 'noProviders' | 'chooseProvider'
  | 'status' | 'statusAvailable' | 'statusUnavailable'
  | 'test' | 'testing' | 'testOk' | 'testFailed'
  | 'loadFailed' | 'overridden' | 'reset' | 'invalid'
  | 'readOnly' | 'unavailable' | 'save' | 'saving' | 'saveFailed'

export const dictionaries: Dictionaries<EmbeddingLocaleKey> = {
  en: {
    nav: 'Embedding',
    title: 'Embedding',
    description: 'Turns text into vectors, so that other plugins can find what is similar by meaning. Choose which provider supplies it and configure that provider; the service is then available to every plugin that asks for it.',
    provider: 'Provider',
    providerNone: 'None',
    providerNotLoaded: 'not loaded',
    noProviders: 'No embedding provider is installed. Install a provider plugin such as dsh-ai-openai.',
    chooseProvider: 'Choose a provider to configure it.',
    status: 'Service',
    statusAvailable: 'Available: other plugins can use embedding now.',
    statusUnavailable: 'Not available: no provider is selected, or the selected one is not loaded.',
    test: 'Test the connection',
    testing: 'Testing…',
    testOk: 'Works: {model}, {dimensions} dimensions, {milliseconds} ms.',
    testFailed: 'Does not work ({code}): {message}',
    loadFailed: 'Could not read the state of the service: {message}',
    overridden: 'Changed',
    reset: 'Reset',
    invalid: 'Not valid',
    readOnly: 'This deployment stores settings read-only.',
    unavailable: 'AI providers is not loaded, so it cannot be configured right now.',
    save: 'Save',
    saving: 'Saving…',
    saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
  },
  zh: {
    nav: '嵌入',
    title: '嵌入',
    description: '把文本转换为向量，让其他插件能按含义查找相近内容。选择由哪个提供方提供该服务并完成配置；之后所有需要它的插件都可以使用。',
    provider: '提供方',
    providerNone: '无',
    providerNotLoaded: '未加载',
    noProviders: '尚未安装任何嵌入提供方。请安装如 dsh-ai-openai 之类的提供方插件。',
    chooseProvider: '选择一个提供方后即可配置。',
    status: '服务',
    statusAvailable: '可用：其他插件现在可以使用嵌入。',
    statusUnavailable: '不可用：尚未选择提供方，或所选提供方未加载。',
    test: '测试连接',
    testing: '正在测试…',
    testOk: '可用：{model}，{dimensions} 维，{milliseconds} 毫秒。',
    testFailed: '不可用（{code}）：{message}',
    loadFailed: '无法读取服务状态：{message}',
    overridden: '已更改',
    reset: '重置',
    invalid: '无效',
    readOnly: '本部署的设置为只读。',
    unavailable: 'AI 提供方插件未加载，暂时无法配置。',
    save: '保存',
    saving: '正在保存…',
    saveFailed: '本部署没有接受这些值，已保留供你修改。',
  },
}

export const formLabels = (t: (key: EmbeddingLocaleKey) => string): SettingsFormLabels => ({
  unavailable: t('unavailable'),
  readOnly: t('readOnly'),
  saveFailed: t('saveFailed'),
  save: t('save'),
  saving: t('saving'),
})
