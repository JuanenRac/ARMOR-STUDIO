/**
 * Interface text of the review timeline of the vision service (History > Review) and of its two security options (Configuration > Security).
 * One row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese; Portuguese (of Portugal) follows in PT.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  tl_tab: ["Review", "Revisión", "Überprüfung", "Revue", "Revisione", "確認", "回看"],
  tl_title: ["Review timeline of the vision service", "Línea de tiempo de revisión del servicio de visión", "Überprüfungs-Zeitleiste des Bilddienstes", "Chronologie de revue du service de vision", "Cronologia di revisione del servizio di visione", "映像サービスの確認タイムライン", "视觉服务回看时间线"],
  tl_help: ["What the vision service saw in the alert zones and the detection zones, newest first, with the alarm it raised and the photo and recording taken. It is kept only while the option is on in Configuration > Security.", "Lo que el servicio de visión vio en las zonas de alerta y de detección, lo más reciente primero, con la alarma que levantó y la foto y la grabación tomadas. Solo se guarda mientras la opción esté activada en Configuración > Seguridad.", "Was der Bilddienst in den Alarmzonen und Erkennungszonen gesehen hat, das Neueste zuerst, mit dem ausgelösten Alarm sowie Foto und Aufnahme. Es wird nur gespeichert, solange die Option unter Konfiguration > Sicherheit eingeschaltet ist.", "Ce que le service de vision a vu dans les zones d'alerte et de détection, le plus récent d'abord, avec l'alarme déclenchée et la photo et l'enregistrement pris. Gardé seulement tant que l'option est activée dans Configuration > Sécurité.", "Ciò che il servizio di visione ha visto nelle zone di allerta e di rilevamento, dal più recente, con l'allarme generato e la foto e la registrazione fatte. Viene conservato solo finché l'opzione è attiva in Configurazione > Sicurezza.", "映像サービスがアラートゾーンと検知ゾーンで見たものを新しい順に表示します。発生させたアラームと、撮影した写真・録画も表示します。「設定 > セキュリティ」でオプションがオンの間だけ保存されます。", "视觉服务在警戒区和检测区看到的内容，最新的在前，并附带其触发的警报以及拍摄的照片和录像。仅在“配置 > 安全”中该选项开启时才会保存。"],
  tl_since: ["Since", "Desde", "Seit", "Depuis", "Da", "開始", "起始时间"],
  tl_level: ["Kind of zone", "Tipo de zona", "Zonenart", "Type de zone", "Tipo di zona", "ゾーンの種類", "区域类型"],
  tl_level_all: ["All", "Todas", "Alle", "Toutes", "Tutte", "すべて", "全部"],
  tl_level_alert: ["Alert zone", "Zona de alerta", "Alarmzone", "Zone d'alerte", "Zona di allerta", "アラートゾーン", "警戒区"],
  tl_level_detection: ["Detection zone", "Zona de detección", "Erkennungszone", "Zone de détection", "Zona di rilevamento", "検知ゾーン", "检测区"],
  tl_camera: ["Camera", "Cámara", "Kamera", "Caméra", "Telecamera", "カメラ", "摄像头"],
  tl_camera_all: ["All cameras", "Todas las cámaras", "Alle Kameras", "Toutes les caméras", "Tutte le telecamere", "すべてのカメラ", "所有摄像头"],
  tl_refresh: ["Refresh", "Actualizar", "Aktualisieren", "Actualiser", "Aggiorna", "更新", "刷新"],
  tl_delete_all: ["Delete all", "Borrar todo", "Alle löschen", "Tout supprimer", "Elimina tutto", "すべて削除", "全部删除"],
  tl_delete_one: ["Delete", "Borrar", "Löschen", "Supprimer", "Elimina", "削除", "删除"],
  tl_delete_one_ask: ["Delete this entry of the timeline? The photo and the recording stay in the evidence library.", "¿Borrar esta entrada de la línea de tiempo? La foto y la grabación siguen en la biblioteca de evidencias.", "Diesen Eintrag der Zeitleiste löschen? Foto und Aufnahme bleiben in der Beweisbibliothek.", "Supprimer cette entrée de la chronologie ? La photo et l'enregistrement restent dans la bibliothèque de preuves.", "Eliminare questa voce della cronologia? La foto e la registrazione restano nella libreria delle prove.", "このタイムラインの項目を削除しますか? 写真と録画は証拠ライブラリに残ります。", "要删除时间线中的这一条吗？照片和录像仍保留在证据库中。"],
  tl_delete_all_ask: ["Delete every entry of the timeline? The photos and recordings stay in the evidence library.", "¿Borrar todas las entradas de la línea de tiempo? Las fotos y grabaciones siguen en la biblioteca de evidencias.", "Alle Einträge der Zeitleiste löschen? Fotos und Aufnahmen bleiben in der Beweisbibliothek.", "Supprimer toutes les entrées de la chronologie ? Les photos et enregistrements restent dans la bibliothèque de preuves.", "Eliminare tutte le voci della cronologia? Le foto e le registrazioni restano nella libreria delle prove.", "タイムラインのすべての項目を削除しますか? 写真と録画は証拠ライブラリに残ります。", "要删除时间线中的所有条目吗？照片和录像仍保留在证据库中。"],
  tl_deleted: ["Deleted: {n}", "Borradas: {n}", "Gelöscht: {n}", "Supprimées : {n}", "Eliminate: {n}", "削除しました: {n}", "已删除：{n}"],
  tl_off: ["The timeline is off, so nothing is kept. An administrator can turn it on in Configuration > Security.", "La línea de tiempo está desactivada, así que no se guarda nada. Un administrador puede activarla en Configuración > Seguridad.", "Die Zeitleiste ist aus, es wird nichts gespeichert. Ein Administrator kann sie unter Konfiguration > Sicherheit einschalten.", "La chronologie est désactivée, rien n'est gardé. Un administrateur peut l'activer dans Configuration > Sécurité.", "La cronologia è disattivata, quindi non viene conservato nulla. Un amministratore può attivarla in Configurazione > Sicurezza.", "タイムラインはオフのため、何も保存されません。管理者は「設定 > セキュリティ」でオンにできます。", "时间线已关闭，因此不会保存任何内容。管理员可在“配置 > 安全”中开启。"],
  tl_empty: ["Nothing yet. Entries are kept for {days} days.", "Todavía nada. Las entradas se guardan {days} días.", "Noch nichts. Einträge werden {days} Tage aufbewahrt.", "Rien pour l'instant. Les entrées sont gardées {days} jours.", "Ancora niente. Le voci vengono conservate per {days} giorni.", "まだ何もありません。項目は {days} 日間保存されます。", "暂无内容。条目保存 {days} 天。"],
  tl_alarm: ["Alarm", "Alarma", "Alarm", "Alarme", "Allarme", "アラーム", "警报"],
  tl_no_alarm: ["No alarm raised", "No levantó alarma", "Kein Alarm ausgelöst", "Aucune alarme déclenchée", "Nessun allarme generato", "アラームなし", "未触发警报"],
  tl_photo: ["Photo", "Foto", "Foto", "Photo", "Foto", "写真", "照片"],
  tl_video: ["Recording", "Grabación", "Aufnahme", "Enregistrement", "Registrazione", "録画", "录像"],
  tl_error: ["The timeline could not be read.", "No se pudo leer la línea de tiempo.", "Die Zeitleiste konnte nicht gelesen werden.", "La chronologie n'a pas pu être lue.", "Non è stato possibile leggere la cronologia.", "タイムラインを読み込めませんでした。", "无法读取时间线。"],
  sec_opt_vtimeline: ["Timeline of the vision service", "Línea de tiempo del servicio de visión", "Zeitleiste des Bilddienstes", "Chronologie du service de vision", "Cronologia del servizio di visione", "映像サービスのタイムライン", "视觉服务时间线"],
  sec_opt_vtimeline_help: ["The server keeps the events of the zones of the vision service, with the evidence taken, so that they can be reviewed in History. Off, nothing is kept.", "El servidor guarda los eventos de las zonas del servicio de visión, con la evidencia tomada, para poder revisarlos en Historial. Desactivada, no se guarda nada.", "Der Server speichert die Ereignisse der Zonen des Bilddienstes mit den aufgenommenen Beweisen, damit sie im Verlauf überprüft werden können. Aus: Es wird nichts gespeichert.", "Le serveur garde les événements des zones du service de vision, avec les preuves prises, pour les revoir dans Historique. Désactivée, rien n'est gardé.", "Il server conserva gli eventi delle zone del servizio di visione, con le prove raccolte, per rivederli in Cronologia. Disattivata, non viene conservato nulla.", "サーバーは映像サービスのゾーンのイベントを、撮影した証拠とともに保存し、履歴で確認できるようにします。オフの間は何も保存されません。", "服务器保存视觉服务各区域的事件及所拍摄的证据，以便在历史记录中回看。关闭时不保存任何内容。"],
  sec_opt_vtimeline_warn: ["Turning it on keeps a record of who and what the cameras saw, with the photo and recording of each event. Keep it only as long as you need it.", "Al activarla se guarda un registro de quién y qué vieron las cámaras, con la foto y la grabación de cada evento. Consérvalo solo el tiempo necesario.", "Beim Einschalten wird festgehalten, wer und was die Kameras gesehen haben, mit Foto und Aufnahme jedes Ereignisses. Bewahren Sie es nur so lange wie nötig auf.", "L'activer conserve une trace de qui et quoi les caméras ont vu, avec la photo et l'enregistrement de chaque événement. Gardez-la seulement le temps nécessaire.", "Attivandola si conserva una traccia di chi e cosa hanno visto le telecamere, con la foto e la registrazione di ogni evento. Conservala solo per il tempo necessario.", "オンにすると、カメラが見た人や物の記録が、各イベントの写真と録画とともに残ります。必要な期間だけ保存してください。", "开启后会记录摄像头看到的人和物，并附上每个事件的照片和录像。请仅在需要的时间内保留。"],
  sec_ret_timeline: ["Timeline of the vision service (days)", "Línea de tiempo del servicio de visión (días)", "Zeitleiste des Bilddienstes (Tage)", "Chronologie du service de vision (jours)", "Cronologia del servizio di visione (giorni)", "映像サービスのタイムライン (日数)", "视觉服务时间线（天）"],
};

const PT: Record<string, string> = {
  tl_tab: "Revisão",
  tl_title: "Linha do tempo de revisão do serviço de visão",
  tl_help: "O que o serviço de visão viu nas zonas de alerta e de deteção, o mais recente primeiro, com o alarme que levantou e a foto e a gravação tiradas. Só é guardado enquanto a opção estiver ligada em Configuração > Segurança.",
  tl_since: "Desde",
  tl_level: "Tipo de zona",
  tl_level_all: "Todas",
  tl_level_alert: "Zona de alerta",
  tl_level_detection: "Zona de deteção",
  tl_camera: "Câmara",
  tl_camera_all: "Todas as câmaras",
  tl_refresh: "Atualizar",
  tl_delete_all: "Apagar tudo",
  tl_delete_one: "Apagar",
  tl_delete_one_ask: "Apagar esta entrada da linha do tempo? A foto e a gravação continuam na biblioteca de provas.",
  tl_delete_all_ask: "Apagar todas as entradas da linha do tempo? As fotos e gravações continuam na biblioteca de provas.",
  tl_deleted: "Apagadas: {n}",
  tl_off: "A linha do tempo está desligada, por isso não se guarda nada. Um administrador pode ligá-la em Configuração > Segurança.",
  tl_empty: "Ainda nada. As entradas guardam-se {days} dias.",
  tl_alarm: "Alarme",
  tl_no_alarm: "Não levantou alarme",
  tl_photo: "Foto",
  tl_video: "Gravação",
  tl_error: "Não foi possível ler a linha do tempo.",
  sec_opt_vtimeline: "Linha do tempo do serviço de visão",
  sec_opt_vtimeline_help: "O servidor guarda os eventos das zonas do serviço de visão, com as provas recolhidas, para poderem ser revistos no Histórico. Desligada, não se guarda nada.",
  sec_opt_vtimeline_warn: "Ao ligá-la, guarda-se um registo de quem e do que as câmaras viram, com a foto e a gravação de cada evento. Conserve-o apenas o tempo necessário.",
  sec_ret_timeline: "Linha do tempo do serviço de visão (dias)",
};

export const timelineCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
