/**
 * The phrases of the longer history ranges, the energy per day and the history of an electrical channel, in the seven languages.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  solarRange7: ["7 days", "7 días", "7 Tage", "7 jours", "7 giorni", "7日間", "7天"],
  solarRange30: ["30 days", "30 días", "30 Tage", "30 jours", "30 giorni", "30日間", "30天"],
  enTitle: ["Energy per day", "Energía por día", "Energie pro Tag", "Énergie par jour", "Energia al giorno", "1日あたりのエネルギー", "每日能量"],
  enHelp: ["Added up by the server from the readings of the inverters and batteries, kept across restarts. Kilowatt-hours.", "Sumada por el servidor a partir de las lecturas de inversores y baterías; se conserva al reiniciar. Kilovatios-hora.", "Vom Server aus den Messwerten von Wechselrichtern und Batterien addiert, bleibt über Neustarts erhalten. Kilowattstunden.", "Additionnée par le serveur à partir des mesures des onduleurs et batteries, conservée après redémarrage. Kilowattheures.", "Sommata dal server dalle letture di inverter e batterie, conservata ai riavvii. Kilowattora.", "サーバーがインバーターとバッテリーの測定値から積算し、再起動後も保持します。kWh。", "由服务器根据逆变器和电池读数累计，重启后仍保留。千瓦时。"],
  enPv: ["Solar", "Solar", "Solar", "Solaire", "Solare", "太陽光", "光伏"],
  enLoad: ["Used", "Consumo", "Verbrauch", "Consommation", "Consumo", "消費", "用电"],
  enIn: ["Battery in", "Entra a la batería", "In die Batterie", "Vers la batterie", "Nella batteria", "電池へ充電", "充入电池"],
  enOut: ["Battery out", "Sale de la batería", "Aus der Batterie", "Depuis la batterie", "Dalla batteria", "電池から放電", "电池放出"],
  enNone: ["No energy has been counted yet: it adds up as the readings arrive.", "Aún no hay energía contada: se va sumando conforme llegan las lecturas.", "Noch keine Energie gezählt: sie wird mit den eintreffenden Messwerten addiert.", "Aucune énergie comptée pour l'instant : elle s'additionne au fil des mesures.", "Nessuna energia ancora contata: si somma man mano che arrivano le letture.", "まだ積算されたエネルギーはありません。測定値が届くたびに加算されます。", "尚未累计能量：随读数到达逐步累加。"],
  elHistory: ["History of the channel", "Historial del canal", "Verlauf des Kanals", "Historique du canal", "Storico del canale", "チャンネルの履歴", "通道历史"],
  elPower: ["Power", "Potencia", "Leistung", "Puissance", "Potenza", "電力", "功率"],
  elVoltage: ["Voltage", "Tensión", "Spannung", "Tension", "Tensione", "電圧", "电压"],
  elCurrent: ["Current", "Corriente", "Strom", "Courant", "Corrente", "電流", "电流"],
};
export const energyCatalogues = cataloguesFromRows(ROWS);
