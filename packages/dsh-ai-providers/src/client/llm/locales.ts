import type { Dictionaries } from '../i18n.ts'

export type LlmLocaleKey =
  | 'nav' | 'title' | 'description' | 'routes' | 'noRoutes' | 'refresh' | 'active' | 'inactive' | 'provider' | 'models' | 'noModels'
  | 'context' | 'output' | 'test' | 'testing' | 'testOk' | 'testFailed' | 'loadFailed' | 'configuration' | 'noProviders'

export const dictionaries: Dictionaries<LlmLocaleKey> = {
  en: {
    nav: 'Language models',
    title: 'Language models',
    description: 'Configure the models used by chats and agents. Each provider exposes one or more routes to DSH, and chats select them as route / model. Set up provider connections first, then add routes and models here.',
    routes: 'Routes', noRoutes: 'No routes are configured yet. Add one under Configuration.', refresh: 'Refresh',
    active: 'Served to DSH', inactive: 'Not served: {problem}', provider: 'Provider', models: 'Models', noModels: 'This route lists no models.',
    context: 'context {tokens}', output: 'output {tokens}',
    test: 'Test', testing: 'Testing…', testOk: 'Answered “{text}” in {milliseconds} ms{tokens}.', testFailed: 'Failed ({code}): {message}',
    loadFailed: 'Could not read the routes: {message}', configuration: 'Configuration', noProviders: 'No provider that offers language models is installed. Install a provider plugin such as @dsh-ai-providers/openai.',
  },
  zh: {
    nav: '语言模型',
    title: '语言模型',
    description: '配置对话和智能体使用的模型。每个提供方向 DSH 提供一条或多条路由，对话以“路由 / 模型”的形式选择。请先配置提供方连接，再在此添加路由和模型。',
    routes: '路由', noRoutes: '还没有配置路由。请在“配置”中添加。', refresh: '刷新',
    active: '已提供给 DSH', inactive: '未提供：{problem}', provider: '提供方', models: '模型', noModels: '此路由没有列出模型。',
    context: '上下文 {tokens}', output: '输出 {tokens}',
    test: '测试', testing: '正在测试…', testOk: '回答“{text}”，用时 {milliseconds} 毫秒{tokens}。', testFailed: '失败（{code}）：{message}',
    loadFailed: '无法读取路由：{message}', configuration: '配置', noProviders: '没有安装提供语言模型的提供方。请安装如 @dsh-ai-providers/openai 之类的提供方插件。',
  },
  ja: {
    nav: '言語モデル', title: '言語モデル', description: 'チャットやエージェントが使用するモデルです。各プロバイダーは DSH にルートを公開し、チャットでは「ルート / モデル」の組み合わせでモデルを選びます。標準のモデルプロバイダーに代わる機能です。OpenAI 接続でエンドポイントを設定してから、ここでルートとモデルを設定してください。',
    routes: 'ルート', noRoutes: 'ルートはまだありません。「設定」で追加してください。', refresh: '更新', active: 'DSH に公開中', inactive: '未公開: {problem}', provider: 'プロバイダー', models: 'モデル', noModels: 'このルートにモデルは登録されていません。',
    context: 'コンテキスト {tokens}', output: '出力 {tokens}', test: 'テスト', testing: 'テスト中…', testOk: '「{text}」と回答しました。所要時間: {milliseconds} ms{tokens}', testFailed: '失敗 ({code}): {message}', loadFailed: 'ルートを読み込めませんでした: {message}', configuration: '設定', noProviders: '言語モデルを提供するプロバイダーがインストールされていません。@dsh-ai-providers/openai などのプロバイダープラグインをインストールしてください。',
  },
  es: {
    nav: 'Modelos de lenguaje', title: 'Modelos de lenguaje', description: 'Son los modelos que usan los chats y los agentes. Cada proveedor publica rutas en DSH, y cada chat elige un modelo como «ruta / modelo». Esta página sustituye a los proveedores incluidos de serie: configura los endpoints en Conexiones de OpenAI y después añade aquí las rutas y los modelos.',
    routes: 'Rutas', noRoutes: 'Todavía no hay rutas. Añade una en Configuración.', refresh: 'Actualizar', active: 'Disponible en DSH', inactive: 'No disponible: {problem}', provider: 'Proveedor', models: 'Modelos', noModels: 'Esta ruta no incluye ningún modelo.',
    context: 'contexto {tokens}', output: 'salida {tokens}', test: 'Probar', testing: 'Probando…', testOk: 'Respondió «{text}» en {milliseconds} ms{tokens}.', testFailed: 'Error ({code}): {message}', loadFailed: 'No se pudieron leer las rutas: {message}', configuration: 'Configuración', noProviders: 'No hay instalado ningún proveedor de modelos de lenguaje. Instala un complemento como @dsh-ai-providers/openai.',
  },
  fr: {
    nav: 'Modèles de langage', title: 'Modèles de langage', description: 'Ce sont les modèles utilisés par les discussions et les agents. Chaque fournisseur expose des routes à DSH, puis une discussion choisit un modèle sous la forme « route / modèle ». Cette page remplace les fournisseurs intégrés : configurez les points de terminaison dans Connexions OpenAI, puis les routes et les modèles ici.',
    routes: 'Routes', noRoutes: 'Aucune route n’est encore configurée. Ajoutez-en une dans Configuration.', refresh: 'Actualiser', active: 'Disponible dans DSH', inactive: 'Indisponible : {problem}', provider: 'Fournisseur', models: 'Modèles', noModels: 'Cette route ne contient aucun modèle.',
    context: 'contexte {tokens}', output: 'sortie {tokens}', test: 'Tester', testing: 'Test en cours…', testOk: 'Réponse « {text} » obtenue en {milliseconds} ms{tokens}.', testFailed: 'Échec ({code}) : {message}', loadFailed: 'Impossible de lire les routes : {message}', configuration: 'Configuration', noProviders: 'Aucun fournisseur de modèles de langage n’est installé. Installez un module tel que @dsh-ai-providers/openai.',
  },
  de: {
    nav: 'Sprachmodelle', title: 'Sprachmodelle', description: 'Diese Modelle werden von Chats und Agenten verwendet. Jeder Anbieter stellt DSH Routen bereit; ein Chat wählt ein Modell als „Route / Modell“. Diese Seite ersetzt die integrierten Modellanbieter. Richte zuerst die Endpunkte unter OpenAI-Verbindungen ein und danach hier die Routen und Modelle.',
    routes: 'Routen', noRoutes: 'Noch keine Routen eingerichtet. Füge unter Konfiguration eine hinzu.', refresh: 'Aktualisieren', active: 'Für DSH verfügbar', inactive: 'Nicht verfügbar: {problem}', provider: 'Anbieter', models: 'Modelle', noModels: 'Diese Route enthält keine Modelle.',
    context: 'Kontext {tokens}', output: 'Ausgabe {tokens}', test: 'Testen', testing: 'Test läuft…', testOk: 'Antwort „{text}“ nach {milliseconds} ms{tokens}.', testFailed: 'Fehlgeschlagen ({code}): {message}', loadFailed: 'Routen konnten nicht gelesen werden: {message}', configuration: 'Konfiguration', noProviders: 'Es ist kein Anbieter für Sprachmodelle installiert. Installiere ein Anbieter-Plugin wie @dsh-ai-providers/openai.',
  },
  ru: {
    nav: 'Языковые модели', title: 'Языковые модели', description: 'Эти модели используют чаты и агенты. Каждый провайдер публикует маршруты в DSH, а чат выбирает модель в формате «маршрут / модель». Эта страница заменяет встроенных провайдеров моделей: сначала настройте конечные точки в разделе подключений OpenAI, затем добавьте здесь маршруты и модели.',
    routes: 'Маршруты', noRoutes: 'Маршрутов пока нет. Добавьте маршрут в разделе настроек.', refresh: 'Обновить', active: 'Доступен в DSH', inactive: 'Недоступен: {problem}', provider: 'Провайдер', models: 'Модели', noModels: 'В этом маршруте нет моделей.',
    context: 'контекст {tokens}', output: 'вывод {tokens}', test: 'Проверить', testing: 'Проверка…', testOk: 'Получен ответ «{text}» за {milliseconds} мс{tokens}.', testFailed: 'Ошибка ({code}): {message}', loadFailed: 'Не удалось прочитать маршруты: {message}', configuration: 'Настройка', noProviders: 'Не установлен ни один провайдер языковых моделей. Установите плагин, например @dsh-ai-providers/openai.',
  },
  pt: {
    nav: 'Modelos de linguagem', title: 'Modelos de linguagem', description: 'São os modelos usados por chats e agentes. Cada provedor disponibiliza rotas ao DSH, e o chat escolhe um modelo no formato “rota / modelo”. Esta página substitui os provedores padrão: configure os endpoints em Conexões OpenAI e depois adicione aqui as rotas e os modelos.',
    routes: 'Rotas', noRoutes: 'Ainda não há rotas configuradas. Adicione uma em Configuração.', refresh: 'Atualizar', active: 'Disponível no DSH', inactive: 'Indisponível: {problem}', provider: 'Provedor', models: 'Modelos', noModels: 'Esta rota não contém modelos.',
    context: 'contexto {tokens}', output: 'saída {tokens}', test: 'Testar', testing: 'Testando…', testOk: 'Respondeu “{text}” em {milliseconds} ms{tokens}.', testFailed: 'Falha ({code}): {message}', loadFailed: 'Não foi possível ler as rotas: {message}', configuration: 'Configuração', noProviders: 'Nenhum provedor de modelos de linguagem está instalado. Instale um plugin como @dsh-ai-providers/openai.',
  },
}
