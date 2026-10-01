/**
 * The solar nodes of the Inverters and Batteries menus: the ESP32-S3 gateways that sit beside the equipment, read it through their serial ports and send what they read.
 * One card per node says what it reads (how many inverters and battery stacks) and whether it is reporting, so the role of a node - the one that reads - is not mixed up
 * with the role of the equipment - what is read. A node is known by what it reads: it appears once equipment is declared for it or has reported.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useMemo } from "react";
import type { Translate } from "./components/camera";
import type { SolarDeviceView, SolarRegistration } from "./solarModel";

export type SolarNodeState = "reporting" | "example" | "stale" | "waiting";
export type SolarNodeSummary = { id: string; inverters: number; batteries: number; reporting: number; lastMs: number | null; state: SolarNodeState };

/** The nodes behind the declared equipment and the readings, each with what it reads and how it is doing. */
export function summariseNodes(devices: readonly SolarDeviceView[], registrations: readonly SolarRegistration[]): SolarNodeSummary[] {
  const equipment = new Map<string, { kind: string; reading?: SolarDeviceView }>();   // keyed by node/device, so a declared device that reports counts once
  for (const item of registrations) equipment.set(`${item.node_id}/${item.device}`, { kind: item.kind });
  for (const view of devices) equipment.set(`${view.node_id}/${view.device}`, { kind: view.kind, reading: view });
  const nodes = new Map<string, SolarNodeSummary & { fresh: number; examples: number }>();
  for (const [key, item] of equipment) {
    const id = key.slice(0, key.indexOf("/"));
    const node = nodes.get(id) ?? { id, inverters: 0, batteries: 0, reporting: 0, lastMs: null, state: "waiting" as SolarNodeState, fresh: 0, examples: 0 };
    if (item.kind === "inverter") node.inverters += 1; else node.batteries += 1;
    if (item.reading) {
      node.reporting += 1;
      if (item.reading.example) node.examples += 1; else if (!item.reading.stale) node.fresh += 1;
      const at = Date.parse(item.reading.received_at);
      if (Number.isFinite(at) && (node.lastMs === null || at > node.lastMs)) node.lastMs = at;
    }
    nodes.set(id, node);
  }
  return [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)).map(({ fresh, examples, ...node }) => ({
    ...node,
    state: fresh > 0 ? "reporting" : node.reporting === 0 ? "waiting" : examples === node.reporting ? "example" : "stale",
  }));
}

const since = (ms: number, now: number): string => {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  return s < 90 ? `${s} s` : s < 5400 ? `${Math.round(s / 60)} min` : `${Math.round(s / 3600)} h`;
};

export function SolarNodes({ t, devices, registrations, now }: { t: Translate; devices: readonly SolarDeviceView[]; registrations: readonly SolarRegistration[]; now: number }) {
  const nodes = useMemo(() => summariseNodes(devices, registrations), [devices, registrations]);
  return <section className="solar-nodes" aria-label={t("solarNodesTitle")}>
    <h3>{t("solarNodesTitle")}</h3>
    <p className="muted small">{t("solarNodesRole")}</p>
    {nodes.length === 0 ? <p className="muted small">{t("solarNodesNone")}</p> : <div className="solar-node-cards">
      {nodes.map(node => <article key={node.id} className={`solar-node-card ${node.state}`}>
        <span className="solar-node-chip" aria-hidden="true">⌁</span>
        <div>
          <strong>{node.id}</strong>
          <small>{[node.inverters ? `${node.inverters} ${t("solarNodeInverters")}` : "", node.batteries ? `${node.batteries} ${t("solarNodeBatteries")}` : ""].filter(Boolean).join(" · ")}</small>
        </div>
        <span className="solar-node-state">{t(`solarNodeState_${node.state}`)}{node.lastMs !== null && node.state !== "waiting" ? ` · ${since(node.lastMs, now)}` : ""}</span>
      </article>)}
    </div>}
  </section>;
}
