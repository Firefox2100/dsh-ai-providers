import type { Dictionaries } from '../i18n.ts'

export type ConcurrencyLocaleKey =
  | 'nav' | 'title' | 'description' | 'none' | 'name' | 'max' | 'reserve' | 'reserveHelp' | 'remove' | 'routes' | 'noRoutes' | 'capabilities' | 'add' | 'live' | 'notSaved' | 'maxWait' | 'maxWaitHelp'
  | 'unavailable' | 'readOnly' | 'saveFailed' | 'save' | 'saving'
  | 'capability.embedding' | 'capability.rerank' | 'capability.tts' | 'capability.stt' | 'capability.image'

export const dictionaries: Dictionaries<ConcurrencyLocaleKey> = {
  en: {
    nav: 'Concurrency',
    title: 'Concurrency',
    description: 'How many calls a shared resource serves at once. Each limit names the language model routes and the services that use it (one GPU, one local server); calls beyond it wait their turn, a call a person waits for before background work such as filling a memory index. Calls that no limit names are never held back.',
    none: 'No limits: every call starts at once.',
    name: 'Name', max: 'At most at once', reserve: 'Kept for people', reserveHelp: 'Places background work may not take.', remove: 'Remove', routes: 'Language model routes', noRoutes: 'No language model routes are served yet.', capabilities: 'Services', add: 'Add a limit',
    live: 'Running {active} of {max}; waiting: {foreground} for a person, {background} in the background; the longest has waited {wait} s.',
    notSaved: 'Save to start counting.',
    maxWait: 'Longest wait (seconds)', maxWaitHelp: 'A call that waits longer fails with an error that says so. 0 means no limit.',
    unavailable: 'Not available', readOnly: 'Read only', saveFailed: 'Saving failed', save: 'Save', saving: 'Saving…',
    'capability.embedding': 'Embedding', 'capability.rerank': 'Reranking', 'capability.tts': 'Speech', 'capability.stt': 'Transcription', 'capability.image': 'Images',
  },
  zh: {
    nav: '并发',
    title: '并发',
    description: '一个共享资源同时处理多少个调用。每条限制写明使用该资源的语言模型路由和服务（一块 GPU、一台本地服务器）；超出的调用排队等候，有人等着的调用先于后台工作（例如填充记忆索引）。没有被任何限制点名的调用不受影响。',
    none: '没有限制：每个调用立即开始。',
    name: '名称', max: '同时最多', reserve: '留给用户', reserveHelp: '后台工作不得占用的名额。', remove: '删除', routes: '语言模型路由', noRoutes: '还没有提供任何语言模型路由。', capabilities: '服务', add: '添加限制',
    live: '正在运行 {active}/{max}；等待中：有人等待的 {foreground} 个，后台的 {background} 个；最久已等待 {wait} 秒。',
    notSaved: '保存后开始统计。',
    maxWait: '最长等待（秒）', maxWaitHelp: '等待更久的调用会失败，并说明原因。0 表示不限制。',
    unavailable: '不可用', readOnly: '只读', saveFailed: '保存失败', save: '保存', saving: '正在保存…',
    'capability.embedding': '向量嵌入', 'capability.rerank': '重排序', 'capability.tts': '语音合成', 'capability.stt': '语音转写', 'capability.image': '图像生成',
  },
}
