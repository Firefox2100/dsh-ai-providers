import type { SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Capability } from 'dsh-ai-core'
import type { Dictionaries } from '../i18n.ts'

export type CapabilityLocaleKey =
  | 'nav' | 'title' | 'description'
  | 'provider' | 'providerNone' | 'providerNotLoaded' | 'noProviders' | 'chooseProvider'
  | 'status' | 'statusAvailable' | 'statusUnavailable'
  | 'test' | 'testing' | 'testOk' | 'testFailed'
  | 'loadFailed' | 'overridden' | 'reset' | 'invalid'
  | 'readOnly' | 'unavailable' | 'save' | 'saving' | 'saveFailed'

const embedding: Dictionaries<CapabilityLocaleKey> = {
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

const rerank: Dictionaries<CapabilityLocaleKey> = {
  en: {
    ...embedding.en,
    nav: 'Reranking',
    title: 'Reranking',
    description: 'Judges how well each of a few texts answers a question by reading them together, which is more accurate than comparing vectors. Other plugins use it to put the best of what a cheaper search found first. Choose which provider supplies it and configure that provider.',
    noProviders: 'No reranking provider is installed. Install a provider plugin such as dsh-ai-jina-cohere.',
    statusAvailable: 'Available: other plugins can use reranking now.',
    testOk: 'Works: {model}, {milliseconds} ms.',
  },
  zh: {
    ...embedding.zh,
    nav: '重排序',
    title: '重排序',
    description: '把问题和几段文本放在一起阅读，判断每段文本回答问题的程度，比单独比较向量更准确。其他插件用它把较便宜的检索找到的内容按相关度排好。选择由哪个提供方提供该服务并完成配置。',
    noProviders: '尚未安装任何重排序提供方。请安装如 dsh-ai-jina-cohere 之类的提供方插件。',
    statusAvailable: '可用：其他插件现在可以使用重排序。',
    testOk: '可用：{model}，{milliseconds} 毫秒。',
  },
}

const tts: Dictionaries<CapabilityLocaleKey> = {
  en: {
    ...embedding.en,
    nav: 'Text to speech',
    title: 'Text to speech',
    description: 'Turns text into streamed speech audio. Choose which provider supplies it and configure its model, voice and output defaults.',
    noProviders: 'No text-to-speech provider is installed. Install a provider plugin such as dsh-ai-openai.',
    statusAvailable: 'Available: other plugins can synthesize speech now.',
    testOk: 'Works: {model}, {milliseconds} ms.',
  },
  zh: {
    ...embedding.zh,
    nav: '文本转语音',
    title: '文本转语音',
    description: '把文本转换为流式语音音频。选择由哪个提供方提供，并配置其模型、声音和输出默认值。',
    noProviders: '尚未安装任何文本转语音提供方。请安装如 dsh-ai-openai 之类的提供方插件。',
    statusAvailable: '可用：其他插件现在可以合成语音。',
    testOk: '可用：{model}，{milliseconds} 毫秒。',
  },
}

const stt: Dictionaries<CapabilityLocaleKey> = {
  en: { ...embedding.en, nav: 'Speech to text', title: 'Speech to text', description: 'Transcribes completed audio files and live microphone audio. Choose which provider supplies it and configure its transcription model.', noProviders: 'No speech-to-text provider is installed. Install a provider plugin such as dsh-ai-openai.', statusAvailable: 'Available: other plugins can transcribe audio now.', testOk: 'Works: {model}, {milliseconds} ms.' },
  zh: { ...embedding.zh, nav: '语音转文本', title: '语音转文本', description: '转录完整音频文件和实时麦克风音频。选择由哪个提供方提供，并配置其转录模型。', noProviders: '尚未安装任何语音转文本提供方。请安装如 dsh-ai-openai 之类的提供方插件。', statusAvailable: '可用：其他插件现在可以转录音频。', testOk: '可用：{model}，{milliseconds} 毫秒。' },
}

const image: Dictionaries<CapabilityLocaleKey> = {
  en: { ...embedding.en, nav: 'Image generation', title: 'Image generation', description: 'Creates bitmap images from text prompts. Choose which provider supplies it and configure its model and output defaults.', noProviders: 'No image generation provider is installed. Install a provider plugin such as dsh-ai-openai.', statusAvailable: 'Available: other plugins can generate images now.', testOk: 'Works: {model}, {milliseconds} ms.' },
  zh: { ...embedding.zh, nav: '图像生成', title: '图像生成', description: '根据文本提示创建位图图像。选择由哪个提供方提供，并配置其模型和输出默认值。', noProviders: '尚未安装任何图像生成提供方。请安装如 dsh-ai-openai 之类的提供方插件。', statusAvailable: '可用：其他插件现在可以生成图像。', testOk: '可用：{model}，{milliseconds} 毫秒。' },
}

/** The copy of each capability's tab. */
export const dictionariesOf = { embedding, rerank, tts, stt, image } as const satisfies Record<Capability, Dictionaries<CapabilityLocaleKey>>

export const formLabels = (t: (key: CapabilityLocaleKey) => string): SettingsFormLabels => ({
  unavailable: t('unavailable'),
  readOnly: t('readOnly'),
  saveFailed: t('saveFailed'),
  save: t('save'),
  saving: t('saving'),
})
