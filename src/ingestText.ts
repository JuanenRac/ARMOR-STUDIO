/**
 * The phrases of the list of what the nodes send (System menu), in the seven languages.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  ing_title: ["What the nodes send", "Lo que mandan los nodos", "Was die Knoten senden", "Ce que envoient les nœuds", "Cosa inviano i nodi", "ノードからの受信", "节点发送的内容"],
  ing_help: ["Every topic the server received from the nodes: how many messages it took, how many it refused and why. A node that does not show up in its menu is explained here.", "Cada tema que el servidor ha recibido de los nodos: cuántos mensajes aceptó, cuántos rechazó y por qué. Un nodo que no aparece en su menú se explica aquí.", "Jedes Thema, das der Server von den Knoten erhalten hat: wie viele Nachrichten angenommen, wie viele abgelehnt wurden und warum. Ein Knoten, der in seinem Menü fehlt, wird hier erklärt.", "Chaque sujet reçu par le serveur de la part des nœuds : combien de messages acceptés, combien refusés et pourquoi. Un nœud absent de son menu s'explique ici.", "Ogni argomento che il server ha ricevuto dai nodi: quanti messaggi ha accettato, quanti rifiutato e perché. Un nodo che non compare nel suo menu si spiega qui.", "サーバーがノードから受け取った各トピック：受理した件数、拒否した件数とその理由。メニューに現れないノードの原因はここで分かります。", "服务器从节点收到的每个主题：接受了多少条消息、拒绝了多少条以及原因。节点没有出现在菜单中的原因可在此查看。"],
  ing_topic: ["Topic", "Tema", "Thema", "Sujet", "Argomento", "トピック", "主题"],
  ing_ok: ["Taken", "Aceptados", "Angenommen", "Acceptés", "Accettati", "受理", "已接受"],
  ing_bad: ["Refused", "Rechazados", "Abgelehnt", "Refusés", "Rifiutati", "拒否", "已拒绝"],
  ing_last: ["Last message taken", "Último mensaje aceptado", "Letzte angenommene Nachricht", "Dernier message accepté", "Ultimo messaggio accettato", "最後に受理", "最近接受"],
  ing_why: ["Last refusal", "Último rechazo", "Letzte Ablehnung", "Dernier refus", "Ultimo rifiuto", "直近の拒否", "最近拒绝"],
  ing_ignored: ["Fields of a newer firmware that this server ignores", "Campos de un firmware más nuevo que este servidor ignora", "Felder einer neueren Firmware, die dieser Server ignoriert", "Champs d'un firmware plus récent que ce serveur ignore", "Campi di un firmware più recente che questo server ignora", "このサーバーが無視する新しいファームウェアの項目", "此服务器忽略的较新固件字段"],
  ing_empty: ["No node has sent anything since the server started.", "Ningún nodo ha enviado nada desde que arrancó el servidor.", "Seit dem Start des Servers hat kein Knoten etwas gesendet.", "Aucun nœud n'a rien envoyé depuis le démarrage du serveur.", "Nessun nodo ha inviato nulla da quando il server è partito.", "サーバー起動後、ノードからの送信はありません。", "服务器启动以来没有任何节点发送数据。"],
  ing_payload: ["What was sent (start)", "Lo que se envió (principio)", "Gesendet (Anfang)", "Ce qui a été envoyé (début)", "Cosa è stato inviato (inizio)", "送信内容（先頭）", "发送内容（开头）"],
};
export const ingestCatalogues = cataloguesFromRows(ROWS);
