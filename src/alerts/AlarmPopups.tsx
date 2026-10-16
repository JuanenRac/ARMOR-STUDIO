/**
 * The alarm pop-ups: small cards in a corner of the console that slide in when an alarm comes, pulse while it waits, never cover the work (the page under them stays usable) and close
 * with a click, a key or by themselves. A click on one takes the person to where that alarm is handled.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { alarmSentence } from "./route";
import { useAlerts } from "./settings";
import { stopSound } from "./sounds";
import type { Popup } from "./useAlarmAnnouncer";
import "./alerts.css";

const ICON: Record<string, string> = { critical: "⚠", high: "▲", warning: "●" };

export function AlarmPopups({ popups, open, dismiss, dismissAll, acknowledge, t }: { popups: readonly Popup[]; open: (popup: Popup) => void; dismiss: (id: string) => void; dismissAll: () => void; /** Mark the alarm as seen without leaving the page. */ acknowledge?: (id: string) => void; t: (key: string) => string }) {
  const settings = useAlerts();
  if (popups.length === 0) return null;
  return <div className={`alarm-popups ${settings.popups.blink ? "blink" : ""}`} role="region" aria-label={t("popupRegion")} aria-live="assertive">
    {popups.length > 1 && <button type="button" className="alarm-popups-all" onClick={dismissAll}>{t("popupCloseAll")} ({popups.length})</button>}
    {popups.map(popup => <article key={popup.id} className={`alarm-popup ${popup.alarm.severity}`} role="alert">
      <span className="alarm-popup-icon" aria-hidden="true">{ICON[popup.alarm.severity] ?? "●"}</span>
      <button type="button" className="alarm-popup-body" onClick={() => { stopSound(); open(popup); }} title={t("popupGo")}>
        <strong>{t(`alarm_${popup.alarm.code}`)}</strong>
        <small>{alarmSentence(popup.alarm, t, { type: false, severity: true, source: true })}</small>
        <em>{new Date(popup.alarm.raised_at).toLocaleTimeString()} · {t("popupGo")} ›</em>
      </button>
      {acknowledge && <button type="button" className="alarm-popup-ack" onClick={() => { stopSound(); acknowledge(popup.id); dismiss(popup.id); }}>{t("acknowledge")}</button>}
      <button type="button" className="alarm-popup-close" onClick={() => { stopSound(); dismiss(popup.id); }} aria-label={t("close")} title={t("close")}>×</button>
    </article>)}
  </div>;
}
