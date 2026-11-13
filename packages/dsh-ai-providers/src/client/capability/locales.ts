import type { SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Capability } from '@dsh-ai-providers/core'
import type { Dictionaries } from '../i18n.ts'

export type CapabilityLocaleKey =
  | 'nav' | 'tab' | 'title' | 'description'
  | 'provider' | 'providerNone' | 'providerNotLoaded' | 'noProviders' | 'chooseProvider'
  | 'status' | 'statusAvailable' | 'statusUnavailable'
  | 'test' | 'testing' | 'testSaveFirst' | 'testOk' | 'testFailed'
  | 'probeNoProvider' | 'probeOddRanking' | 'probeEmptyAudio' | 'probeEmptyImage' | 'probeOddDecision'
  | 'loadFailed' | 'overridden' | 'reset' | 'invalid'
  | 'readOnly' | 'unavailable' | 'save' | 'saving' | 'saveFailed'

const embedding: Dictionaries<CapabilityLocaleKey> = {
  en: {
    nav: 'Embedding',
    tab: 'Embedding',
    title: 'Embedding',
    description: 'Converts text into vectors that other plugins can search by meaning. Choose and configure a provider, and the service becomes available to every plugin that needs it.',
    provider: 'Provider',
    providerNone: 'Disabled',
    providerNotLoaded: 'not loaded',
    noProviders: 'No embedding provider is installed. Install a provider plugin such as @dsh-ai-providers/openai.',
    chooseProvider: 'Choose a provider to configure it.',
    status: 'Service',
    statusAvailable: 'Available: other plugins can now create embeddings.',
    statusUnavailable: 'Not available: no provider is selected, or the selected one is not loaded.',
    test: 'Test the connection',
    testing: 'Testing…',
    testSaveFirst: 'Save the provider selection before testing it.',
    testOk: 'Works: {model}, {dimensions} dimensions, {milliseconds} ms.',
    testFailed: 'Does not work ({code}): {message}',
    probeNoProvider: 'No provider is selected, or the selected provider is not loaded.', probeOddRanking: '{provider} did not rank the sentence about the fox first.', probeEmptyAudio: '{provider} returned empty audio.', probeEmptyImage: '{provider} returned no image data.', probeOddDecision: '{provider} did not identify the test message as angry and about billing.',
    loadFailed: 'Could not read the state of the service: {message}',
    overridden: 'Changed',
    reset: 'Reset',
    invalid: 'Not valid',
    readOnly: 'This deployment stores settings read-only.',
    unavailable: 'The AI providers plugin is not loaded, so these settings are unavailable.',
    save: 'Save',
    saving: 'Saving…',
    saveFailed: 'These values were rejected. Your changes are still here so you can correct them.',
  },
  zh: {
    nav: '嵌入',
    tab: '嵌入',
    title: '嵌入',
    description: '把文本转换为向量，供其他插件按语义查找相近内容。选择并配置提供方后，所有需要嵌入服务的插件都能使用它。',
    provider: '提供方',
    providerNone: '已禁用',
    providerNotLoaded: '未加载',
    noProviders: '尚未安装任何嵌入提供方。请安装如 @dsh-ai-providers/openai 之类的提供方插件。',
    chooseProvider: '选择一个提供方后即可配置。',
    status: '服务',
    statusAvailable: '可用：其他插件现在可以生成嵌入向量。',
    statusUnavailable: '不可用：尚未选择提供方，或所选提供方未加载。',
    test: '测试连接',
    testing: '正在测试…',
    testSaveFirst: '请先保存提供方选择，再进行测试。',
    testOk: '可用：{model}，{dimensions} 维，{milliseconds} 毫秒。',
    testFailed: '不可用（{code}）：{message}',
    probeNoProvider: '尚未选择提供方，或所选提供方未加载。', probeOddRanking: '{provider} 没有把关于狐狸的句子排在第一位。', probeEmptyAudio: '{provider} 返回了空音频。', probeEmptyImage: '{provider} 没有返回图片数据。', probeOddDecision: '{provider} 未能判断测试消息表达了愤怒且内容与账单有关。',
    loadFailed: '无法读取服务状态：{message}',
    overridden: '已更改',
    reset: '重置',
    invalid: '无效',
    readOnly: '本部署的设置为只读。',
    unavailable: 'AI 提供方插件尚未加载，无法使用这些设置。',
    save: '保存',
    saving: '正在保存…',
    saveFailed: '这些值未被接受。你的修改仍保留在此，方便更正。',
  },
  ja: {
    nav: '埋め込み', tab: '埋め込み', title: '埋め込み', description: 'テキストをベクトルに変換し、他のプラグインが意味の近い内容を探せるようにします。使用するプロバイダーを選んで設定すると、このサービスを必要とするすべてのプラグインから利用できます。', provider: 'プロバイダー', providerNone: '無効', providerNotLoaded: '未読み込み', noProviders: '埋め込みプロバイダーがインストールされていません。@dsh-ai-providers/openai などのプロバイダープラグインをインストールしてください。', chooseProvider: '設定するプロバイダーを選んでください。', status: 'サービス', statusAvailable: '利用可能: 他のプラグインから埋め込みを使えます。', statusUnavailable: '利用不可: プロバイダーが未選択か、選択したプロバイダーが読み込まれていません。', test: '接続をテスト', testing: 'テスト中…', testSaveFirst: 'テストする前にプロバイダーの選択を保存してください。', testOk: '利用可能: {model}、{dimensions} 次元、{milliseconds} ms。', testFailed: '利用できません ({code}): {message}', probeNoProvider: 'プロバイダーが未選択か、選択したプロバイダーが読み込まれていません。', probeOddRanking: '{provider} はキツネについての文を1位にしませんでした。', probeEmptyAudio: '{provider} が空の音声を返しました。', probeEmptyImage: '{provider} が画像データを返しませんでした。', probeOddDecision: '{provider} はテストメッセージを怒りと請求に関する内容だと判定できませんでした。', loadFailed: 'サービスの状態を読み込めませんでした: {message}', overridden: '変更あり', reset: 'リセット', invalid: '無効', readOnly: 'この環境の設定は読み取り専用です。', unavailable: 'AI プロバイダープラグインが読み込まれていないため、現在は設定できません。', save: '保存', saving: '保存中…', saveFailed: '値を保存できませんでした。修正できるよう入力内容は残してあります。',
  },
  es: {
    nav: 'Embeddings', tab: 'Embeddings', title: 'Embeddings', description: 'Convierte texto en vectores para que otros complementos encuentren contenido parecido por su significado. Elige y configura el proveedor; después, cualquier complemento que necesite el servicio podrá usarlo.', provider: 'Proveedor', providerNone: 'Desactivado', providerNotLoaded: 'no cargado', noProviders: 'No hay ningún proveedor de embeddings instalado. Instala un complemento como @dsh-ai-providers/openai.', chooseProvider: 'Elige un proveedor para configurarlo.', status: 'Servicio', statusAvailable: 'Disponible: otros complementos ya pueden usar embeddings.', statusUnavailable: 'No disponible: no se ha elegido un proveedor o el elegido no está cargado.', test: 'Probar la conexión', testing: 'Probando…', testSaveFirst: 'Guarda la selección del proveedor antes de probarlo.', testOk: 'Funciona: {model}, {dimensions} dimensiones, {milliseconds} ms.', testFailed: 'No funciona ({code}): {message}', probeNoProvider: 'No se ha elegido ningún proveedor o el elegido no está cargado.', probeOddRanking: '{provider} no puso en primer lugar la frase sobre el zorro.', probeEmptyAudio: '{provider} devolvió audio vacío.', probeEmptyImage: '{provider} no devolvió datos de imagen.', probeOddDecision: '{provider} no identificó el mensaje de prueba como enfadado y relacionado con facturación.', loadFailed: 'No se pudo leer el estado del servicio: {message}', overridden: 'Modificado', reset: 'Restablecer', invalid: 'No válido', readOnly: 'Los ajustes de esta instalación son de solo lectura.', unavailable: 'El complemento de proveedores de IA no está cargado, así que ahora mismo no se puede configurar.', save: 'Guardar', saving: 'Guardando…', saveFailed: 'La instalación rechazó estos valores; se han conservado para que puedas corregirlos.',
  },
  fr: {
    nav: 'Plongements', tab: 'Plongements', title: 'Plongements', description: 'Transforme le texte en vecteurs pour permettre aux autres modules de retrouver des contenus de sens proche. Choisissez et configurez le fournisseur ; le service sera ensuite accessible à tous les modules qui en ont besoin.', provider: 'Fournisseur', providerNone: 'Désactivé', providerNotLoaded: 'non chargé', noProviders: 'Aucun fournisseur de plongements n’est installé. Installez un module tel que @dsh-ai-providers/openai.', chooseProvider: 'Choisissez un fournisseur pour le configurer.', status: 'Service', statusAvailable: 'Disponible : les autres modules peuvent maintenant utiliser les plongements.', statusUnavailable: 'Indisponible : aucun fournisseur n’est sélectionné ou le fournisseur choisi n’est pas chargé.', test: 'Tester la connexion', testing: 'Test en cours…', testSaveFirst: 'Enregistrez le fournisseur choisi avant de le tester.', testOk: 'Fonctionne : {model}, {dimensions} dimensions, {milliseconds} ms.', testFailed: 'Ne fonctionne pas ({code}) : {message}', probeNoProvider: 'Aucun fournisseur n’est sélectionné ou le fournisseur choisi n’est pas chargé.', probeOddRanking: '{provider} n’a pas classé la phrase sur le renard en premier.', probeEmptyAudio: '{provider} a renvoyé un son vide.', probeEmptyImage: '{provider} n’a renvoyé aucune donnée d’image.', probeOddDecision: '{provider} n’a pas reconnu que le message de test exprimait de la colère et concernait la facturation.', loadFailed: 'Impossible de lire l’état du service : {message}', overridden: 'Modifié', reset: 'Réinitialiser', invalid: 'Non valide', readOnly: 'Les réglages de ce déploiement sont en lecture seule.', unavailable: 'Le module des fournisseurs d’IA n’est pas chargé et ne peut pas être configuré pour le moment.', save: 'Enregistrer', saving: 'Enregistrement…', saveFailed: 'Le déploiement a refusé ces valeurs ; elles sont conservées pour vous permettre de les corriger.',
  },
  de: {
    nav: 'Einbettungen', tab: 'Einbettungen', title: 'Einbettungen', description: 'Wandelt Text in Vektoren um, damit andere Plugins Inhalte mit ähnlicher Bedeutung finden können. Wähle einen Anbieter aus und richte ihn ein; danach steht der Dienst allen Plugins zur Verfügung, die ihn anfordern.', provider: 'Anbieter', providerNone: 'Deaktiviert', providerNotLoaded: 'nicht geladen', noProviders: 'Es ist kein Anbieter für Einbettungen installiert. Installiere ein Anbieter-Plugin wie @dsh-ai-providers/openai.', chooseProvider: 'Wähle einen Anbieter aus, um ihn einzurichten.', status: 'Dienst', statusAvailable: 'Verfügbar: Andere Plugins können Einbettungen jetzt verwenden.', statusUnavailable: 'Nicht verfügbar: Es ist kein Anbieter ausgewählt oder der ausgewählte Anbieter ist nicht geladen.', test: 'Verbindung testen', testing: 'Test läuft…', testSaveFirst: 'Speichere die Anbieterauswahl vor dem Test.', testOk: 'Funktioniert: {model}, {dimensions} Dimensionen, {milliseconds} ms.', testFailed: 'Funktioniert nicht ({code}): {message}', probeNoProvider: 'Es ist kein Anbieter ausgewählt oder der ausgewählte Anbieter ist nicht geladen.', probeOddRanking: '{provider} hat den Satz über den Fuchs nicht an die erste Stelle gesetzt.', probeEmptyAudio: '{provider} hat leere Audiodaten zurückgegeben.', probeEmptyImage: '{provider} hat keine Bilddaten zurückgegeben.', probeOddDecision: '{provider} hat die Testnachricht nicht als verärgert und abrechnungsbezogen erkannt.', loadFailed: 'Dienststatus konnte nicht gelesen werden: {message}', overridden: 'Geändert', reset: 'Zurücksetzen', invalid: 'Ungültig', readOnly: 'Die Einstellungen dieser Installation sind schreibgeschützt.', unavailable: 'Das Plugin für KI-Anbieter ist nicht geladen und kann zurzeit nicht eingerichtet werden.', save: 'Speichern', saving: 'Wird gespeichert…', saveFailed: 'Die Installation hat diese Werte abgelehnt; sie bleiben zur Korrektur erhalten.',
  },
  ru: {
    nav: 'Эмбеддинги', tab: 'Эмбеддинги', title: 'Эмбеддинги', description: 'Преобразует текст в векторы, чтобы другие плагины могли находить материалы с близким смыслом. Выберите и настройте провайдера; после этого сервис станет доступен всем плагинам, которым он нужен.', provider: 'Провайдер', providerNone: 'Отключено', providerNotLoaded: 'не загружен', noProviders: 'Не установлен провайдер эмбеддингов. Установите плагин, например @dsh-ai-providers/openai.', chooseProvider: 'Выберите провайдера, чтобы настроить его.', status: 'Сервис', statusAvailable: 'Доступен: другие плагины могут использовать эмбеддинги.', statusUnavailable: 'Недоступен: провайдер не выбран или выбранный провайдер не загружен.', test: 'Проверить подключение', testing: 'Проверка…', testSaveFirst: 'Сохраните выбор провайдера перед проверкой.', testOk: 'Работает: {model}, {dimensions} измерений, {milliseconds} мс.', testFailed: 'Не работает ({code}): {message}', probeNoProvider: 'Провайдер не выбран или выбранный провайдер не загружен.', probeOddRanking: '{provider} не поставил предложение о лисе на первое место.', probeEmptyAudio: '{provider} вернул пустые аудиоданные.', probeEmptyImage: '{provider} не вернул данные изображения.', probeOddDecision: '{provider} не распознал, что тестовое сообщение выражает недовольство и касается оплаты.', loadFailed: 'Не удалось получить состояние сервиса: {message}', overridden: 'Изменено', reset: 'Сбросить', invalid: 'Некорректно', readOnly: 'Настройки этой установки доступны только для чтения.', unavailable: 'Плагин провайдеров ИИ не загружен, поэтому сейчас его нельзя настроить.', save: 'Сохранить', saving: 'Сохранение…', saveFailed: 'Установка отклонила эти значения; они оставлены в форме для исправления.',
  },
  pt: {
    nav: 'Embeddings', tab: 'Embeddings', title: 'Embeddings', description: 'Converte texto em vetores para que outros plugins encontrem conteúdo com significado parecido. Escolha e configure o provedor; depois disso, qualquer plugin que precisar do serviço poderá usá-lo.', provider: 'Provedor', providerNone: 'Desativado', providerNotLoaded: 'não carregado', noProviders: 'Nenhum provedor de embeddings está instalado. Instale um plugin como @dsh-ai-providers/openai.', chooseProvider: 'Escolha um provedor para configurá-lo.', status: 'Serviço', statusAvailable: 'Disponível: outros plugins já podem usar embeddings.', statusUnavailable: 'Indisponível: nenhum provedor foi escolhido ou o provedor escolhido não está carregado.', test: 'Testar conexão', testing: 'Testando…', testSaveFirst: 'Salve a escolha do provedor antes de testar.', testOk: 'Funcionando: {model}, {dimensions} dimensões, {milliseconds} ms.', testFailed: 'Não funciona ({code}): {message}', probeNoProvider: 'Nenhum provedor foi escolhido ou o provedor escolhido não está carregado.', probeOddRanking: '{provider} não colocou a frase sobre a raposa em primeiro lugar.', probeEmptyAudio: '{provider} devolveu áudio vazio.', probeEmptyImage: '{provider} não devolveu dados de imagem.', probeOddDecision: '{provider} não identificou a mensagem de teste como irritada e relacionada com cobrança.', loadFailed: 'Não foi possível ler o estado do serviço: {message}', overridden: 'Alterado', reset: 'Redefinir', invalid: 'Inválido', readOnly: 'As configurações desta instalação são somente leitura.', unavailable: 'O plugin de provedores de IA não está carregado, então não pode ser configurado agora.', save: 'Salvar', saving: 'Salvando…', saveFailed: 'A instalação recusou estes valores; eles foram mantidos para que você possa corrigi-los.',
  },
}

