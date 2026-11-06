/**
 * The phrases of the list of what the nodes send (System menu), in seven languages (the eighth, Portuguese, is in ptCatalogue.ts).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

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
  rec_title: ["Copy of the node traffic", "Copia del tráfico de los nodos", "Kopie des Knotenverkehrs", "Copie du trafic des nœuds", "Copia del traffico dei nodi", "ノード通信の控え", "节点流量副本"],
  rec_help: ["The file the server writes while the option in Configuration > Security is on, for playing an incident again on the bench. It never holds orders to the nodes or fields that look like a secret.", "El archivo que el servidor escribe mientras la opción de Configuración > Seguridad está activada, para reproducir un incidente en el banco. Nunca contiene órdenes a los nodos ni campos que parezcan un secreto.", "Die Datei, die der Server schreibt, solange die Option unter Konfiguration > Sicherheit eingeschaltet ist, um einen Vorfall auf dem Prüfstand erneut abzuspielen. Sie enthält nie Befehle an die Knoten oder Felder, die wie ein Geheimnis aussehen.", "Le fichier que le serveur écrit tant que l'option de Configuration > Sécurité est activée, pour rejouer un incident sur le banc. Il ne contient jamais d'ordres aux nœuds ni de champs qui ressemblent à un secret.", "Il file che il server scrive finché l'opzione di Configurazione > Sicurezza è attivata, per riprodurre un incidente sul banco. Non contiene mai ordini ai nodi né campi che sembrino un segreto.", "設定 > セキュリティのオプションがオンの間にサーバーが書き込むファイルで、試験台でインシデントを再生するためのものです。ノードへの命令や秘密に見える項目は含まれません。", "当“配置 > 安全”中的选项开启时服务器写入的文件，用于在测试台上重放事件。其中绝不包含发给节点的命令或看起来像机密的字段。"],
  rec_off: ["The copy is off. Nothing is written and the file cannot be downloaded.", "La copia está desactivada. No se escribe nada y el archivo no se puede descargar.", "Die Kopie ist ausgeschaltet. Es wird nichts geschrieben und die Datei kann nicht heruntergeladen werden.", "La copie est désactivée. Rien n'est écrit et le fichier ne peut pas être téléchargé.", "La copia è disattivata. Non viene scritto nulla e il file non si può scaricare.", "控えはオフです。何も書き込まれず、ファイルもダウンロードできません。", "副本已关闭。不会写入任何内容，也无法下载文件。"],
  rec_on: ["The copy is on.", "La copia está activada.", "Die Kopie ist eingeschaltet.", "La copie est activée.", "La copia è attivata.", "控えはオンです。", "副本已开启。"],
  rec_stats: ["{0} messages since the server started: {1} taken, {2} refused, {3} that the simulator cannot play.", "{0} mensajes desde que arrancó el servidor: {1} aceptados, {2} rechazados, {3} que el simulador no puede reproducir.", "{0} Nachrichten seit dem Start des Servers: {1} angenommen, {2} abgelehnt, {3}, die der Simulator nicht abspielen kann.", "{0} messages depuis le démarrage du serveur : {1} acceptés, {2} refusés, {3} que le simulateur ne peut pas rejouer.", "{0} messaggi dall'avvio del server: {1} accettati, {2} rifiutati, {3} che il simulatore non può riprodurre.", "サーバー起動後 {0} 件：受理 {1}、拒否 {2}、シミュレーターで再生できないもの {3}。", "服务器启动以来共 {0} 条消息：接受 {1}、拒绝 {2}、模拟器无法重放 {3}。"],
  rec_size: ["Current file {0} of at most {1}; {2} of up to {3} files kept; rotated {4} times.", "Archivo actual {0} de como máximo {1}; {2} de hasta {3} archivos guardados; rotado {4} veces.", "Aktuelle Datei {0} von höchstens {1}; {2} von bis zu {3} Dateien aufbewahrt; {4}-mal rotiert.", "Fichier actuel {0} sur {1} au plus ; {2} fichiers conservés sur {3} au maximum ; rotation {4} fois.", "File attuale {0} di al massimo {1}; {2} di al massimo {3} file conservati; ruotato {4} volte.", "現在のファイル {0}（上限 {1}）、保持 {2}/最大 {3} ファイル、ローテーション {4} 回。", "当前文件 {0}，上限 {1}；已保留 {2}/最多 {3} 个文件；已轮转 {4} 次。"],
  rec_since: ["First message of this run", "Primer mensaje de esta ejecución", "Erste Nachricht dieses Laufs", "Premier message de cette exécution", "Primo messaggio di questa esecuzione", "今回の最初のメッセージ", "本次运行的第一条消息"],
  rec_download: ["Download", "Descargar", "Herunterladen", "Télécharger", "Scarica", "ダウンロード", "下载"],
  rec_file_now: ["Being written now", "Se está escribiendo ahora", "Wird gerade geschrieben", "En cours d'écriture", "In scrittura ora", "書き込み中", "正在写入"],
  rec_file_old: ["Older file {0}", "Archivo anterior {0}", "Ältere Datei {0}", "Fichier plus ancien {0}", "File precedente {0}", "古いファイル {0}", "较旧的文件 {0}"],
  rec_done: ["The file was downloaded. Keep it as private as the server itself.", "El archivo se ha descargado. Manténlo tan privado como el propio servidor.", "Die Datei wurde heruntergeladen. Halten Sie sie so privat wie den Server selbst.", "Le fichier a été téléchargé. Gardez-le aussi privé que le serveur lui-même.", "Il file è stato scaricato. Tienilo privato quanto il server stesso.", "ファイルをダウンロードしました。サーバーと同じくらい厳重に保管してください。", "文件已下载。请像保护服务器本身一样保护它。"],
  rec_err_recording_disabled: ["The copy is off: turn it on in Configuration > Security first.", "La copia está desactivada: actívala antes en Configuración > Seguridad.", "Die Kopie ist ausgeschaltet: Schalten Sie sie zuerst unter Konfiguration > Sicherheit ein.", "La copie est désactivée : activez-la d'abord dans Configuration > Sécurité.", "La copia è disattivata: attivala prima in Configurazione > Sicurezza.", "控えがオフです。先に設定 > セキュリティでオンにしてください。", "副本已关闭：请先在“配置 > 安全”中开启。"],
  rec_err_rate_limited: ["Too many downloads in the last hour. Try again later.", "Demasiadas descargas en la última hora. Inténtalo más tarde.", "Zu viele Downloads in der letzten Stunde. Versuchen Sie es später erneut.", "Trop de téléchargements dans la dernière heure. Réessayez plus tard.", "Troppi download nell'ultima ora. Riprova più tardi.", "直近1時間のダウンロードが多すぎます。後でもう一度お試しください。", "过去一小时下载次数过多，请稍后再试。"],
  rec_err_status_429: ["Too many downloads in the last hour. Try again later.", "Demasiadas descargas en la última hora. Inténtalo más tarde.", "Zu viele Downloads in der letzten Stunde. Versuchen Sie es später erneut.", "Trop de téléchargements dans la dernière heure. Réessayez plus tard.", "Troppi download nell'ultima ora. Riprova più tardi.", "直近1時間のダウンロードが多すぎます。後でもう一度お試しください。", "过去一小时下载次数过多，请稍后再试。"],
  rec_err_not_found: ["That file does not exist (any more).", "Ese archivo no existe (ya).", "Diese Datei gibt es nicht (mehr).", "Ce fichier n'existe pas (ou plus).", "Quel file non esiste (più).", "そのファイルは存在しません（または既にありません）。", "该文件不存在（或已不存在）。"],
  rec_err_forbidden: ["Only an administrator may download it.", "Solo un administrador puede descargarlo.", "Nur ein Administrator darf sie herunterladen.", "Seul un administrateur peut le télécharger.", "Solo un amministratore può scaricarlo.", "管理者のみダウンロードできます。", "只有管理员才能下载。"],
  rec_err_generic: ["The file could not be downloaded.", "No se pudo descargar el archivo.", "Die Datei konnte nicht heruntergeladen werden.", "Le fichier n'a pas pu être téléchargé.", "Non è stato possibile scaricare il file.", "ファイルをダウンロードできませんでした。", "无法下载该文件。"],
};
const PT: Record<string, string> = {
  rec_title: "Cópia do tráfego dos nós",
  rec_help: "O ficheiro que o servidor escreve enquanto a opção de Configuração > Segurança estiver ligada, para reproduzir um incidente na bancada. Nunca contém ordens para os nós nem campos que pareçam um segredo.",
  rec_off: "A cópia está desligada. Não se escreve nada e o ficheiro não pode ser descarregado.",
  rec_on: "A cópia está ligada.",
  rec_stats: "{0} mensagens desde que o servidor arrancou: {1} aceites, {2} recusadas, {3} que o simulador não consegue reproduzir.",
  rec_size: "Ficheiro atual com {0} de, no máximo, {1}; {2} de até {3} ficheiros guardados; rodado {4} vezes.",
  rec_since: "Primeira mensagem desta execução",
  rec_download: "Descarregar",
  rec_file_now: "A ser escrito agora",
  rec_file_old: "Ficheiro anterior {0}",
  rec_done: "O ficheiro foi descarregado. Mantenha-o tão privado como o próprio servidor.",
  rec_err_recording_disabled: "A cópia está desligada: ligue-a primeiro em Configuração > Segurança.",
  rec_err_rate_limited: "Demasiados descarregamentos na última hora. Tente mais tarde.",
  rec_err_status_429: "Demasiados descarregamentos na última hora. Tente mais tarde.",
  rec_err_not_found: "Esse ficheiro não existe (ou já não existe).",
  rec_err_forbidden: "Só um administrador o pode descarregar.",
  rec_err_generic: "Não foi possível descarregar o ficheiro.",
};
export const ingestCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
