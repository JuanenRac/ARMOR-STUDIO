/**
 * The words of the tabs of the History, of the list of connections and of the connection and system events, one row per phrase: en, es, de, fr, it, ja, zh. Portuguese is in ptCatalogue.ts
 * like every other phrase.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Locale } from "./i18n";

type Row = readonly [string, string, string, string, string, string, string];
const order: readonly Locale[] = ["en", "es", "de", "fr", "it", "ja", "zh"];

const rows: Record<string, Row> = {
  his_tab_alarms: ["Alarms", "Alarmas", "Alarme", "Alarmes", "Allarmi", "アラーム", "报警"],
  his_tab_connections: ["Connections", "Conexiones", "Verbindungen", "Connexions", "Connessioni", "接続", "连接"],
  his_tab_devices: ["Devices", "Dispositivos", "Geräte", "Appareils", "Dispositivi", "デバイス", "设备"],
  his_tab_system: ["System", "Sistema", "System", "Système", "Sistema", "システム", "系统"],
  his_tab_settings: ["Settings", "Ajustes", "Einstellungen", "Réglages", "Impostazioni", "設定", "设置"],
  event_connection: ["Connection", "Conexión", "Verbindung", "Connexion", "Connessione", "接続", "连接"],
  event_system: ["System", "Sistema", "System", "Système", "Sistema", "システム", "系统"],
  conn_first_seen: ["seen for the first time", "vista por primera vez", "zum ersten Mal gesehen", "vu pour la première fois", "vista per la prima volta", "初めて検出", "首次出现"],
  conn_login: ["signed in", "ha iniciado sesión", "angemeldet", "connecté", "ha effettuato l'accesso", "サインイン", "已登录"],
  conn_login_failed: ["sign-in refused", "inicio de sesión rechazado", "Anmeldung abgelehnt", "connexion refusée", "accesso rifiutato", "サインイン拒否", "登录被拒"],
  conn_second_factor_failed: ["wrong code of the second factor", "código del segundo factor incorrecto", "falscher Code des zweiten Faktors", "mauvais code du second facteur", "codice del secondo fattore errato", "第二要素のコードが違います", "第二重验证码错误"],
  conn_logout: ["signed out", "ha cerrado sesión", "abgemeldet", "déconnecté", "ha chiuso la sessione", "サインアウト", "已退出"],
  conn_session_ended: ["session ended", "sesión terminada", "Sitzung beendet", "session terminée", "sessione terminata", "セッション終了", "会话已结束"],
  conn_session_expired: ["session expired", "sesión caducada", "Sitzung abgelaufen", "session expirée", "sessione scaduta", "セッション期限切れ", "会话已过期"],
  conn_panel_opened: ["panel opened", "panel abierto", "Panel geöffnet", "panneau ouvert", "pannello aperto", "パネルを開きました", "已打开面板"],
  ck_studio: ["Studio", "Studio", "Studio", "Studio", "Studio", "Studio", "Studio"],
  ck_android: ["Android app", "App Android", "Android-App", "Appli Android", "App Android", "Android アプリ", "Android 应用"],
  ck_node: ["Node panel", "Panel de nodo", "Knoten-Panel", "Panneau de nœud", "Pannello del nodo", "ノードのパネル", "节点面板"],
  ck_voice: ["Voice service", "Servicio de voz", "Sprachdienst", "Service vocal", "Servizio vocale", "音声サービス", "语音服务"],
  ck_other: ["Other client", "Otro cliente", "Anderer Client", "Autre client", "Altro client", "その他のクライアント", "其他客户端"],
  ck_all: ["All clients", "Todos los clientes", "Alle Clients", "Tous les clients", "Tutti i client", "すべてのクライアント", "所有客户端"],
  conn_2fa: ["with second factor", "con segundo factor", "mit zweitem Faktor", "avec second facteur", "con secondo fattore", "第二要素あり", "已用第二重验证"],
  conn_local: ["from inside the house", "desde dentro de la casa", "von innerhalb des Hauses", "depuis l'intérieur de la maison", "da dentro casa", "自宅内から", "来自屋内"],
  conn_remote: ["from outside", "desde fuera", "von außerhalb", "depuis l'extérieur", "da fuori", "外部から", "来自外部"],
  sc_node: ["Node", "Nodo", "Knoten", "Nœud", "Nodo", "ノード", "节点"],
  sc_broker: ["Broker", "Broker", "Broker", "Broker", "Broker", "ブローカー", "代理"],
  sc_settings: ["Settings", "Ajustes", "Einstellungen", "Réglages", "Impostazioni", "設定", "设置"],
  sc_service: ["Service", "Servicio", "Dienst", "Service", "Servizio", "サービス", "服务"],
  sc_update: ["Update", "Actualización", "Aktualisierung", "Mise à jour", "Aggiornamento", "更新", "更新"],
  sc_alarm: ["Alarm", "Alarma", "Alarm", "Alarme", "Allarme", "アラーム", "报警"],
  sc_backup: ["Backup", "Copia de seguridad", "Sicherung", "Sauvegarde", "Backup", "バックアップ", "备份"],
  sc_all: ["All system events", "Todos los eventos del sistema", "Alle Systemereignisse", "Tous les événements système", "Tutti gli eventi di sistema", "すべてのシステムイベント", "所有系统事件"],
  sa_appeared: ["appeared", "ha aparecido", "aufgetaucht", "est apparu", "è apparso", "出現", "出现"],
  sa_returned: ["came back", "ha vuelto", "wieder da", "est revenu", "è tornato", "復帰", "已恢复"],
  sa_disappeared: ["disappeared", "ha desaparecido", "verschwunden", "a disparu", "è scomparso", "消失", "已消失"],
  sa_firmware_changed: ["firmware changed", "firmware cambiado", "Firmware geändert", "firmware changé", "firmware cambiato", "ファームウェア変更", "固件已更改"],
  sa_connected: ["connected", "conectado", "verbunden", "connecté", "connesso", "接続", "已连接"],
  sa_disconnected: ["disconnected", "desconectado", "getrennt", "déconnecté", "disconnesso", "切断", "已断开"],
  sa_created: ["created", "creado", "angelegt", "créé", "creato", "作成", "已创建"],
  sa_changed: ["changed", "cambiado", "geändert", "modifié", "modificato", "変更", "已更改"],
  sa_removed: ["removed", "eliminado", "entfernt", "supprimé", "rimosso", "削除", "已删除"],
  sa_started: ["started", "iniciado", "gestartet", "démarré", "avviato", "開始", "已启动"],
  sa_stopped: ["stopped", "detenido", "gestoppt", "arrêté", "fermato", "停止", "已停止"],
  sa_restarted: ["restarted", "reiniciado", "neu gestartet", "redémarré", "riavviato", "再起動", "已重启"],
  sa_checked: ["checked for updates", "comprobadas las actualizaciones", "Aktualisierungen geprüft", "mises à jour vérifiées", "aggiornamenti controllati", "更新を確認", "已检查更新"],
  sa_installed: ["installed", "instalado", "installiert", "installé", "installato", "インストール", "已安装"],
  sa_rolled_back: ["rolled back", "revertido", "zurückgesetzt", "annulé", "ripristinato", "ロールバック", "已回滚"],
  sa_armed: ["armed", "armado", "scharf geschaltet", "armé", "inserito", "警戒開始", "已布防"],
  sa_disarmed: ["disarmed", "desarmado", "unscharf geschaltet", "désarmé", "disinserito", "警戒解除", "已撤防"],
  sa_silenced: ["siren silenced", "sirena silenciada", "Sirene stumm", "sirène coupée", "sirena silenziata", "サイレン停止", "警报器已静音"],
  sa_acknowledged: ["alarm acknowledged", "alarma reconocida", "Alarm quittiert", "alarme acquittée", "allarme riconosciuto", "アラーム確認", "报警已确认"],
  sa_arm_requested: ["arming requested", "armado pedido", "Scharfschalten angefordert", "armement demandé", "inserimento richiesto", "警戒開始を要求", "已请求布防"],
  sa_disarm_requested: ["disarming requested", "desarmado pedido", "Unscharfschalten angefordert", "désarmement demandé", "disinserimento richiesto", "警戒解除を要求", "已请求撤防"],
  sa_silence_requested: ["siren silence requested", "silenciar la sirena pedido", "Sirene stumm schalten angefordert", "coupure de la sirène demandée", "silenziamento sirena richiesto", "サイレン停止を要求", "已请求静音警报器"],
  sa_backup_made: ["backup made", "copia de seguridad hecha", "Sicherung erstellt", "sauvegarde faite", "backup eseguito", "バックアップ作成", "已备份"],
  sa_backup_restored: ["backup restored", "copia de seguridad restaurada", "Sicherung wiederhergestellt", "sauvegarde restaurée", "backup ripristinato", "バックアップ復元", "已恢复备份"],
  sa_by: ["by", "por", "von", "par", "da", "実行者", "操作人"],
  sa_profile: ["profile", "perfil", "Profil", "profil", "profilo", "プロファイル", "方案"],
  sa_refused: ["refused", "rechazado", "abgelehnt", "refusé", "rifiutato", "拒否", "被拒绝"],
  sa_failed: ["failed", "falló", "fehlgeschlagen", "échoué", "non riuscito", "失敗", "失败"],
  sa_firmware: ["firmware", "firmware", "Firmware", "firmware", "firmware", "ファームウェア", "固件"],
  cl_title: ["Devices and apps that connect", "Dispositivos y aplicaciones que se conectan", "Geräte und Apps, die sich verbinden", "Appareils et applications qui se connectent", "Dispositivi e app che si collegano", "接続しているデバイスとアプリ", "已连接的设备和应用"],
  cl_help: ["Every device or app the server has seen: Studio in a browser, the Android app, the panels of the nodes, the voice service and anything else, with when it was last seen and how many sessions it has open. Only the administrators see addresses and user agents; no password, token or cookie is ever recorded.", "Cada dispositivo o aplicación que el servidor ha visto: Studio en un navegador, la app Android, los paneles de los nodos, el servicio de voz y cualquier otro, con cuándo se vio por última vez y cuántas sesiones tiene abiertas. Solo los administradores ven direcciones y agentes de usuario; nunca se registra una contraseña, un token o una cookie.", "Jedes Gerät und jede App, die der Server gesehen hat: Studio im Browser, die Android-App, die Panels der Knoten, der Sprachdienst und alles andere, mit dem Zeitpunkt der letzten Sichtung und den offenen Sitzungen. Nur Administratoren sehen Adressen und User-Agents; nie wird ein Passwort, Token oder Cookie aufgezeichnet.", "Chaque appareil ou application que le serveur a vu : Studio dans un navigateur, l'appli Android, les panneaux des nœuds, le service vocal et tout le reste, avec la dernière fois vu et le nombre de sessions ouvertes. Seuls les administrateurs voient les adresses et les agents utilisateur ; aucun mot de passe, jeton ni cookie n'est jamais enregistré.", "Ogni dispositivo o app che il server ha visto: Studio in un browser, l'app Android, i pannelli dei nodi, il servizio vocale e qualsiasi altro, con l'ultima volta visto e quante sessioni ha aperte. Solo gli amministratori vedono indirizzi e user agent; non si registra mai una password, un token o un cookie.", "サーバーが確認したすべてのデバイスとアプリ（ブラウザーの Studio、Android アプリ、ノードのパネル、音声サービスなど）を、最終確認時刻と開いているセッション数とともに表示します。アドレスとユーザーエージェントは管理者にだけ表示され、パスワード・トークン・クッキーは一切記録されません。", "服务器见过的所有设备和应用：浏览器中的 Studio、Android 应用、节点面板、语音服务等，附最后出现时间和已打开的会话数。只有管理员能看到地址和用户代理；密码、令牌和 Cookie 绝不会被记录。"],
  cl_user: ["User", "Usuario", "Benutzer", "Utilisateur", "Utente", "ユーザー", "用户"],
  cl_version: ["Version", "Versión", "Version", "Version", "Versione", "バージョン", "版本"],
  cl_first: ["First seen", "Vista por primera vez", "Zuerst gesehen", "Vu la première fois", "Vista la prima volta", "初回", "首次出现"],
  cl_last: ["Last seen", "Vista por última vez", "Zuletzt gesehen", "Vu la dernière fois", "Vista l'ultima volta", "最終", "最后出现"],
  cl_sessions: ["Open sessions", "Sesiones abiertas", "Offene Sitzungen", "Sessions ouvertes", "Sessioni aperte", "開いているセッション", "已打开的会话"],
  cl_ok: ["Sign-ins", "Inicios de sesión", "Anmeldungen", "Connexions", "Accessi", "サインイン", "登录次数"],
  cl_failed: ["Refused", "Rechazados", "Abgelehnt", "Refusées", "Rifiutati", "拒否", "被拒绝"],
  cl_ip: ["Address", "Dirección", "Adresse", "Adresse", "Indirizzo", "アドレス", "地址"],
  cl_agent: ["User agent", "Agente de usuario", "User-Agent", "Agent utilisateur", "User agent", "ユーザーエージェント", "用户代理"],
  cl_empty: ["No client has connected yet.", "Ningún cliente se ha conectado todavía.", "Noch kein Client hat sich verbunden.", "Aucun client ne s'est encore connecté.", "Nessun client si è ancora collegato.", "まだ接続したクライアントはありません。", "还没有客户端连接过。"],
  cl_active_only: ["Only with an open session", "Solo con sesión abierta", "Nur mit offener Sitzung", "Seulement avec une session ouverte", "Solo con sessione aperta", "開いているセッションのみ", "仅显示有会话的"],
  cl_admin_note: ["Addresses and user agents are shown to administrators only.", "Las direcciones y los agentes de usuario se muestran solo a los administradores.", "Adressen und User-Agents sehen nur Administratoren.", "Les adresses et les agents utilisateur ne sont montrés qu'aux administrateurs.", "Indirizzi e user agent sono visibili solo agli amministratori.", "アドレスとユーザーエージェントは管理者にだけ表示されます。", "地址和用户代理只显示给管理员。"],
  cl_last_failure: ["Last refusal", "Último rechazo", "Letzte Ablehnung", "Dernier refus", "Ultimo rifiuto", "最後の拒否", "最近一次被拒"],
  cl_load_failed: ["The list of connections could not be read.", "No se pudo leer la lista de conexiones.", "Die Liste der Verbindungen konnte nicht gelesen werden.", "La liste des connexions n'a pas pu être lue.", "Non è stato possibile leggere l'elenco delle connessioni.", "接続の一覧を読み込めませんでした。", "无法读取连接列表。"],
  cl_kind: ["Client", "Cliente", "Client", "Client", "Client", "クライアント", "客户端"],
  cl_events: ["Connection events", "Eventos de conexión", "Verbindungsereignisse", "Événements de connexion", "Eventi di connessione", "接続イベント", "连接事件"],
  cl_never: ["never", "nunca", "nie", "jamais", "mai", "なし", "从未"],
};

export const historyLogCatalogue = (locale: Locale): Record<string, string> => {
  const index = order.indexOf(locale);
  if (index < 0) return {};
  return Object.fromEntries(Object.entries(rows).map(([key, row]) => [key, row[index]]));
};

/** The phrases in this file, for the Portuguese table to be checked against. */
export const historyLogKeys: readonly string[] = Object.keys(rows);
