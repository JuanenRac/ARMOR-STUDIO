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
  bmsPower: ["Power (the BMS's own reading)", "Potencia (lectura propia del BMS)", "Leistung (eigene Messung des BMS)", "Puissance (mesure propre du BMS)", "Potenza (lettura propria del BMS)", "電力（BMS自身の測定）", "功率（BMS自身读数）"],
  bmsBalancing: ["Cells being balanced", "Celdas equilibrándose", "Zellen im Ausgleich", "Cellules en équilibrage", "Celle in bilanciamento", "バランス中のセル", "正在均衡的电芯"],
  bmsProtecting: ["A protection has switched a MOSFET off", "Una protección ha cortado un MOSFET", "Ein Schutz hat einen MOSFET abgeschaltet", "Une protection a coupé un MOSFET", "Una protezione ha spento un MOSFET", "保護機能がMOSFETを遮断しました", "保护已关断一个 MOSFET"],
  bmsMos: ["MOSFET charge / discharge (status code)", "MOSFET carga / descarga (código de estado)", "MOSFET Laden / Entladen (Statuscode)", "MOSFET charge / décharge (code d'état)", "MOSFET carica / scarica (codice di stato)", "MOSFET 充電／放電（状態コード）", "MOSFET 充电／放电（状态码）"],
  solarBus: ["DC bus", "Bus de continua", "DC-Zwischenkreis", "Bus continu", "Bus DC", "DCバス", "直流母线"],
  eaTitle: ["Alarm levels", "Niveles de las alarmas", "Alarmstufen", "Niveaux des alarmes", "Livelli degli allarmi", "アラームの基準", "报警阈值"],
  eaHelp: ["When a battery or an inverter raises an alarm. Each one ends with a small margin so a value on the edge does not flap.", "Cuándo una batería o un inversor levanta una alarma. Cada una termina con un pequeño margen para que un valor en el borde no oscile.", "Wann eine Batterie oder ein Wechselrichter Alarm auslöst. Jeder endet mit einer kleinen Marge, damit ein Wert am Rand nicht flackert.", "Quand une batterie ou un onduleur lève une alarme. Chacune se termine avec une petite marge pour qu'une valeur à la limite n'oscille pas.", "Quando una batteria o un inverter solleva un allarme. Ognuno termina con un piccolo margine perché un valore al limite non oscilli.", "バッテリーやインバーターがアラームを出す基準です。境界の値が揺れないよう、解除には少し余裕があります。", "电池或逆变器何时报警。每项解除时留有余量，避免临界值反复触发。"],
  eaSocLow: ["Low charge (%)", "Carga baja (%)", "Niedrige Ladung (%)", "Charge basse (%)", "Carica bassa (%)", "低残量（%）", "低电量（%）"],
  eaSocOk: ["Enough again (%)", "Ya es suficiente (%)", "Wieder ausreichend (%)", "De nouveau suffisante (%)", "Di nuovo sufficiente (%)", "回復とみなす残量（%）", "视为恢复的电量（%）"],
  eaCells: ["Cell spread (mV)", "Diferencia entre celdas (mV)", "Zellspreizung (mV)", "Écart entre cellules (mV)", "Differenza tra celle (mV)", "セル間の差（mV）", "电芯压差（mV）"],
  eaHot: ["Battery too hot (°C)", "Batería demasiado caliente (°C)", "Batterie zu heiß (°C)", "Batterie trop chaude (°C)", "Batteria troppo calda (°C)", "バッテリー高温（°C）", "电池过热（°C）"],
  eaCold: ["Too cold to charge (°C)", "Demasiado fría para cargar (°C)", "Zu kalt zum Laden (°C)", "Trop froide pour charger (°C)", "Troppo fredda per caricare (°C)", "低温で充電不可（°C）", "过冷不宜充电（°C）"],
  eaHeatsink: ["Inverter heat sink too hot (°C)", "Disipador del inversor demasiado caliente (°C)", "Kühlkörper des Wechselrichters zu heiß (°C)", "Dissipateur de l'onduleur trop chaud (°C)", "Dissipatore dell'inverter troppo caldo (°C)", "インバーターの放熱器が高温（°C）", "逆变器散热器过热（°C）"],
  eaWorn: ["Worn below (% of its capacity)", "Desgastada por debajo de (% de su capacidad)", "Verschlissen unter (% der Kapazität)", "Usée en dessous de (% de sa capacité)", "Usurata sotto (% della capacità)", "劣化の基準（容量の%）", "老化阈值（容量的%）"],
  eaSave: ["Save", "Guardar", "Speichern", "Enregistrer", "Salva", "保存", "保存"],
  eaDefaults: ["Defaults", "Valores por defecto", "Standardwerte", "Valeurs par défaut", "Predefiniti", "初期値", "默认值"],
  eaSaved: ["Saved.", "Guardado.", "Gespeichert.", "Enregistré.", "Salvato.", "保存しました。", "已保存。"],
  eaFailed: ["The levels were not saved: check that each one is in range and that the charge that ends is higher than the one that starts.", "No se guardaron los niveles: comprueba que cada uno está en su rango y que la carga que termina es mayor que la que empieza.", "Die Stufen wurden nicht gespeichert: Prüfen Sie, dass jede im Bereich liegt und die endende Ladung höher ist als die beginnende.", "Les niveaux n'ont pas été enregistrés : vérifiez que chacun est dans sa plage et que la charge de fin est supérieure à celle de début.", "I livelli non sono stati salvati: controlla che ognuno sia nel suo intervallo e che la carica che termina sia maggiore di quella che inizia.", "保存できませんでした。各値が範囲内で、解除の残量が開始より高いことを確認してください。", "未能保存：请检查各项在范围内，且解除电量高于触发电量。"],
};
export const energyCatalogues = cataloguesFromRows(ROWS);
