import type {} from '@deepseek-ai/dsh-client-ui-slots'

type ProviderLocaleId = 'en' | 'zh' | 'ja' | 'es' | 'fr' | 'de' | 'ru' | 'pt'

type Key =
  | 'label' | 'title' | 'description' | 'llmDescription'
  | 'connectionsTitle' | 'connectionsDescription' | 'connectionsEmpty' | 'name' | 'baseUrl' | 'keyRef' | 'key' | 'keyHint' | 'saveKey' | 'keySet' | 'keyUnset' | 'addConnection' | 'remove'
  | 'connection' | 'connectionNone' | 'connectionHint' | 'embeddingModel' | 'embeddingDimensions' | 'batchSize' | 'rerankModel' | 'decisionModel'
  | 'ttsModel' | 'ttsVoice' | 'ttsResponseFormat' | 'ttsSpeed' | 'sttModel' | 'sttRealtimeModel'
  | 'imageModel' | 'imageSize' | 'imageQuality' | 'imageOutputFormat' | 'imageOutputCompression' | 'imageReferences' | 'imageHighresScale' | 'imageHighresSteps'
  | 'requestBody' | 'requestBodyHint' | 'timeoutMs' | 'llmRoutes' | 'llmRoutesHint' | 'llmIdleTimeoutMs'
  | 'overridden' | 'reset' | 'invalidNumber' | 'save' | 'saving' | 'saveFailed' | 'readOnly' | 'unavailable'

declare module '@deepseek-ai/dsh-client-ui-slots' { interface LocaleNamespaceMap { 'ai.localai': Key } }

