/**
 * The Alarm panels menu: what the ARMOR-ALARM nodes say about the house's alarm, live. The totals (panels, guarding, sounding), one card per node with its phase and mode,
 * its zones and its last events, and - for an administrator, only when the server, the node and the broker all allow it - the buttons that arm and disarm it.
 * A disarm from here carries no PIN, so it asks first; an accepted command is not an armed alarm, and the card shows what the node says next.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState } from "react";
import { alarmCommandsStatus, sendAlarmCommand, ApiError, type AlarmNodeView, type AlarmNodes } from "../api";
import { MenuLogo } from "../menuLogos";
import { usePolled } from "../hooks";
import type { Translate } from "../components/camera";
import { NodeFinder } from "../NodeFinder";
import type { NetworkOverview } from "../networkModel";
import "./solar.css";
import "./electrical-live.css";
import "./alarm-panels.css";

type Props = { t: Translate; origin: string; nodes: AlarmNodes | null; unreachable: boolean; network?: NetworkOverview | null; isAdmin: boolean; now: number };

const ago = (seconds: number): string => (seconds < 90 ? `${seconds} s` : seconds < 5400 ? `${Math.round(seconds / 60)} min` : `${Math.round(seconds / 3600)} h`);
const sinceIso = (iso: string, now: number): string => { const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000)); return Number.isFinite(s) ? ago(s) : "–"; };
const fill = (text: string, value: string): string => text.replace("{0}", value);

export function AlarmPanelsView({ t, origin, nodes, unreachable, network = null, isAdmin, now }: Props) {
  const list = nodes?.nodes ?? [];
  const totals = nodes?.totals;
  const status = usePolled(() => alarmCommandsStatus(origin), 4000, origin);
  const enabled = status.data?.enabled ?? false;
  return <div className="solar-view electrical-live alarm-panels">
    <header className="solar-head">
      <MenuLogo kind="alarmPanels" size={68} />
      <div className="solar-title"><p className="eyebrow">{t("navMonitor")}</p><h2>{t("alarmPanels")}</h2><span className="muted">{t("alarmPanelsHelp")}</span></div>
      {totals && <div className="solar-totals">
        <Tile label={t("apNodes")} value={`${totals.nodes - totals.stale}/${totals.nodes}`} />
        <Tile label={t("apArmed")} value={String(totals.armed)} />
        <Tile label={t("apSounding")} value={String(totals.sounding)} bad={totals.sounding > 0} />
      </div>}
    </header>
    {unreachable && <p className="solar-notice bad">{t("apUnreachable")}</p>}
    {isAdmin && status.data && !enabled && <p className="solar-notice">{t("apCommandsOff")}</p>}
    <NodeFinder t={t} origin={origin} network={network} wantKind="alarm" knownIds={list.map(node => node.node_id)} />
    {list.length === 0 ? <div className="solar-empty"><MenuLogo kind="alarmPanels" size={92} /><h3>{t("apNone")}</h3><p>{t("apNoneHelp")}</p></div>
      : list.map(node => <PanelCard key={node.node_id} t={t} origin={origin} node={node} now={now} canCommand={isAdmin && enabled} recent={(status.data?.recent ?? []).filter(item => item.node_id === node.node_id).slice(0, 3)} reload={status.reload} />)}
  </div>;
}

function Tile({ label, value, bad = false }: { label: string; value: string; bad?: boolean }) {
  return <div className="solar-tile" style={{ borderColor: bad ? "#ff6f7988" : "#22d3ee55" }}><small>{label}</small><b style={{ color: bad ? "#ff8e99" : "#5df0c4" }}>{value}</b></div>;
}

type Recent = { command_id: string; action: string; mode?: string; accepted: boolean; refusal: string; at: string };

function PanelCard({ t, origin, node, now, canCommand, recent, reload }: { t: Translate; origin: string; node: AlarmNodeView; now: number; canCommand: boolean; recent: Recent[]; reload: () => void }) {
  const state = node.state;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const [force, setForce] = useState(false);
  const sounding = state.phase === "alarm";
  const guarding = state.phase === "armed" || state.phase === "exit_delay" || state.phase === "entry_delay";
  const allowed = canCommand && !node.stale && state.commands_enabled;
  const send = async (action: "arm" | "disarm", mode?: "away" | "stay") => {
    if (action === "disarm" && !window.confirm(fill(t("apConfirmDisarm"), node.node_id))) return;
    setBusy(true); setMessage(null);
    try { await sendAlarmCommand(origin, node.node_id, action, mode, force); setMessage({ text: t("apSent"), bad: false }); reload(); }
    catch (error) {
      const code = error instanceof ApiError ? error.code : "other";
      setMessage({ text: t(`apErr_${code}`) !== `apErr_${code}` ? t(`apErr_${code}`) : t("apErr_other"), bad: true });
    }
    setBusy(false);
  };
  const openZones = state.open_zones;
  return <article className={`el-node-card ap-card ${node.stale ? "stale" : ""} ${sounding ? "sounding" : ""}`}>
    <header>
      <strong>{node.node_id}</strong>
      <span className={`el-pill ${node.stale ? "bad" : "good"}`}>{node.stale ? t("solarNodeState_stale") : t("solarNodeState_reporting")} · {sinceIso(node.received_at, now)}</span>
      <span className={`el-pill ${sounding ? "bad" : guarding ? "good" : "warn"}`}>{t(`apPhase_${state.phase}`)}</span>
      {state.mode !== "disarmed" && <span className="el-pill">{t(`apMode_${state.mode}`)}</span>}
      {state.siren && <span className="el-pill bad">{t("apSiren")}</span>}
      {state.locked_out && <span className="el-pill warn">{t("apLockedOut")}</span>}
      <span className={`el-pill ${state.commands_enabled ? "good" : "warn"}`}>{state.commands_enabled ? t("apCommandsEnabled") : t("apCommandsDisabled")}</span>
    </header>
    <section className="ap-zones" aria-label={t("apZones")}>
      <h4>{t("apZones")}</h4>
      {state.zones.length === 0 ? <p className="muted">{t("apNoZones")}</p> : <div className="ap-zone-list">
        {state.zones.map(zone => <div key={zone.id} className={`ap-zone ${zone.state}`}>
          <b>{zone.name ?? zone.id}</b>
          <small>{t(`apKind_${zone.kind}`)}</small>
          <span className={`el-pill ${zone.state === "normal" ? "good" : zone.state === "tamper" ? "bad" : "warn"}`}>{t(`apState_${zone.state}`)}</span>
          {zone.bypassed && <span className="el-pill warn">{t("apBypassed")}</span>}
        </div>)}
      </div>}
      {openZones.length > 0 && <p className="ap-open"><b>{t("apOpenNow")}:</b> {openZones.map(id => state.zones.find(zone => zone.id === id)?.name ?? id).join(", ")}</p>}
    </section>
    <section className="ap-events" aria-label={t("apEvents")}>
      <h4>{t("apEvents")}</h4>
      {state.events.length === 0 ? <p className="muted">{t("apNoEvents")}</p> : <ul>
        {[...state.events].reverse().map((event, index) => <li key={index}><span className="muted">{fill(t("apAgo"), ago(event.ago_s))}</span> · {t(`apEvent_${event.kind}`)}{event.zone ? ` · ${state.zones.find(zone => zone.id === event.zone)?.name ?? event.zone}` : ""}</li>)}
      </ul>}
    </section>
    {canCommand && !state.commands_enabled && <p className="muted small">{t("apNodeCommandsOff")}</p>}
    {canCommand && <div className="ap-actions">
      <button type="button" disabled={busy || !allowed || state.phase !== "disarmed"} onClick={() => void send("arm", "away")}>{t("apArmAway")}</button>
      <button type="button" disabled={busy || !allowed || state.phase !== "disarmed"} onClick={() => void send("arm", "stay")}>{t("apArmStay")}</button>
      <button type="button" className="danger" disabled={busy || !allowed || state.phase === "disarmed"} onClick={() => void send("disarm")}>{t("apDisarm")}</button>
      {openZones.length > 0 && state.phase === "disarmed" && <label className="ap-force"><input type="checkbox" checked={force} onChange={event => setForce(event.target.checked)} /> {t("apForce")}</label>}
    </div>}
    {message && <p className={`solar-notice ${message.bad ? "bad" : ""}`} role={message.bad ? "alert" : "status"}>{message.text}</p>}
    {recent.length > 0 && <div className="ap-recent"><h4>{t("apRecent")}</h4><ul>
      {recent.map(item => <li key={item.command_id}>{item.action}{item.mode ? ` ${t(`apMode_${item.mode}`)}` : ""} · {item.accepted ? t("apAccepted") : (t(`apRefusal_${item.refusal}`) !== `apRefusal_${item.refusal}` ? t(`apRefusal_${item.refusal}`) : item.refusal)}</li>)}
    </ul></div>}
  </article>;
}
