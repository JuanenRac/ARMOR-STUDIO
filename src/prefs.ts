/**
 * The preferences of the person at the console: how the help is given (guided tours, hover hints), how the page moves and how dense it is, where it opens and what it announces.
 * They belong to the browser (a phone and a desk do not want the same), are read with the same suspicion as the rest of the browser's storage, and are applied to the page as attributes
 * of <html> so that every style sheet can follow them. The store is a plain module, read from anywhere and watched by components.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useSyncExternalStore } from "react";
import type { View } from "./domain";

export const PREFS_KEY = "armor-studio-prefs-v1";
export const TOOLTIP_MODES = ["off", "text", "rich"] as const;
export const MOTION_MODES = ["full", "reduced", "off"] as const;
export const DENSITIES = ["comfortable", "compact"] as const;
export type TooltipMode = (typeof TOOLTIP_MODES)[number];
export type MotionMode = (typeof MOTION_MODES)[number];
export type Density = (typeof DENSITIES)[number];
/** Where Studio opens: a menu, or the one the person was in last. */
export type StartView = View | "last";

export const VIEWS: readonly View[] = ["overview", "weather", "alarms", "alarmPanels", "cameras", "radar", "inverters", "batteries", "electrical", "devices", "automations", "record", "history", "network", "services", "siteDesigner", "electricalDesigner", "networkDesigner", "alarmDesigner", "system", "configuration"];

export type Prefs = {
  /** The guided tours are offered (the first visit starts the welcome one, the Help and the preferences list them). */
  tutorial: boolean;
  /** A first visit starts the welcome tour by itself. */
  tourAutoStart: boolean;
  /** The tours that were seen to the end (or skipped on purpose). */
  toursDone: string[];
  tooltips: TooltipMode;
  /** How long the pointer rests on a control before its hint appears, in milliseconds. */
  tooltipDelay: number;
  motion: MotionMode;
  density: Density;
  /** The size of the text, in percent. */
  textScale: number;
  startView: StartView;
  /** The menu the person was in last, kept for `startView: "last"`. */
  lastView: View;
  /** The mascot that guides from menu to menu. */
  assistant: boolean;
  /** A new critical alarm is heard. */
  alertSound: boolean;
  /** A new critical alarm is shown as a notification of the browser. */
  alertNotifications: boolean;
};

export const DEFAULT_PREFS: Prefs = {
  tutorial: true, tourAutoStart: true, toursDone: [], tooltips: "rich", tooltipDelay: 450, motion: "full", density: "comfortable", textScale: 100,
  startView: "overview", lastView: "overview", assistant: true, alertSound: true, alertNotifications: true,
};

export const LIMITS = { tooltipDelay: [150, 1500], textScale: [85, 130], tours: 40 } as const;
const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));
const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T => (typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : fallback);

/** Read stored preferences: anything that is not what it should be falls back to its default, and nothing the page did not write is trusted. */
export function parsePrefs(raw: string | null): Prefs {
  let data: unknown;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  const source = typeof data === "object" && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  const bool = (key: keyof Prefs, fallback: boolean): boolean => (typeof source[key] === "boolean" ? (source[key] as boolean) : fallback);
  const number = (key: keyof Prefs, fallback: number, [low, high]: readonly [number, number]): number => (typeof source[key] === "number" && Number.isFinite(source[key]) ? clamp(Math.round(source[key] as number), low, high) : fallback);
  const done = Array.isArray(source.toursDone) ? [...new Set(source.toursDone.filter((item): item is string => typeof item === "string" && /^[a-z][a-z0-9-]{0,31}$/.test(item)))].slice(0, LIMITS.tours) : [];
  const start = source.startView === "last" ? "last" : oneOf(VIEWS, source.startView, DEFAULT_PREFS.startView as View);
  return {
    tutorial: bool("tutorial", DEFAULT_PREFS.tutorial), tourAutoStart: bool("tourAutoStart", DEFAULT_PREFS.tourAutoStart), toursDone: done,
    tooltips: oneOf(TOOLTIP_MODES, source.tooltips, DEFAULT_PREFS.tooltips), tooltipDelay: number("tooltipDelay", DEFAULT_PREFS.tooltipDelay, LIMITS.tooltipDelay),
    motion: oneOf(MOTION_MODES, source.motion, DEFAULT_PREFS.motion), density: oneOf(DENSITIES, source.density, DEFAULT_PREFS.density), textScale: number("textScale", DEFAULT_PREFS.textScale, LIMITS.textScale),
    startView: start, lastView: oneOf(VIEWS, source.lastView, DEFAULT_PREFS.lastView), assistant: bool("assistant", DEFAULT_PREFS.assistant), alertSound: bool("alertSound", DEFAULT_PREFS.alertSound), alertNotifications: bool("alertNotifications", DEFAULT_PREFS.alertNotifications),
  };
}

export const serializePrefs = (prefs: Prefs): string => JSON.stringify(prefs);

/** The menu Studio opens at. */
export const openingView = (prefs: Prefs): View => (prefs.startView === "last" ? prefs.lastView : prefs.startView);

/** Put the preferences on the page: the motion, the density and the size of the text are attributes and a size of <html>, followed by the style sheets. */
export function applyPrefs(prefs: Prefs, root: HTMLElement | undefined = typeof document === "undefined" ? undefined : document.documentElement): void {
  if (!root) return;
  root.dataset.motion = prefs.motion;
  root.dataset.density = prefs.density;
  root.dataset.tooltips = prefs.tooltips;
  root.style.fontSize = prefs.textScale === 100 ? "" : `${prefs.textScale}%`;
}

// ---- the store ----
let current: Prefs | null = null;
const listeners = new Set<() => void>();

const load = (): Prefs => {
  try { return parsePrefs(window.localStorage.getItem(PREFS_KEY)); } catch { return parsePrefs(null); }
};

export function getPrefs(): Prefs {
  if (current === null) current = load();
  return current;
}

export function setPrefs(patch: Partial<Prefs>): Prefs {
  current = parsePrefs(JSON.stringify({ ...getPrefs(), ...patch }));
  try { window.localStorage.setItem(PREFS_KEY, serializePrefs(current)); } catch { /* storage may be blocked: the preferences last until the page is closed */ }
  applyPrefs(current);
  listeners.forEach(listener => listener());
  return current;
}

export const resetPrefs = (): Prefs => setPrefs({ ...DEFAULT_PREFS, toursDone: [] });

/** Mark a tour seen (or, with `false`, forget that it was). */
export function markTour(id: string, seen = true): Prefs {
  const rest = getPrefs().toursDone.filter(item => item !== id);
  return setPrefs({ toursDone: seen ? [...rest, id] : rest });
}

export function subscribePrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The preferences as a hook: the component draws again when they change. */
export const usePrefs = (): Prefs => useSyncExternalStore(subscribePrefs, getPrefs, getPrefs);

/** For tests: forget what was read so that the next read goes to the storage again. */
export function reloadPrefs(): void { current = null; }
