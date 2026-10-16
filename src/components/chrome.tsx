/**
 * The Studio shell: sidebar, top bar, and the About and Help dialogs.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState } from "react";
import type { ServerInfo } from "../api";
import { NAV_GROUPS, type View } from "../domain";
import { getPrefs as getPrefsForHelp } from "../prefs";
import { startTour } from "../tour/tourStore";
import { useClock } from "../hooks";
import { formatUptime } from "../history";
import type { Translate } from "./camera";
import { ArmorMark } from "../menuLogos";
import { HELP_SECTIONS } from "../helpText";
import { HELP_TECH } from "../helpTech";
import { TourArt, ART_OF_VIEW, type ArtId } from "../tour/TourArt";
import "../help.css";

const NAV_CLOSED_KEY = "armor-studio-nav-closed";

export function Sidebar({ view, setView, sidebarOpen, toggle, alarmBadge, t }: {
  view: View; setView: (view: View) => void; sidebarOpen: boolean; toggle: () => void; /** Alarms waiting for a person. */ alarmBadge: number; t: Translate;
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
    <div className="brand" data-tour="brand">
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
        <div className="nav-items">{group.items.map(([key, icon]) => <button key={key} data-tour={`nav-${key}`} className={view === key ? "active" : ""} onClick={() => setView(key)} title={t(key)}><span className="nav-icon">{icon}</span><em>{t(key)}</em>{key === "alarms" && alarmBadge > 0 && <b className="nav-badge">{alarmBadge}</b>}</button>)}</div>
      </div>;
    })}</nav>
  </aside>;
}

