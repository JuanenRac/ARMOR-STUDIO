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

export type NodeKind = "radar" | "solar" | "electrical";
export type NodeCandidate = {
  ip: string; mac?: string; hostname?: string; vendor?: string; online: boolean; /** The node id its host name says (a node is called "armor-" and its id), when it does. */ nodeId?: string;
  /** What its own panel says it is (its page title is "A.R.M.O.R. radar/solar/electrical"), when the network node has read it; undefined when it hasn't yet or the answer did not say. */
  kind?: NodeKind;
};

/** The kind a device's web panel says it is, from the title banner the network node reads when it probes port 80 or 443 ("A.R.M.O.R. radar", "...solar", "...electrical"). */
function kindOf(device: { ports?: readonly { banner?: string }[] }): NodeKind | undefined {
  const banners = (device.ports ?? []).map(port => port.banner ?? "").join(" ").toLowerCase();
  if (banners.includes("radar")) return "radar";
  if (banners.includes("solar")) return "solar";
  if (banners.includes("electrical")) return "electrical";
  return undefined;
}

const HOST_PREFIX = "armor-";

/** The devices of the network that look like ARMOR nodes and are not among the ones already known (by id or by address). */
/** `wantKind`, when given, leaves out a candidate whose panel clearly says a DIFFERENT kind - one whose panel has not answered yet, or did not say, is kept (better to show a maybe than hide a real node). */
export function findNodeCandidates(network: NetworkOverview | null, knownIds: Iterable<string>, knownIps: Iterable<string> = [], wantKind?: NodeKind): NodeCandidate[] {
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
      const kind = kindOf(device);
      if (wantKind && kind && kind !== wantKind) continue;
      found.push({ ip: device.ip, mac: device.mac, hostname: device.hostname, vendor: device.vendor, online: device.online, ...(nodeId ? { nodeId } : {}), ...(kind ? { kind } : {}) });
    }
  }
  return found.sort((a, b) => Number(b.online) - Number(a.online) || a.ip.localeCompare(b.ip, undefined, { numeric: true }));
}

export function NodeFinder({ t, origin, network, knownIds, knownIps, wantKind, onUse }: {
  t: Translate; origin: string; network: NetworkOverview | null; knownIds: Iterable<string>; knownIps?: Iterable<string>;
  /** Leaves out a candidate whose panel clearly says a different kind than this one. */
  wantKind?: NodeKind;
  /** Solar menus: put the node in the form of a new equipment. */
  onUse?: (nodeId: string) => void;
}) {
  const candidates = useMemo(() => findNodeCandidates(network, knownIds, knownIps, wantKind), [network, knownIds, knownIps, wantKind]);
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
