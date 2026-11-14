/**
 * Interface text of the card that shows who is at home (Configuration > Security), fed by the word home or away that the phones tell the server.
 * One row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese; Portuguese (of Portugal) follows in PT.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  prc_title: ["Who is at home", "Quién está en casa", "Wer zu Hause ist", "Qui est à la maison", "Chi è in casa", "在宅している人", "谁在家"],
  prc_help: [
    "Shows the people whose phone told the server a word of the last day, and the sum that the automations with a presence trigger follow. Only the word home or away reaches the server, never the position of a phone.",
    "Muestra las personas cuyo móvil le dijo al servidor una palabra del último día, y la suma que siguen las automatizaciones con disparador de presencia. Al servidor solo llega la palabra en casa o fuera, nunca la posición de un móvil.",
    "Zeigt die Personen, deren Telefon dem Server innerhalb des letzten Tages ein Wort mitgeteilt hat, und die Summe, der die Automatisierungen mit Anwesenheits-Auslöser folgen. Beim Server kommt nur das Wort zu Hause oder unterwegs an, nie die Position eines Telefons.",
    "Montre les personnes dont le téléphone a dit un mot au serveur au cours du dernier jour, et la somme que suivent les automatisations avec un déclencheur de présence. Seul le mot à la maison ou absent arrive au serveur, jamais la position d'un téléphone.",
    "Mostra le persone il cui telefono ha detto al server una parola nell'ultimo giorno e la somma che seguono le automazioni con trigger di presenza. Al server arriva solo la parola a casa o fuori, mai la posizione di un telefono.",
    "直近1日以内にスマートフォンがサーバーに言葉を伝えた人と、在宅トリガーを持つオートメーションが参照する合計を表示します。サーバーに届くのは「在宅」か「外出」という言葉だけで、スマートフォンの位置は届きません。",
    "显示最近一天内手机向服务器报告过词的人，以及带有在家触发器的自动化所依据的汇总。服务器只会收到“在家”或“外出”这个词，绝不会收到手机的位置。",
  ],
  prc_state_everyone_away: ["Everyone has left", "Todos han salido", "Alle sind weg", "Tout le monde est parti", "Sono usciti tutti", "全員が外出中", "所有人都已外出"],
  prc_state_someone_home: ["Someone is at home", "Hay alguien en casa", "Jemand ist zu Hause", "Quelqu'un est à la maison", "Qualcuno è in casa", "誰かが在宅中", "有人在家"],
  prc_state_unknown: ["Nobody has said where they are", "Nadie ha dicho dónde está", "Niemand hat mitgeteilt, wo er ist", "Personne n'a dit où il est", "Nessuno ha detto dove si trova", "誰も居場所を伝えていません", "没有人报告自己的位置"],
  prc_home: ["At home", "En casa", "Zu Hause", "À la maison", "In casa", "在宅", "在家"],
  prc_away: ["Away", "Fuera", "Unterwegs", "Absent", "Fuori", "外出", "外出"],
  prc_since: ["since", "desde", "seit", "depuis", "dalle", "から", "自"],
  prc_nobody: ["No phone has told the server a word in the last day.", "Ningún móvil ha dicho una palabra al servidor en el último día.", "Kein Telefon hat dem Server im letzten Tag ein Wort mitgeteilt.", "Aucun téléphone n'a dit de mot au serveur au cours du dernier jour.", "Nessun telefono ha detto una parola al server nell'ultimo giorno.", "直近1日以内にサーバーへ言葉を伝えたスマートフォンはありません。", "最近一天内没有手机向服务器报告过词。"],
  prc_refresh: ["Refresh", "Actualizar", "Aktualisieren", "Actualiser", "Aggiorna", "更新", "刷新"],
  prc_err_not_found: [
    "The server does not keep the presence of the people: turn on the option \"Presence by person\" below.",
    "El servidor no guarda la presencia de las personas: activa la opción «Presencia por persona» de abajo.",
    "Der Server speichert die Anwesenheit der Personen nicht: Schalten Sie unten die Option „Anwesenheit pro Person“ ein.",
    "Le serveur ne conserve pas la présence des personnes : activez l'option « Présence par personne » ci-dessous.",
    "Il server non conserva la presenza delle persone: attiva l'opzione «Presenza per persona» qui sotto.",
    "サーバーは人の在宅状況を保持していません。下のオプション「人ごとの在宅状況」をオンにしてください。",
    "服务器不保存人员的在家状态：请打开下方的“按人员的在家状态”选项。",
  ],
  prc_err_generic: ["The presence could not be read.", "No se pudo leer la presencia.", "Die Anwesenheit konnte nicht gelesen werden.", "La présence n'a pas pu être lue.", "Non è stato possibile leggere la presenza.", "在宅状況を読み取れませんでした。", "无法读取在家状态。"],
};

const PT: Record<string, string> = {
  prc_title: "Quem está em casa",
  prc_help: "Mostra as pessoas cujo telemóvel disse ao servidor uma palavra no último dia e a soma que seguem as automatizações com acionador de presença. Ao servidor chega apenas a palavra em casa ou fora, nunca a posição de um telemóvel.",
  prc_state_everyone_away: "Todos saíram",
  prc_state_someone_home: "Há alguém em casa",
  prc_state_unknown: "Ninguém disse onde está",
  prc_home: "Em casa",
  prc_away: "Fora",
  prc_since: "desde",
  prc_nobody: "Nenhum telemóvel disse uma palavra ao servidor no último dia.",
  prc_refresh: "Atualizar",
  prc_err_not_found: "O servidor não guarda a presença das pessoas: ative em baixo a opção «Presença por pessoa».",
  prc_err_generic: "Não foi possível ler a presença.",
};

export const presenceCardCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