const rerank: Dictionaries<CapabilityLocaleKey> = {
  en: {
    ...embedding.en,
    nav: 'Reranking',
    tab: 'Reranking',
    title: 'Reranking',
    description: 'Reads a question and several texts together, then scores how well each text answers the question. This is more accurate than comparing vectors. Other plugins use it to reorder candidates from a cheaper search. Choose and configure a provider to enable it.',
    noProviders: 'No reranking provider is installed. Install a provider plugin such as @dsh-ai-providers/jina.',
    statusAvailable: 'Available: other plugins can use reranking now.',
    testOk: 'Works: {model}, {milliseconds} ms.',
  },
  zh: {
    ...embedding.zh,
    nav: '重排',
    tab: '重排',
    title: '重排',
    description: '同时读取问题和多段文本，再判断每段文本对问题的回答程度。这比单独比较向量更准确。其他插件可用它对低成本检索产生的候选结果重新排序。选择并配置提供方即可启用。',
    noProviders: '尚未安装重排提供方。请安装 @dsh-ai-providers/jina 等提供方插件。',
    statusAvailable: '可用：其他插件现在可以重排结果。',
    testOk: '可用：{model}，{milliseconds} 毫秒。',
  },
  ja: { ...embedding.ja, nav: '再ランキング', tab: '再ランキング', title: '再ランキング', description: '質問と複数のテキストをまとめて読み、それぞれが質問にどの程度答えているかを判定します。ベクトル比較より精度が高く、他のプラグインは安価な検索で見つけた候補を関連度順に並べるために使います。使用するプロバイダーを選んで設定してください。', noProviders: '再ランキングのプロバイダーがインストールされていません。@dsh-ai-providers/jina などをインストールしてください。', statusAvailable: '利用可能: 他のプラグインから再ランキングを使えます。', testOk: '利用可能: {model}、{milliseconds} ms。' },
  es: { ...embedding.es, nav: 'Reordenación', tab: 'Reordenación', title: 'Reordenación', description: 'Lee una pregunta junto con varios textos y valora lo bien que responde cada uno. Es más preciso que comparar vectores. Otros complementos lo usan para ordenar los mejores resultados de una búsqueda más barata. Elige y configura el proveedor.', noProviders: 'No hay ningún proveedor de reordenación instalado. Instala un complemento como @dsh-ai-providers/jina.', statusAvailable: 'Disponible: otros complementos ya pueden reordenar resultados.', testOk: 'Funciona: {model}, {milliseconds} ms.' },
  fr: { ...embedding.fr, nav: 'Reclassement', tab: 'Reclassement', title: 'Reclassement', description: 'Lit une question avec plusieurs textes pour mesurer dans quelle mesure chacun y répond. Cette méthode est plus précise qu’une comparaison de vecteurs. Les autres modules l’utilisent pour classer les meilleurs résultats d’une recherche moins coûteuse. Choisissez et configurez le fournisseur.', noProviders: 'Aucun fournisseur de reclassement n’est installé. Installez un module tel que @dsh-ai-providers/jina.', statusAvailable: 'Disponible : les autres modules peuvent maintenant reclasser les résultats.', testOk: 'Fonctionne : {model}, {milliseconds} ms.' },
  de: { ...embedding.de, nav: 'Neusortierung', tab: 'Neusortierung', title: 'Neusortierung', description: 'Liest eine Frage zusammen mit mehreren Texten und bewertet, wie gut jeder Text die Frage beantwortet. Das ist genauer als ein Vektorvergleich. Andere Plugins bringen damit die besten Treffer einer günstigeren Suche nach vorn. Wähle den Anbieter aus und richte ihn ein.', noProviders: 'Es ist kein Anbieter für Neusortierung installiert. Installiere ein Plugin wie @dsh-ai-providers/jina.', statusAvailable: 'Verfügbar: Andere Plugins können Ergebnisse jetzt neu sortieren.', testOk: 'Funktioniert: {model}, {milliseconds} ms.' },
  ru: { ...embedding.ru, nav: 'Переранжирование', tab: 'Переранжирование', title: 'Переранжирование', description: 'Читает вопрос вместе с несколькими текстами и оценивает, насколько хорошо каждый из них отвечает на вопрос. Это точнее сравнения векторов. Другие плагины используют сервис, чтобы поднять лучшие результаты более дешёвого поиска. Выберите и настройте провайдера.', noProviders: 'Не установлен провайдер переранжирования. Установите плагин, например @dsh-ai-providers/jina.', statusAvailable: 'Доступен: другие плагины могут использовать переранжирование.', testOk: 'Работает: {model}, {milliseconds} мс.' },
  pt: { ...embedding.pt, nav: 'Reordenação', tab: 'Reordenação', title: 'Reordenação', description: 'Lê uma pergunta junto com vários textos e avalia até que ponto cada texto responde à pergunta. É mais preciso do que comparar vetores. Outros plugins usam o serviço para colocar primeiro os melhores resultados de uma busca mais barata. Escolha e configure o provedor.', noProviders: 'Nenhum provedor de reordenação está instalado. Instale um plugin como @dsh-ai-providers/jina.', statusAvailable: 'Disponível: outros plugins já podem reordenar resultados.', testOk: 'Funcionando: {model}, {milliseconds} ms.' },
}

