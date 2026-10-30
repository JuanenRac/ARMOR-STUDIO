/**
 * Interface text of the settings of a node that Studio sets from a screen (today: how many wrong passwords per minute the node lets through before it locks sign-in), one row per phrase:
 * English, Spanish, German, French, Italian, Japanese, Chinese; Portuguese follows in PT. `ns_why_*` are the reasons the node's own panel gave and `ns_err_*` the answers of the server.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  ns_open: ["Settings of the node (sign-in limit)", "Ajustes del nodo (límite de acceso)", "Einstellungen des Knotens (Anmeldelimit)", "Réglages du nœud (limite de connexion)", "Impostazioni del nodo (limite di accesso)", "ノードの設定（ログイン制限）", "节点设置（登录限制）"],
  ns_title: ["Settings of the node", "Ajustes del nodo", "Einstellungen des Knotens", "Réglages du nœud", "Impostazioni del nodo", "ノードの設定", "节点设置"],
  ns_help: ["Reads and changes a setting that is kept in the node itself. Give the login of the node's own panel: it is used once and never kept.", "Lee y cambia un ajuste que se guarda en el propio nodo. Indica el acceso al panel del nodo: se usa una vez y no se guarda.", "Liest und ändert eine Einstellung, die im Knoten selbst gespeichert ist. Geben Sie den Zugang zum Panel des Knotens an: Er wird einmal verwendet und nie gespeichert.", "Lit et modifie un réglage conservé dans le nœud lui-même. Indiquez l'identifiant du panneau du nœud : il est utilisé une fois et jamais conservé.", "Legge e modifica un'impostazione conservata nel nodo stesso. Indica l'accesso al pannello del nodo: viene usato una volta e non viene conservato.", "ノード自体に保存されている設定を読み取り・変更します。ノードのパネルのログイン情報を入力してください。一度だけ使用し、保存されません。", "读取并修改保存在节点本身的设置。请填写节点面板的登录信息：只使用一次，不会被保存。"],
  ns_user: ["User of the node's panel", "Usuario del panel del nodo", "Benutzer des Knoten-Panels", "Utilisateur du panneau du nœud", "Utente del pannello del nodo", "ノードのパネルのユーザー", "节点面板的用户"],
  ns_password: ["Password of the node's panel", "Contraseña del panel del nodo", "Passwort des Knoten-Panels", "Mot de passe du panneau du nœud", "Password del pannello del nodo", "ノードのパネルのパスワード", "节点面板的密码"],
  ns_read: ["Read the setting", "Leer el ajuste", "Einstellung lesen", "Lire le réglage", "Leggi l'impostazione", "設定を読み取る", "读取设置"],
  ns_save: ["Save in the node", "Guardar en el nodo", "Im Knoten speichern", "Enregistrer dans le nœud", "Salva nel nodo", "ノードに保存", "保存到节点"],
  ns_limit: ["Wrong passwords per minute before sign-in is locked", "Contraseñas erróneas por minuto antes de bloquear el acceso", "Falsche Passwörter pro Minute, bevor die Anmeldung gesperrt wird", "Mots de passe erronés par minute avant le blocage de la connexion", "Password errate al minuto prima del blocco dell'accesso", "ログインがロックされるまでの 1 分あたりの誤パスワード回数", "每分钟输错密码多少次后锁定登录"],
  ns_limit_help: ["30 is the usual value. 0 turns this limit off (each user and address still has its own limit). At most 120. The node applies it at once, without restarting.", "30 es el valor habitual. 0 desactiva este límite (cada usuario y dirección sigue teniendo el suyo). Máximo 120. El nodo lo aplica al instante, sin reiniciar.", "30 ist der übliche Wert. 0 schaltet dieses Limit ab (jeder Benutzer und jede Adresse behält sein eigenes Limit). Höchstens 120. Der Knoten übernimmt den Wert sofort, ohne Neustart.", "30 est la valeur habituelle. 0 désactive cette limite (chaque utilisateur et chaque adresse garde la sienne). 120 au maximum. Le nœud l'applique tout de suite, sans redémarrer.", "30 è il valore abituale. 0 disattiva questo limite (ogni utente e indirizzo mantiene il proprio). Al massimo 120. Il nodo lo applica subito, senza riavviarsi.", "通常は 30 です。0 にするとこの制限を無効にします（ユーザーごと・アドレスごとの制限は残ります）。最大 120。ノードは再起動せずにすぐ適用します。", "常用值为 30。设为 0 将关闭此限制（每个用户和地址仍有各自的限制）。最大 120。节点无需重启即可立即生效。"],
  ns_current: ["The node has it at {0}.", "El nodo lo tiene en {0}.", "Der Knoten hat den Wert {0}.", "Le nœud l'a réglé sur {0}.", "Il nodo lo ha impostato a {0}.", "ノードの現在値は {0} です。", "节点当前的值为 {0}。"],
  ns_current_off: ["The node has this limit turned off (0).", "El nodo tiene este límite desactivado (0).", "Der Knoten hat dieses Limit abgeschaltet (0).", "Le nœud a désactivé cette limite (0).", "Il nodo ha disattivato questo limite (0).", "ノードではこの制限が無効（0）になっています。", "节点已关闭此限制（0）。"],
  ns_saved: ["Saved: the node has it at {0}.", "Guardado: el nodo lo tiene en {0}.", "Gespeichert: Der Knoten hat den Wert {0}.", "Enregistré : le nœud l'a réglé sur {0}.", "Salvato: il nodo lo ha impostato a {0}.", "保存しました。ノードの現在値は {0} です。", "已保存：节点当前的值为 {0}。"],
  ns_why_panel_login_refused: ["The node's panel refused that user or password.", "El panel del nodo rechazó ese usuario o contraseña.", "Das Panel des Knotens hat diesen Benutzer oder dieses Passwort abgelehnt.", "Le panneau du nœud a refusé cet utilisateur ou ce mot de passe.", "Il pannello del nodo ha rifiutato quell'utente o quella password.", "ノードのパネルがそのユーザーまたはパスワードを拒否しました。", "节点面板拒绝了该用户或密码。"],
  ns_why_panel_login_failed: ["The node's panel did not accept the login.", "El panel del nodo no aceptó el acceso.", "Das Panel des Knotens hat die Anmeldung nicht akzeptiert.", "Le panneau du nœud n'a pas accepté la connexion.", "Il pannello del nodo non ha accettato l'accesso.", "ノードのパネルがログインを受け付けませんでした。", "节点面板未接受该登录。"],
  ns_why_panel_not_reachable: ["The node's panel did not answer.", "El panel del nodo no respondió.", "Das Panel des Knotens hat nicht geantwortet.", "Le panneau du nœud n'a pas répondu.", "Il pannello del nodo non ha risposto.", "ノードのパネルから応答がありません。", "节点面板没有响应。"],
  ns_why_panel_config_refused: ["The node refused the setting.", "El nodo rechazó el ajuste.", "Der Knoten hat die Einstellung abgelehnt.", "Le nœud a refusé le réglage.", "Il nodo ha rifiutato l'impostazione.", "ノードが設定を拒否しました。", "节点拒绝了该设置。"],
  ns_why_setting_unknown: ["This node does not have the setting: its firmware is older.", "Este nodo no tiene el ajuste: su firmware es más antiguo.", "Dieser Knoten hat die Einstellung nicht: Seine Firmware ist älter.", "Ce nœud n'a pas ce réglage : son firmware est plus ancien.", "Questo nodo non ha l'impostazione: il suo firmware è più vecchio.", "このノードにはこの設定がありません。ファームウェアが古いためです。", "该节点没有此设置：其固件较旧。"],
  ns_err_forbidden: ["Only an administrator can change the settings of a node.", "Solo un administrador puede cambiar los ajustes de un nodo.", "Nur ein Administrator kann die Einstellungen eines Knotens ändern.", "Seul un administrateur peut modifier les réglages d'un nœud.", "Solo un amministratore può modificare le impostazioni di un nodo.", "ノードの設定を変更できるのは管理者だけです。", "只有管理员才能修改节点设置。"],
  ns_err_generic: ["The server could not do it: check the address of the node and the values.", "El servidor no pudo hacerlo: revisa la dirección del nodo y los valores.", "Der Server konnte es nicht ausführen: Prüfen Sie die Adresse des Knotens und die Werte.", "Le serveur n'a pas pu le faire : vérifiez l'adresse du nœud et les valeurs.", "Il server non è riuscito a farlo: controlla l'indirizzo del nodo e i valori.", "サーバーで実行できませんでした。ノードのアドレスと値を確認してください。", "服务器无法完成：请检查节点地址和数值。"],
};

const PT: Record<string, string> = {
  ns_open: "Definições do nó (limite de início de sessão)", ns_title: "Definições do nó",
  ns_help: "Lê e altera uma definição guardada no próprio nó. Indique o início de sessão do painel do nó: usa-se uma vez e nunca se guarda.",
  ns_user: "Utilizador do painel do nó", ns_password: "Palavra-passe do painel do nó",
  ns_read: "Ler a definição", ns_save: "Guardar no nó",
  ns_limit: "Palavras-passe erradas por minuto antes de bloquear o início de sessão",
  ns_limit_help: "30 é o valor habitual. 0 desativa este limite (cada utilizador e endereço continua a ter o seu). No máximo 120. O nó aplica-o logo, sem reiniciar.",
  ns_current: "O nó tem-no em {0}.", ns_current_off: "O nó tem este limite desativado (0).", ns_saved: "Guardado: o nó tem-no em {0}.",
  ns_why_panel_login_refused: "O painel do nó recusou esse utilizador ou palavra-passe.", ns_why_panel_login_failed: "O painel do nó não aceitou o início de sessão.",
  ns_why_panel_not_reachable: "O painel do nó não respondeu.", ns_why_panel_config_refused: "O nó recusou a definição.",
  ns_why_setting_unknown: "Este nó não tem a definição: o seu firmware é mais antigo.",
  ns_err_forbidden: "Só um administrador pode alterar as definições de um nó.", ns_err_generic: "O servidor não conseguiu fazê-lo: verifique o endereço do nó e os valores.",
};

export const nodeSettingsCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
