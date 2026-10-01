/**
 * The Studio shell: sidebar, top bar and the About dialog.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { ServerInfo } from "../api";
import { NAV_GROUPS, type View } from "../domain";
import { useClock } from "../hooks";
import { formatUptime } from "../history";
import type { Translate } from "./camera";
import { ArmorMark } from "../menuLogos";

export function Sidebar({ view, setView, sidebarOpen, toggle, connection, alarmBadge, t }: {
  view: View; setView: (view: View) => void; sidebarOpen: boolean; toggle: () => void; connection: string; /** Alarms waiting for a person. */ alarmBadge: number; t: Translate;
}) {
  return <aside className="sidebar">
    <div className="brand">
      <span className="brand-mark armor-mark"><ArmorMark /></span>
      <div className="brand-copy"><strong>A.R.M.O.R.</strong><small>STUDIO CONSOLE</small></div>
      <button className="sidebar-toggle" title={sidebarOpen ? t("collapse") : t("expand")} aria-label={sidebarOpen ? t("collapse") : t("expand")} onClick={toggle}>{sidebarOpen ? "‹" : "›"}</button>
    </div>
    <nav>{NAV_GROUPS.map(group => <div key={group.title} className="nav-group"><small className="nav-group-title">{t(group.title)}</small>{group.items.map(([key, icon]) => <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)} title={t(key)}><span className="nav-icon">{icon}</span><em>{t(key)}</em>{key === "alarms" && alarmBadge > 0 && <b className="nav-badge">{alarmBadge}</b>}</button>)}</div>)}</nav>
    <div className="sidebar-foot"><span className="state-dot normal" /> <span>{connection}</span></div>
  </aside>;
}

export function TopBar({ view, revision, mode, demo, siteStatus, fullScreen, isFullScreen, openAbout, toggleMode, t }: {
  view: View; revision: number; mode: "armed" | "disarmed"; demo: boolean; /** Whether the design is kept on the server. */ siteStatus: "idle" | "saved" | "saving" | "offline"; fullScreen: () => void; /** True while the page is fullscreen: the same button then leaves it. */ isFullScreen: boolean; openAbout: () => void; /** Arm when disarmed, disarm when armed (after asking). */ toggleMode: () => void; t: Translate;
}) {
  return <header className="topbar">
    <div className="top-left"><div><p className="eyebrow">AUTONOMOUS RADAR &amp; MULTIMODAL OBSERVATION RANGE</p><h1>{t(view)}</h1></div></div>
    <div className="top-status">
      {demo && <span className="demo-badge" title={t("offlineDemo")}>{t("offlineDemo")}</span>}
      <button className={`icon-button ${isFullScreen ? "active" : ""}`} title={isFullScreen ? t("exitFullscreen") : t("fullscreen")} aria-label={isFullScreen ? t("exitFullscreen") : t("fullscreen")} aria-pressed={isFullScreen} onClick={fullScreen}>{isFullScreen ? "🗗" : "⛶"}</button>
      <button className="icon-button about-button" title={t("about")} onClick={openAbout}>i</button>
      {siteStatus !== "idle" && <span className={`site-sync ${siteStatus}`} title={t(`siteSync_${siteStatus}`)}>{siteStatus === "saved" ? "☁✓" : siteStatus === "saving" ? "☁…" : "☁!"}</span>}
      <span>REV {revision}</span>
      <button className={`mode-button ${mode}`} onClick={toggleMode} disabled={demo} title={mode === "armed" ? t("disarmSystem") : t("armSystem")} aria-label={mode === "armed" ? t("disarmSystem") : t("armSystem")}>{mode === "armed" ? t("armed") : t("disarmed")}</button>
    </div>
  </header>;
}

export function AboutDialog({ version, revision, close, t }: { version: string; revision: number; close: () => void; t: Translate }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={close}>
    <section className="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title" onMouseDown={event => event.stopPropagation()}>
      <button className="modal-close" onClick={close} aria-label={t("close")}>×</button>
      <div className="about-orbit"><span>A</span></div>
      <p className="eyebrow">AUTONOMOUS RADAR &amp; MULTIMODAL OBSERVATION RANGE</p>
      <h2 id="about-title">A.R.M.O.R. Studio</h2>
      <p>{t("aboutDescription")}</p>
      <dl>
        <div><dt>{t("studioVersion")}</dt><dd>{version}</dd></div>
        <div><dt>{t("serverRevision")}</dt><dd>{revision}</dd></div>
        <div><dt>{t("author")}</dt><dd>JuanenRac · Electro Hobby 3D</dd></div>
        <div><dt>{t("license")}</dt><dd>GPL-3.0-or-later</dd></div>
      </dl>
      <button className="primary" onClick={close}>{t("returnConsole")}</button>
    </section>
  </div>;
}

