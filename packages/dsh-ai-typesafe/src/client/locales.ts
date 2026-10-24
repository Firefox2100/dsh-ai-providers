import type { SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Dictionaries } from './i18n.ts'

export type TypeSafeLocaleKey =
  | 'label' | 'title' | 'description'
  | 'connectionsTitle' | 'connectionsDescription' | 'connectionsEmpty' | 'connection' | 'connectionHint' | 'connectionNone' | 'connectionName' | 'connectionAdd' | 'connectionRemove' | 'apiKeySave'
  | 'baseUrl' | 'baseUrlHint' | 'apiKeyEnv' | 'apiKeyEnvHint' | 'apiKey' | 'apiKeyHint' | 'apiKeySet' | 'apiKeyUnset'
  | 'decisionModel' | 'decisionModelHint' | 'longContext' | 'longContextHint' | 'timeoutMs' | 'timeoutMsHint'
  | 'overridden' | 'reset' | 'invalidNumber'
  | 'readOnly' | 'unavailable' | 'save' | 'saving' | 'saveFailed'

export const dictionaries: Dictionaries<TypeSafeLocaleKey> = {
  en: {
    label: 'TypeSafe',
    title: 'TypeSafe decisions',
    description: 'Decisions from TypeSafe\'s Jev, a hosted model that answers typed questions about text or structured state with probabilities in one pass. The state a plugin asks about is sent to TypeSafe. A server that copies the System One API, such as a local one, works through a custom connection.',
    connectionsTitle: 'TypeSafe connections',
    connectionsDescription: 'Configure the TypeSafe endpoint, or a compatible server, and its credentials once, then select it in the Decisions settings.',
    connectionsEmpty: 'No TypeSafe connections are configured.',
    connection: 'Connection', connectionHint: 'Managed in the TypeSafe connections settings page.', connectionNone: 'No connection',
    connectionName: 'Name', connectionAdd: 'Add connection', connectionRemove: 'Remove', apiKeySave: 'Store key',
    baseUrl: 'Base URL',
    baseUrlHint: 'The API root, for example https://api.typesafe.ai/v1 or http://localhost:8081/v1. Requests go to {base URL}/systemone.',
    apiKeyEnv: 'Key name',
    apiKeyEnvHint: 'The name the key is stored under. It can also be supplied by an environment variable of this name, which then takes precedence.',
    apiKey: 'API key',
    apiKeyHint: 'Typed here, kept by DSH\'s credentials store and never written to the profile or shown again. A server that needs no key can be left without one.',
    apiKeySet: 'Key stored',
    apiKeyUnset: 'No key',
    decisionModel: 'Model',
    decisionModelHint: 'The decision model, as the API names it: jev-latest follows TypeSafe\'s newest release, while a version such as jev-1.14.0 keeps the answers from changing under you.',
    longContext: 'Longer context window',
    longContextHint: 'Asks for TypeSafe\'s extended context (262k tokens instead of 64k) with the header it offers for it.',
    timeoutMs: 'Timeout (ms)',
    timeoutMsHint: 'How long a request may take before it is given up.',
    overridden: 'Changed',
    reset: 'Reset',
    invalidNumber: 'Enter a whole number.',
    readOnly: 'This deployment stores settings read-only.',
    unavailable: 'The TypeSafe provider is not loaded, so it cannot be configured right now.',
    save: 'Save',
    saving: 'Saving…',
    saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
  },
  zh: {
    label: 'TypeSafe',
    title: 'TypeSafe 决策',
    description: '使用 TypeSafe 的 Jev 做决策。Jev 是托管模型，一次性针对文本或结构化状态回答带类型的问题并给出概率。插件要询问的状态会发送给 TypeSafe。复制了 System One 接口的服务（例如本地服务）可通过自定义连接使用。',
    connectionsTitle: 'TypeSafe 连接',
    connectionsDescription: '只需配置一次 TypeSafe 端点（或兼容服务）及其凭据，然后在“决策”设置中选择。',
    connectionsEmpty: '尚未配置 TypeSafe 连接。',
    connection: '连接', connectionHint: '在“TypeSafe 连接”设置页中管理。', connectionNone: '无连接',
    connectionName: '名称', connectionAdd: '添加连接', connectionRemove: '移除', apiKeySave: '保存密钥',
    baseUrl: '基础 URL',
    baseUrlHint: '接口根地址，例如 https://api.typesafe.ai/v1 或 http://localhost:8081/v1。请求发往 {基础 URL}/systemone。',
    apiKeyEnv: '密钥名称',
    apiKeyEnvHint: '密钥存放所用的名称。也可以由同名环境变量提供，此时环境变量优先。',
    apiKey: 'API 密钥',
    apiKeyHint: '在此输入，由 DSH 的凭据存储保管，不会写入配置，也不会再次显示。不需要密钥的服务可以留空。',
    apiKeySet: '已保存密钥',
    apiKeyUnset: '无密钥',
    decisionModel: '模型',
    decisionModelHint: '决策模型在接口中的名称：jev-latest 会跟随 TypeSafe 的最新版本，而 jev-1.14.0 这样的指定版本可避免答案在你不知情时改变。',
    longContext: '更长的上下文窗口',
    longContextHint: '通过 TypeSafe 提供的请求头，请求其扩展上下文（262k 词元，而非 64k）。',
    timeoutMs: '超时（毫秒）',
    timeoutMsHint: '一次请求最长等待多久后放弃。',
    overridden: '已更改',
    reset: '重置',
    invalidNumber: '请输入整数。',
    readOnly: '本部署的设置为只读。',
    unavailable: 'TypeSafe 提供方未加载，暂时无法配置。',
    save: '保存',
    saving: '正在保存…',
    saveFailed: '本部署没有接受这些值，已保留供你修改。',
  },
}

export const formLabels = (t: (key: TypeSafeLocaleKey) => string): SettingsFormLabels => ({
  unavailable: t('unavailable'),
  readOnly: t('readOnly'),
  saveFailed: t('saveFailed'),
  save: t('save'),
  saving: t('saving'),
})
