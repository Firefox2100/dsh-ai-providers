import type { Dictionaries } from '../i18n.ts'

export type LlmLocaleKey =
  | 'nav' | 'title' | 'description' | 'routes' | 'noRoutes' | 'refresh' | 'active' | 'inactive' | 'provider' | 'models' | 'noModels'
  | 'context' | 'output' | 'test' | 'testing' | 'testOk' | 'testFailed' | 'loadFailed' | 'configuration' | 'noProviders'

export const dictionaries: Dictionaries<LlmLocaleKey> = {
  en: {
    nav: 'Language models',
    title: 'Language models',
    description: 'The models that chats and agents talk to. Each provider below serves routes to DSH; a chat picks a model as route / model. This replaces the stock model providers: configure endpoints in OpenAI connections, then routes and models here.',
    routes: 'Routes', noRoutes: 'No routes are configured yet. Add one under Configuration.', refresh: 'Refresh',
    active: 'Served to DSH', inactive: 'Not served: {problem}', provider: 'Provider', models: 'Models', noModels: 'This route lists no models.',
    context: 'context {tokens}', output: 'output {tokens}',
    test: 'Test', testing: 'Testing…', testOk: 'Answered “{text}” in {milliseconds} ms{tokens}.', testFailed: 'Failed ({code}): {message}',
    loadFailed: 'Could not read the routes: {message}', configuration: 'Configuration', noProviders: 'No provider that offers language models is installed. Install dsh-ai-openai.',
  },
  zh: {
    nav: '语言模型',
    title: '语言模型',
    description: '对话和智能体所使用的模型。下面的每个提供方向 DSH 提供若干路由；对话以“路由 / 模型”选择模型。这里取代了自带的模型提供方：先在“OpenAI 连接”中配置接口，再在这里配置路由和模型。',
    routes: '路由', noRoutes: '还没有配置路由。请在“配置”中添加。', refresh: '刷新',
    active: '已提供给 DSH', inactive: '未提供：{problem}', provider: '提供方', models: '模型', noModels: '此路由没有列出模型。',
    context: '上下文 {tokens}', output: '输出 {tokens}',
    test: '测试', testing: '正在测试…', testOk: '回答“{text}”，用时 {milliseconds} 毫秒{tokens}。', testFailed: '失败（{code}）：{message}',
    loadFailed: '无法读取路由：{message}', configuration: '配置', noProviders: '没有安装提供语言模型的提供方。请安装 dsh-ai-openai。',
  },
}