const tts: Dictionaries<CapabilityLocaleKey> = {
  en: {
    ...embedding.en,
    nav: 'Text to speech',
    tab: 'Voice',
    title: 'Text to speech',
    description: 'Converts text into streamed speech. Choose a provider, then configure its default model, voice and output format.',
    noProviders: 'No text-to-speech provider is installed. Install a provider plugin such as @dsh-ai-providers/openai.',
    statusAvailable: 'Available: other plugins can synthesize speech now.',
    testOk: 'Works: {model}, {milliseconds} ms.',
  },
  zh: {
    ...embedding.zh,
    nav: '文本转语音',
    tab: '语音合成',
    title: '文本转语音',
    description: '把文本转换为流式语音。选择提供方，再配置默认模型、声音和输出格式。',
    noProviders: '尚未安装任何文本转语音提供方。请安装如 @dsh-ai-providers/openai 之类的提供方插件。',
    statusAvailable: '可用：其他插件现在可以合成语音。',
    testOk: '可用：{model}，{milliseconds} 毫秒。',
  },
  ja: { ...embedding.ja, nav: 'テキスト読み上げ', tab: '音声', title: 'テキスト読み上げ', description: 'テキストをストリーミング音声に変換します。使用するプロバイダーを選び、モデル、声、出力の既定値を設定してください。', noProviders: '音声合成プロバイダーがインストールされていません。@dsh-ai-providers/openai などをインストールしてください。', statusAvailable: '利用可能: 他のプラグインから音声を合成できます。', testOk: '利用可能: {model}、{milliseconds} ms。' },
  es: { ...embedding.es, nav: 'Texto a voz', tab: 'Voz', title: 'Texto a voz', description: 'Convierte texto en audio hablado por streaming. Elige el proveedor y configura el modelo, la voz y los valores de salida.', noProviders: 'No hay ningún proveedor de texto a voz instalado. Instala un complemento como @dsh-ai-providers/openai.', statusAvailable: 'Disponible: otros complementos ya pueden sintetizar voz.', testOk: 'Funciona: {model}, {milliseconds} ms.' },
  fr: { ...embedding.fr, nav: 'Synthèse vocale', tab: 'Voix', title: 'Synthèse vocale', description: 'Transforme le texte en audio vocal diffusé en continu. Choisissez le fournisseur, puis configurez le modèle, la voix et les valeurs de sortie par défaut.', noProviders: 'Aucun fournisseur de synthèse vocale n’est installé. Installez un module tel que @dsh-ai-providers/openai.', statusAvailable: 'Disponible : les autres modules peuvent maintenant produire de la voix.', testOk: 'Fonctionne : {model}, {milliseconds} ms.' },
  de: { ...embedding.de, nav: 'Sprachausgabe', tab: 'Sprache', title: 'Sprachausgabe', description: 'Wandelt Text in einen gestreamten Sprachton um. Wähle einen Anbieter aus und richte Modell, Stimme und Ausgabevorgaben ein.', noProviders: 'Es ist kein Anbieter für Sprachausgabe installiert. Installiere ein Plugin wie @dsh-ai-providers/openai.', statusAvailable: 'Verfügbar: Andere Plugins können jetzt Sprache erzeugen.', testOk: 'Funktioniert: {model}, {milliseconds} ms.' },
  ru: { ...embedding.ru, nav: 'Синтез речи', tab: 'Речь', title: 'Синтез речи', description: 'Преобразует текст в потоковое речевое аудио. Выберите провайдера и настройте модель, голос и параметры вывода по умолчанию.', noProviders: 'Не установлен провайдер синтеза речи. Установите плагин, например @dsh-ai-providers/openai.', statusAvailable: 'Доступен: другие плагины могут синтезировать речь.', testOk: 'Работает: {model}, {milliseconds} мс.' },
  pt: { ...embedding.pt, nav: 'Texto para voz', tab: 'Voz', title: 'Texto para voz', description: 'Converte texto em áudio de voz por streaming. Escolha o provedor e configure o modelo, a voz e os padrões de saída.', noProviders: 'Nenhum provedor de texto para voz está instalado. Instale um plugin como @dsh-ai-providers/openai.', statusAvailable: 'Disponível: outros plugins já podem sintetizar voz.', testOk: 'Funcionando: {model}, {milliseconds} ms.' },
}

