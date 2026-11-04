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
};

export const countLinesCatalogue = (locale: Locale): Record<string, string> => {
  const index = order.indexOf(locale);
  if (index < 0) return {};
  return Object.fromEntries(Object.entries(rows).map(([key, row]) => [key, row[index]]));
};

/** The phrases in this file, for the Portuguese table to be checked against. */
export const countLinesKeys: readonly string[] = Object.keys(rows);
