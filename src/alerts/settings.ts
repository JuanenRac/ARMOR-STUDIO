/**
 * How an alarm is announced: the sound of each severity (and, if wanted, of each kind of source), the spoken voice, the pop-ups and where an alarm takes the person.
 * Kept in this browser like the rest of the preferences, read with the same suspicion, and watched by components through a small store.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useSyncExternalStore } from "react";
import type { AlarmSourceType, Severity } from "../api";

export const ALERT_KEY = "armor-studio-alerts-v1";
export const SEVERITIES: readonly Severity[] = ["critical", "high", "warning"];
export const SOURCES: readonly AlarmSourceType[] = ["alarm", "camera", "node", "device", "solar", "electrical", "network"];
/** The sounds Studio makes by itself; an uploaded one is `custom:<id>`. `none` is silence. */
export const BUILT_IN_SOUNDS = ["none", "siren", "klaxon", "beep", "pulse", "chime", "bell", "buzzer", "alert"] as const;
export const REDIRECTS = ["never", "critical", "all"] as const;
export const GENDERS = ["any", "female", "male"] as const;
export const AGES = ["child", "adult", "senior"] as const;
/** How the voice speaks: plain, like an action hero (quick, witty, sure of itself), like a dark lord (slow, deep, imposing) or theatrical (cold whispers and dramatic peaks). */
export const VOICE_STYLES = ["plain", "hero", "dark", "chaos"] as const;
export type Redirect = (typeof REDIRECTS)[number];
export type Gender = (typeof GENDERS)[number];
export type Age = (typeof AGES)[number];
export type VoiceStyle = (typeof VOICE_STYLES)[number];

export type AlertSettings = {
  /** Everything silent: no sound and no voice (the pop-ups stay). */
  muted: boolean;
  /** Loudness, in percent. */
  volume: number;
  /** The sound of each severity. */
  sounds: Record<Severity, string>;
  /** A sound for a kind of source that wins over the one of the severity ("" = the severity's own). */
  sourceSounds: Partial<Record<AlarmSourceType, string>>;
  mutedSeverities: Severity[];
  mutedSources: AlarmSourceType[];
  voice: { enabled: boolean; language: string; gender: Gender; age: Age; style: VoiceStyle; /** Say aloud when a node, a device or a camera connects. */ sayConnections: boolean; rate: number; say: { type: boolean; severity: boolean; source: boolean } };
  popups: { enabled: boolean; seconds: number; blink: boolean; onlyWhileArmed: boolean; maxOnScreen: number };
  /** Take the person to the menu where the alarm is handled as soon as it comes in. */
  redirect: Redirect;
  /** The browser tab's title blinks while an alarm waits for a person. */
  blinkTitle: boolean;
};

export const DEFAULT_ALERTS: AlertSettings = {
  muted: false, volume: 70,
  sounds: { critical: "siren", high: "klaxon", warning: "chime" },
  sourceSounds: {}, mutedSeverities: [], mutedSources: [],
  voice: { enabled: false, language: "", gender: "any", age: "adult", style: "plain", sayConnections: true, rate: 100, say: { type: true, severity: true, source: true } },
  popups: { enabled: true, seconds: 15, blink: true, onlyWhileArmed: false, maxOnScreen: 4 },
  redirect: "never", blinkTitle: true,
};

export const LIMITS = { volume: [0, 100], seconds: [0, 120], rate: [60, 160], onScreen: [1, 8] } as const;
const clamp = (value: number, [low, high]: readonly [number, number]): number => Math.min(high, Math.max(low, value));
const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T => (typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : fallback);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const num = (value: unknown, fallback: number, range: readonly [number, number]): number => (typeof value === "number" && Number.isFinite(value) ? clamp(Math.round(value), range) : fallback);
const bool = (value: unknown, fallback: boolean): boolean => (typeof value === "boolean" ? value : fallback);
/** A sound name that is built in or `custom:` plus an id the sound library could have made. */
export const isSoundChoice = (value: unknown): value is string => typeof value === "string" && ((BUILT_IN_SOUNDS as readonly string[]).includes(value) || /^custom:[a-z0-9-]{4,40}$/.test(value));
const sound = (value: unknown, fallback: string): string => (isSoundChoice(value) ? value : fallback);
const subset = <T extends string>(list: readonly T[], value: unknown): T[] => (Array.isArray(value) ? list.filter(item => value.includes(item)) : []);