const stt: Dictionaries<CapabilityLocaleKey> = {
  en: { ...embedding.en, nav: 'API speech to text', tab: 'Speech', title: 'API speech to text', description: 'Transcribes completed recordings through the same provider shape as DSH Voice Input; a provider may also support realtime transcription. This API service can be disabled while DSH Voice Input uses SenseVoice.', noProviders: 'No speech-to-text provider is installed. Install a provider plugin such as @dsh-ai-providers/openai.', statusAvailable: 'Available: other plugins can use API transcription now.', testOk: 'Works: {model}, {milliseconds} ms.' },
  zh: { ...embedding.zh, nav: 'API 语音转文本', tab: '语音识别', title: 'API 语音转文本', description: '使用与 DSH 语音输入提供方相同的接口转录完整录音；提供方还可选择支持实时转录。此 API 服务可以禁用，同时让 DSH 语音输入使用 SenseVoice。', noProviders: '尚未安装任何语音转文本提供方。请安装如 @dsh-ai-providers/openai 之类的提供方插件。', statusAvailable: '可用：其他插件现在可以使用 API 转录。', testOk: '可用：{model}，{milliseconds} 毫秒。' },
  ja: { ...embedding.ja, nav: 'API 音声認識', tab: '音声認識', title: 'API 音声認識', description: 'DSH 音声入力と同じプロバイダー形式で、録音済みの音声を文字に起こします。プロバイダーによってはリアルタイム文字起こしにも対応します。DSH 音声入力で SenseVoice を使いながら、この API サービスだけを無効にすることもできます。', noProviders: '音声認識プロバイダーがインストールされていません。@dsh-ai-providers/openai などをインストールしてください。', statusAvailable: '利用可能: 他のプラグインから API 文字起こしを使えます。', testOk: '利用可能: {model}、{milliseconds} ms。' },
  es: { ...embedding.es, nav: 'Voz a texto por API', tab: 'Transcripción', title: 'Voz a texto por API', description: 'Transcribe grabaciones terminadas con la misma interfaz de proveedores que Entrada de voz de DSH; algunos proveedores también admiten transcripción en tiempo real. Este servicio de API puede desactivarse mientras Entrada de voz usa SenseVoice.', noProviders: 'No hay ningún proveedor de voz a texto instalado. Instala un complemento como @dsh-ai-providers/openai.', statusAvailable: 'Disponible: otros complementos ya pueden usar la transcripción por API.', testOk: 'Funciona: {model}, {milliseconds} ms.' },
  fr: { ...embedding.fr, nav: 'Transcription par API', tab: 'Transcription', title: 'Transcription par API', description: 'Transcrit les enregistrements terminés avec la même interface de fournisseur que la saisie vocale de DSH. Un fournisseur peut aussi prendre en charge la transcription en temps réel. Ce service d’API peut être désactivé pendant que la saisie vocale utilise SenseVoice.', noProviders: 'Aucun fournisseur de transcription n’est installé. Installez un module tel que @dsh-ai-providers/openai.', statusAvailable: 'Disponible : les autres modules peuvent maintenant utiliser la transcription par API.', testOk: 'Fonctionne : {model}, {milliseconds} ms.' },
  de: { ...embedding.de, nav: 'API-Spracherkennung', tab: 'Transkription', title: 'API-Spracherkennung', description: 'Transkribiert fertige Aufnahmen über dieselbe Anbieterschnittstelle wie DSH Voice Input. Ein Anbieter kann zusätzlich Echtzeittranskription unterstützen. Dieser API-Dienst kann deaktiviert bleiben, während DSH Voice Input SenseVoice nutzt.', noProviders: 'Es ist kein Anbieter für Spracherkennung installiert. Installiere ein Plugin wie @dsh-ai-providers/openai.', statusAvailable: 'Verfügbar: Andere Plugins können jetzt die API-Transkription nutzen.', testOk: 'Funktioniert: {model}, {milliseconds} ms.' },
  ru: { ...embedding.ru, nav: 'Распознавание речи через API', tab: 'Распознавание речи', title: 'Распознавание речи через API', description: 'Расшифровывает готовые записи через тот же интерфейс провайдера, что и голосовой ввод DSH. Провайдер также может поддерживать распознавание в реальном времени. Этот API-сервис можно отключить, пока голосовой ввод DSH использует SenseVoice.', noProviders: 'Не установлен провайдер распознавания речи. Установите плагин, например @dsh-ai-providers/openai.', statusAvailable: 'Доступен: другие плагины могут использовать распознавание через API.', testOk: 'Работает: {model}, {milliseconds} мс.' },
  pt: { ...embedding.pt, nav: 'Voz para texto por API', tab: 'Transcrição', title: 'Voz para texto por API', description: 'Transcreve gravações concluídas com a mesma interface de provedores da Entrada de Voz do DSH. O provedor também pode oferecer transcrição em tempo real. Este serviço de API pode ficar desativado enquanto a Entrada de Voz usa o SenseVoice.', noProviders: 'Nenhum provedor de voz para texto está instalado. Instale um plugin como @dsh-ai-providers/openai.', statusAvailable: 'Disponível: outros plugins já podem usar a transcrição por API.', testOk: 'Funcionando: {model}, {milliseconds} ms.' },
}

