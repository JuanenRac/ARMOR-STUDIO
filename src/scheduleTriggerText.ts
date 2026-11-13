/**
 * Interface text of the schedule trigger of the automations (vacation mode): a time of day with a random shift, on chosen days.
 * One row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese; Portuguese (of Portugal) follows in PT.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  trigger_schedule: ["it is a time of day (vacation mode)", "es una hora del día (modo vacaciones)", "eine Uhrzeit erreicht ist (Urlaubsmodus)", "une heure du jour arrive (mode vacances)", "è un certo orario (modalità vacanza)", "時刻になった(休暇モード)", "到达某个时刻(度假模式)"],
  sched_time: ["Time of day", "Hora del día", "Uhrzeit", "Heure", "Orario", "時刻", "时刻"],
  sched_jitter: ["Random shift, up to (minutes)", "Variación aleatoria, hasta (minutos)", "Zufällige Verschiebung, bis zu (Minuten)", "Décalage aléatoire, jusqu'à (minutes)", "Variazione casuale, fino a (minuti)", "ランダムなずれ(最大・分)", "随机偏移，最多(分钟)"],
  sched_days: ["Days", "Días", "Tage", "Jours", "Giorni", "曜日", "星期"],
  sched_help: [
    "Runs once a day at that time, moved by a random but repeatable amount, only while the system is armed away and the security option Vacation mode is on.",
    "Se ejecuta una vez al día a esa hora, movida una cantidad aleatoria pero repetible, solo mientras el sistema está armado en modo fuera y la opción de seguridad Modo vacaciones está activada.",
    "Läuft einmal täglich zu dieser Zeit, um einen zufälligen, aber wiederholbaren Betrag verschoben, nur solange das System im Modus Abwesend scharf ist und die Sicherheitsoption Urlaubsmodus eingeschaltet ist.",
    "S'exécute une fois par jour à cette heure, décalée d'une quantité aléatoire mais reproductible, seulement tant que le système est armé en mode absent et que l'option de sécurité Mode vacances est activée.",
    "Viene eseguita una volta al giorno a quell'orario, spostato di una quantità casuale ma ripetibile, solo mentre il sistema è armato in modalità assente e l'opzione di sicurezza Modalità vacanza è attiva.",
    "その時刻に1日1回、ランダムだが再現可能な量だけずらして実行されます。システムが外出モードで警戒中で、セキュリティオプションの休暇モードがオンの間だけです。",
    "每天在该时刻执行一次，带有随机但可重复的偏移，仅在系统以外出模式布防且安全选项“度假模式”开启时运行。",
  ],
  sched_day0: ["Sun", "Dom", "So", "Dim", "Dom", "日", "日"],
  sched_day1: ["Mon", "Lun", "Mo", "Lun", "Lun", "月", "一"],
  sched_day2: ["Tue", "Mar", "Di", "Mar", "Mar", "火", "二"],
  sched_day3: ["Wed", "Mié", "Mi", "Mer", "Mer", "水", "三"],
  sched_day4: ["Thu", "Jue", "Do", "Jeu", "Gio", "木", "四"],
  sched_day5: ["Fri", "Vie", "Fr", "Ven", "Ven", "金", "五"],
  sched_day6: ["Sat", "Sáb", "Sa", "Sam", "Sab", "土", "六"],
};

const PT: Record<string, string> = {
  trigger_schedule: "é uma hora do dia (modo de férias)",
  sched_time: "Hora do dia",
  sched_jitter: "Variação aleatória, até (minutos)",
  sched_days: "Dias",
  sched_help: "Executa-se uma vez por dia a essa hora, movida uma quantidade aleatória mas repetível, apenas enquanto o sistema está armado em modo ausente e a opção de segurança Modo de férias está ligada.",
  sched_day0: "Dom", sched_day1: "Seg", sched_day2: "Ter", sched_day3: "Qua", sched_day4: "Qui", sched_day5: "Sex", sched_day6: "Sáb",
};

export const scheduleTriggerCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
