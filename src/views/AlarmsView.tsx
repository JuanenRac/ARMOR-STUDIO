/**
 * The Alarms menu: what needs a person right now, how serious it is, where it came from and what it is about (the device, its address and
 * MAC, the port, the numbers of the line), with the controls to act on it by hand - acknowledge, look at the details, delete one, clear the
 * record - and a filter to find one. The state of the system (armed or not) is here too, because an alarm only makes sense against it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useMemo, useState } from "react";
import { acknowledgeAlarm, acknowledgeAllAlarms, ApiError, clearAlarmRecord, deleteAlarm, saveDeviceNote, type Alarm, type StudioDevice } from "../api";
import { ago, KindIcon } from "../deviceKinds";
import type { Translate } from "../components/camera";
import { ConfirmDialog } from "../components/chrome";
import "./alarms.css";

type Props = {
  t: Translate; origin: string; alarms: { active: Alarm[]; recent: Alarm[] } | null; reload: () => void; devices: StudioDevice[]; cameraNames: Record<string, string>;
  mode: "armed" | "disarmed"; toggleMode: () => void; now: number; isAdmin: boolean;
};

/** Where an alarm came from, in words and (for a device) as its icon. */
export function AlarmSource({ alarm, devices, cameraNames, t }: { alarm: Alarm; devices: StudioDevice[]; cameraNames: Record<string, string>; t: Translate }) {
  if (alarm.source.type === "device") {
    const device = devices.find(item => item.id === alarm.source.id);
    return <><span className="alarm-source-icon">{device ? <KindIcon kind={device.kind} size={20} /> : "◌"}</span><span>{device?.name ?? alarm.source.id}</span></>;
  }
  if (alarm.source.type === "camera") return <><span className="alarm-source-icon">◉</span><span>{cameraNames[alarm.source.id] ?? alarm.source.id}</span></>;
  return <><span className="alarm-source-icon">◌</span><span>{alarm.source.id}</span></>;
}

/** The order the facts are told in; anything else a node sends follows. */
const FACT_ORDER = ["device", "ip", "mac", "vendor", "hostname", "kind", "os", "online", "open_ports", "port", "risky", "opened_at", "first_seen", "mac_now", "mac_before", "what_happened",
  "latency_ms", "loss_percent", "failing", "router_answers", "since", "router", "interface", "node"];

export function factValue(key: string, value: string | number | boolean, t: Translate): string {
  if (typeof value === "boolean") return t(value ? "alarmYes" : "alarmNo");
  if (key === "latency_ms") return `${value} ms`;
  if (key === "loss_percent") return `${value} %`;
  if ((key === "since" || key === "first_seen" || key === "opened_at") && typeof value === "string") { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(); }
  return String(value);
}

export function AlarmFacts({ alarm, t }: { alarm: Alarm; t: Translate }) {
  const entries = Object.entries(alarm.detail ?? {}).sort(([a], [b]) => (FACT_ORDER.indexOf(a) + 1 || 99) - (FACT_ORDER.indexOf(b) + 1 || 99));
  if (entries.length === 0) return <p className="muted small">{t("alarmNoDetails")}</p>;
  return <dl className="alarm-facts">{entries.map(([key, value]) => {
    const label = t(`fact_${key}`);
    return <div key={key}><dt>{label === `fact_${key}` ? key : label}</dt><dd className={key.startsWith("mac") || key === "ip" ? "mono" : ""}>{factValue(key, value, t)}</dd></div>;
  })}</dl>;
}

/** One line that says what it is about, without opening it: the device and its address. */
const summaryOf = (alarm: Alarm): string => [alarm.detail?.device, alarm.detail?.ip, alarm.detail?.port !== undefined ? `:${alarm.detail.port}` : ""].filter(part => part !== undefined && part !== "").join(" · ").replace(" · :", ":");

type Confirming = { kind: "delete"; alarm: Alarm } | { kind: "clear" } | null;