const image: Dictionaries<CapabilityLocaleKey> = {
  en: { ...embedding.en, nav: 'Image generation', tab: 'Images', title: 'Image generation', description: 'Creates bitmap images from text prompts. Choose which provider supplies it and configure its model and output defaults.', noProviders: 'No image generation provider is installed. Install a provider plugin such as @dsh-ai-providers/openai.', statusAvailable: 'Available: other plugins can generate images now.', testOk: 'Works: {model}, {milliseconds} ms.' },
  zh: { ...embedding.zh, nav: '图像生成', tab: '图像', title: '图像生成', description: '根据文本提示创建位图图像。选择由哪个提供方提供，并配置其模型和输出默认值。', noProviders: '尚未安装任何图像生成提供方。请安装如 @dsh-ai-providers/openai 之类的提供方插件。', statusAvailable: '可用：其他插件现在可以生成图像。', testOk: '可用：{model}，{milliseconds} 毫秒。' },
  ja: { ...embedding.ja, nav: '画像生成', tab: '画像', title: '画像生成', description: 'テキストのプロンプトからビットマップ画像を作成します。使用するプロバイダーを選び、モデルと出力の既定値を設定してください。', noProviders: '画像生成プロバイダーがインストールされていません。@dsh-ai-providers/openai などをインストールしてください。', statusAvailable: '利用可能: 他のプラグインから画像を生成できます。', testOk: '利用可能: {model}、{milliseconds} ms。' },
  es: { ...embedding.es, nav: 'Generación de imágenes', tab: 'Imágenes', title: 'Generación de imágenes', description: 'Crea imágenes de mapa de bits a partir de prompts de texto. Elige el proveedor y configura el modelo y los valores de salida.', noProviders: 'No hay ningún proveedor de generación de imágenes instalado. Instala un complemento como @dsh-ai-providers/openai.', statusAvailable: 'Disponible: otros complementos ya pueden generar imágenes.', testOk: 'Funciona: {model}, {milliseconds} ms.' },
  fr: { ...embedding.fr, nav: 'Génération d’images', tab: 'Images', title: 'Génération d’images', description: 'Crée des images matricielles à partir de prompts textuels. Choisissez le fournisseur, puis configurez le modèle et les valeurs de sortie par défaut.', noProviders: 'Aucun fournisseur de génération d’images n’est installé. Installez un module tel que @dsh-ai-providers/openai.', statusAvailable: 'Disponible : les autres modules peuvent maintenant générer des images.', testOk: 'Fonctionne : {model}, {milliseconds} ms.' },
  de: { ...embedding.de, nav: 'Bilderzeugung', tab: 'Bilder', title: 'Bilderzeugung', description: 'Erzeugt Rasterbilder aus Textprompts. Wähle einen Anbieter aus und richte Modell und Ausgabevorgaben ein.', noProviders: 'Es ist kein Anbieter für Bilderzeugung installiert. Installiere ein Plugin wie @dsh-ai-providers/openai.', statusAvailable: 'Verfügbar: Andere Plugins können jetzt Bilder erzeugen.', testOk: 'Funktioniert: {model}, {milliseconds} ms.' },
  ru: { ...embedding.ru, nav: 'Генерация изображений', tab: 'Изображения', title: 'Генерация изображений', description: 'Создаёт растровые изображения по текстовым промптам. Выберите провайдера и настройте модель и параметры вывода по умолчанию.', noProviders: 'Не установлен провайдер генерации изображений. Установите плагин, например @dsh-ai-providers/openai.', statusAvailable: 'Доступен: другие плагины могут создавать изображения.', testOk: 'Работает: {model}, {milliseconds} мс.' },
  pt: { ...embedding.pt, nav: 'Geração de imagens', tab: 'Imagens', title: 'Geração de imagens', description: 'Cria imagens bitmap a partir de prompts de texto. Escolha o provedor e configure o modelo e os padrões de saída.', noProviders: 'Nenhum provedor de geração de imagens está instalado. Instale um plugin como @dsh-ai-providers/openai.', statusAvailable: 'Disponível: outros plugins já podem gerar imagens.', testOk: 'Funcionando: {model}, {milliseconds} ms.' },
}

