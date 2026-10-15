/**
 * The Studio shell: sidebar, top bar, and the About and Help dialogs.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState } from "react";
import type { ServerInfo } from "../api";
import { NAV_GROUPS, type View } from "../domain";
import { useClock } from "../hooks";
import { formatUptime } from "../history";
import type { Translate } from "./camera";
import { ArmorMark } from "../menuLogos";
import { HELP_SECTIONS } from "../helpText";
import "../help.css";

const NAV_CLOSED_KEY = "armor-studio-nav-closed";

export function Sidebar({ view, setView, sidebarOpen, toggle, connection, alarmBadge, t }: {
  view: View; setView: (view: View) => void; sidebarOpen: boolean; toggle: () => void; connection: string; /** Alarms waiting for a person. */ alarmBadge: number; t: Translate;
}) {
  // The groups can be folded; which ones are folded is remembered in this browser. The group of the screen you are on never hides it.
  const [closed, setClosed] = useState<ReadonlySet<string>>(() => { try { return new Set<string>(JSON.parse(window.localStorage.getItem(NAV_CLOSED_KEY) ?? "[]") as string[]); } catch { return new Set<string>(); } });
  const flip = (title: string) => setClosed(current => {
    const next = new Set(current);
    if (next.has(title)) next.delete(title); else next.add(title);
    try { window.localStorage.setItem(NAV_CLOSED_KEY, JSON.stringify([...next])); } catch { /* storage may be blocked */ }
    return next;
  });
  return <aside className="sidebar">
    <div className="brand">
      <span className="brand-mark armor-mark"><ArmorMark /></span>
      <div className="brand-copy"><strong>A.R.M.O.R.</strong><small>STUDIO CONSOLE</small></div>
      <button className="sidebar-toggle" title={sidebarOpen ? t("collapse") : t("expand")} aria-label={sidebarOpen ? t("collapse") : t("expand")} onClick={toggle}>{sidebarOpen ? "‹" : "›"}</button>
    </div>
    <nav>{NAV_GROUPS.map(group => {
      const folded = closed.has(group.title) && !group.items.some(([key]) => key === view);
      const waiting = group.items.some(([key]) => key === "alarms") ? alarmBadge : 0;
      return <div key={group.title} className={`nav-group ${folded ? "folded" : ""}`}>
        <button type="button" className="nav-group-title" aria-expanded={!folded} title={folded ? t("navGroupUnfold") : t("navGroupFold")} onClick={() => flip(group.title)}>
          <i aria-hidden="true">{folded ? "▸" : "▾"}</i><strong className="nav-group-name">{t(group.title)}</strong>{folded && waiting > 0 && <b className="nav-badge">{waiting}</b>}
        </button>
        <div className="nav-items">{group.items.map(([key, icon]) => <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)} title={t(key)}><span className="nav-icon">{icon}</span><em>{t(key)}</em>{key === "alarms" && alarmBadge > 0 && <b className="nav-badge">{alarmBadge}</b>}</button>)}</div>
      </div>;
    })}</nav>
    <div className="sidebar-foot"><span className="state-dot normal" /> <span>{connection}</span></div>
  </aside>;
}

export function TopBar({ view, revision, mode, demo, siteStatus, fullScreen, isFullScreen, openAbout, openHelp, toggleMode, t }: {
  view: View; revision: number; mode: "armed" | "disarmed"; demo: boolean; /** Whether the design is kept on the server. */ siteStatus: "idle" | "saved" | "saving" | "offline"; fullScreen: () => void; /** True while the page is fullscreen: the same button then leaves it. */ isFullScreen: boolean; openAbout: () => void; openHelp: () => void; /** Arm when disarmed, disarm when armed (after asking). */ toggleMode: () => void; t: Translate;
}) {
  return <header className="topbar">
    <div className="top-left"><div><p className="eyebrow">AUTONOMOUS RADAR &amp; MULTIMODAL OBSERVATION RANGE</p><h1>{t(view)}</h1></div></div>
    <div className="top-status">
      {demo && <span className="demo-badge" title={t("offlineDemo")}>{t("offlineDemo")}</span>}
      <button className={`icon-button ${isFullScreen ? "active" : ""}`} title={isFullScreen ? t("exitFullscreen") : t("fullscreen")} aria-label={isFullScreen ? t("exitFullscreen") : t("fullscreen")} aria-pressed={isFullScreen} onClick={fullScreen}>{isFullScreen ? "🗗" : "⛶"}</button>
      <button className="icon-button help-button" title={t("helpButton")} aria-label={t("helpButton")} onClick={openHelp}>?</button>
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

/** The Help window: every menu explained, a list of sections on the left and the chosen one on the right. */
export function HelpDialog({ close, initial, t }: { close: () => void; initial?: string; t: Translate }) {
  const [current, setCurrent] = useState(initial && HELP_SECTIONS.some(section => section.id === initial) ? initial : HELP_SECTIONS[0].id);
  return <div className="modal-backdrop" role="presentation" onMouseDown={close} onKeyDown={event => { if (event.key === "Escape") close(); }}>
    <section className="about-dialog help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={event => event.stopPropagation()}>
      <button className="modal-close" onClick={close} aria-label={t("close")}>×</button>
      <p className="eyebrow">A.R.M.O.R. STUDIO</p>
      <h2 id="help-title">{t("helpTitle")}</h2>
      <p className="muted">{t("helpIntro")}</p>
      <div className="help-body">
        <nav className="help-nav" aria-label={t("helpSections")}>{HELP_SECTIONS.map(section => <button key={section.id} className={current === section.id ? "active" : ""} onClick={() => setCurrent(section.id)}>{t(`help_s_${section.id}`)}</button>)}</nav>
        <article className="help-text" tabIndex={0}><h3>{t(`help_s_${current}`)}</h3>{t(`help_b_${current}`).split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}</article>
      </div>
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

/** Disarming asks for the PIN: the field is there for everybody, and the server only insists for a user who has one (or when the installation requires it). */
export function PinDialog({ title, text, confirmLabel, confirm, cancel, t }: { title: string; text: string; confirmLabel: string; confirm: (pin: string) => void; cancel: () => void; t: Translate }) {
  const [pin, setPin] = useState("");
  return <div className="modal-backdrop" role="presentation" onMouseDown={cancel} onKeyDown={event => { if (event.key === "Escape") cancel(); }}>
    <form className="about-dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="pin-title" aria-describedby="pin-text" onMouseDown={event => event.stopPropagation()}
      onSubmit={event => { event.preventDefault(); confirm(pin); }}>
      <h2 id="pin-title">{title}</h2>
      <p id="pin-text">{text}</p>
      <label className="pin-field">{t("pinLabel")}<input type="password" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={pin} autoFocus
        placeholder={t("pinPlaceholder")} onChange={event => setPin(event.target.value.replace(/[^0-9]/g, ""))} /></label>
      <div className="confirm-actions">
        <button type="button" onClick={cancel}>{t("cancelAction")}</button>
        <button type="submit" className="danger">{confirmLabel}</button>
      </div>
    </form>
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
