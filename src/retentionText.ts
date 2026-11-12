/**
 * The words of the retention of photos and recordings by kind (Configuration > Security). One row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese;
 * Portuguese (of Portugal) follows in PT.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  sec_ret_title: ["How long photos and recordings are kept", "Cuánto tiempo se guardan fotos y grabaciones", "Wie lange Fotos und Aufnahmen aufbewahrt werden", "Combien de temps photos et enregistrements sont conservés", "Per quanto tempo si conservano foto e registrazioni", "写真と録画の保存期間", "照片和录像的保存时间"],
  sec_ret_help: ["Each kind has its own number of days (0 to 3650). 0 means the general limit of the server applies. Evidence marked to keep is never deleted. A shorter time takes effect at the next cleaning.", "Cada tipo tiene su propio número de días (0 a 3650). 0 significa que se aplica el límite general del servidor. La prueba marcada para conservar nunca se borra. Un plazo más corto se aplica en la próxima limpieza.", "Jede Art hat ihre eigene Anzahl Tage (0 bis 3650). 0 bedeutet, dass die allgemeine Grenze des Servers gilt. Als Beweis markierte Dateien werden nie gelöscht. Eine kürzere Zeit gilt ab der nächsten Bereinigung.", "Chaque type a son propre nombre de jours (0 à 3650). 0 signifie que la limite générale du serveur s'applique. Une preuve marquée à conserver n'est jamais supprimée. Un délai plus court s'applique au prochain nettoyage.", "Ogni tipo ha il proprio numero di giorni (da 0 a 3650). 0 significa che vale il limite generale del server. Una prova marcata da conservare non viene mai eliminata. Un tempo più breve vale dalla prossima pulizia.", "種類ごとに日数（0〜3650）を設定します。0 はサーバーの一般的な上限が適用されることを意味します。保持指定した証拠は削除されません。短くした期間は次回の整理から有効になります。", "每种类型有各自的天数（0 到 3650）。0 表示使用服务器的通用限制。标记为保留的证据永远不会被删除。缩短时间将在下次清理时生效。"],
  sec_ret_snapshot: ["Photos (days)", "Fotos (días)", "Fotos (Tage)", "Photos (jours)", "Foto (giorni)", "写真（日数）", "照片（天）"],
  sec_ret_recording: ["Recordings (days)", "Grabaciones (días)", "Aufnahmen (Tage)", "Enregistrements (jours)", "Registrazioni (giorni)", "録画（日数）", "录像（天）"],
};

const PT: Record<string, string> = {
  sec_ret_title: "Durante quanto tempo se guardam fotos e gravações",
  sec_ret_help: "Cada tipo tem o seu número de dias (0 a 3650). 0 significa que se aplica o limite geral do servidor. A prova marcada para guardar nunca é apagada. Um prazo mais curto aplica-se na próxima limpeza.",
  sec_ret_snapshot: "Fotos (dias)",
  sec_ret_recording: "Gravações (dias)",
};

export const retentionCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