const decision: Dictionaries<CapabilityLocaleKey> = {
  en: { ...embedding.en, nav: 'Decisions', tab: 'Decisions', title: 'Decisions', description: 'Answers typed questions about a text (does a statement hold, which option fits, where it falls on a scale) with a model that scores the options in one pass instead of writing text. The answers are probabilities, so a plugin can act on a confident one and leave an unsure one to a slower model. Choose which provider supplies it and configure that provider.', noProviders: 'No decision provider is installed. Install a provider plugin such as @dsh-ai-providers/typesafe or @dsh-ai-providers/localai.', statusAvailable: 'Available: other plugins can ask decisions now.', testOk: 'Works: {model}, {milliseconds} ms.' },
  zh: { ...embedding.zh, nav: '决策', tab: '决策', title: '决策', description: '针对一段文本回答带类型的问题（某个陈述是否成立、哪个选项最合适、在量表上处于什么位置），由一个一次性为各选项打分、而不是逐字生成文本的模型完成。答案是概率，因此插件可以采纳把握大的答案，把没把握的交给更慢的模型。选择由哪个提供方提供该服务并完成配置。', noProviders: '尚未安装任何决策提供方。请安装如 @dsh-ai-providers/typesafe 或 @dsh-ai-providers/localai 之类的提供方插件。', statusAvailable: '可用：其他插件现在可以请求决策。', testOk: '可用：{model}，{milliseconds} 毫秒。' },
  ja: { ...embedding.ja, nav: '判定', tab: '判定', title: '判定', description: 'テキストについて型付きの質問 (文が成り立つか、どの選択肢が合うか、尺度のどこに位置するか) に答えます。文章を生成する代わりに、モデルが 1 回の処理で各選択肢を採点します。答えは確率なので、プラグインは確信度の高い答えを採用し、曖昧なものだけを遅いモデルに渡せます。使用するプロバイダーを選んで設定してください。', noProviders: '判定プロバイダーがインストールされていません。@dsh-ai-providers/typesafe や @dsh-ai-providers/localai などをインストールしてください。', statusAvailable: '利用可能: 他のプラグインから判定を依頼できます。', testOk: '利用可能: {model}、{milliseconds} ms。' },
  es: { ...embedding.es, nav: 'Decisiones', tab: 'Decisiones', title: 'Decisiones', description: 'Responde preguntas tipadas sobre un texto: si se cumple una afirmación, qué opción encaja o dónde cae en una escala. En lugar de redactar texto, el modelo puntúa las opciones en una sola pasada. Como las respuestas son probabilidades, un complemento puede actuar cuando hay suficiente confianza y dejar los casos dudosos a un modelo más lento. Elige y configura el proveedor.', noProviders: 'No hay ningún proveedor de decisiones instalado. Instala un complemento como @dsh-ai-providers/typesafe o @dsh-ai-providers/localai.', statusAvailable: 'Disponible: otros complementos ya pueden solicitar decisiones.', testOk: 'Funciona: {model}, {milliseconds} ms.' },
  fr: { ...embedding.fr, nav: 'Décisions', tab: 'Décisions', title: 'Décisions', description: 'Répond à des questions typées sur un texte : une affirmation est-elle vraie, quelle option convient, ou quelle position occupe-t-elle sur une échelle ? Au lieu de rédiger du texte, le modèle note les options en un seul passage. Les réponses étant des probabilités, un module peut agir sur une réponse sûre et confier les cas incertains à un modèle plus lent. Choisissez et configurez le fournisseur.', noProviders: 'Aucun fournisseur de décisions n’est installé. Installez un module tel que @dsh-ai-providers/typesafe ou @dsh-ai-providers/localai.', statusAvailable: 'Disponible : les autres modules peuvent maintenant demander des décisions.', testOk: 'Fonctionne : {model}, {milliseconds} ms.' },
  de: { ...embedding.de, nav: 'Entscheidungen', tab: 'Entscheidungen', title: 'Entscheidungen', description: 'Beantwortet typisierte Fragen zu einem Text: Trifft eine Aussage zu, welche Option passt oder wo liegt sie auf einer Skala? Statt Text zu schreiben, bewertet das Modell alle Optionen in einem Durchlauf. Die Antworten sind Wahrscheinlichkeiten. Ein Plugin kann daher sichere Antworten direkt verwenden und unsichere Fälle einem langsameren Modell überlassen. Wähle den Anbieter aus und richte ihn ein.', noProviders: 'Es ist kein Anbieter für Entscheidungen installiert. Installiere ein Plugin wie @dsh-ai-providers/typesafe oder @dsh-ai-providers/localai.', statusAvailable: 'Verfügbar: Andere Plugins können jetzt Entscheidungen anfragen.', testOk: 'Funktioniert: {model}, {milliseconds} ms.' },
  ru: { ...embedding.ru, nav: 'Решения', tab: 'Решения', title: 'Решения', description: 'Отвечает на типизированные вопросы о тексте: верно ли утверждение, какой вариант подходит или где ответ находится на шкале. Вместо генерации текста модель за один проход оценивает все варианты. Ответы представлены вероятностями, поэтому плагин может принять уверенный ответ, а сомнительный передать более медленной модели. Выберите и настройте провайдера.', noProviders: 'Не установлен провайдер решений. Установите плагин, например @dsh-ai-providers/typesafe или @dsh-ai-providers/localai.', statusAvailable: 'Доступен: другие плагины могут запрашивать решения.', testOk: 'Работает: {model}, {milliseconds} мс.' },
  pt: { ...embedding.pt, nav: 'Decisões', tab: 'Decisões', title: 'Decisões', description: 'Responde perguntas tipadas sobre um texto: se uma afirmação vale, qual opção se encaixa ou onde ela cai em uma escala. Em vez de escrever texto, o modelo pontua as opções em uma única passagem. Como as respostas são probabilidades, um plugin pode agir quando há confiança e enviar casos incertos para um modelo mais lento. Escolha e configure o provedor.', noProviders: 'Nenhum provedor de decisões está instalado. Instale um plugin como @dsh-ai-providers/typesafe ou @dsh-ai-providers/localai.', statusAvailable: 'Disponível: outros plugins já podem solicitar decisões.', testOk: 'Funcionando: {model}, {milliseconds} ms.' },
}

/** The copy of each capability's tab. */
export const dictionariesOf = { embedding, rerank, tts, stt, image, decision } as const satisfies Record<Capability, Dictionaries<CapabilityLocaleKey>>

export const formLabels = (t: (key: CapabilityLocaleKey) => string): SettingsFormLabels => ({
  unavailable: t('unavailable'),
  readOnly: t('readOnly'),
  saveFailed: t('saveFailed'),
  save: t('save'),
  saving: t('saving'),
})