export const dictionaries: Record<ProviderLocaleId, Record<Key, string>> = {
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
  ja: {
    label: 'LocalAI', title: 'LocalAI', description: 'このサービス用に LocalAI を設定します。', llmDescription: 'DSH に公開する LocalAI の言語モデルルートを設定します。',
    connectionsTitle: 'LocalAI 接続', connectionsDescription: 'LocalAI のエンドポイントと任意の Bearer 認証情報です。各サービスで共通に利用できます。', connectionsEmpty: 'LocalAI 接続が設定されていません。',
    name: '名前', baseUrl: 'ベース URL', keyRef: '認証情報名', key: 'API キー', keyHint: 'DSH が保存し、プロファイルには書き込まれません。サーバーでキーが不要な場合は空のままにします。', saveKey: 'キーを保存', keySet: 'キー保存済み', keyUnset: 'キーなし', addConnection: '接続を追加', remove: '削除',
    connection: '接続', connectionNone: '接続なし', connectionHint: '接続の作成と管理は「プロバイダー」ページで行います。',
    embeddingModel: '埋め込みモデル', embeddingDimensions: '次元数', batchSize: '1 リクエストあたりのテキスト数', rerankModel: 'リランクモデル', decisionModel: '判断モデル',
    ttsModel: '音声モデル', ttsVoice: '既定の音声', ttsResponseFormat: '音声形式', ttsSpeed: '話速', sttModel: '文字起こしモデル', sttRealtimeModel: 'リアルタイム文字起こしモデル',
    imageModel: '画像モデル', imageSize: '画像サイズ', imageQuality: '画像品質', imageOutputFormat: '画像形式', imageOutputCompression: '圧縮率', imageReferences: '参照画像モード', imageHighresScale: '高解像度の倍率', imageHighresSteps: '高解像度のステップ数',
    requestBody: '追加のリクエストフィールド（JSON）', requestBodyHint: 'リクエスト本文にマージされる LocalAI 固有のフィールドです。', timeoutMs: 'タイムアウト（ms）',
    llmRoutes: 'ルート（JSON）', llmRoutesHint: 'ルート、モデル、サンプリング制御、LocalAI 固有のリクエストフィールドからなる配列です。', llmIdleTimeoutMs: '無音の上限（ms）',
    overridden: '変更済み', reset: 'リセット', invalidNumber: '有効な数値を入力してください。', save: '保存', saving: '保存中…', saveFailed: '設定が受け入れられませんでした。', readOnly: '設定は読み取り専用です。', unavailable: 'プロバイダーを利用できません。',
  },
  es: {
    label: 'LocalAI', title: 'LocalAI', description: 'Configura LocalAI para este servicio.', llmDescription: 'Configura las rutas de modelos de lenguaje de LocalAI expuestas a DSH.',
    connectionsTitle: 'Conexiones de LocalAI', connectionsDescription: 'Endpoints de LocalAI y credenciales Bearer opcionales, reutilizables entre sus servicios.', connectionsEmpty: 'No hay conexiones de LocalAI configuradas.',
    name: 'Nombre', baseUrl: 'URL base', keyRef: 'Nombre de la credencial', key: 'Clave de API', keyHint: 'DSH la guarda y nunca la escribe en el perfil. Déjala vacía si el servidor no necesita clave.', saveKey: 'Guardar clave', keySet: 'Clave guardada', keyUnset: 'Sin clave', addConnection: 'Añadir conexión', remove: 'Quitar',
    connection: 'Conexión', connectionNone: 'Sin conexión', connectionHint: 'Crea y gestiona las conexiones en la página de proveedores.',
    embeddingModel: 'Modelo de embeddings', embeddingDimensions: 'Dimensiones', batchSize: 'Textos por solicitud', rerankModel: 'Modelo de reranking', decisionModel: 'Modelo de decisión',
    ttsModel: 'Modelo de voz', ttsVoice: 'Voz predeterminada', ttsResponseFormat: 'Formato de audio', ttsSpeed: 'Velocidad de voz', sttModel: 'Modelo de transcripción', sttRealtimeModel: 'Modelo de transcripción en vivo',
    imageModel: 'Modelo de imagen', imageSize: 'Tamaño de imagen', imageQuality: 'Calidad de imagen', imageOutputFormat: 'Formato de imagen', imageOutputCompression: 'Compresión', imageReferences: 'Modo de imagen de referencia', imageHighresScale: 'Escala de alta resolución', imageHighresSteps: 'Pasos de alta resolución',
    requestBody: 'Campos de solicitud adicionales (JSON)', requestBodyHint: 'Campos específicos de LocalAI que se combinan con el cuerpo de la solicitud.', timeoutMs: 'Tiempo de espera (ms)',
    llmRoutes: 'Rutas (JSON)', llmRoutesHint: 'Una matriz de rutas, modelos, controles de muestreo y campos de solicitud específicos de LocalAI.', llmIdleTimeoutMs: 'Límite de silencio (ms)',
    overridden: 'Modificado', reset: 'Restablecer', invalidNumber: 'Introduce un número válido.', save: 'Guardar', saving: 'Guardando…', saveFailed: 'No se aceptaron los ajustes.', readOnly: 'Los ajustes son de solo lectura.', unavailable: 'El proveedor no está disponible.',
  },
  fr: {
    label: 'LocalAI', title: 'LocalAI', description: 'Configurez LocalAI pour ce service.', llmDescription: 'Configurez les routes de modèles de langage LocalAI exposées à DSH.',
    connectionsTitle: 'Connexions LocalAI', connectionsDescription: 'Points de terminaison LocalAI et identifiants Bearer facultatifs, réutilisables entre ses services.', connectionsEmpty: 'Aucune connexion LocalAI configurée.',
    name: 'Nom', baseUrl: 'URL de base', keyRef: 'Nom de l\'identifiant', key: 'Clé API', keyHint: 'Stockée par DSH et jamais écrite dans le profil. Laissez le champ vide si le serveur ne demande aucune clé.', saveKey: 'Enregistrer la clé', keySet: 'Clé enregistrée', keyUnset: 'Aucune clé', addConnection: 'Ajouter une connexion', remove: 'Supprimer',
    connection: 'Connexion', connectionNone: 'Aucune connexion', connectionHint: 'Créez et gérez les connexions sur la page Fournisseurs.',
    embeddingModel: 'Modèle d\'embedding', embeddingDimensions: 'Dimensions', batchSize: 'Textes par requête', rerankModel: 'Modèle de reclassement', decisionModel: 'Modèle de décision',
    ttsModel: 'Modèle vocal', ttsVoice: 'Voix par défaut', ttsResponseFormat: 'Format audio', ttsSpeed: 'Vitesse de parole', sttModel: 'Modèle de transcription', sttRealtimeModel: 'Modèle de transcription en direct',
    imageModel: 'Modèle d\'image', imageSize: 'Taille des images', imageQuality: 'Qualité des images', imageOutputFormat: 'Format des images', imageOutputCompression: 'Compression', imageReferences: 'Mode image de référence', imageHighresScale: 'Échelle haute résolution', imageHighresSteps: 'Étapes haute résolution',
    requestBody: 'Champs de requête supplémentaires (JSON)', requestBodyHint: 'Champs propres à LocalAI fusionnés dans le corps de la requête.', timeoutMs: 'Délai maximal (ms)',
    llmRoutes: 'Routes (JSON)', llmRoutesHint: 'Un tableau de routes, de modèles, de réglages d\'échantillonnage et de champs de requête propres à LocalAI.', llmIdleTimeoutMs: 'Limite de silence (ms)',
    overridden: 'Modifié', reset: 'Réinitialiser', invalidNumber: 'Saisissez un nombre valide.', save: 'Enregistrer', saving: 'Enregistrement…', saveFailed: 'Les paramètres n\'ont pas été acceptés.', readOnly: 'Les paramètres sont en lecture seule.', unavailable: 'Le fournisseur n\'est pas disponible.',
  },
  de: {
    label: 'LocalAI', title: 'LocalAI', description: 'LocalAI für diesen Dienst konfigurieren.', llmDescription: 'Die für DSH bereitgestellten LocalAI-Sprachmodellrouten konfigurieren.',
    connectionsTitle: 'LocalAI-Verbindungen', connectionsDescription: 'LocalAI-Endpunkte und optionale Bearer-Anmeldedaten, die alle Dienste gemeinsam nutzen.', connectionsEmpty: 'Es sind keine LocalAI-Verbindungen konfiguriert.',
    name: 'Name', baseUrl: 'Basis-URL', keyRef: 'Name der Anmeldedaten', key: 'API-Schlüssel', keyHint: 'Wird von DSH gespeichert und nie ins Profil geschrieben. Leer lassen, wenn der Server keinen Schlüssel benötigt.', saveKey: 'Schlüssel speichern', keySet: 'Schlüssel gespeichert', keyUnset: 'Kein Schlüssel', addConnection: 'Verbindung hinzufügen', remove: 'Entfernen',
    connection: 'Verbindung', connectionNone: 'Keine Verbindung', connectionHint: 'Verbindungen werden auf der Seite Anbieter erstellt und verwaltet.',
    embeddingModel: 'Embedding-Modell', embeddingDimensions: 'Dimensionen', batchSize: 'Texte pro Anfrage', rerankModel: 'Reranking-Modell', decisionModel: 'Entscheidungsmodell',
    ttsModel: 'Sprachausgabemodell', ttsVoice: 'Standardstimme', ttsResponseFormat: 'Audioformat', ttsSpeed: 'Sprechgeschwindigkeit', sttModel: 'Transkriptionsmodell', sttRealtimeModel: 'Live-Transkriptionsmodell',
    imageModel: 'Bildmodell', imageSize: 'Bildgröße', imageQuality: 'Bildqualität', imageOutputFormat: 'Bildformat', imageOutputCompression: 'Komprimierung', imageReferences: 'Referenzbildmodus', imageHighresScale: 'Hochauflösender Maßstab', imageHighresSteps: 'Hochauflösende Schritte',
    requestBody: 'Zusätzliche Anfragefelder (JSON)', requestBodyHint: 'LocalAI-spezifische Felder, die in den Anfrage-Body eingefügt werden.', timeoutMs: 'Zeitlimit (ms)',
    llmRoutes: 'Routen (JSON)', llmRoutesHint: 'Ein Array aus Routen, Modellen, Sampling-Steuerung und LocalAI-spezifischen Anfragefeldern.', llmIdleTimeoutMs: 'Grenze für Stille (ms)',
    overridden: 'Geändert', reset: 'Zurücksetzen', invalidNumber: 'Gültige Zahl eingeben.', save: 'Speichern', saving: 'Speichern…', saveFailed: 'Die Einstellungen wurden nicht übernommen.', readOnly: 'Die Einstellungen sind schreibgeschützt.', unavailable: 'Der Anbieter ist nicht verfügbar.',
  },
  ru: {
    label: 'LocalAI', title: 'LocalAI', description: 'Настройте LocalAI для этой службы.', llmDescription: 'Настройте маршруты языковых моделей LocalAI, доступные в DSH.',
    connectionsTitle: 'Подключения LocalAI', connectionsDescription: 'Конечные точки LocalAI и необязательные учётные данные Bearer, общие для всех служб.', connectionsEmpty: 'Подключения LocalAI не настроены.',
    name: 'Название', baseUrl: 'Базовый URL', keyRef: 'Имя учётных данных', key: 'Ключ API', keyHint: 'Хранится в DSH и никогда не записывается в профиль. Оставьте пустым, если серверу не нужен ключ.', saveKey: 'Сохранить ключ', keySet: 'Ключ сохранён', keyUnset: 'Без ключа', addConnection: 'Добавить подключение', remove: 'Удалить',
    connection: 'Подключение', connectionNone: 'Без подключения', connectionHint: 'Создавайте подключения и управляйте ими на странице «Провайдеры».',
    embeddingModel: 'Модель эмбеддингов', embeddingDimensions: 'Размерность', batchSize: 'Текстов на запрос', rerankModel: 'Модель переранжирования', decisionModel: 'Модель принятия решений',
    ttsModel: 'Модель синтеза речи', ttsVoice: 'Голос по умолчанию', ttsResponseFormat: 'Формат аудио', ttsSpeed: 'Скорость речи', sttModel: 'Модель расшифровки', sttRealtimeModel: 'Модель потоковой расшифровки',
    imageModel: 'Модель изображений', imageSize: 'Размер изображения', imageQuality: 'Качество изображения', imageOutputFormat: 'Формат изображения', imageOutputCompression: 'Сжатие', imageReferences: 'Режим опорных изображений', imageHighresScale: 'Масштаб высокого разрешения', imageHighresSteps: 'Шаги высокого разрешения',
    requestBody: 'Дополнительные поля запроса (JSON)', requestBodyHint: 'Поля, специфичные для LocalAI, добавляемые в тело запроса.', timeoutMs: 'Тайм-аут (мс)',
    llmRoutes: 'Маршруты (JSON)', llmRoutesHint: 'Массив маршрутов, моделей, параметров сэмплирования и полей запроса, специфичных для LocalAI.', llmIdleTimeoutMs: 'Предел тишины (мс)',
    overridden: 'Изменено', reset: 'Сбросить', invalidNumber: 'Введите корректное число.', save: 'Сохранить', saving: 'Сохранение…', saveFailed: 'Настройки не были приняты.', readOnly: 'Настройки доступны только для чтения.', unavailable: 'Провайдер недоступен.',
  },
  pt: {
    label: 'LocalAI', title: 'LocalAI', description: 'Configure o LocalAI para este serviço.', llmDescription: 'Configure as rotas de modelos de linguagem do LocalAI expostas ao DSH.',
    connectionsTitle: 'Conexões do LocalAI', connectionsDescription: 'Endpoints do LocalAI e credenciais Bearer opcionais, reutilizáveis entre os serviços.', connectionsEmpty: 'Nenhuma conexão do LocalAI está configurada.',
    name: 'Nome', baseUrl: 'URL base', keyRef: 'Nome da credencial', key: 'Chave de API', keyHint: 'Armazenada pelo DSH e nunca gravada no perfil. Deixe em branco se o servidor não exigir chave.', saveKey: 'Salvar chave', keySet: 'Chave salva', keyUnset: 'Sem chave', addConnection: 'Adicionar conexão', remove: 'Remover',
    connection: 'Conexão', connectionNone: 'Sem conexão', connectionHint: 'Crie e gerencie conexões na página Provedores.',
    embeddingModel: 'Modelo de embeddings', embeddingDimensions: 'Dimensões', batchSize: 'Textos por requisição', rerankModel: 'Modelo de reranqueamento', decisionModel: 'Modelo de decisão',
    ttsModel: 'Modelo de fala', ttsVoice: 'Voz padrão', ttsResponseFormat: 'Formato de áudio', ttsSpeed: 'Velocidade da fala', sttModel: 'Modelo de transcrição', sttRealtimeModel: 'Modelo de transcrição ao vivo',
    imageModel: 'Modelo de imagem', imageSize: 'Tamanho da imagem', imageQuality: 'Qualidade da imagem', imageOutputFormat: 'Formato da imagem', imageOutputCompression: 'Compressão', imageReferences: 'Modo de imagem de referência', imageHighresScale: 'Escala de alta resolução', imageHighresSteps: 'Passos de alta resolução',
    requestBody: 'Campos extras da requisição (JSON)', requestBodyHint: 'Campos específicos do LocalAI mesclados ao corpo da requisição.', timeoutMs: 'Tempo limite (ms)',
    llmRoutes: 'Rotas (JSON)', llmRoutesHint: 'Um array de rotas, modelos, controles de amostragem e campos de requisição específicos do LocalAI.', llmIdleTimeoutMs: 'Limite de silêncio (ms)',
    overridden: 'Alterado', reset: 'Redefinir', invalidNumber: 'Informe um número válido.', save: 'Salvar', saving: 'Salvando…', saveFailed: 'As configurações não foram aceitas.', readOnly: 'As configurações são somente leitura.', unavailable: 'O provedor está indisponível.',
  },
}
