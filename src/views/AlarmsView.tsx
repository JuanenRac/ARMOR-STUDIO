/**
 * The Alarms menu: what needs a person right now, how serious it is and where it came from, with a button to acknowledge it; and the
 * closed record. The state of the system (armed or not) is here too, because an alarm only makes sense against it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState } from "react";
import { acknowledgeAlarm, acknowledgeAllAlarms, clearAlarmRecord, type Alarm, type StudioDevice } from "../api";
import { ago, KindIcon } from "../deviceKinds";
import type { Translate } from "../components/camera";
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

export function AlarmsView({ t, origin, alarms, reload, devices, cameraNames, mode, toggleMode, now, isAdmin }: Props) {
  const [message, setMessage] = useState("");
  const active = alarms?.active ?? [], recent = alarms?.recent ?? [];
  const pending = active.filter(alarm => !alarm.acknowledged_at).length;
  const act = async (work: () => Promise<unknown>) => { try { await work(); reload(); } catch { setMessage(t("modeFailed")); } };
  const stateOf = (alarm: Alarm) => !alarm.acknowledged_at ? (alarm.cleared_at ? "ended" : "active") : "going";
  const worst = active.some(alarm => alarm.severity === "critical" && !alarm.acknowledged_at) ? "critical" : active.some(alarm => !alarm.acknowledged_at) ? "warning" : "clear";

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
    {message && <p className="notice bad" role="status">{message}</p>}

    <div className="alarm-list">
      {active.map(alarm => <article key={alarm.id} className={`alarm-card ${alarm.severity} ${stateOf(alarm)}`}>
        <span className={`severity-chip ${alarm.severity}`}>{t(`severity_${alarm.severity}`)}</span>
        <div className="alarm-body">
          <strong>{t(`alarm_${alarm.code}`)}</strong>
          <span className="alarm-source"><AlarmSource alarm={alarm} devices={devices} cameraNames={cameraNames} t={t} /></span>
          <small>{t(`alarmState_${stateOf(alarm)}`)} · {t("raisedAgo")} {ago(alarm.raised_at, now, t)}{alarm.acknowledged_by ? ` · ${t("ackBy")} ${alarm.acknowledged_by}` : ""}</small>
        </div>
        {!alarm.acknowledged_at && <button className="primary" onClick={() => void act(() => acknowledgeAlarm(origin, alarm.id))}>{t("acknowledge")}</button>}
      </article>)}
    </div>

    <article className="stack-card alarm-record">
      <h3>{t("alarmRecord")} <small className="user-chip">{recent.length}</small></h3>
      {recent.length === 0 ? <p className="muted">{t("noRecord")}</p> : <ul>
        {recent.map(alarm => <li key={alarm.id}><span className={`severity-dot ${alarm.severity}`} /><span className="alarm-record-text">{t(`alarm_${alarm.code}`)}</span><span className="alarm-record-source"><AlarmSource alarm={alarm} devices={devices} cameraNames={cameraNames} t={t} /></span><small>{ago(alarm.raised_at, now, t)} · {alarm.acknowledged_by}</small></li>)}
      </ul>}
      {isAdmin && recent.length > 0 && <div className="users-actions"><button className="danger-button" onClick={() => { if (window.confirm(t("confirmClearRecord"))) void act(() => clearAlarmRecord(origin)); }}>{t("clearRecord")}</button></div>}
    </article>
  </section>;
}
