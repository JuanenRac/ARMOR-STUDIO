/**
 * The words of the alarm codes of the energy balance (the same as the shared table of ARMOR-COMMON, which a test compares).
 * One row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese; Portuguese (of Portugal) follows in PT.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  alarm_grid_export_unexpected: ["The house is feeding the grid although it must not", "La casa está inyectando a la red aunque no debe", "Das Haus speist ins Netz ein, obwohl es das nicht darf", "La maison injecte dans le réseau alors qu'elle ne le doit pas", "La casa sta immettendo in rete anche se non deve", "宅内から系統へ逆潮流していますが、許可されていません", "房屋正在向电网送电，但不应如此"],
  alarm_meter_mismatch: ["The meters of the house do not agree with each other", "Los contadores de la casa no coinciden entre sí", "Die Zähler des Hauses stimmen nicht miteinander überein", "Les compteurs de la maison ne concordent pas entre eux", "I contatori della casa non concordano tra loro", "宅内のメーターの値が互いに一致しません", "房屋的电表读数互不一致"],
  alarm_consumption_appliance_stopped: ["An appliance you watch has stopped drawing power", "Un aparato que vigilas ha dejado de consumir", "Ein überwachtes Gerät verbraucht keinen Strom mehr", "Un appareil surveillé ne consomme plus", "Un apparecchio sorvegliato ha smesso di consumare", "監視中の機器が電力を消費しなくなりました", "您监控的电器已停止耗电"],
  alarm_consumption_standby_high: ["The night consumption of a channel is higher than it used to be", "El consumo en reposo de un canal es más alto de lo habitual", "Der Ruheverbrauch eines Kanals ist höher als sonst", "La consommation de veille d'un canal est plus élevée que d'habitude", "Il consumo in standby di un canale è più alto del solito", "あるチャンネルの待機電力がいつもより高くなっています", "某个通道的待机用电高于以往"],
  alarm_consumption_phase_down: ["A phase of the mains has lost its voltage", "Una fase de la red ha perdido la tensión", "Eine Phase des Netzes hat ihre Spannung verloren", "Une phase du réseau a perdu sa tension", "Una fase della rete ha perso la tensione", "系統の一相が電圧を失いました", "电网的某一相失去了电压"],
};

const PT: Record<string, string> = {
  alarm_grid_export_unexpected: "A casa está a injetar na rede, embora não deva",
  alarm_meter_mismatch: "Os contadores da casa não coincidem entre si",
  alarm_consumption_appliance_stopped: "Um aparelho vigiado deixou de consumir",
  alarm_consumption_standby_high: "O consumo em espera de um canal é mais alto do que o habitual",
  alarm_consumption_phase_down: "Uma fase da rede perdeu a tensão",
};

export const alarmCodesACatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
