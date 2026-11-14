/**
 * Interface text of the card that gives the key of a node for the signed commands (Configuration > Administration).
 * One row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese; Portuguese (of Portugal) follows in PT.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  nk_title: ["Key of a node for the signed commands", "Clave de un nodo para las órdenes firmadas", "Schlüssel eines Knotens für signierte Befehle", "Clé d'un nœud pour les commandes signées", "Chiave di un nodo per i comandi firmati", "署名付きコマンド用のノードの鍵", "节点的签名命令密钥"],
  nk_help: [
    "With the security option Sign the critical commands on, a node can take only the commands this server signed. Type the id of the node, read its key and paste it in the settings of that node (the command key of an alarm panel or of an electrical node). The key is its own: it works for no other node.",
    "Con la opción de seguridad Firmar las órdenes críticas activada, un nodo puede aceptar solo las órdenes que este servidor firmó. Escribe el id del nodo, lee su clave y pégala en los ajustes de ese nodo (la clave de órdenes de una central de alarma o de un nodo eléctrico). La clave es suya: no sirve para ningún otro nodo.",
    "Ist die Sicherheitsoption Kritische Befehle signieren eingeschaltet, nimmt ein Knoten nur Befehle an, die dieser Server signiert hat. Geben Sie die ID des Knotens ein, lesen Sie seinen Schlüssel und fügen Sie ihn in die Einstellungen dieses Knotens ein (der Befehlsschlüssel einer Alarmzentrale oder eines Elektroknotens). Der Schlüssel gehört nur ihm: Für keinen anderen Knoten gilt er.",
    "Avec l'option de sécurité Signer les commandes critiques activée, un nœud ne peut prendre que les commandes que ce serveur a signées. Saisissez l'identifiant du nœud, lisez sa clé et collez-la dans les réglages de ce nœud (la clé de commande d'une centrale d'alarme ou d'un nœud électrique). La clé est la sienne : elle ne vaut pour aucun autre nœud.",
    "Con l'opzione di sicurezza Firma i comandi critici attiva, un nodo può accettare solo i comandi firmati da questo server. Scrivi l'id del nodo, leggi la sua chiave e incollala nelle impostazioni di quel nodo (la chiave dei comandi di una centrale d'allarme o di un nodo elettrico). La chiave è sua: non vale per nessun altro nodo.",
    "セキュリティオプション「重要コマンドに署名する」がオンのとき、ノードはこのサーバーが署名したコマンドだけを受け付けます。ノードのIDを入力して鍵を読み取り、そのノードの設定(アラームパネルまたは電気ノードのコマンド鍵)に貼り付けてください。鍵はそのノード専用で、他のノードでは使えません。",
    "开启安全选项“为关键命令签名”后，节点只接受本服务器签名的命令。输入节点 ID，读取其密钥，并粘贴到该节点的设置中(报警面板或电气节点的命令密钥)。该密钥只属于这个节点，对其他节点无效。",
  ],
  nk_id: ["Node id", "Id del nodo", "Knoten-ID", "Identifiant du nœud", "Id del nodo", "ノードID", "节点 ID"],
  nk_read: ["Read the key", "Leer la clave", "Schlüssel lesen", "Lire la clé", "Leggi la chiave", "鍵を読み取る", "读取密钥"],
  nk_key: ["Key of this node", "Clave de este nodo", "Schlüssel dieses Knotens", "Clé de ce nœud", "Chiave di questo nodo", "このノードの鍵", "此节点的密钥"],
  nk_copy: ["Copy", "Copiar", "Kopieren", "Copier", "Copia", "コピー", "复制"],
  nk_copied: ["Copied", "Copiada", "Kopiert", "Copiée", "Copiata", "コピーしました", "已复制"],
  nk_clears: ["It disappears from this screen in a minute. Treat it like a password.", "Desaparece de esta pantalla en un minuto. Trátala como una contraseña.", "Er verschwindet in einer Minute von diesem Bildschirm. Behandeln Sie ihn wie ein Passwort.", "Elle disparaît de cet écran dans une minute. Traitez-la comme un mot de passe.", "Sparisce da questa schermata fra un minuto. Trattala come una password.", "1分後にこの画面から消えます。パスワードと同じように扱ってください。", "一分钟后会从此屏幕消失。请像对待密码一样对待它。"],
  nk_off: ["The server gave no key: the security option Sign the critical commands is off.", "El servidor no dio clave: la opción de seguridad Firmar las órdenes críticas está desactivada.", "Der Server hat keinen Schlüssel gegeben: Die Sicherheitsoption Kritische Befehle signieren ist aus.", "Le serveur n'a pas donné de clé : l'option de sécurité Signer les commandes critiques est désactivée.", "Il server non ha dato alcuna chiave: l'opzione di sicurezza Firma i comandi critici è disattivata.", "サーバーは鍵を返しませんでした。セキュリティオプション「重要コマンドに署名する」がオフです。", "服务器没有给出密钥：安全选项“为关键命令签名”已关闭。"],
  nk_bad_id: ["That is not the id of a node (lowercase letters, digits, - and _).", "Eso no es el id de un nodo (minúsculas, cifras, - y _).", "Das ist keine Knoten-ID (Kleinbuchstaben, Ziffern, - und _).", "Ce n'est pas l'identifiant d'un nœud (minuscules, chiffres, - et _).", "Non è l'id di un nodo (minuscole, cifre, - e _).", "ノードIDではありません(小文字、数字、-、_)。", "这不是节点 ID(小写字母、数字、- 和 _)。"],
};

const PT: Record<string, string> = {
  nk_title: "Chave de um nó para os comandos assinados",
  nk_help: "Com a opção de segurança Assinar os comandos críticos ligada, um nó só pode aceitar os comandos que este servidor assinou. Escreva o id do nó, leia a sua chave e cole-a nas definições desse nó (a chave de comandos de uma central de alarme ou de um nó elétrico). A chave é só dele: não serve para nenhum outro nó.",
  nk_id: "Id do nó", nk_read: "Ler a chave", nk_key: "Chave deste nó", nk_copy: "Copiar", nk_copied: "Copiada",
  nk_clears: "Desaparece deste ecrã dentro de um minuto. Trate-a como uma palavra-passe.",
  nk_off: "O servidor não deu chave: a opção de segurança Assinar os comandos críticos está desligada.",
  nk_bad_id: "Isso não é o id de um nó (minúsculas, algarismos, - e _).",
};

export const nodeKeyCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
