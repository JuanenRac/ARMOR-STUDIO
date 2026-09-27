/**
 * The System menu: the server's version, uptime and mode, what it holds and how full it is, how it connects, and the audit trail.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useMemo, useState } from "react";
import { readAudit, readSystem } from "../api";
import { usePolled } from "../hooks";
import type { Translate } from "../components/camera";
import "./system.css";
import { MenuTitle } from "../menuLogos";

const size = (bytes: number): string => bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.round(bytes / 1e3)} kB`;
export const uptimeText = (seconds: number, t: Translate): string => {
  const days = Math.floor(seconds / 86400), hours = Math.floor((seconds % 86400) / 3600), minutes = Math.floor((seconds % 3600) / 60);
  return days > 0 ? `${days} ${t("daysShort")} ${hours} ${t("hoursShort")}` : hours > 0 ? `${hours} ${t("hoursShort")} ${minutes} ${t("minutesShort")}` : `${minutes} ${t("minutesShort")}`;
};

export function SystemView({ t, origin, isAdmin }: { t: Translate; origin: string; isAdmin: boolean }) {
  const system = usePolled(() => readSystem(origin), 5000, origin).data;
  const audit = usePolled(() => (isAdmin ? readAudit(origin, 200) : Promise.resolve({ entries: [] })), 6000, `${origin}:${isAdmin}`).data;
  const [filter, setFilter] = useState("");
  const [problems, setProblems] = useState(false);
  const entries = useMemo(() => (audit?.entries ?? []).filter(entry => (!problems || entry.outcome !== "allowed") && (!filter || `${entry.action} ${entry.actor ?? ""} ${entry.target ?? ""} ${entry.detail ?? ""}`.toLowerCase().includes(filter.toLowerCase()))), [audit, filter, problems]);
  const mediaShare = system ? Math.min(100, (system.storage.media_bytes / Math.max(1, system.storage.media_limit_bytes)) * 100) : 0;
  const disk = system?.storage.disk;
  const diskUsed = disk ? Math.round(((disk.total_bytes - disk.free_bytes) / Math.max(1, disk.total_bytes)) * 100) : 0;
  const counts = system?.counts;
  const link = (on: boolean, label: string) => <div className={`sys-link ${on ? "on" : ""}`}><span className="state-dot normal" /> <strong>{label}</strong><small>{on ? t("sysOn") : t("sysOff")}</small></div>;

  return <section className="system-view">
    <header className="devices-head"><MenuTitle kind="system"><p className="eyebrow">{t("systemTitle")}</p><h2>{t("system")}</h2><p className="muted">{t("systemHelp")}</p></MenuTitle></header>
    {system && counts && <>
      <div className="sys-hero">
        <div><small>{t("sysVersion")}</small><strong>v{system.version}</strong></div>
        <div><small>{t("sysUptime")}</small><strong>{uptimeText(system.uptime_s, t)}</strong></div>
        <div><small>{t("sysMode")}</small><strong className={system.mode}>{system.mode === "armed" ? t("armed") : t("disarmed")}</strong></div>
        <div><small>{t("sysRevision")}</small><strong>{system.revision}</strong></div>
      </div>
      <div className="sys-grid">
        <article className="stack-card"><h3>{t("sysHolds")}</h3>
          <div className="sys-counts">
            {([["sysNodes", `${counts.nodes_online}/${counts.nodes}`], ["sysCameras", counts.cameras], ["sysDevices", `${counts.devices_online}/${counts.devices}`], ["sysAlarms", counts.alarms_active], ["sysAutomations", counts.automations], ["sysUsers", counts.users], ["sysEvents", counts.events]] as const).map(([key, value]) => <div key={key}><strong>{value}</strong><small>{t(key)}</small></div>)}
          </div>
        </article>
        <article className="stack-card"><h3>{t("sysStorage")}</h3>
          <div className="meter"><div className="meter-head"><span>{t("sysMedia")}</span><b>{size(system.storage.media_bytes)} / {size(system.storage.media_limit_bytes)} · {system.storage.media_files} {t("tileFiles")}</b></div><div className="meter-bar"><i style={{ width: `${mediaShare}%` }} className={mediaShare > 85 ? "hot" : ""} /></div></div>
          {disk && <div className="meter"><div className="meter-head"><span>{t("sysDisk")}</span><b>{size(disk.free_bytes)} / {size(disk.total_bytes)}</b></div><div className="meter-bar"><i style={{ width: `${diskUsed}%` }} className={diskUsed > 90 ? "hot" : ""} /></div></div>}
        </article>
        <article className="stack-card"><h3>{t("sysLinks")}</h3>{link(system.mqtt, t("sysMqtt"))}{link(system.live_video, t("sysVideo"))}{link(system.webhook, t("sysWebhook"))}</article>
      </div>
    </>}
    <article className="stack-card audit-card">
      <h3>{t("auditTitle")}</h3>
      {!isAdmin ? <p className="muted">{t("auditOnlyAdmin")}</p> : <>
        <p className="muted">{t("auditHelp")}</p>
        <div className="devices-filters"><input type="search" value={filter} placeholder={t("auditFilter")} onChange={event => setFilter(event.target.value)} /><button className={problems ? "on" : ""} onClick={() => setProblems(value => !value)}>{t("auditOnlyProblems")}</button></div>
        <div className="audit-table" role="table"><div className="audit-row head" role="row"><span>{t("auditWhen")}</span><span>{t("auditWho")}</span><span>{t("auditWhat")}</span><span>{t("auditResult")}</span></div>
          {entries.slice(0, 120).map((entry, index) => <div className={`audit-row ${entry.outcome}`} role="row" key={`${entry.at}-${index}`}>
            <span>{new Date(entry.at).toLocaleString()}</span><span>{entry.actor ?? "—"}</span><span><b>{entry.action}</b>{entry.target ? ` · ${entry.target}` : ""}{entry.detail ? ` · ${entry.detail}` : ""}</span><span className={`outcome ${entry.outcome}`}>{t(`outcome_${entry.outcome}`)}</span></div>)}
        </div>
      </>}
    </article>
  </section>;
}
