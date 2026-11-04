/**
 * The words of the warning about the contracts of a node (Radar > Nodes), one row per phrase: en, es, de, fr, it, ja, zh. Portuguese is in ptCatalogue.ts like every other phrase.
 * "{node}" and "{server}" are replaced by the two versions.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Locale } from "./i18n";

type Row = readonly [string, string, string, string, string, string, string];
const order: readonly Locale[] = ["en", "es", "de", "fr", "it", "ja", "zh"];

const rows: Record<string, Row> = {
  ct_differs: [
    "contracts {node}, the server {server}",
    "contratos {node}, el servidor {server}",
    "Verträge {node}, der Server {server}",
    "contrats {node}, le serveur {server}",
    "contratti {node}, il server {server}",
    "契約 {node}、サーバー {server}",
    "契约 {node}，服务器 {server}",
  ],
  ct_help: [
    "This node was built against other contracts than the server uses. They may still work together; update the node or the server so that both are of the same version of the family.",
    "Este nodo se construyó con otros contratos que los del servidor. Puede que sigan funcionando juntos; actualiza el nodo o el servidor para que sean de la misma versión de la familia.",
    "Dieser Knoten wurde gegen andere Verträge gebaut als die, die der Server verwendet. Sie können weiter zusammenarbeiten; aktualisieren Sie den Knoten oder den Server, damit beide zur selben Version der Familie gehören.",
    "Ce nœud a été construit avec d'autres contrats que ceux du serveur. Ils peuvent continuer à fonctionner ensemble ; mettez à jour le nœud ou le serveur pour qu'ils soient de la même version de la famille.",
    "Questo nodo è stato costruito con contratti diversi da quelli del server. Possono continuare a funzionare insieme; aggiorna il nodo o il server perché siano della stessa versione della famiglia.",
    "このノードはサーバーとは別の契約でビルドされています。そのまま動くこともありますが、両方が同じバージョンになるようノードまたはサーバーを更新してください。",
    "此节点使用的契约与服务器不同。它们可能仍能一起工作；请更新节点或服务器，使两者属于同一个版本。",
  ],
};

export const contractCatalogue = (locale: Locale): Record<string, string> => {
  const index = order.indexOf(locale);
  if (index < 0) return {};
  return Object.fromEntries(Object.entries(rows).map(([key, row]) => [key, row[index]]));
};

/** The phrases in this file, for the Portuguese table to be checked against. */
export const contractKeys: readonly string[] = Object.keys(rows);
