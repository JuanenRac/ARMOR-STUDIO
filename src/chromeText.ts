/**
 * Small phrases of the console's frame (top bar, sidebar), in the seven languages.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  armSystem: ["Arm the system", "Armar el sistema", "System scharfschalten", "Armer le système", "Attiva il sistema", "システムを警戒開始", "布防系统"],
  disarmSystem: ["Disarm the system", "Desarmar el sistema", "System unscharf schalten", "Désarmer le système", "Disattiva il sistema", "システムの警戒を解除", "撤防系统"],
  confirmArm: ["Arm the system? Intrusion sensors will raise alarms.", "¿Armar el sistema? Los sensores de intrusión activarán alarmas.", "System scharfschalten? Einbruchsensoren lösen Alarme aus.", "Armer le système ? Les capteurs d'intrusion déclencheront des alarmes.", "Attivare il sistema? I sensori di intrusione genereranno allarmi.", "システムを警戒状態にしますか？侵入センサーが警報を発します。", "布防系统？入侵传感器将触发警报。"],
  confirmDisarm: ["Disarm the system? Intrusion alarms will end.", "¿Desarmar el sistema? Las alarmas de intrusión terminarán.", "System unscharf schalten? Einbruchalarme werden beendet.", "Désarmer le système ? Les alarmes d'intrusion prendront fin.", "Disattivare il sistema? Gli allarmi di intrusione termineranno.", "システムの警戒を解除しますか？侵入警報は終了します。", "撤防系统？入侵警报将结束。"],
  modeArmedNotice: ["The system is armed.", "El sistema está armado.", "Das System ist scharf.", "Le système est armé.", "Il sistema è attivo.", "システムは警戒中です。", "系统已布防。"],
  modeDisarmedNotice: ["The system is disarmed.", "El sistema está desarmado.", "Das System ist unscharf.", "Le système est désarmé.", "Il sistema è disattivato.", "システムの警戒を解除しました。", "系统已撤防。"],
  modeFailed: ["The mode could not be changed.", "No se ha podido cambiar el modo.", "Der Modus ließ sich nicht ändern.", "Le mode n'a pas pu être changé.", "Non è stato possibile cambiare modalità.", "モードを変更できませんでした。", "无法更改模式。"],
  exitFullscreen: ["Leave fullscreen", "Salir de pantalla completa", "Vollbild beenden", "Quitter le plein écran", "Esci dallo schermo intero", "全画面を終了", "退出全屏"],
};
export const chromeCatalogues = cataloguesFromRows(ROWS);
