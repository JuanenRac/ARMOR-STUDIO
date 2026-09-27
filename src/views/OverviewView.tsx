/**
 * The overview: one screen for the whole perimeter. A hero with the state of the system and the arm / disarm switch, a tile for every part
 * of A.R.M.O.R. in its own colour the live map of the site design, what needs attention, and the latest events.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { CSSProperties, ReactNode } from "react";
import { listHistory, readSystem, type Alarm, type ArmorEvent, type StudioDevice } from "../api";
import { SiteMap } from "../components/SiteMap";
import type { SiteModel } from "../designer/ops";
import { describeEvent } from "../history";
import { ago, deviceProblem, KindIcon } from "../deviceKinds";
import { usePolled } from "../hooks";
import type { Reachability } from "../api";
import type { NodeState } from "../types";
import type { Camera, Dimensions, View } from "../domain";
import type { Translate } from "../components/camera";
import { AlarmSource } from "./AlarmsView";
import "./overview.css";
import { MenuLogo } from "../menuLogos";

type Props = {
  t: Translate; origin: string; mode: "armed" | "disarmed"; toggleMode: () => void; demo: boolean;
  nodes: NodeState[]; cameras: readonly Camera[]; reachability: Record<string, Reachability>; devices: StudioDevice[]; alarms: { active: Alarm[]; recent: Alarm[] } | null;
  model: SiteModel; dimensions: Dimensions; setView: (view: View) => void; onDevice: (id: string) => void; now: number;
};

const size = (bytes: number): string => bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : bytes >= 1e6 ? `${(bytes / 1e6).toFixed(0)} MB` : `${Math.round(bytes / 1e3)} kB`;
const EVENT_ICON: Record<ArmorEvent["type"], string> = { alert: "◌", node: "▣", camera: "◉", mode: "⏻", device: "◈", alarm: "!" };

function Tile({ colour, label, value, sub, onClick, alert, icon }: { colour: string; label: string; value: ReactNode; sub: ReactNode; onClick: () => void; alert?: boolean; icon: string }) {
  return <button className={`ov-tile ${alert ? "alert" : ""}`} style={{ "--accent": colour } as CSSProperties} onClick={onClick}>
    <span className="ov-tile-icon">{icon}</span><span className="ov-tile-label">{label}</span><strong>{value}</strong><small>{sub}</small>
  </button>;
}

export function OverviewView({ t, origin, mode, toggleMode, demo, nodes, cameras, reachability, devices, alarms, model, dimensions, setView, onDevice, now }: Props) {
  const system = usePolled(() => readSystem(origin), 6000, origin).data;
  const feed = usePolled(() => listHistory(origin, { limit: 12 }), 5000, origin).data?.events ?? [];
  const active = (alarms?.active ?? []).filter(alarm => !alarm.acknowledged_at);
  const critical = active.some(alarm => alarm.severity === "critical");
  const tracks = nodes.reduce((sum, node) => sum + (node.online && !node.stale ? node.target_count : 0), 0);
  const nodesOnline = nodes.filter(node => node.online && !node.stale).length;
  const camerasReachable = cameras.filter(camera => reachability[camera.id] === "online").length;
  const devicesOnline = devices.filter(device => device.online).length, triggered = devices.filter(device => deviceProblem(device) === "triggered").length;
  const troubled = devices.filter(device => deviceProblem(device));

  return <section className="overview">
    <header className={`ov-hero ${mode} ${critical ? "critical" : ""}`}>
      <div className="ov-hero-text"><MenuLogo kind="overview" size={58} />
        <p className="eyebrow">A.R.M.O.R.</p>
        <h2>{t("overviewTitle")}</h2>
        <p className="muted">{t("overviewHelp")}</p>
      </div>
      <div className="ov-hero-state">
        <span className={`ov-pulse ${mode}`} />
        <div><small>{t("sysMode")}</small><strong>{mode === "armed" ? t("armed") : t("disarmed")}</strong></div>
        <button className={`mode-big ${mode}`} onClick={toggleMode} disabled={demo}>{mode === "armed" ? t("disarmSystem") : t("armSystem")}</button>
      </div>
    </header>

    <div className="ov-tiles">
      <Tile colour={active.length ? (critical ? "#ff4d5e" : "#ffb020") : "#34d399"} alert={active.length > 0} icon="!" label={t("tileAlarms")} value={active.length} sub={active.length ? t("alarmsActive") : t("allClear")} onClick={() => setView("alarms")} />
      <Tile colour="#38bdf8" icon="◌" label={t("tileRadar")} value={`${nodesOnline}/${nodes.length}`} sub={`${tracks} ${t("tileTracks")}`} onClick={() => setView("radar")} />
      <Tile colour="#a78bfa" icon="◉" label={t("tileCameras")} value={`${camerasReachable}/${cameras.length}`} sub={t("tileReachable")} onClick={() => setView("cameras")} />
      <Tile colour="#34d399" icon="◈" label={t("tileDevices")} value={`${devicesOnline}/${devices.length}`} sub={triggered ? `${triggered} ${t("tileTriggered")}` : t("tileOnline")} alert={triggered > 0} onClick={() => setView("devices")} />
      <Tile colour="#fbbf24" icon="⚙" label={t("tileAutomations")} value={system?.counts.automations ?? "—"} sub={t("automationsTitle")} onClick={() => setView("automations")} />
      <Tile colour="#2dd4bf" icon="⌗" label={t("tileSite")} value={model.buildings.length} sub={`${t("tileBuildings")} · ${model.placements.length} ${t("tileDevicesPlaced")}`} onClick={() => setView("siteDesigner")} />
      <Tile colour="#fb923c" icon="▣" label={t("tileEvidence")} value={system?.storage.media_files ?? "—"} sub={system ? size(system.storage.media_bytes) : ""} onClick={() => setView("record")} />
      <Tile colour="#c084fc" icon="⌂" label={t("tileSystem")} value={system ? `v${system.version}` : "—"} sub={system ? `${system.counts.users} ${t("tileUsers")}` : ""} onClick={() => setView("system")} />
    </div>

    <div className="ov-main">
      <article className="ov-card ov-map">
        <header><h3>{t("liveMap")}</h3><button className="link-button" onClick={() => setView("siteDesigner")}>{t("qaDesigner")} ▸</button></header>
        <SiteMap model={model} dimensions={dimensions} devices={devices} nodes={nodes} onDevice={onDevice} empty={t("liveMapEmpty")} />
      </article>
      <div className="ov-side">
        <article className="ov-card">
          <header><h3>{t("alarms")}</h3><button className="link-button" onClick={() => setView("alarms")}>▸</button></header>
          {active.length === 0 ? <p className="ov-ok">✓ {t("allClearHelp")}</p> : <ul className="ov-list">{active.slice(0, 5).map(alarm => <li key={alarm.id} className={alarm.severity}><span className={`severity-dot ${alarm.severity}`} /><div><strong>{t(`alarm_${alarm.code}`)}</strong><small className="alarm-source"><AlarmSource alarm={alarm} devices={devices} cameraNames={Object.fromEntries(cameras.map(camera => [camera.id, camera.name]))} t={t} /> · {ago(alarm.raised_at, now, t)}</small></div></li>)}</ul>}
        </article>
        <article className="ov-card">
          <header><h3>{t("needsAttention")}</h3></header>
          {troubled.length === 0 ? <p className="ov-ok">✓ {t("nothingToAttend")}</p> : <ul className="ov-list">{troubled.slice(0, 6).map(device => <li key={device.id} className="warning" onClick={() => onDevice(device.id)}><span className="ov-kind"><KindIcon kind={device.kind} size={18} /></span><div><strong>{device.name}</strong><small>{t(`problem_${deviceProblem(device)}`)}</small></div></li>)}</ul>}
        </article>
        <article className="ov-card ov-quick">
          <header><h3>{t("quickActions")}</h3></header>
          <div><button onClick={() => setView("cameras")}>{t("qaCameras")}</button><button onClick={() => setView("devices")}>{t("qaAddDevice")}</button><button onClick={() => setView("siteDesigner")}>{t("qaDesigner")}</button></div>
        </article>
      </div>
    </div>

    <article className="ov-card ov-feed">
      <header><h3>{t("recentActivity")}</h3><button className="link-button" onClick={() => setView("history")}>{t("openHistory")} ▸</button></header>
      {feed.length === 0 ? <p className="muted">{t("noActivity")}</p> : <ul>{feed.map(event => <li key={event.id} className={`ev-${event.type}`}><span className="ov-event-icon">{EVENT_ICON[event.type]}</span><span className="ov-event-text">{describeEvent(event, t)}</span><small>{ago(event.at, now, t)}</small></li>)}</ul>}
    </article>
  </section>;
}
