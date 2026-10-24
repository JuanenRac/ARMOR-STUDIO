/**
 * How many nodes of every kind there are and how many answer: the count of the bottom bar and of the overview.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 *
 * The radar nodes arrive on the live telemetry stream; every kind of node (radar, solar, electrical, alarm and hmi) reports its health to the server. The census takes both: a node that
 * is on the stream is counted with what the stream says, one that only reports its health with what the health says, and one that is in both is online when either says so.
 */
import type { HealthFamily, NodeHealthList } from "./api/nodeHealth";

export type CensusFamily = { family: HealthFamily; online: number; total: number };
export type NodeCensus = { online: number; total: number; families: CensusFamily[]; silent: Array<{ node_id: string; family: HealthFamily }> };

const ORDER: readonly HealthFamily[] = ["radar", "solar", "electrical", "alarm", "hmi"];

export function nodeCensus(radar: ReadonlyArray<{ node_id: string; online: boolean; stale?: boolean }>, health: NodeHealthList | null | undefined): NodeCensus {
  const known = new Map<string, { family: HealthFamily; online: boolean }>();
  for (const item of health?.nodes ?? []) known.set(item.node_id, { family: item.family, online: !item.stale && item.status !== "stale" });
  for (const node of radar) {
    const live = node.online && !node.stale;
    const before = known.get(node.node_id);
    known.set(node.node_id, { family: before?.family ?? "radar", online: live || (before?.online ?? false) });
  }
  const families = ORDER.map(family => {
    const members = [...known.values()].filter(node => node.family === family);
    return { family, online: members.filter(node => node.online).length, total: members.length };
  }).filter(entry => entry.total > 0);
  const silent = [...known.entries()].filter(([, node]) => !node.online).map(([node_id, node]) => ({ node_id, family: node.family })).sort((a, b) => a.node_id.localeCompare(b.node_id));
  return { online: [...known.values()].filter(node => node.online).length, total: known.size, families, silent };
}
