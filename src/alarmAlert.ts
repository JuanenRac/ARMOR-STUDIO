/**
 * A critical alarm that comes in is heard and, when the browser allows it, shown as a notification, so that an alarm raised while the console is
 * on another tab or another view is not missed. Alarms already on the list when the console opens are not announced again.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useRef } from "react";
import type { Alarm } from "./api";

/** Which alarms are new and critical since the last look (the first look only learns what is there). */
export function newCriticalAlarms(known: Set<string> | null, active: readonly Alarm[]): { fresh: Alarm[]; known: Set<string> } {
  const now = new Set(active.map(alarm => alarm.id));
  if (known === null) return { fresh: [], known: now };
  return { fresh: active.filter(alarm => alarm.severity === "critical" && !alarm.acknowledged_at && !known.has(alarm.id)), known: now };
}

function beep(): void {
  try {
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const audio = new Context();
    for (let i = 0; i < 3; i += 1) {
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = "square"; oscillator.frequency.value = 880;
      gain.gain.value = 0.15;
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(audio.currentTime + i * 0.35); oscillator.stop(audio.currentTime + i * 0.35 + 0.2);
    }
    window.setTimeout(() => void audio.close().catch(() => undefined), 1500);
  } catch { /* the browser did not allow a sound before the first click: the notification and the badge still tell */ }
}

export function useCriticalAlarmAlert(alarms: { active: readonly Alarm[] } | null | undefined, title: string, enabled = true, how: { sound?: boolean; notification?: boolean } = {}): void {
  const sound = how.sound !== false, notification = how.notification !== false;
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!enabled || !notification) return;
    const ask = () => { try { if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission(); } catch { /* not available */ } };
    window.addEventListener("pointerdown", ask, { once: true });
    return () => window.removeEventListener("pointerdown", ask);
  }, [enabled, notification]);
  useEffect(() => {
    if (!alarms) return;
    const { fresh, known: next } = newCriticalAlarms(known.current, alarms.active);
    known.current = next;
    if (!enabled || fresh.length === 0) return;
    if (sound) beep();
    try {
      if (notification && typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(title, { body: fresh.map(alarm => alarm.code).join(", "), tag: "armor-critical", requireInteraction: true });
    } catch { /* a notification that cannot be shown is not worth an error */ }
  }, [alarms, title, enabled, sound, notification]);
}