export function TopBar({ view, revision, mode, demo, siteStatus, fullScreen, isFullScreen, openAbout, openHelp, toggleMode, readOnly = false, checkPerimeter, t }: {
  view: View; revision: number; mode: "armed" | "disarmed"; demo: boolean; /** Whether the design is kept on the server. */ siteStatus: "idle" | "saved" | "saving" | "offline"; fullScreen: () => void; /** True while the page is fullscreen: the same button then leaves it. */ isFullScreen: boolean; openAbout: () => void; openHelp: () => void; /** Arm when disarmed, disarm when armed (after asking). */ toggleMode: () => void; /** A viewer only looks: the arm button is off. */ readOnly?: boolean; /** Look at what would stop the perimeter from being ready, without arming. */ checkPerimeter?: () => void; t: Translate;
}) {
  return <header className="topbar">
    <div className="top-left"><span className="top-art" aria-hidden="true"><TourArt art={ART_OF_VIEW[view] ?? "menu"} size={64} /></span><div><p className="eyebrow">AUTONOMOUS RADAR &amp; MULTIMODAL OBSERVATION RANGE</p><h1>{t(view)}</h1></div></div>
    <div className="top-status">
      {demo && <span className="demo-badge" title={t("offlineDemo")}>{t("offlineDemo")}</span>}
      <button className={`icon-button ${isFullScreen ? "active" : ""}`} title={isFullScreen ? t("exitFullscreen") : t("fullscreen")} aria-label={isFullScreen ? t("exitFullscreen") : t("fullscreen")} aria-pressed={isFullScreen} onClick={fullScreen}>{isFullScreen ? "🗗" : "⛶"}</button>
      {checkPerimeter && <button className="icon-button" title={t("pre_check")} aria-label={t("pre_check")} onClick={checkPerimeter}>✔</button>}
      <button className="icon-button help-button" data-tour="help" title={t("helpButton")} aria-label={t("helpButton")} onClick={openHelp}>?</button>
      <button className="icon-button about-button" title={t("about")} onClick={openAbout}>i</button>
      {siteStatus !== "idle" && <span className={`site-sync ${siteStatus}`} title={t(`siteSync_${siteStatus}`)}>{siteStatus === "saved" ? "☁✓" : siteStatus === "saving" ? "☁…" : "☁!"}</span>}
      <span>REV {revision}</span>
      <button data-tour="arm" className={`mode-button ${mode}`} onClick={toggleMode} disabled={demo || readOnly} title={mode === "armed" ? t("disarmSystem") : t("armSystem")} aria-label={mode === "armed" ? t("disarmSystem") : t("armSystem")}>{mode === "armed" ? t("armed") : t("disarmed")}</button>
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

const HELP_LEVELS = ["simple", "medium", "advanced", "technical"] as const;
type HelpLevel = (typeof HELP_LEVELS)[number];
const HELP_LEVEL_KEY = "armor-studio-help-level";
const readHelpLevel = (): HelpLevel => { try { const value = window.localStorage.getItem(HELP_LEVEL_KEY); return (HELP_LEVELS as readonly string[]).includes(value ?? "") ? (value as HelpLevel) : "medium"; } catch { return "medium"; } };
const pageOf = (id: string): ArtId => (id === "start" ? "welcome" : id === "tips" ? "tips" : ART_OF_VIEW[id as View] ?? "menu");

/** The Help window, laid out like a book: the menus as chapters on the left, a picture and the text of the chosen one on the right at the level of detail the person picks (simple, medium, advanced or technical), and arrows to turn the page. It is wide and short so that it fits a 1080-pixel screen. */
export function HelpDialog({ close, initial, t }: { close: () => void; initial?: string; t: Translate }) {
  const start = initial ? HELP_SECTIONS.findIndex(section => section.id === initial) : 0;
  const [index, setIndex] = useState(start >= 0 ? start : 0);
  const [level, setLevel] = useState<HelpLevel>(readHelpLevel);
  const [turn, setTurn] = useState<"next" | "prev">("next");
  const section = HELP_SECTIONS[index];
  const go = (next: number) => { if (next < 0 || next >= HELP_SECTIONS.length) return; setTurn(next > index ? "next" : "prev"); setIndex(next); };
  const choose = (next: HelpLevel) => { setLevel(next); try { window.localStorage.setItem(HELP_LEVEL_KEY, next); } catch { /* storage may be blocked */ } };
  const paragraphs = t(`help_b_${section.id}`).split("\n\n");
  const shown = level === "simple" ? paragraphs.slice(0, 1) : level === "medium" ? paragraphs.slice(0, 2) : paragraphs;
  const tech = HELP_TECH[section.id];
  return <div className="modal-backdrop" role="presentation" onMouseDown={close} onKeyDown={event => { if (event.key === "Escape") close(); else if (event.key === "ArrowRight" && !(event.target instanceof HTMLSelectElement)) go(index + 1); else if (event.key === "ArrowLeft" && !(event.target instanceof HTMLSelectElement)) go(index - 1); }}>
    <section className="about-dialog help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={event => event.stopPropagation()}>
      <button className="modal-close" onClick={close} aria-label={t("close")}>×</button>
      <header className="help-head">
        <div><p className="eyebrow">A.R.M.O.R. STUDIO</p><h2 id="help-title">{t("helpTitle")}</h2></div>
        <div className="help-levels" role="radiogroup" aria-label={t("hb_level")}>
          <span>{t("hb_level")}</span>
          {HELP_LEVELS.map(item => <button key={item} type="button" role="radio" aria-checked={level === item} className={level === item ? "active" : ""} title={t(`hb_${item}_h`)} onClick={() => choose(item)}>{t(`hb_${item}`)}</button>)}
        </div>
      </header>
      <div className="help-body">
        <nav className="help-nav" aria-label={t("helpSections")}>{HELP_SECTIONS.map((item, position) => <button key={item.id} className={index === position ? "active" : ""} onClick={() => go(position)}>{t(`help_s_${item.id}`)}</button>)}</nav>
        <article className={`help-page turn-${turn}`} key={section.id} tabIndex={0}>
          <div className="help-art"><TourArt art={pageOf(section.id)} size={150} /><small>{t(`hb_${level}_h`)}</small></div>
          <div className="help-text"><h3>{t(`help_s_${section.id}`)}</h3>
            {shown.map((paragraph, number) => <p key={number} className={number === 0 ? "lead" : ""}>{paragraph}</p>)}
            {level !== "technical" && level !== "advanced" && paragraphs.length > shown.length && <p className="muted help-more">{t("hb_more")}</p>}
            {level === "technical" && tech && tech.routes.length > 0 && <div className="help-tech"><strong>{t("hb_tech_title")}</strong>
              <ul>{tech.routes.map(route => <li key={route}><code>{route}</code></li>)}</ul>
              <small>{tech.every ? `${t("hb_tech_every")}: ${tech.every}` : ""}{tech.role === "admin" ? ` · ${t("hb_tech_admin")}` : ""}</small></div>}
          </div>
        </article>
      </div>
      <footer className="help-actions">
        <div className="help-pager"><button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label={t("hb_prev")} title={t("hb_prev")}>‹</button>
          <span>{t("hb_page").replace("{0}", String(index + 1)).replace("{1}", String(HELP_SECTIONS.length))}</span>
          <button type="button" onClick={() => go(index + 1)} disabled={index === HELP_SECTIONS.length - 1} aria-label={t("hb_next")} title={t("hb_next")}>›</button></div>
        <div>{getPrefsForHelp().tutorial && <button onClick={() => { close(); startTour("welcome"); }}>{t("tourHelpButton")}</button>}
          <button className="primary" onClick={close}>{t("returnConsole")}</button></div>
      </footer>
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
  return <footer className="status-bar" role="contentinfo" data-tour="statusbar">
    <div className="sb-left">
      <span className="sb-chip" title={serverName}>{serverName}</span>
      <i className="sb-sep" />
      <span className={`sb-dot ${synced ? "ok" : "down"}`} aria-hidden="true" />
      <span className="sb-title">{synced ? t("serverSynchronized") : t("serverOffline")}</span>
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
