/**
 * The words of the counting lines of a camera (Configuration > Cameras), one row per phrase: en, es, de, fr, it, ja, zh. Portuguese is in ptCatalogue.ts like every other phrase.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Locale } from "./i18n";

type Row = readonly [string, string, string, string, string, string, string];
const order: readonly Locale[] = ["en", "es", "de", "fr", "it", "ja", "zh"];

const rows: Record<string, Row> = {
  lc_title: ["Counting lines", "Líneas de conteo", "Zähllinien", "Lignes de comptage", "Linee di conteggio", "カウントライン", "计数线"],
  lc_help: ["Draw a line across the places where you want to count who goes by (a gate, a door, a path). The observation service counts every crossing, in both directions, for the objects it follows. The video, the photos and the recordings stay whole.", "Dibuja una línea por los sitios donde quieras contar quién pasa (una puerta, un portón, un camino). El servicio de observación cuenta cada cruce, en los dos sentidos, de los objetos que sigue. El vídeo, las fotos y las grabaciones se quedan enteros.", "Zeichnen Sie eine Linie über die Stellen, an denen Sie zählen möchten, wer vorbeigeht (ein Tor, eine Tür, ein Weg). Der Beobachtungsdienst zählt jede Überquerung in beide Richtungen für die Objekte, die er verfolgt. Video, Fotos und Aufnahmen bleiben unverändert.", "Tracez une ligne à travers les endroits où vous voulez compter qui passe (un portail, une porte, un chemin). Le service d'observation compte chaque franchissement, dans les deux sens, des objets qu'il suit. La vidéo, les photos et les enregistrements restent entiers.", "Disegna una linea attraverso i punti in cui vuoi contare chi passa (un cancello, una porta, un sentiero). Il servizio di osservazione conta ogni attraversamento, nei due sensi, degli oggetti che segue. Il video, le foto e le registrazioni restano intatti.", "通る人を数えたい場所（門、ドア、道）を横切る線を描きます。観測サービスは、追跡している対象が線を横切るたびに、両方向とも数えます。映像、写真、録画はそのままです。", "在想统计经过人数的位置（大门、门口、小路）画一条线。观测服务会统计它所跟踪的对象双向穿过这条线的每一次。视频、照片和录像保持完整。"],
  lc_draw: ["Drag on the picture to draw a line.", "Arrastra sobre la imagen para dibujar una línea.", "Ziehen Sie auf dem Bild, um eine Linie zu zeichnen.", "Faites glisser sur l'image pour tracer une ligne.", "Trascina sull'immagine per disegnare una linea.", "画像上をドラッグして線を描きます。", "在画面上拖动即可画一条线。"],
  lc_none: ["No line is counted in this camera.", "En esta cámara no se cuenta ninguna línea.", "In dieser Kamera wird keine Linie gezählt.", "Aucune ligne n'est comptée dans cette caméra.", "In questa telecamera non si conta nessuna linea.", "このカメラではカウントするラインはありません。", "此摄像头没有计数线。"],
  lc_line: ["Line", "Línea", "Linie", "Ligne", "Linea", "ライン", "线"],
  lc_remove: ["Remove", "Quitar", "Entfernen", "Retirer", "Rimuovi", "削除", "移除"],
  lc_clear: ["Remove all", "Quitar todas", "Alle entfernen", "Tout retirer", "Rimuovi tutte", "すべて削除", "全部移除"],
  lc_save: ["Save the lines", "Guardar las líneas", "Linien speichern", "Enregistrer les lignes", "Salva le linee", "ラインを保存", "保存计数线"],
  lc_saved: ["Saved: the observation service uses them from now on.", "Guardado: el servicio de observación las usa desde ahora.", "Gespeichert: Der Beobachtungsdienst verwendet sie ab jetzt.", "Enregistré : le service d'observation les utilise dès maintenant.", "Salvato: il servizio di osservazione le usa da ora.", "保存しました。観測サービスは今後これを使います。", "已保存：观测服务从现在起使用它们。"],
  lc_error: ["Could not save the lines.", "No se pudieron guardar las líneas.", "Die Linien konnten nicht gespeichert werden.", "Impossible d'enregistrer les lignes.", "Impossibile salvare le linee.", "ラインを保存できませんでした。", "无法保存计数线。"],
  lc_counts_title: ["Crossings counted so far", "Cruces contados hasta ahora", "Bisher gezählte Überquerungen", "Passages comptés jusqu'ici", "Attraversamenti contati finora", "これまでに数えた通過", "目前统计的穿越次数"],
  lc_counts_reading: ["Counted since the observation service started, in each direction of the line.", "Contados desde que arrancó el servicio de observación, en cada sentido de la línea.", "Gezählt seit dem Start des Beobachtungsdienstes, in jede Richtung der Linie.", "Comptés depuis le démarrage du service d'observation, dans chaque sens de la ligne.", "Contati dall'avvio del servizio di osservazione, in ogni verso della linea.", "観測サービスの起動以降、ラインの各方向ごとに数えた数です。", "自观察服务启动以来，按线的每个方向统计。"],
  lc_counts_left: ["to the left", "hacia la izquierda", "nach links", "vers la gauche", "verso sinistra", "左へ", "向左"],
  lc_counts_right: ["to the right", "hacia la derecha", "nach rechts", "vers la droite", "verso destra", "右へ", "向右"],
  lc_counts_refresh: ["Refresh the counts", "Actualizar los conteos", "Zählungen aktualisieren", "Actualiser les comptages", "Aggiorna i conteggi", "カウントを更新", "刷新计数"],
  lc_counts_none: ["Nothing has been counted for this camera yet.", "Todavía no se ha contado nada en esta cámara.", "Für diese Kamera wurde noch nichts gezählt.", "Rien n'a encore été compté pour cette caméra.", "Per questa telecamera non è stato ancora contato nulla.", "このカメラではまだ何も数えていません。", "此摄像头尚未统计任何内容。"],
  lc_counts_err_heatmap_disabled: ["The counts are off: turn on the activity report in Configuration > Security.", "Los conteos están desactivados: activa el informe de actividad en Configuración > Seguridad.", "Die Zählungen sind ausgeschaltet: Schalten Sie den Aktivitätsbericht unter Konfiguration > Sicherheit ein.", "Les comptages sont désactivés : activez le rapport d'activité dans Configuration > Sécurité.", "I conteggi sono disattivati: attiva il rapporto di attività in Configurazione > Sicurezza.", "カウントはオフです。設定 > セキュリティでアクティビティレポートをオンにしてください。", "计数已关闭：请在“配置 > 安全”中开启活动报告。"],
  lc_counts_err_counts_pipeline_off: ["The activity analysis of the observation service is off.", "El análisis de actividad del servicio de observación está desactivado.", "Die Aktivitätsanalyse des Beobachtungsdienstes ist ausgeschaltet.", "L'analyse d'activité du service d'observation est désactivée.", "L'analisi dell'attività del servizio di osservazione è disattivata.", "観測サービスのアクティビティ分析がオフです。", "观察服务的活动分析已关闭。"],
  lc_counts_err_counts_not_configured: ["The observation service is not set up on this server.", "El servicio de observación no está configurado en este servidor.", "Der Beobachtungsdienst ist auf diesem Server nicht eingerichtet.", "Le service d'observation n'est pas configuré sur ce serveur.", "Il servizio di osservazione non è configurato su questo server.", "このサーバーでは観測サービスが設定されていません。", "此服务器未设置观察服务。"],
  lc_counts_err_generic: ["The counts could not be read.", "No se pudieron leer los conteos.", "Die Zählungen konnten nicht gelesen werden.", "Les comptages n'ont pas pu être lus.", "Non è stato possibile leggere i conteggi.", "カウントを読み取れませんでした。", "无法读取计数。"],
};

export const countLinesCatalogue = (locale: Locale): Record<string, string> => {
  const index = order.indexOf(locale);
  if (index < 0) return {};
  return Object.fromEntries(Object.entries(rows).map(([key, row]) => [key, row[index]]));
};

/** The phrases in this file, for the Portuguese table to be checked against. */
export const countLinesKeys: readonly string[] = Object.keys(rows);
