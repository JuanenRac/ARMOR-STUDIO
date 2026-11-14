/**
 * The wall-panel mode (kiosk) of the console, without any screen: when it is wanted, when the panel rests, and which alarms it shows. The numbers are in kiosk.config.json.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import config from "./kiosk.config.json";
import type { Alarm } from "../api/alarms";

export type KioskConfig = { idle_after_s: number; alarm_poll_ms: number; wake_lock: boolean };
export const KIOSK_CONFIG: KioskConfig = config;

/** What this browser remembers: the panel was asked for (the installed app starts at /?kiosk=1 and a tablet is reloaded many times). */
export const KIOSK_FLAG = "armor-studio-kiosk";

/** The panel is shown only when it is asked for: ?kiosk=1 turns it on (and it is remembered), ?kiosk=0 turns it off; with neither, what was remembered decides, and by default it is off. */
export function kioskWanted(search: string, remembered: boolean): boolean {
  const asked = new URLSearchParams(search).get("kiosk");
  if (asked === "1") return true;
  if (asked === "0") return false;
  return remembered;
}

/** The panel rests (dims and shows the clock) after [idleAfterS] seconds without a touch; 0 or less: never. An alarm waiting for a person keeps it awake. */
export function isResting(nowMs: number, lastTouchMs: number, idleAfterS: number, alarmWaiting: boolean): boolean {
  if (alarmWaiting || idleAfterS <= 0) return false;
  return nowMs - lastTouchMs >= idleAfterS * 1000;
}

/** The alarms the panel lists: those raised and not cleared, the ones nobody has acknowledged first, then the oldest first. */
export function alarmsToShow(active: readonly Alarm[] | undefined): Alarm[] {
  return (active ?? []).filter(alarm => !alarm.cleared_at)
    .sort((a, b) => Number(Boolean(a.acknowledged_at)) - Number(Boolean(b.acknowledged_at)) || a.raised_at.localeCompare(b.raised_at));
}

export function alarmWaiting(active: readonly Alarm[] | undefined): boolean {
  return alarmsToShow(active).some(alarm => !alarm.acknowledged_at);
}

export function readKioskFlag(): boolean {
  try { return window.localStorage.getItem(KIOSK_FLAG) === "1"; } catch { return false; }
}

export function storeKioskFlag(on: boolean): void {
  try { if (on) window.localStorage.setItem(KIOSK_FLAG, "1"); else window.localStorage.removeItem(KIOSK_FLAG); } catch { /* Storage may be blocked. */ }
}
