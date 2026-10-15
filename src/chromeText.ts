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
  mode_wrong_pin: ["The PIN is not right: the system was not disarmed.", "El PIN no es correcto: el sistema no se ha desarmado.", "Die PIN ist falsch: das System wurde nicht unscharf geschaltet.", "Le code PIN n'est pas bon : le système n'a pas été désarmé.", "Il PIN non è corretto: il sistema non è stato disattivato.", "PIN が違います。警戒は解除されませんでした。", "PIN 不正确：系统没有撤防。"],
  mode_pin_locked: ["Too many wrong PINs: wait a while before trying again.", "Demasiados PIN erróneos: espera un poco antes de volver a intentarlo.", "Zu viele falsche PINs: Bitte warten Sie, bevor Sie es erneut versuchen.", "Trop de codes PIN erronés : patientez avant de réessayer.", "Troppi PIN errati: attendi prima di riprovare.", "PIN の誤りが多すぎます。しばらく待ってからやり直してください。", "错误的 PIN 太多：请稍等后再试。"],
  mode_pin_not_set: ["This user has no PIN to disarm with: an administrator sets it in Configuration > Users.", "Este usuario no tiene un PIN para desarmar: lo pone un administrador en Configuración > Usuarios.", "Dieser Benutzer hat keine PIN zum Entschärfen: Ein Administrator legt sie unter Konfiguration > Benutzer fest.", "Cet utilisateur n'a pas de code PIN pour désarmer : un administrateur le définit dans Configuration > Utilisateurs.", "Questo utente non ha un PIN per disattivare: lo imposta un amministratore in Configurazione > Utenti.", "このユーザーには解除用の PIN がありません。管理者が「設定 > ユーザー」で設定します。", "该用户没有撤防用的 PIN：由管理员在“配置 > 用户”中设置。"],
  pinLabel: ["PIN", "PIN", "PIN", "Code PIN", "PIN", "PIN", "PIN"],
  pinPlaceholder: ["Your PIN, if you have one", "Tu PIN, si tienes uno", "Ihre PIN, falls vorhanden", "Votre code PIN, si vous en avez un", "Il tuo PIN, se ne hai uno", "PIN（設定している場合）", "你的 PIN（如已设置）"],
  modeNoAnswer: ["The server did not answer, so the mode was not changed. Try again.", "El servidor no ha respondido, así que el modo no ha cambiado. Inténtalo de nuevo.", "Der Server hat nicht geantwortet, der Modus wurde nicht geändert. Versuchen Sie es erneut.", "Le serveur n'a pas répondu, le mode n'a pas changé. Réessayez.", "Il server non ha risposto, la modalità non è cambiata. Riprova.", "サーバーが応答せず、モードは変更されていません。もう一度お試しください。", "服务器没有响应，模式未更改。请重试。"],
  modeServerError: ["The server refused the change (error {status}).", "El servidor ha rechazado el cambio (error {status}).", "Der Server hat die Änderung abgelehnt (Fehler {status}).", "Le serveur a refusé le changement (erreur {status}).", "Il server ha rifiutato la modifica (errore {status}).", "サーバーが変更を拒否しました（エラー {status}）。", "服务器拒绝了更改（错误 {status}）。"],
  confirmAction: ["Confirm", "Confirmar", "Bestätigen", "Confirmer", "Conferma", "確認", "确认"],
  mediaProtect: ["Keep (protect)", "Conservar (proteger)", "Aufbewahren (schützen)", "Conserver (protéger)", "Conserva (proteggi)", "保護する", "保护"],
  mediaUnprotect: ["Protected: release", "Protegida: liberar", "Geschützt: freigeben", "Protégé : libérer", "Protetto: rilascia", "保護中：解除", "已保护：解除"],
  mediaProtectedNote: ["Protected: it is not pruned automatically", "Protegida: no se borra sola", "Geschützt: wird nicht automatisch gelöscht", "Protégé : jamais supprimé automatiquement", "Protetto: non viene eliminato da solo", "保護中：自動削除されません", "已保护：不会被自动清理"],
  mediaFailed: ["The protection could not be changed.", "No se ha podido cambiar la protección.", "Der Schutz ließ sich nicht ändern.", "La protection n'a pas pu être modifiée.", "Non è stato possibile cambiare la protezione.", "保護を変更できませんでした。", "无法更改保护状态。"],
  navSecurity: ["Security", "Seguridad", "Sicherheit", "Sécurité", "Sicurezza", "セキュリティ", "安防"],
  navHouse: ["House and network", "Casa y red", "Haus und Netzwerk", "Maison et réseau", "Casa e rete", "家とネットワーク", "住宅与网络"],
  navGroupFold: ["Fold this group", "Plegar este grupo", "Gruppe einklappen", "Replier ce groupe", "Comprimi questo gruppo", "このグループを折りたたむ", "折叠此分组"],
  navGroupUnfold: ["Unfold this group", "Desplegar este grupo", "Gruppe ausklappen", "Déplier ce groupe", "Espandi questo gruppo", "このグループを展開", "展开此分组"],
  copyLog: ["Copy the log", "Copiar el registro", "Protokoll kopieren", "Copier le journal", "Copia il registro", "ログをコピー", "复制日志"],
  copied: ["Copied", "Copiado", "Kopiert", "Copié", "Copiato", "コピーしました", "已复制"],
  copyFailed: ["Could not copy", "No se pudo copiar", "Kopieren nicht möglich", "Copie impossible", "Copia non riuscita", "コピーできませんでした", "复制失败"],
  askConfirmTitle: ["Are you sure?", "¿Seguro?", "Sind Sie sicher?", "Êtes-vous sûr ?", "Sei sicuro?", "よろしいですか？", "确定吗？"],
  askConfirmYes: ["Yes, continue", "Sí, continuar", "Ja, fortfahren", "Oui, continuer", "Sì, continua", "はい、続行します", "是，继续"],
  cancelAction: ["Cancel", "Cancelar", "Abbrechen", "Annuler", "Annulla", "キャンセル", "取消"],
  exitFullscreen: ["Leave fullscreen", "Salir de pantalla completa", "Vollbild beenden", "Quitter le plein écran", "Esci dallo schermo intero", "全画面を終了", "退出全屏"],
};
export const chromeCatalogues = cataloguesFromRows(ROWS);