export function parseAlerts(raw: string | null): AlertSettings {
  let data: unknown;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  const source = isRecord(data) ? data : {};
  const sounds = isRecord(source.sounds) ? source.sounds : {};
  const bySource = isRecord(source.sourceSounds) ? source.sourceSounds : {};
  const voice = isRecord(source.voice) ? source.voice : {};
  const say = isRecord(voice.say) ? voice.say : {};
  const popups = isRecord(source.popups) ? source.popups : {};
  const d = DEFAULT_ALERTS;
  const sourceSounds: Partial<Record<AlarmSourceType, string>> = {};
  for (const kind of SOURCES) if (isSoundChoice(bySource[kind])) sourceSounds[kind] = bySource[kind] as string;
  const language = typeof voice.language === "string" && /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(voice.language) ? voice.language : "";
  return {
    muted: bool(source.muted, d.muted), volume: num(source.volume, d.volume, LIMITS.volume),
    sounds: { critical: sound(sounds.critical, d.sounds.critical), high: sound(sounds.high, d.sounds.high), warning: sound(sounds.warning, d.sounds.warning) },
    sourceSounds, mutedSeverities: subset(SEVERITIES, source.mutedSeverities), mutedSources: subset(SOURCES, source.mutedSources),
    voice: { enabled: bool(voice.enabled, d.voice.enabled), language, gender: oneOf(GENDERS, voice.gender, d.voice.gender), age: oneOf(AGES, voice.age, d.voice.age), style: oneOf(VOICE_STYLES, voice.style, d.voice.style), sayConnections: bool(voice.sayConnections, d.voice.sayConnections), rate: num(voice.rate, d.voice.rate, LIMITS.rate),
      say: { type: bool(say.type, true), severity: bool(say.severity, true), source: bool(say.source, true) } },
    popups: { enabled: bool(popups.enabled, d.popups.enabled), seconds: num(popups.seconds, d.popups.seconds, LIMITS.seconds), blink: bool(popups.blink, d.popups.blink), onlyWhileArmed: bool(popups.onlyWhileArmed, d.popups.onlyWhileArmed), maxOnScreen: num(popups.maxOnScreen, d.popups.maxOnScreen, LIMITS.onScreen) },
    redirect: oneOf(REDIRECTS, source.redirect, d.redirect), blinkTitle: bool(source.blinkTitle, d.blinkTitle),
  };
}

// ---- the store ----
let current: AlertSettings | null = null;
const listeners = new Set<() => void>();
const load = (): AlertSettings => { try { return parseAlerts(window.localStorage.getItem(ALERT_KEY)); } catch { return parseAlerts(null); } };

export function getAlerts(): AlertSettings { if (current === null) current = load(); return current; }

export function setAlerts(patch: Partial<AlertSettings>): AlertSettings {
  current = parseAlerts(JSON.stringify({ ...getAlerts(), ...patch }));
  try { window.localStorage.setItem(ALERT_KEY, JSON.stringify(current)); } catch { /* storage may be blocked: the choices last until the page is closed */ }
  listeners.forEach(listener => listener());
  return current;
}

export const resetAlerts = (): AlertSettings => setAlerts(parseAlerts(null));
export function subscribeAlerts(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
export const useAlerts = (): AlertSettings => useSyncExternalStore(subscribeAlerts, getAlerts, getAlerts);
export function reloadAlerts(): void { current = null; }

/** The sound that goes with an alarm: its source's own if there is one, else its severity's; silence when it or its severity or source is muted. */
export function soundFor(settings: AlertSettings, severity: Severity, source: AlarmSourceType): string {
  if (settings.muted || settings.mutedSeverities.includes(severity) || settings.mutedSources.includes(source)) return "none";
  return settings.sourceSounds[source] || settings.sounds[severity];
}
