import type { Dictionaries } from '../i18n.ts'

export type ConcurrencyLocaleKey =
  | 'nav' | 'title' | 'description' | 'none' | 'name' | 'max' | 'reserve' | 'reserveHelp' | 'remove' | 'routes' | 'noRoutes' | 'capabilities' | 'add' | 'live' | 'notSaved' | 'maxWait' | 'maxWaitHelp' | 'overridden' | 'reset' | 'invalidNumber'
  | 'unavailable' | 'readOnly' | 'saveFailed' | 'save' | 'saving'
  | 'capability.embedding' | 'capability.rerank' | 'capability.tts' | 'capability.stt' | 'capability.image' | 'capability.decision'

export const dictionaries: Dictionaries<ConcurrencyLocaleKey> = {
  en: {
    nav: 'Concurrency',
    title: 'Concurrency',
    description: 'Set how many calls a shared resource can handle at once. Each limit lists the model routes and services that share a resource, such as one GPU or local server. Extra calls wait in a queue, with user-facing work ahead of background jobs such as building a memory index. Calls outside every limit start immediately.',
    none: 'No limits: every call starts at once.',
    name: 'Name', max: 'Maximum at once', reserve: 'Reserved for users', reserveHelp: 'Slots that background work cannot use.', remove: 'Remove', routes: 'Language model routes', noRoutes: 'No language model routes are available yet.', capabilities: 'Services', add: 'Add a limit',
    live: 'Running {active} of {max}; waiting: {foreground} user-facing, {background} background; longest wait: {wait} s.',
    notSaved: 'Save to start counting.',
    maxWait: 'Longest wait (seconds)', maxWaitHelp: 'A call that waits longer fails with an error that says so. 0 means no limit.',
    overridden: 'Overridden', reset: 'Reset', invalidNumber: 'Enter a whole number of seconds.', unavailable: 'Not available', readOnly: 'Read only', saveFailed: 'Saving failed', save: 'Save', saving: 'Saving…',
    'capability.embedding': 'Embedding', 'capability.rerank': 'Reranking', 'capability.tts': 'Speech', 'capability.stt': 'Transcription', 'capability.image': 'Images', 'capability.decision': 'Decisions',
  },
  zh: {
    nav: '并发',
    title: '并发',
    description: '设置共享资源可同时处理的调用数。每条限制列出共用该资源的模型路由和服务，例如同一块 GPU 或同一台本地服务器。超出的调用进入队列；用户正在等待的任务优先于构建记忆索引等后台任务。不属于任何限制的调用会立即开始。',
    none: '没有限制：每个调用立即开始。',
    name: '名称', max: '最大并发数', reserve: '为用户保留', reserveHelp: '后台任务不能占用的名额。', remove: '删除', routes: '语言模型路由', noRoutes: '尚无可用的语言模型路由。', capabilities: '服务', add: '添加限制',
    live: '正在运行 {active}/{max}；等待中：用户任务 {foreground} 个，后台任务 {background} 个；最长已等待 {wait} 秒。',
    notSaved: '保存后开始统计。',
    maxWait: '最长等待（秒）', maxWaitHelp: '等待更久的调用会失败，并说明原因。0 表示不限制。',
    overridden: '已覆盖', reset: '重置', invalidNumber: '请输入整数秒数。', unavailable: '不可用', readOnly: '只读', saveFailed: '保存失败', save: '保存', saving: '正在保存…',
    'capability.embedding': '向量嵌入', 'capability.rerank': '重排序', 'capability.tts': '语音合成', 'capability.stt': '语音转写', 'capability.image': '图像生成', 'capability.decision': '决策',
  },
  ja: {
    nav: '同時実行', title: '同時実行', description: '共有リソースが同時に処理できる呼び出し数を設定します。各上限には、そのリソースを使う言語モデルのルートとサービス (1 枚の GPU や 1 台のローカルサーバーなど) を指定します。上限を超えた呼び出しは待機し、メモリー索引の作成などのバックグラウンド処理より、利用者が待っている処理が優先されます。どの上限にも含まれない呼び出しは待機しません。',
    none: '上限なし: すべての呼び出しをすぐに開始します。', name: '名前', max: '同時実行数', reserve: '利用者用に確保', reserveHelp: 'バックグラウンド処理が使えない枠です。', remove: '削除', routes: '言語モデルのルート', noRoutes: '言語モデルのルートはまだありません。', capabilities: 'サービス', add: '上限を追加',
    live: '実行中 {active}/{max}。待機中: 利用者向け {foreground} 件、バックグラウンド {background} 件。最長待機時間は {wait} 秒です。', notSaved: '保存すると集計が始まります。', maxWait: '最長待機時間 (秒)', maxWaitHelp: 'この時間を超えて待機した呼び出しは、理由を示すエラーで終了します。0 は無制限です。',
    overridden: '変更済み', reset: 'リセット', invalidNumber: '秒数を整数で入力してください。', unavailable: '利用不可', readOnly: '読み取り専用', saveFailed: '保存できませんでした', save: '保存', saving: '保存中…', 'capability.embedding': '埋め込み', 'capability.rerank': '再ランキング', 'capability.tts': '音声合成', 'capability.stt': '文字起こし', 'capability.image': '画像生成', 'capability.decision': '判定',
  },
  es: {
    nav: 'Concurrencia', title: 'Concurrencia', description: 'Controla cuántas llamadas atiende a la vez un recurso compartido. Cada límite indica las rutas de modelos y los servicios que usan ese recurso, como una GPU o un servidor local. Las demás llamadas esperan su turno, y las que espera una persona pasan antes que el trabajo en segundo plano, como crear un índice de memoria. Las llamadas que no figuran en ningún límite nunca se retienen.',
    none: 'Sin límites: todas las llamadas empiezan de inmediato.', name: 'Nombre', max: 'Máximo simultáneo', reserve: 'Reservado para personas', reserveHelp: 'Plazas que no puede ocupar el trabajo en segundo plano.', remove: 'Eliminar', routes: 'Rutas de modelos de lenguaje', noRoutes: 'Todavía no hay rutas de modelos de lenguaje.', capabilities: 'Servicios', add: 'Añadir un límite',
    live: 'En curso: {active} de {max}; en espera: {foreground} para una persona y {background} en segundo plano; la espera más larga es de {wait} s.', notSaved: 'Guarda para empezar a contar.', maxWait: 'Espera máxima (segundos)', maxWaitHelp: 'Una llamada que supere este tiempo termina con un error que explica el motivo. 0 significa sin límite.',
    overridden: 'Modificado', reset: 'Restablecer', invalidNumber: 'Introduce un número entero de segundos.', unavailable: 'No disponible', readOnly: 'Solo lectura', saveFailed: 'No se pudo guardar', save: 'Guardar', saving: 'Guardando…', 'capability.embedding': 'Embeddings', 'capability.rerank': 'Reordenación', 'capability.tts': 'Voz', 'capability.stt': 'Transcripción', 'capability.image': 'Imágenes', 'capability.decision': 'Decisiones',
  },
  fr: {
    nav: 'Accès simultanés', title: 'Accès simultanés', description: 'Détermine le nombre d’appels qu’une ressource partagée peut traiter en même temps. Chaque limite indique les routes de modèles et les services qui utilisent cette ressource, par exemple un GPU ou un serveur local. Les appels excédentaires attendent leur tour, et ceux qu’une personne attend passent avant les tâches de fond comme la création d’un index mémoire. Un appel absent de toutes les limites n’est jamais retenu.',
    none: 'Aucune limite : tous les appels démarrent immédiatement.', name: 'Nom', max: 'Maximum simultané', reserve: 'Réservé aux personnes', reserveHelp: 'Places que les tâches de fond ne peuvent pas occuper.', remove: 'Supprimer', routes: 'Routes des modèles de langage', noRoutes: 'Aucune route de modèle de langage n’est encore disponible.', capabilities: 'Services', add: 'Ajouter une limite',
    live: '{active} appel(s) actif(s) sur {max} ; en attente : {foreground} pour une personne et {background} en arrière-plan ; attente la plus longue : {wait} s.', notSaved: 'Enregistrez pour commencer le comptage.', maxWait: 'Attente maximale (secondes)', maxWaitHelp: 'Un appel qui attend plus longtemps échoue avec un message explicatif. 0 désactive la limite.',
    overridden: 'Modifié', reset: 'Réinitialiser', invalidNumber: 'Indiquez un nombre entier de secondes.', unavailable: 'Indisponible', readOnly: 'Lecture seule', saveFailed: 'Échec de l’enregistrement', save: 'Enregistrer', saving: 'Enregistrement…', 'capability.embedding': 'Plongements', 'capability.rerank': 'Reclassement', 'capability.tts': 'Synthèse vocale', 'capability.stt': 'Transcription', 'capability.image': 'Images', 'capability.decision': 'Décisions',
  },
  de: {
    nav: 'Parallelität', title: 'Parallelität', description: 'Legt fest, wie viele Aufrufe eine gemeinsam genutzte Ressource gleichzeitig bearbeitet. Jede Begrenzung nennt die Modellrouten und Dienste, die diese Ressource nutzen, etwa eine GPU oder einen lokalen Server. Weitere Aufrufe warten; dabei werden Aufrufe, auf die eine Person wartet, vor Hintergrundarbeit wie dem Aufbau eines Speicherindex ausgeführt. Aufrufe ohne passende Begrenzung werden nie aufgehalten.',
    none: 'Keine Begrenzungen: Alle Aufrufe starten sofort.', name: 'Name', max: 'Höchstens gleichzeitig', reserve: 'Für Personen reserviert', reserveHelp: 'Plätze, die Hintergrundarbeit nicht belegen darf.', remove: 'Entfernen', routes: 'Sprachmodellrouten', noRoutes: 'Es werden noch keine Sprachmodellrouten angeboten.', capabilities: 'Dienste', add: 'Begrenzung hinzufügen',
    live: '{active} von {max} aktiv; wartend: {foreground} für eine Person, {background} im Hintergrund; längste Wartezeit: {wait} s.', notSaved: 'Speichere, um die Zählung zu starten.', maxWait: 'Längste Wartezeit (Sekunden)', maxWaitHelp: 'Ein länger wartender Aufruf schlägt mit einer erklärenden Fehlermeldung fehl. 0 bedeutet unbegrenzt.',
    overridden: 'Überschrieben', reset: 'Zurücksetzen', invalidNumber: 'Gib eine ganze Zahl von Sekunden ein.', unavailable: 'Nicht verfügbar', readOnly: 'Schreibgeschützt', saveFailed: 'Speichern fehlgeschlagen', save: 'Speichern', saving: 'Wird gespeichert…', 'capability.embedding': 'Einbettung', 'capability.rerank': 'Neusortierung', 'capability.tts': 'Sprachausgabe', 'capability.stt': 'Transkription', 'capability.image': 'Bilder', 'capability.decision': 'Entscheidungen',
  },
  ru: {
    nav: 'Параллельные вызовы', title: 'Параллельные вызовы', description: 'Задаёт число вызовов, которые общий ресурс может обрабатывать одновременно. Для каждого ограничения указываются маршруты моделей и сервисы, использующие этот ресурс, например одну видеокарту или локальный сервер. Остальные вызовы ждут очереди; вызовы, которых ждёт пользователь, выполняются раньше фоновой работы вроде заполнения индекса памяти. Вызовы, не попавшие ни под одно ограничение, не задерживаются.',
    none: 'Без ограничений: все вызовы запускаются сразу.', name: 'Название', max: 'Одновременно не более', reserve: 'Зарезервировано для пользователей', reserveHelp: 'Места, недоступные фоновой работе.', remove: 'Удалить', routes: 'Маршруты языковых моделей', noRoutes: 'Маршрутов языковых моделей пока нет.', capabilities: 'Сервисы', add: 'Добавить ограничение',
    live: 'Выполняется {active} из {max}; ожидают: {foreground} пользовательских, {background} фоновых; самое долгое ожидание — {wait} с.', notSaved: 'Сохраните настройки, чтобы начать учёт.', maxWait: 'Максимальное ожидание (секунды)', maxWaitHelp: 'Если вызов ждёт дольше, он завершается с поясняющей ошибкой. 0 означает отсутствие ограничения.',
    overridden: 'Изменено', reset: 'Сбросить', invalidNumber: 'Укажите целое число секунд.', unavailable: 'Недоступно', readOnly: 'Только чтение', saveFailed: 'Не удалось сохранить', save: 'Сохранить', saving: 'Сохранение…', 'capability.embedding': 'Векторизация', 'capability.rerank': 'Переранжирование', 'capability.tts': 'Синтез речи', 'capability.stt': 'Распознавание речи', 'capability.image': 'Изображения', 'capability.decision': 'Решения',
  },
  pt: {
    nav: 'Concorrência', title: 'Concorrência', description: 'Define quantas chamadas um recurso compartilhado atende ao mesmo tempo. Cada limite indica as rotas de modelos e os serviços que usam esse recurso, como uma GPU ou um servidor local. As chamadas excedentes aguardam a vez, e as que uma pessoa está esperando passam antes de tarefas em segundo plano, como criar um índice de memória. Chamadas que não aparecem em nenhum limite nunca ficam retidas.',
    none: 'Sem limites: todas as chamadas começam imediatamente.', name: 'Nome', max: 'Máximo simultâneo', reserve: 'Reservado para pessoas', reserveHelp: 'Vagas que tarefas em segundo plano não podem ocupar.', remove: 'Remover', routes: 'Rotas de modelos de linguagem', noRoutes: 'Ainda não há rotas de modelos de linguagem disponíveis.', capabilities: 'Serviços', add: 'Adicionar limite',
    live: 'Em execução: {active} de {max}; aguardando: {foreground} para uma pessoa e {background} em segundo plano; maior espera: {wait} s.', notSaved: 'Salve para começar a contagem.', maxWait: 'Espera máxima (segundos)', maxWaitHelp: 'Uma chamada que esperar além desse tempo falhará com uma mensagem explicando o motivo. 0 significa sem limite.',
    overridden: 'Substituído', reset: 'Redefinir', invalidNumber: 'Informe um número inteiro de segundos.', unavailable: 'Indisponível', readOnly: 'Somente leitura', saveFailed: 'Falha ao salvar', save: 'Salvar', saving: 'Salvando…', 'capability.embedding': 'Embeddings', 'capability.rerank': 'Reordenação', 'capability.tts': 'Voz', 'capability.stt': 'Transcrição', 'capability.image': 'Imagens', 'capability.decision': 'Decisões',
  },
}
