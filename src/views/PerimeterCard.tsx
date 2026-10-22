/**
 * Radar > Perimeter of the node: the state of the perimeter engine of every radar node (from its health report), the recent events the engine raised and a button that opens the panel of the
 * node. The zones themselves (rotated detection zones, exclusion zones, tripwires, loitering) are edited in the panel of the node, which already has the editor; Studio does not repeat it
 * here, it explains it and links to it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState } from "react";
import { readNodeHealth, readRadarEvents, type NodeHealthItem, type RadarEvent } from "../api";
import type { Translate } from "../components/camera";
import { usePolled } from "../hooks";
import { isAlertEvent, isBluetoothOpen, eventLine, newestFirst } from "../perimeterModel";
import { bluetoothAlert, sensorModelName, sortedSensors } from "../nodeHealthModel";
import { panelUrl } from "./RadarView";
import type { NodeState } from "../types";
import "./perimeter.css";

type PanelOf = Record<string, { ip: string; port: number } | undefined>;

/** The state of the engine of each radar node and the button that opens the panel of the node. */
export function PerimeterNodes({ t, items, panels }: { t: Translate; items: readonly NodeHealthItem[]; panels: PanelOf }) {
  if (items.length === 0) return <p className="muted" data-testid="pm-none">{t("pm_none_nodes")}</p>;
  return <ul className="pm-nodes">{items.map(item => {
    const radar = item.report.radar, panel = panels[item.node_id];
    const sensors = sortedSensors(item.report.sensors ?? []);
    const danger = radar?.masked || radar?.wifi_jam || sensors.some(bluetoothAlert);
    return <li key={item.node_id} className={`pm-node ${danger ? "danger" : ""}`} data-testid={`pm-node-${item.node_id}`}>
      <header>
        <strong>{item.node_id}</strong>
        {radar && <span className={`el-pill ${radar.perimeter_enabled ? "good" : ""}`}>{t("nh_radar_perimeter")}: {t(radar.perimeter_enabled ? "nh_radar_on" : "nh_radar_off")}</span>}
        {radar?.masked && <span className="el-pill bad">{t("nh_radar_masked")}</span>}
        {radar?.wifi_jam && <span className="el-pill bad">{t("nh_radar_jam")}</span>}
        {radar?.bridge_open && <span className="el-pill warn">{t("nh_radar_bridge")}</span>}
        {sensors.some(bluetoothAlert) && <span className="el-pill bad" data-testid={`pm-bt-${item.node_id}`}>{t("nh_sensor_bt_alert")}</span>}
      </header>
      {radar && <p className="muted small">{t("nh_radar_buffered")}: {radar.events_buffered} · {t("nh_radar_btrule")}: {t(radar.sensor_bluetooth_off ? "nh_radar_btrule_off" : "nh_radar_btrule_free")}</p>}
      {sensors.length > 0 && <p className="small">{sensors.map(sensor => `${sensor.sensor_id}: ${sensorModelName(sensor.model)} (${t(`nh_sstate_${sensor.state}`)}; Bluetooth ${t(`nh_sbt_${sensor.bluetooth}`)})`).join(" · ")}</p>}
      {panel
        ? <a className="act-btn pm-open" href={panelUrl(panel)} target="_blank" rel="noopener noreferrer">{t("pm_open")}</a>
        : <p className="muted small">{t("pm_no_panel")}</p>}
    </li>;
  })}</ul>;
}

/** The recent events of the perimeter, newest first; a sensor whose Bluetooth opened stands out. */
export function PerimeterEvents({ t, events }: { t: Translate; events: readonly RadarEvent[] }) {
  if (events.length === 0) return <p className="muted" data-testid="pm-events-none">{t("pm_events_none")}</p>;
  return <ol className="pm-events" data-testid="pm-events">{newestFirst(events).map(event => <li key={`${event.node_id}-${event.boot}-${event.seq}`} className={`${isAlertEvent(event) ? "alert" : ""} ${isBluetoothOpen(event) ? "bluetooth" : ""}`}>
    <time dateTime={event.received_at}>{new Date(event.received_at).toLocaleTimeString()}</time>
    <strong>{event.node_id}</strong>
    <span>{eventLine(event, t)}</span>
    {isBluetoothOpen(event) && <span className="el-pill bad">{t("nh_sensor_bt_alert")}</span>}
  </li>)}</ol>;
}

export function PerimeterCard({ t, origin, nodes }: { t: Translate; origin: string; nodes: readonly NodeState[] }) {
  const [only, setOnly] = useState("");
  const health = usePolled(() => readNodeHealth(origin), 15_000, origin);
  const events = usePolled(() => readRadarEvents(origin, { node: only || undefined, limit: 50 }), 8_000, `${origin}|${only}`);
  const radars = (health.data?.nodes ?? []).filter(node => node.family === "radar");
  const panels: PanelOf = Object.fromEntries(nodes.map(node => [node.node_id, node.panel ? { ip: node.panel.ip, port: node.panel.port } : undefined]));
  const known = events.data?.nodes ?? radars.map(node => node.node_id);
  return <article className="stack-card pm-card" data-tour="radar-perimeter" aria-label={t("pm_tab")}>
    <h3>{t("pm_tab")}</h3>
    <p className="muted">{t("pm_help")}</p>
    <PerimeterNodes t={t} items={only ? radars.filter(node => node.node_id === only) : radars} panels={panels} />
    <h4>{t("pm_events")}</h4>
    {known.length > 1 && <label className="nh-filter">
      <select value={only} onChange={event => setOnly(event.target.value)} aria-label={t("pm_filter_all")}>
        <option value="">{t("pm_filter_all")}</option>
        {known.map(id => <option key={id} value={id}>{id}</option>)}
      </select>
    </label>}
    {events.failed && !events.data && <p className="notice bad" role="alert">{t("pm_events_failed")}</p>}
    {events.data && <PerimeterEvents t={t} events={events.data.events} />}
  </article>;
}