export function AlarmsView({ t, origin, alarms, reload, devices, cameraNames, mode, toggleMode, now }: Props) {
  const [message, setMessage] = useState<{ text: string; bad: boolean }>({ text: "", bad: false });
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [severity, setSeverity] = useState("all"), [source, setSource] = useState("all"), [query, setQuery] = useState("");
  // What somebody has acknowledged is dealt with: it is not shown again as an alarm, whether its cause has ended or not; it is kept in the record below.
  const everyActive = alarms?.active ?? [];
  const active = everyActive.filter(alarm => !alarm.acknowledged_at);
  const recent = [...(alarms?.recent ?? []), ...everyActive.filter(alarm => alarm.acknowledged_at)].sort((a, b) => b.raised_at.localeCompare(a.raised_at));
  const pending = active.filter(alarm => !alarm.acknowledged_at).length;
  const stateOf = (alarm: Alarm) => !alarm.acknowledged_at ? (alarm.cleared_at ? "ended" : "active") : "going";
  const worst = active.some(alarm => alarm.severity === "critical" && !alarm.acknowledged_at) ? "critical" : active.some(alarm => !alarm.acknowledged_at) ? "warning" : "clear";

  /** Do something to the alarms, then refresh the list; if it fails, say why (the real status), not one sentence for everything. */
  const act = async (work: () => Promise<unknown>, done?: (result: unknown) => string) => {
    try {
      const result = await work();
      reload();
      setMessage({ text: done ? done(result) : "", bad: false });
    } catch (error) {
      const why = error instanceof ApiError ? `${error.status} ${error.code}` : t("modeNoAnswer");
      setMessage({ text: `${t("alarmFailedWhy")}${why}`, bad: true });
    }
  };
  const toggle = (id: string) => setOpen(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const sources = useMemo(() => [...new Set([...active, ...recent].map(alarm => alarm.source.type))].sort(), [active, recent]);
  const matches = (alarm: Alarm) => {
    if (severity !== "all" && alarm.severity !== severity) return false;
    if (source !== "all" && alarm.source.type !== source) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    const haystack = [t(`alarm_${alarm.code}`), alarm.code, alarm.source.id, ...Object.values(alarm.detail ?? {}).map(String)].join(" ").toLowerCase();
    return haystack.includes(needle);
  };
  const shownActive = active.filter(matches), shownRecent = recent.filter(matches);

  const markKnown = (alarm: Alarm) => {
    const deviceId = alarm.source.id.includes("/") ? alarm.source.id.slice(alarm.source.id.indexOf("/") + 1) : "";
    if (deviceId) void act(() => saveDeviceNote(origin, deviceId, { trusted: true }), () => t("alarmMarkedKnown"));
  };

  const controls = (alarm: Alarm, compact = false) => <div className={`alarm-actions ${compact ? "compact" : ""}`}>
    {!alarm.acknowledged_at && <button className="primary" onClick={() => void act(() => acknowledgeAlarm(origin, alarm.id))}>{t("acknowledge")}</button>}
    {alarm.code === "network_new_device" && !alarm.cleared_at && <button onClick={() => markKnown(alarm)}>{t("alarmMarkKnown")}</button>}
    <button onClick={() => toggle(alarm.id)} aria-expanded={open.has(alarm.id)}>{open.has(alarm.id) ? t("alarmHideDetails") : t("alarmDetails")}</button>
    <button className="danger-button" onClick={() => setConfirming({ kind: "delete", alarm })} title={t("alarmDeleteTitle")} aria-label={t("alarmDeleteTitle")}>×</button>
  </div>;

  return <section className="alarms-view">
    <header className={`alarm-hero ${worst}`}>
      <div className="alarm-hero-mark">{worst === "clear" ? "✓" : "!"}</div>
      <div className="alarm-hero-text">
        <p className="eyebrow">{t("alarmsTitle")}</p>
        <h2>{pending === 0 ? t("allClear") : `${pending} ${t("alarmsActive")}`}</h2>
        <p className="muted">{pending === 0 ? t("allClearHelp") : t("alarmsHelp")}</p>
      </div>
      <div className="alarm-hero-actions">
        <button className={`mode-big ${mode}`} onClick={toggleMode}>{mode === "armed" ? t("disarmSystem") : t("armSystem")}<small>{mode === "armed" ? t("armed") : t("disarmed")}</small></button>
        {pending > 0 && <button className="primary" onClick={() => void act(() => acknowledgeAllAlarms(origin))}>{t("acknowledgeAll")}</button>}
      </div>
    </header>
    {message.text && <p className={`notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p>}

    <div className="alarm-toolbar">
      <label>{t("alarmFilterSeverity")}<select value={severity} onChange={event => setSeverity(event.target.value)}>
        <option value="all">{t("alarmFilterAll")}</option>{(["critical", "high", "warning"] as const).map(level => <option key={level} value={level}>{t(`severity_${level}`)}</option>)}</select></label>
      <label>{t("alarmFilterSource")}<select value={source} onChange={event => setSource(event.target.value)}>
        <option value="all">{t("alarmFilterAll")}</option>{sources.map(kind => <option key={kind} value={kind}>{t(`source_${kind}`)}</option>)}</select></label>
      <input className="alarm-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("alarmSearch")} aria-label={t("alarmSearch")} />
      <span className="muted small">{t("alarmShowing")} {shownActive.length + shownRecent.length}/{active.length + recent.length}</span>
    </div>

    <div className="alarm-list">
      {shownActive.map(alarm => <article key={alarm.id} className={`alarm-card ${alarm.severity} ${stateOf(alarm)}`}>
        <span className={`severity-chip ${alarm.severity}`}>{t(`severity_${alarm.severity}`)}</span>
        <div className="alarm-body">
          <strong>{t(`alarm_${alarm.code}`)}</strong>
          <span className="alarm-source"><AlarmSource alarm={alarm} devices={devices} cameraNames={cameraNames} t={t} /></span>
          {summaryOf(alarm) && <span className="alarm-summary">{summaryOf(alarm)}</span>}
          <small>{t(`alarmState_${stateOf(alarm)}`)} · {t("raisedAgo")} {ago(alarm.raised_at, now, t)}{alarm.acknowledged_by ? ` · ${t("ackBy")} ${alarm.acknowledged_by}` : ""}</small>
          {open.has(alarm.id) && <AlarmFacts alarm={alarm} t={t} />}
        </div>
        {controls(alarm)}
      </article>)}
    </div>

    <article className="stack-card alarm-record">
      <h3>{t("alarmRecord")} <small className="user-chip">{shownRecent.length}</small></h3>
      {shownRecent.length === 0 ? <p className="muted">{t("noRecord")}</p> : <ul>
        {shownRecent.map(alarm => <li key={alarm.id} className="alarm-record-row">
          <span className={`severity-dot ${alarm.severity}`} /><span className="alarm-record-text">{t(`alarm_${alarm.code}`)}{summaryOf(alarm) ? ` · ${summaryOf(alarm)}` : ""}</span>
          <span className="alarm-record-source"><AlarmSource alarm={alarm} devices={devices} cameraNames={cameraNames} t={t} /></span>
          <small>{ago(alarm.raised_at, now, t)}</small>
          {controls(alarm, true)}
          {open.has(alarm.id) && <div className="alarm-record-facts"><AlarmFacts alarm={alarm} t={t} /></div>}
        </li>)}
      </ul>}
      {recent.length > 0 && <div className="users-actions"><button className="danger-button" onClick={() => setConfirming({ kind: "clear" })}>{t("clearRecord")}</button></div>}
    </article>

    {confirming && <ConfirmDialog t={t} danger
      title={confirming.kind === "clear" ? t("clearRecord") : t("alarmDeleteTitle")}
      text={confirming.kind === "clear" ? t("alarmClearQuestion") : `${t(`alarm_${confirming.alarm.code}`)} - ${t("alarmDeleteQuestion")}`}
      confirmLabel={confirming.kind === "clear" ? t("clearRecord") : t("alarmDelete")}
      cancel={() => setConfirming(null)}
      confirm={() => {
        const what = confirming;
        setConfirming(null);
        if (what.kind === "clear") void act(() => clearAlarmRecord(origin), result => `${(result as { deleted: number }).deleted} ${t("alarmCleared")}`);
        else void act(() => deleteAlarm(origin, what.alarm.id));
      }} />}
  </section>;
}
