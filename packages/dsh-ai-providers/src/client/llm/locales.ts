import type { Dictionaries } from '../i18n.ts'

export type LlmLocaleKey =
  | 'nav' | 'title' | 'description' | 'routes' | 'noRoutes' | 'refresh' | 'active' | 'inactive' | 'provider' | 'models' | 'noModels'
  | 'context' | 'output' | 'test' | 'testing' | 'testOk' | 'tokensSuffix' | 'testFailed' | 'loadFailed' | 'configuration' | 'noProviders'
  | 'probeNoModelService' | 'probeReasonedWithoutAnswer' | 'probeEmptyAnswer'

export const dictionaries: Dictionaries<LlmLocaleKey> = {
  en: {
    nav: 'Language models',
    title: 'Language models',
    description: 'Configure the models used by chats and agents. Each provider exposes one or more routes to DSH, and chats select them as route / model. Set up provider connections first, then add routes and models here.',
    routes: 'Routes', noRoutes: 'No routes are configured yet. Add one under Configuration.', refresh: 'Refresh',
    active: 'Served to DSH', inactive: 'Not served: {problem}', provider: 'Provider', models: 'Models', noModels: 'This route lists no models.',
    context: 'context {tokens}', output: 'output {tokens}',
    test: 'Test', testing: 'Testing…', testOk: 'Answered “{text}” in {milliseconds} ms{tokens}.', tokensSuffix: ', {count} tokens', testFailed: 'Failed ({code}): {message}',
    loadFailed: 'Could not read the routes: {message}', configuration: 'Configuration', noProviders: 'No provider that offers language models is installed. Install a provider plugin such as @dsh-ai-providers/openai.', probeNoModelService: 'This profile has no model service.', probeReasonedWithoutAnswer: 'The model used its {tokens}-token allowance for reasoning without writing an answer. Raise the route’s output limit or lower its reasoning level.', probeEmptyAnswer: 'The model returned no text.',
  },
  zh: {
    nav: '语言模型',
    title: '语言模型',
    description: '配置对话和智能体使用的模型。每个提供方向 DSH 提供一条或多条路由，对话以“路由 / 模型”的形式选择。请先配置提供方连接，再在此添加路由和模型。',
    routes: '路由', noRoutes: '还没有配置路由。请在“配置”中添加。', refresh: '刷新',
    active: '已提供给 DSH', inactive: '未提供：{problem}', provider: '提供方', models: '模型', noModels: '此路由没有列出模型。',
    context: '上下文 {tokens}', output: '输出 {tokens}',
    test: '测试', testing: '正在测试…', testOk: '回答“{text}”，用时 {milliseconds} 毫秒{tokens}。', tokensSuffix: '，{count} 个词元', testFailed: '失败（{code}）：{message}',
    loadFailed: '无法读取路由：{message}', configuration: '配置', noProviders: '没有安装提供语言模型的提供方。请安装如 @dsh-ai-providers/openai 之类的提供方插件。', probeNoModelService: '此配置没有模型服务。', probeReasonedWithoutAnswer: '模型把 {tokens} 个词元的额度全部用于思考，没有写出答案。请提高路由的输出上限，或降低思考级别。', probeEmptyAnswer: '模型没有返回文本。',
  },
  ja: {
    nav: '言語モデル', title: '言語モデル', description: 'チャットやエージェントが使用するモデルを設定します。各プロバイダーは DSH に 1 つ以上のルートを公開し、チャットでは「ルート / モデル」の形式でモデルを選びます。先にプロバイダーの接続を設定し、ここでルートとモデルを追加してください。',
    routes: 'ルート', noRoutes: 'ルートはまだありません。「設定」で追加してください。', refresh: '更新', active: 'DSH に公開中', inactive: '未公開: {problem}', provider: 'プロバイダー', models: 'モデル', noModels: 'このルートにモデルは登録されていません。',
    context: 'コンテキスト {tokens}', output: '出力 {tokens}', test: 'テスト', testing: 'テスト中…', testOk: '「{text}」と回答しました。所要時間: {milliseconds} ms{tokens}', tokensSuffix: '、{count} トークン', testFailed: '失敗 ({code}): {message}', loadFailed: 'ルートを読み込めませんでした: {message}', configuration: '設定', noProviders: '言語モデルを提供するプロバイダーがインストールされていません。@dsh-ai-providers/openai などのプロバイダープラグインをインストールしてください。', probeNoModelService: 'このプロファイルにはモデルサービスがありません。', probeReasonedWithoutAnswer: 'モデルは{tokens}トークンを推論に使い切り、回答を書きませんでした。ルートの出力上限を増やすか、推論レベルを下げてください。', probeEmptyAnswer: 'モデルからテキストが返されませんでした。',
  },
  es: {
    nav: 'Modelos de lenguaje', title: 'Modelos de lenguaje', description: 'Configura los modelos que usan los chats y los agentes. Cada proveedor expone una o más rutas a DSH, y cada chat elige un modelo como «ruta / modelo». Configura antes las conexiones de los proveedores y añade aquí las rutas y los modelos.',
    routes: 'Rutas', noRoutes: 'Todavía no hay rutas. Añade una en Configuración.', refresh: 'Actualizar', active: 'Disponible en DSH', inactive: 'No disponible: {problem}', provider: 'Proveedor', models: 'Modelos', noModels: 'Esta ruta no incluye ningún modelo.',
    context: 'contexto {tokens}', output: 'salida {tokens}', test: 'Probar', testing: 'Probando…', testOk: 'Respondió «{text}» en {milliseconds} ms{tokens}.', tokensSuffix: ', {count} tokens', testFailed: 'Error ({code}): {message}', loadFailed: 'No se pudieron leer las rutas: {message}', configuration: 'Configuración', noProviders: 'No hay instalado ningún proveedor de modelos de lenguaje. Instala un complemento como @dsh-ai-providers/openai.', probeNoModelService: 'Este perfil no tiene servicio de modelos.', probeReasonedWithoutAnswer: 'El modelo agotó sus {tokens} tokens razonando sin escribir una respuesta. Aumenta el límite de salida de la ruta o reduce el nivel de razonamiento.', probeEmptyAnswer: 'El modelo no devolvió texto.',
  },
  fr: {
    nav: 'Modèles de langage', title: 'Modèles de langage', description: 'Configurez les modèles utilisés par les discussions et les agents. Chaque fournisseur expose une ou plusieurs routes à DSH, et une discussion choisit un modèle sous la forme « route / modèle ». Configurez d’abord les connexions des fournisseurs, puis ajoutez ici les routes et les modèles.',
    routes: 'Routes', noRoutes: 'Aucune route n’est encore configurée. Ajoutez-en une dans Configuration.', refresh: 'Actualiser', active: 'Disponible dans DSH', inactive: 'Indisponible : {problem}', provider: 'Fournisseur', models: 'Modèles', noModels: 'Cette route ne contient aucun modèle.',
    context: 'contexte {tokens}', output: 'sortie {tokens}', test: 'Tester', testing: 'Test en cours…', testOk: 'Réponse « {text} » obtenue en {milliseconds} ms{tokens}.', tokensSuffix: ', {count} jetons', testFailed: 'Échec ({code}) : {message}', loadFailed: 'Impossible de lire les routes : {message}', configuration: 'Configuration', noProviders: 'Aucun fournisseur de modèles de langage n’est installé. Installez un module tel que @dsh-ai-providers/openai.', probeNoModelService: 'Ce profil ne dispose d’aucun service de modèles.', probeReasonedWithoutAnswer: 'Le modèle a consacré ses {tokens} jetons au raisonnement sans produire de réponse. Augmentez la limite de sortie de la route ou réduisez le niveau de raisonnement.', probeEmptyAnswer: 'Le modèle n’a renvoyé aucun texte.',
  },
  de: {
    nav: 'Sprachmodelle', title: 'Sprachmodelle', description: 'Diese Modelle werden von Chats und Agenten verwendet. Jeder Anbieter stellt DSH eine oder mehrere Routen bereit; ein Chat wählt ein Modell als „Route / Modell“. Richte zuerst die Anbieterverbindungen ein und füge danach hier die Routen und Modelle hinzu.',
    routes: 'Routen', noRoutes: 'Noch keine Routen eingerichtet. Füge unter Konfiguration eine hinzu.', refresh: 'Aktualisieren', active: 'Für DSH verfügbar', inactive: 'Nicht verfügbar: {problem}', provider: 'Anbieter', models: 'Modelle', noModels: 'Diese Route enthält keine Modelle.',
    context: 'Kontext {tokens}', output: 'Ausgabe {tokens}', test: 'Testen', testing: 'Test läuft…', testOk: 'Antwort „{text}“ nach {milliseconds} ms{tokens}.', tokensSuffix: ', {count} Tokens', testFailed: 'Fehlgeschlagen ({code}): {message}', loadFailed: 'Routen konnten nicht gelesen werden: {message}', configuration: 'Konfiguration', noProviders: 'Es ist kein Anbieter für Sprachmodelle installiert. Installiere ein Anbieter-Plugin wie @dsh-ai-providers/openai.', probeNoModelService: 'Dieses Profil hat keinen Modelldienst.', probeReasonedWithoutAnswer: 'Das Modell hat seine {tokens} Tokens für den Gedankengang verbraucht, ohne eine Antwort zu schreiben. Erhöhe das Ausgabelimit der Route oder verringere die Denkstufe.', probeEmptyAnswer: 'Das Modell hat keinen Text zurückgegeben.',
  },
  ru: {
    nav: 'Языковые модели', title: 'Языковые модели', description: 'Эти модели используют чаты и агенты. Каждый провайдер публикует в DSH один или несколько маршрутов, а чат выбирает модель в формате «маршрут / модель». Сначала настройте подключения провайдеров, затем добавьте здесь маршруты и модели.',
    routes: 'Маршруты', noRoutes: 'Маршрутов пока нет. Добавьте маршрут в разделе настроек.', refresh: 'Обновить', active: 'Доступен в DSH', inactive: 'Недоступен: {problem}', provider: 'Провайдер', models: 'Модели', noModels: 'В этом маршруте нет моделей.',
    context: 'контекст {tokens}', output: 'вывод {tokens}', test: 'Проверить', testing: 'Проверка…', testOk: 'Получен ответ «{text}» за {milliseconds} мс{tokens}.', tokensSuffix: ', {count} токенов', testFailed: 'Ошибка ({code}): {message}', loadFailed: 'Не удалось прочитать маршруты: {message}', configuration: 'Настройка', noProviders: 'Не установлен ни один провайдер языковых моделей. Установите плагин, например @dsh-ai-providers/openai.', probeNoModelService: 'В этом профиле нет сервиса моделей.', probeReasonedWithoutAnswer: 'Модель потратила {tokens} токенов на рассуждения и не написала ответ. Увеличьте лимит вывода маршрута или уменьшите уровень рассуждений.', probeEmptyAnswer: 'Модель не вернула текст.',
  },
  pt: {
    nav: 'Modelos de linguagem', title: 'Modelos de linguagem', description: 'São os modelos usados por chats e agentes. Cada provedor disponibiliza uma ou mais rotas ao DSH, e o chat escolhe um modelo no formato “rota / modelo”. Configure antes as conexões dos provedores e adicione aqui as rotas e os modelos.',
    routes: 'Rotas', noRoutes: 'Ainda não há rotas configuradas. Adicione uma em Configuração.', refresh: 'Atualizar', active: 'Disponível no DSH', inactive: 'Indisponível: {problem}', provider: 'Provedor', models: 'Modelos', noModels: 'Esta rota não contém modelos.',
    context: 'contexto {tokens}', output: 'saída {tokens}', test: 'Testar', testing: 'Testando…', testOk: 'Respondeu “{text}” em {milliseconds} ms{tokens}.', tokensSuffix: ', {count} tokens', testFailed: 'Falha ({code}): {message}', loadFailed: 'Não foi possível ler as rotas: {message}', configuration: 'Configuração', noProviders: 'Nenhum provedor de modelos de linguagem está instalado. Instale um plugin como @dsh-ai-providers/openai.', probeNoModelService: 'Este perfil não tem serviço de modelos.', probeReasonedWithoutAnswer: 'O modelo usou os {tokens} tokens em raciocínio sem escrever uma resposta. Aumente o limite de saída da rota ou reduza o nível de raciocínio.', probeEmptyAnswer: 'O modelo não devolveu texto.',
  },
}
