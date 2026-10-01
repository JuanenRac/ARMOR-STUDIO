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
  modeSessionEnded: ["Your session has ended: sign in again to change the mode.", "Tu sesión ha terminado: inicia sesión de nuevo para cambiar el modo.", "Ihre Sitzung ist beendet: Melden Sie sich erneut an, um den Modus zu ändern.", "Votre session est terminée : reconnectez-vous pour changer le mode.", "La sessione è terminata: accedi di nuovo per cambiare la modalità.", "セッションが終了しました。モードを変更するには再度サインインしてください。", "会话已结束：请重新登录后再更改模式。"],
  modeForbidden: ["This account is not allowed to change the mode.", "Esta cuenta no tiene permiso para cambiar el modo.", "Dieses Konto darf den Modus nicht ändern.", "Ce compte n'est pas autorisé à changer le mode.", "Questo account non può cambiare la modalità.", "このアカウントにはモードを変更する権限がありません。", "此账户无权更改模式。"],
  modeNoAnswer: ["The server did not answer, so the mode was not changed. Try again.", "El servidor no ha respondido, así que el modo no ha cambiado. Inténtalo de nuevo.", "Der Server hat nicht geantwortet, der Modus wurde nicht geändert. Versuchen Sie es erneut.", "Le serveur n'a pas répondu, le mode n'a pas changé. Réessayez.", "Il server non ha risposto, la modalità non è cambiata. Riprova.", "サーバーが応答せず、モードは変更されていません。もう一度お試しください。", "服务器没有响应，模式未更改。请重试。"],
  modeServerError: ["The server refused the change (error {status}).", "El servidor ha rechazado el cambio (error {status}).", "Der Server hat die Änderung abgelehnt (Fehler {status}).", "Le serveur a refusé le changement (erreur {status}).", "Il server ha rifiutato la modifica (errore {status}).", "サーバーが変更を拒否しました（エラー {status}）。", "服务器拒绝了更改（错误 {status}）。"],
  confirmAction: ["Confirm", "Confirmar", "Bestätigen", "Confirmer", "Conferma", "確認", "确认"],
  cancelAction: ["Cancel", "Cancelar", "Abbrechen", "Annuler", "Annulla", "キャンセル", "取消"],
  exitFullscreen: ["Leave fullscreen", "Salir de pantalla completa", "Vollbild beenden", "Quitter le plein écran", "Esci dallo schermo intero", "全画面を終了", "退出全屏"],
};
export const chromeCatalogues = cataloguesFromRows(ROWS);
