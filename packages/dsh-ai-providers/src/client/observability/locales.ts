import type { Dictionaries } from '../i18n.ts'

export type ObservabilityLocaleKey =
  | 'nav' | 'title' | 'description' | 'warning' | 'enabled' | 'sink' | 'sink.jsonl' | 'sink.langfuse' | 'sink.both' | 'capture' | 'capture.summary' | 'capture.full' | 'summaryChars' | 'summaryCharsHelp'
  | 'wire' | 'wireHelp' | 'redact' | 'redactHelp' | 'directory' | 'directoryHelp' | 'langfuse' | 'host' | 'environment' | 'environmentHelp' | 'publicKey' | 'secretKey' | 'keyName' | 'keyHelp' | 'keyChecking' | 'keySet' | 'keyUnset' | 'keySource' | 'keySave' | 'keySaving' | 'keyRemove' | 'keyReadOnly'
  | 'unavailable' | 'readOnly' | 'saveFailed' | 'save' | 'saving'

export const dictionaries: Dictionaries<ObservabilityLocaleKey> = {
  en: {
    nav: 'Observability',
    title: 'Observability',
    description: 'Records every model, embedding, reranking, image, speech and decision call, and the work plugins name around them (a turn, a helper), as nested traces. Records go to files, to a Langfuse server, or both.',
    warning: 'Traces can contain prompts, answers, private text and file contents. Recording is off by default. Use a destination you trust, and add redaction rules before enabling it when the source may contain secrets.',
    enabled: 'Record calls',
    sink: 'Send records to', 'sink.jsonl': 'Files', 'sink.langfuse': 'Langfuse', 'sink.both': 'Files and Langfuse',
    capture: 'What is recorded', 'capture.summary': 'A shortened summary of each input and output', 'capture.full': 'Whole inputs and outputs',
    summaryChars: 'Summary length (characters)', summaryCharsHelp: 'Longer texts are cut to this and say how long they were.',
    wire: 'Keep the exact request of each language-model call',
    wireHelp: 'The body as the endpoint received it, so a call can be replayed unchanged. It makes records much larger.',
    redact: 'Hide what matches (regular expressions, one a line)',
    redactHelp: 'Matches are replaced with [redacted] before anything is stored or shortened. A line that is not a valid pattern is ignored and reported.',
    directory: 'Folder for files', directoryHelp: 'Empty: the traces folder in the DSH home. One file a day.',
    langfuse: 'Langfuse',
    host: 'Server address', environment: 'Environment', environmentHelp: 'Names where the records come from in Langfuse (for example dev). Empty uses its default.',
    publicKey: 'Public key', secretKey: 'Secret key', keyName: 'Credential name', keyHelp: 'The keys are kept in the credential store, never in the settings.',
    keyChecking: 'Checking the credential store…', keySet: 'A key is stored', keyUnset: 'No key is stored', keySource: 'from {source}', keySave: 'Store', keySaving: 'Storing…', keyRemove: 'Remove', keyReadOnly: 'This key comes from the environment and cannot be changed here.',
    unavailable: 'Not available', readOnly: 'Read only', saveFailed: 'Saving failed', save: 'Save', saving: 'Saving…',
  },
  zh: {
    nav: '可观测性',
    title: '可观测性',
    description: '把每一次模型、向量嵌入、重排序、图像、语音和决策调用，以及各插件在其周围命名的工作（一个回合、一个辅助智能体），记录为层层嵌套的追踪。记录可写入文件、发送到 Langfuse 服务器，或两者兼有。',
    warning: '追踪可能包含提示词、回答、私人文本和文件内容。记录功能默认关闭。如果来源中可能有机密，请先添加脱敏规则，再启用记录，并只使用你信任的接收端。',
    enabled: '记录调用',
    sink: '记录发送到', 'sink.jsonl': '文件', 'sink.langfuse': 'Langfuse', 'sink.both': '文件和 Langfuse',
    capture: '记录的内容', 'capture.summary': '每条输入和输出的缩短摘要', 'capture.full': '完整的输入和输出',
    summaryChars: '摘要长度（字符）', summaryCharsHelp: '更长的文本会被截到此长度，并注明原长度。',
    wire: '保留每次语言模型调用的原始请求',
    wireHelp: '端点实际收到的请求体，便于原样重放某次调用。会让记录大很多。',
    redact: '隐藏匹配的内容（正则表达式，每行一个）',
    redactHelp: '匹配到的内容在存储或截断之前就替换为 [redacted]。无效的表达式会被忽略并报告。',
    directory: '文件目录', directoryHelp: '留空则使用 DSH 主目录下的 traces 文件夹，每天一个文件。',
    langfuse: 'Langfuse',
    host: '服务器地址', environment: '环境', environmentHelp: '在 Langfuse 中标明记录的来源（例如 dev）。留空使用默认值。',
    publicKey: '公钥', secretKey: '私钥', keyName: '凭据名称', keyHelp: '密钥保存在凭据存储中，不会写进设置。',
    keyChecking: '正在检查凭据存储…', keySet: '已保存密钥', keyUnset: '尚未保存密钥', keySource: '来自 {source}', keySave: '保存', keySaving: '正在保存…', keyRemove: '删除', keyReadOnly: '这个密钥来自环境变量，无法在这里修改。',
    unavailable: '不可用', readOnly: '只读', saveFailed: '保存失败', save: '保存', saving: '正在保存…',
  },
}
