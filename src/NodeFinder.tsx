/**
 * Finding nodes on the network, for the Inverters, Batteries and Radar menus: what the network node has found on the local network that looks like an ARMOR node (its host name
 * starts with "armor-", which is what a node calls itself, or its maker is Espressif) and that is not yet one of the nodes this menu knows. From the list the node's own panel is
 * opened, and in the solar menus its name goes into the form of a new equipment.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useMemo, useState } from "react";
import { sendNetworkOrder } from "./api";
import type { Translate } from "./components/camera";
import type { NetworkOverview } from "./networkModel";

export type NodeCandidate = { ip: string; mac?: string; hostname?: string; vendor?: string; online: boolean; /** The node id its host name says (a node is called "armor-" and its id), when it does. */ nodeId?: string };

const HOST_PREFIX = "armor-";

/** The devices of the network that look like ARMOR nodes and are not among the ones already known (by id or by address). */
export function findNodeCandidates(network: NetworkOverview | null, knownIds: Iterable<string>, knownIps: Iterable<string> = []): NodeCandidate[] {
  const ids = new Set([...knownIds].map(id => id.toLowerCase())), ips = new Set(knownIps);
  const seen = new Set<string>(), found: NodeCandidate[] = [];
  for (const node of network?.nodes ?? []) {
    for (const device of node.devices) {
      const hostname = device.hostname?.toLowerCase().replace(/\.local\.?$/, "");
      const named = Boolean(hostname?.startsWith(HOST_PREFIX)), espressif = /espressif/i.test(device.vendor ?? "");
      if (!named && !espressif) continue;
      const nodeId = named && hostname ? hostname.slice(HOST_PREFIX.length) : undefined;
      if (ips.has(device.ip) || (nodeId && ids.has(nodeId)) || seen.has(device.ip)) continue;
      seen.add(device.ip);
      found.push({ ip: device.ip, mac: device.mac, hostname: device.hostname, vendor: device.vendor, online: device.online, ...(nodeId ? { nodeId } : {}) });
    }
  }
  return found.sort((a, b) => Number(b.online) - Number(a.online) || a.ip.localeCompare(b.ip, undefined, { numeric: true }));
}

export function NodeFinder({ t, origin, network, knownIds, knownIps, onUse }: {
  t: Translate; origin: string; network: NetworkOverview | null; knownIds: Iterable<string>; knownIps?: Iterable<string>;
  /** Solar menus: put the node in the form of a new equipment. */
  onUse?: (nodeId: string) => void;
}) {
  const candidates = useMemo(() => findNodeCandidates(network, knownIds, knownIps), [network, knownIds, knownIps]);
  const [state, setState] = useState<"idle" | "searching" | "failed">("idle");
  const hasWatcher = Boolean(network?.nodes.some(node => !node.stale));
  const search = async () => {
    setState("searching");
    try { await sendNetworkOrder(origin, { type: "scan_now" }); window.setTimeout(() => setState("idle"), 15_000); } catch { setState("failed"); }
  };
  return <section className="node-finder" aria-label={t("nodeFinderTitle")}>
    <div className="node-finder-head">
      <h3>{t("nodeFinderTitle")}</h3>
      <button type="button" onClick={() => void search()} disabled={!hasWatcher || state === "searching"}>{state === "searching" ? t("nodeFinderSearching") : t("nodeFinderScan")}</button>
    </div>
    <p className="muted small">{t("nodeFinderHelp")}</p>
    {!hasWatcher && <p className="muted small">{t("nodeFinderNoNetwork")}</p>}
    {state === "failed" && <p className="notice bad" role="status">{t("nodeFinderFailed")}</p>}
    {hasWatcher && candidates.length === 0 && <p className="muted small">{t("nodeFinderNone")}</p>}
    {candidates.length > 0 && <ul className="node-finder-list">
      {candidates.map(item => <li key={item.ip} className={item.online ? "" : "off"}>
        <span className="state-dot" />
        <div><strong>{item.nodeId ?? item.hostname ?? item.ip}</strong><small>{[item.ip, item.mac, item.vendor, item.online ? "" : t("nodeFinderOffline")].filter(Boolean).join(" · ")}</small></div>
        <a className="panel-link" href={`http://${item.ip}/`} target="_blank" rel="noopener noreferrer">{t("openNodePanel")}</a>
        {onUse && <button type="button" className="primary" onClick={() => onUse(item.nodeId ?? "")}>{t("nodeFinderUse")}</button>}
      </li>)}
    </ul>}
  </section>;
}
