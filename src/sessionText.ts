/**
 * The words of the sign-in screen and a few small phrases that were missing or fixed (the "default" of a risk, the questions before stopping the broker, ...). One row per phrase: en, es, de,
 * fr, it, ja, zh. Portuguese is in ptCatalogue.ts like every other phrase.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Locale } from "./i18n";

type Row = readonly [string, string, string, string, string, string, string];
const order: readonly Locale[] = ["en", "es", "de", "fr", "it", "ja", "zh"];

const rows: Record<string, Row> = {
  login_checking: ["Checking the Studio session…", "Comprobando la sesión de Studio…", "Studio-Sitzung wird geprüft…", "Vérification de la session Studio…", "Verifica della sessione di Studio…", "Studio のセッションを確認しています…", "正在检查 Studio 会话…"],
  login_title: ["Local operator access", "Acceso de operador local", "Lokaler Operator-Zugang", "Accès opérateur local", "Accesso operatore locale", "ローカルオペレーターのアクセス", "本地操作员登录"],
  login_server: ["Server", "Servidor", "Server", "Serveur", "Server", "サーバー", "服务器"],
  login_user: ["User", "Usuario", "Benutzer", "Utilisateur", "Utente", "ユーザー", "用户"],
  login_password: ["Password", "Contraseña", "Passwort", "Mot de passe", "Password", "パスワード", "密码"],
  login_enter: ["Enter Studio", "Entrar a Studio", "Studio öffnen", "Entrer dans Studio", "Entra in Studio", "Studio に入る", "进入 Studio"],
  login_busy: ["Checking…", "Verificando…", "Prüfung…", "Vérification…", "Verifica…", "確認中…", "验证中…"],
  login_failed: ["Could not sign in. Check the server, the user and the password.", "No se pudo iniciar sesión. Revisa servidor, usuario y contraseña.", "Anmeldung fehlgeschlagen. Prüfen Sie Server, Benutzer und Passwort.", "Connexion impossible. Vérifiez le serveur, l'utilisateur et le mot de passe.", "Accesso non riuscito. Controlla server, utente e password.", "サインインできませんでした。サーバー、ユーザー、パスワードを確認してください。", "无法登录。请检查服务器、用户和密码。"],
  login_note: ["The password is only sent to the server to open a session (an HttpOnly cookie that lasts as long as the server says); Studio does not keep it, and the camera functions are enabled for that session without any extra token.", "La contraseña solo se envía al servidor para abrir una sesión (una cookie HttpOnly que dura lo que el servidor diga); Studio no la guarda, y las funciones de cámara se habilitan durante esa sesión sin ningún token adicional.", "Das Passwort wird nur an den Server gesendet, um eine Sitzung zu öffnen (ein HttpOnly-Cookie, das so lange gilt, wie der Server es festlegt); Studio speichert es nicht, und die Kamerafunktionen werden für diese Sitzung ohne zusätzliches Token freigegeben.", "Le mot de passe n'est envoyé qu'au serveur pour ouvrir une session (un cookie HttpOnly dont la durée est fixée par le serveur) ; Studio ne le conserve pas, et les fonctions caméra sont activées pour cette session sans jeton supplémentaire.", "La password viene inviata solo al server per aprire una sessione (un cookie HttpOnly che dura quanto stabilisce il server); Studio non la conserva e le funzioni delle telecamere sono abilitate per quella sessione senza alcun token aggiuntivo.", "パスワードはセッションを開くためにサーバーへ送られるだけです（サーバーが定める期間有効な HttpOnly クッキー）。Studio は保存せず、カメラ機能はそのセッション中、追加トークンなしで有効になります。", "密码只会发送给服务器用于建立会话（有效期由服务器决定的 HttpOnly Cookie）；Studio 不保存密码，摄像头功能在该会话期间启用，无需额外令牌。"],
  login_remember: ["Remember me (user name only)", "Recordarme (solo el nombre de usuario)", "Angemeldet bleiben (nur der Benutzername)", "Se souvenir de moi (nom d'utilisateur seulement)", "Ricordami (solo il nome utente)", "ユーザー名のみ記憶する", "记住我（仅用户名）"],
  login_pm_note: ["Studio remembers only the user name, and only if you tick the box. The password is saved, if you want it, only by your browser's or system's own password manager; Studio never stores it.", "Studio recuerda solo el nombre de usuario, y solo si marcas la casilla. La contraseña la guarda, si quieres, únicamente el gestor de contraseñas de tu navegador o sistema; Studio nunca la almacena.", "Studio merkt sich nur den Benutzernamen, und nur wenn du das Kästchen anhakst. Das Passwort speichert, wenn du es willst, allein der Passwortmanager deines Browsers oder Systems; Studio speichert es nie.", "Studio ne retient que le nom d'utilisateur, et seulement si vous cochez la case. Le mot de passe n'est enregistré, si vous le souhaitez, que par le gestionnaire de mots de passe de votre navigateur ou système ; Studio ne le stocke jamais.", "Studio ricorda solo il nome utente, e solo se spunti la casella. La password è salvata, se vuoi, soltanto dal gestore di password del browser o del sistema; Studio non la memorizza mai.", "Studio はユーザー名だけを、チェックを入れた場合に限り記憶します。パスワードは、希望する場合にのみブラウザーまたは OS のパスワードマネージャーが保存し、Studio は保存しません。", "Studio 仅在勾选后记住用户名。密码如需保存，只会由浏览器或系统自带的密码管理器保存；Studio 从不存储密码。"],
  default: ["default", "por defecto", "Standard", "par défaut", "predefinito", "既定", "默认"],
  bk_confirm_stop: ["Stopping the broker leaves every node blind until it is started again. Stop it?", "Parar el broker deja ciegos a todos los nodos hasta que se vuelva a arrancar. ¿Pararlo?", "Wenn der Broker gestoppt wird, sind alle Knoten blind, bis er wieder gestartet wird. Stoppen?", "Arrêter le broker laisse tous les nœuds aveugles jusqu'à son redémarrage. L'arrêter ?", "Fermare il broker lascia ciechi tutti i nodi finché non viene riavviato. Fermarlo?", "ブローカーを止めると、再開するまですべてのノードが見えなくなります。止めますか？", "停止代理后，所有节点在其重新启动前都将失联。要停止吗？"],
  bk_confirm_restart: ["Restarting the broker cuts every node off for a few seconds. Restart it?", "Reiniciar el broker corta a todos los nodos durante unos segundos. ¿Reiniciarlo?", "Beim Neustart des Brokers sind alle Knoten einige Sekunden getrennt. Neu starten?", "Redémarrer le broker coupe tous les nœuds pendant quelques secondes. Le redémarrer ?", "Riavviare il broker scollega tutti i nodi per qualche secondo. Riavviarlo?", "ブローカーを再起動すると、数秒間すべてのノードが切断されます。再起動しますか？", "重启代理会使所有节点断开几秒钟。要重启吗？"],
  last_run_never: ["never", "nunca", "nie", "jamais", "mai", "なし", "从未"],
  media_photo: ["PHOTO", "FOTO", "FOTO", "PHOTO", "FOTO", "写真", "照片"],
  snapshot_login_refused: ["The snapshot address cannot carry a user name or a password (user:password@ or ?pwd=...). Use the user and password fields of the camera.", "La dirección de la captura no puede llevar usuario ni contraseña (usuario:clave@ o ?pwd=...). Usa los campos de usuario y contraseña de la cámara.", "Die Snapshot-Adresse darf keinen Benutzernamen und kein Passwort enthalten (benutzer:passwort@ oder ?pwd=...). Verwenden Sie die Felder für Benutzer und Passwort der Kamera.", "L'adresse de l'instantané ne doit pas contenir d'identifiant ni de mot de passe (utilisateur:mot_de_passe@ ou ?pwd=...). Utilisez les champs identifiant et mot de passe de la caméra.", "L'indirizzo dell'istantanea non può contenere utente né password (utente:password@ o ?pwd=...). Usa i campi utente e password della telecamera.", "スナップショットのアドレスにユーザー名やパスワードを含めることはできません（user:pass@ や ?pwd=...）。カメラのユーザー名とパスワードの欄を使ってください。", "快照地址不能包含用户名或密码（user:pass@ 或 ?pwd=...）。请使用摄像头的用户名和密码字段。"],
  panel_account_notice: ["This account is for a wall panel (ARMOR-ALARM or ARMOR-HMI) and cannot use Studio. Sign in with an administrator, operator or viewer account.", "Esta cuenta es de un panel de pared (ARMOR-ALARM o ARMOR-HMI) y no puede usar Studio. Entra con una cuenta de administrador, operador o visor.", "Dieses Konto gehört zu einem Wandpanel (ARMOR-ALARM oder ARMOR-HMI) und kann Studio nicht nutzen. Melden Sie sich mit einem Administrator-, Operator- oder Betrachter-Konto an.", "Ce compte est celui d'un panneau mural (ARMOR-ALARM ou ARMOR-HMI) et ne peut pas utiliser Studio. Connectez-vous avec un compte administrateur, opérateur ou lecteur.", "Questo account è di un pannello a muro (ARMOR-ALARM o ARMOR-HMI) e non può usare Studio. Accedi con un account amministratore, operatore o osservatore.", "このアカウントは壁面パネル（ARMOR-ALARM または ARMOR-HMI）用で、Studio は使えません。管理者・オペレーター・閲覧者のアカウントでサインインしてください。", "此账户用于壁挂面板（ARMOR-ALARM 或 ARMOR-HMI），不能使用 Studio。请使用管理员、操作员或查看者账户登录。"],
  media_video: ["VIDEO", "VÍDEO", "VIDEO", "VIDÉO", "VIDEO", "動画", "视频"],
};

/** Phrases of the site designer and of the camera menu that were still in English in Japanese and Chinese. */
const japanese: Record<string, string> = {
  siteDesigner: "敷地デザイナー", siteObjects: "敷地オブジェクト", toolSolar: "ソーラーパネル", toolCanopy: "キャノピー", toolPillar: "柱", toolEntrance: "入口",
  objectDeleted: "オブジェクトを削除しました。", deleteObject: "オブジェクトを削除", addStorey: "上に同じ平面を複製", activeFloor: "現在の階", storeyCreated: "現在の平面から新しい階を作成しました。",
  roofStyle: "屋根の形状", viewportNavigation: "ビューの操作", objectHeight: "高さ", objectElevation: "標高", objectRotation: "回転", objectProperties: "プロパティ", objectCreated: "作成しました。",
  terrain: "地形", studioAccessActive: "Studio のカメラセッションは有効です。", studioAccessWaiting: "Studio のセッションは有効ではなくなりました。",
  studioAccessNotice: "カメラ操作はサインイン済みの Studio セッションを使います。サーバーを再起動した場合は、もう一度サインインしてください。",
  discoverRtsp: "ストリームを検出", rtspFound: "RTSP ストリームが見つかりました", rtspDiscoverFailed: "RTSP の検出でカメラに接続できませんでした。",
  rtspDiscovering: "既知の RTSP パスを試しています。最大 25 秒かかることがあります。", credentialsStored: "認証情報はローカルサーバーが安全に保管しています。",
  rtspPath: "RTSP パス", maximizeCamera: "カメラを最大化", previousCamera: "前のカメラ", nextCamera: "次のカメラ", ptzControls: "PTZ 操作", online: "オンライン",
};
const chinese: Record<string, string> = {
  siteDesigner: "场地设计器", siteObjects: "场地对象", toolSolar: "太阳能板", toolCanopy: "雨棚", toolPillar: "立柱", toolEntrance: "入口",
  objectDeleted: "对象已删除。", deleteObject: "删除对象", addStorey: "在上方复制底面", activeFloor: "当前楼层", storeyCreated: "已根据当前底面创建新楼层。",
  roofStyle: "屋顶样式", viewportNavigation: "视图导航", objectHeight: "高度", objectElevation: "标高", objectRotation: "旋转", objectProperties: "属性", objectCreated: "已创建。",
  terrain: "地形", studioAccessActive: "Studio 摄像头会话已激活。", studioAccessWaiting: "Studio 会话已失效。",
  studioAccessNotice: "摄像头控制使用已登录的 Studio 会话。如果服务器重启过，请重新登录。",
};

export const sessionCatalogue = (locale: Locale): Record<string, string> => {
  const index = order.indexOf(locale);
  if (index < 0) return {};
  const own = Object.fromEntries(Object.entries(rows).map(([key, row]) => [key, row[index]]));
  return locale === "ja" ? { ...own, ...japanese } : locale === "zh" ? { ...own, ...chinese } : own;
};

/** The phrases in this file, for the Portuguese table to be checked against. */
export const sessionKeys: readonly string[] = Object.keys(rows);