/** A confirmation in the page itself: unlike the browser's own confirm() it cannot be switched off by the browser ("stop this page from creating dialogs"), which left the arm button doing nothing. */
export function ConfirmDialog({ title, text, confirmLabel, danger, confirm, cancel, t }: { title: string; text: string; confirmLabel: string; danger?: boolean; confirm: () => void; cancel: () => void; t: Translate }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={cancel} onKeyDown={event => { if (event.key === "Escape") cancel(); }}>
    <section className="about-dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-text" onMouseDown={event => event.stopPropagation()}>
      <h2 id="confirm-title">{title}</h2>
      <p id="confirm-text">{text}</p>
      <div className="confirm-actions">
        <button onClick={cancel}>{t("cancelAction")}</button>
        <button className={danger ? "danger" : "primary"} onClick={confirm} autoFocus>{confirmLabel}</button>
      </div>
    </section>
  </div>;
}

export type StatusBarProps = {
  serverName: string; synced: boolean; mode: "armed" | "disarmed";
  nodesOnline: number; nodesTotal: number; camerasReachable: number; camerasTotal: number; highAlerts: number;
  info: ServerInfo | null; latencyMs: number | null; revision: number; onSignOut: () => void; t: Translate;
};

/** The console's bottom bar: which server, whether the perimeter is healthy, and the time. */
export function StatusBar(props: StatusBarProps) {
  const { serverName, synced, mode, nodesOnline, nodesTotal, camerasReachable, camerasTotal, highAlerts, info, latencyMs, revision, onSignOut, t } = props;
  const now = useClock();
  const item = (label: string, value: string, tone = "") => <span className={`sb-item ${tone}`}><em>{label}</em><b>{value}</b></span>;
  const nodesTone = nodesTotal > 0 && nodesOnline < nodesTotal ? "warn" : "";
  const camerasTone = camerasTotal > 0 && camerasReachable < camerasTotal ? "warn" : "";
  return <footer className="status-bar" role="contentinfo">
    <div className="sb-left">
      <span className="sb-chip" title={serverName}>{serverName}</span>
      <i className="sb-sep" />
      <span className={`sb-dot ${synced ? "ok" : "down"}`} aria-hidden="true" />
      <span className="sb-title">{synced ? t("perimeterControl") : t("serverOffline")}</span>
      {item(t("sbNodes"), `${nodesOnline}/${nodesTotal}`, nodesTone)}
      {item(t("sbCameras"), `${camerasReachable}/${camerasTotal}`, camerasTone)}
      <span className={`sb-mode ${mode}`}>{mode === "armed" ? t("armed") : t("disarmed")}</span>
      {highAlerts > 0 && <span className="sb-alert">{highAlerts} {t("sbHigh")}</span>}
      {info && item(t("sbServer"), `v${info.version}`)}
      {info && item(t("sbUptime"), formatUptime(info.uptime_s))}
      {info?.mqtt !== undefined && item("MQTT", info.mqtt ? t("sbOn") : t("sbOff"), info.mqtt ? "" : "dim")}
      {info?.live_video !== undefined && item(t("sbVideo"), info.live_video ? t("sbOn") : t("sbOff"), info.live_video ? "" : "dim")}
      {latencyMs !== null && item(t("sbLatency"), `${latencyMs} ms`, latencyMs > 500 ? "warn" : "")}
      {item("REV", String(revision))}
    </div>
    <div className="sb-right">
      <button className="sb-signout" onClick={onSignOut} title={t("signOut")}>{t("signOut")}</button>
      <time className="sb-clock" dateTime={now.toISOString()} title={now.toLocaleDateString(undefined, { dateStyle: "full" })}>
        <span className="sb-date">{now.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}</span>
        <span className="sb-time">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</span>
      </time>
    </div>
  </footer>;
}
