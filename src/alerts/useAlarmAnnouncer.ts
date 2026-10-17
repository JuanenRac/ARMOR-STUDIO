/**
 * Announces the alarms that come in: the sound of their severity, the spoken sentence, a pop-up that does not block anything, a browser notification for a critical one, a blinking tab
 * title while something waits for a person and, if the person asked for it, a jump to the menu where the alarm is handled. Alarms already on the list when the console opens are
 * not announced again, and an alarm that is acknowledged or cleared takes its pop-up away.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Alarm, Severity } from "../api";
import { alarmSentence, routeFor, type RouteContext, type Target } from "./route";
import { playSound, speak, stopSound } from "./sounds";
import { getAlerts, soundFor } from "./settings";

const ORDER: Record<Severity, number> = { critical: 0, high: 1, warning: 2 };
export type Popup = { id: string; alarm: Alarm; shownAt: number };

/** The alarms that are new since the last look and still wait for a person (the first look only learns what is there). */
export function freshAlarms(known: Set<string> | null, active: readonly Alarm[]): { fresh: Alarm[]; known: Set<string> } {
  const ids = new Set(active.map(alarm => alarm.id));
  if (known === null) return { fresh: [], known: ids };
  return { fresh: active.filter(alarm => !alarm.acknowledged_at && !alarm.cleared_at && !known.has(alarm.id)).sort((a, b) => ORDER[a.severity] - ORDER[b.severity]), known: ids };
}

type Options = {
  alarms: { active: readonly Alarm[] } | null | undefined;
  t: (key: string) => string;
  language: string;
  armed: boolean;
  enabled: boolean;
  /** The old, simple switches of the preferences: a sound at all, a notification of the browser. */
  sound: boolean; notification: boolean;
  context: RouteContext;
  go: (target: Target) => void;
};

export function useAlarmAnnouncer(options: Options): { popups: Popup[]; dismiss: (id: string) => void; dismissAll: () => void; open: (popup: Popup) => void } {
  const { alarms, t, language, armed, enabled, sound, notification, context, go } = options;
  const known = useRef<Set<string> | null>(null);
  const [popups, setPopups] = useState<Popup[]>([]);
  const latest = useRef({ t, language, armed, context, go, sound, notification });
  latest.current = { t, language, armed, context, go, sound, notification };

  const dismiss = useCallback((id: string) => setPopups(list => list.filter(item => item.id !== id)), []);
  const dismissAll = useCallback(() => { setPopups([]); stopSound(); }, []);
  const open = useCallback((popup: Popup) => { latest.current.go(routeFor(popup.alarm, latest.current.context)); setPopups(list => list.filter(item => item.id !== popup.id)); }, []);

  useEffect(() => {
    if (!enabled || !latest.current.notification) return;
    const ask = () => { try { if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission(); } catch { /* not available */ } };
    window.addEventListener("pointerdown", ask, { once: true });
    return () => window.removeEventListener("pointerdown", ask);
  }, [enabled, notification]);

  useEffect(() => {
    if (!alarms) return;
    const { fresh, known: next } = freshAlarms(known.current, alarms.active);
    known.current = next;
    // an alarm that is no longer waiting takes its pop-up with it
    const waiting = new Set(alarms.active.filter(alarm => !alarm.acknowledged_at && !alarm.cleared_at).map(alarm => alarm.id));
    setPopups(list => (list.some(item => !waiting.has(item.id)) ? list.filter(item => waiting.has(item.id)) : list));
    const settings = getAlerts();
    if (!enabled || fresh.length === 0) return;
    const now = latest.current;
    if (settings.popups.enabled && (!settings.popups.onlyWhileArmed || now.armed)) {
      setPopups(list => [...fresh.map(alarm => ({ id: alarm.id, alarm, shownAt: Date.now() })), ...list].slice(0, settings.popups.maxOnScreen));
    }
    // one sound for the batch (the one of its most severe alarm) and one sentence, so a burst does not become a wall of noise
    const first = fresh[0];
    if (now.sound && !settings.muted) {
      const choice = soundFor(settings, first.severity, first.source.type);
      if (choice !== "none") void playSound(choice, settings.volume);
      if (settings.voice.enabled && choice !== "none") speak(alarmSentence(first, now.t, settings.voice.say) + (fresh.length > 1 ? `. +${fresh.length - 1}` : ""), settings, now.language);
    }
    try {
      if (now.notification && fresh.some(alarm => alarm.severity === "critical") && typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(now.t("alarmNewCritical"), { body: fresh.map(alarm => now.t(`alarm_${alarm.code}`)).join(", "), tag: "armor-critical", requireInteraction: true });
      }
    } catch { /* a notification that cannot be shown is not worth an error */ }
    const goes = settings.redirect === "all" || (settings.redirect === "critical" && first.severity === "critical");
    if (goes) now.go(routeFor(first, now.context));
  }, [alarms, enabled]);

  // a pop-up that has a time goes by itself
  useEffect(() => {
    const seconds = getAlerts().popups.seconds;
    if (seconds === 0 || popups.length === 0) return;
    const timer = window.setInterval(() => setPopups(list => list.filter(item => Date.now() - item.shownAt < seconds * 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [popups.length]);

  // the tab title blinks while something waits for a person
  const waitingCount = (alarms?.active ?? []).filter(alarm => !alarm.acknowledged_at && !alarm.cleared_at).length;
  useEffect(() => {
    if (!enabled || waitingCount === 0 || !getAlerts().blinkTitle) return;
    const original = document.title.replace(/^\(\d+\) ⚠ /, "");
    let on = false;
    const timer = window.setInterval(() => { on = !on; document.title = on ? `(${waitingCount}) ⚠ ${original}` : original; }, 1000);
    return () => { window.clearInterval(timer); document.title = original; };
  }, [enabled, waitingCount]);

  return { popups, dismiss, dismissAll, open };
}
