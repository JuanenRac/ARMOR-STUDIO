/**
 * Interface text of the summary of the contract version of each node (System > Health of the nodes).
 * One row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese; Portuguese (of Portugal) follows in PT.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  ctrs_title: ["Contract version of the nodes", "Versión del contrato de los nodos", "Vertragsversion der Knoten", "Version du contrat des nœuds", "Versione del contratto dei nodi", "ノードの契約バージョン", "节点的契约版本"],
  ctrs_help: ["The server speaks version {server} of the shared contracts. Each node says the version its firmware was checked against.", "El servidor habla la versión {server} de los contratos compartidos. Cada nodo dice la versión con la que se comprobó su firmware.", "Der Server spricht Version {server} der gemeinsamen Verträge. Jeder Knoten nennt die Version, gegen die seine Firmware geprüft wurde.", "Le serveur parle la version {server} des contrats partagés. Chaque nœud indique la version avec laquelle son firmware a été vérifié.", "Il server parla la versione {server} dei contratti condivisi. Ogni nodo dice la versione con cui è stato verificato il suo firmware.", "サーバーは共有契約のバージョン {server} を使います。各ノードは、ファームウェアが確認されたバージョンを報告します。", "服务器使用共享契约的 {server} 版本。每个节点会报告其固件所检查的版本。"],
  ctrs_current: ["Up to date", "Al día", "Aktuell", "À jour", "Aggiornati", "最新", "已是最新"],
  ctrs_older: ["Behind the server", "Por detrás del servidor", "Hinter dem Server", "En retard sur le serveur", "Indietro rispetto al server", "サーバーより古い", "落后于服务器"],
  ctrs_newer: ["Ahead of the server", "Por delante del servidor", "Vor dem Server", "En avance sur le serveur", "Avanti rispetto al server", "サーバーより新しい", "领先于服务器"],
  ctrs_unknown: ["Does not say", "No lo dice", "Nennt keine", "Ne l'indique pas", "Non lo dice", "報告なし", "未报告"],
  ctrs_update: ["Update its firmware.", "Actualiza su firmware.", "Aktualisieren Sie die Firmware.", "Mettez à jour son firmware.", "Aggiorna il suo firmware.", "ファームウェアを更新してください。", "请更新其固件。"],
};

const PT: Record<string, string> = {
  ctrs_title: "Versão do contrato dos nós",
  ctrs_help: "O servidor fala a versão {server} dos contratos partilhados. Cada nó diz a versão com que o seu firmware foi verificado.",
  ctrs_current: "Atualizados",
  ctrs_older: "Atrás do servidor",
  ctrs_newer: "À frente do servidor",
  ctrs_unknown: "Não o diz",
  ctrs_update: "Atualize o seu firmware.",
};

export const contractStatusCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
