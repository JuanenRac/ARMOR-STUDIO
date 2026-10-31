/**
 * The arming modes of the server (Away, Home, Night) as the editor and the arming dialog handle them: the references a mode defends (`zone:`, `device:`, `node:`, `camera:`), the rules the
 * server will apply (so Save is not offered for a document it would refuse) and the words for a mode. Pure functions, tested without a screen.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { ArmedMode, ArmingMode, ArmingModesDocument } from "./api";

type Translate = (key: string) => string;
export type RefKind = "zone" | "device" | "node" | "camera";
export const MAX_REFS = 64;
export const MAX_SCHEDULE = 16;
export const ARMED_MODES: readonly ArmedMode[] = ["away", "home", "night"];
export const ASSIGNABLE: readonly Exclude<ArmedMode, "away">[] = ["home", "night"];
const NAME = /^.{1,64}$/;
const AT = /^([01]\d|2[0-3]):[0-5]\d$/;

export const refOf = (kind: RefKind, id: string): string => `${kind}:${id}`;
export const isRef = (value: string): boolean => /^(zone|device|node|camera):/.test(value) && NAME.test(value.slice(value.indexOf(":") + 1));

/** The things the owner can mark, taken from what the console knows. */
export type Universe = { zones: string[]; devices: Array<{ id: string; name: string; location?: string }>; nodes: string[]; cameras: Array<{ id: string; name: string }> };

/** The places (locations) the devices are in: each one is a zone that a mode can defend as a whole. Case ignored, the first spelling kept, in order. */
export function zonesOfDevices(devices: ReadonlyArray<{ location?: string }>): string[] {
  const seen = new Map<string, string>();
  for (const device of devices) {
    const place = (device.location ?? "").trim();
    if (place && place.length <= 64 && !seen.has(place.toLowerCase())) seen.set(place.toLowerCase(), place);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export const defendsRef = (list: readonly string[] | undefined, reference: string): boolean => (list ?? []).some(item => item.toLowerCase() === reference.toLowerCase());
/** The list with the reference added or removed (never over the limit of the contract). */
export function toggleRef(list: readonly string[] | undefined, reference: string): string[] {
  const current = list ?? [];
  if (defendsRef(current, reference)) return current.filter(item => item.toLowerCase() !== reference.toLowerCase());
  return current.length >= MAX_REFS ? [...current] : [...current, reference];
}

/** The definition of a mode with nothing assigned is "empty": asking for it needs a confirmation. */
export const isEmptyMode = (document: ArmingModesDocument, mode: Exclude<ArmedMode, "away">): boolean => (document.modes[mode].defends ?? []).length === 0;

/** References of a mode that name something the console does not know (a device removed since): shown so that they can be cleaned. */
export function unknownRefs(list: readonly string[] | undefined, universe: Universe): string[] {
  const known = new Set<string>([
    ...universe.zones.map(zone => refOf("zone", zone).toLowerCase()), ...universe.devices.map(device => refOf("device", device.id).toLowerCase()),
    ...universe.nodes.map(node => refOf("node", node).toLowerCase()), ...universe.cameras.map(camera => refOf("camera", camera.id).toLowerCase()),
  ]);
  return (list ?? []).filter(item => !known.has(item.toLowerCase()));
}

export type Problem = "bad_reference" | "duplicate_reference" | "too_many" | "bad_delay" | "bad_time" | "bad_days" | "clash" | "too_many_entries";
/** What the server would refuse in the document, in the order it is read. Empty when the document is valid. */
export function problemsOf(document: ArmingModesDocument, maxSchedule = MAX_SCHEDULE): Problem[] {
  const found = new Set<Problem>();
  for (const mode of ARMED_MODES) {
    const definition = document.modes[mode] as { defends?: string[]; entry?: string[]; exit_delay_s?: number; entry_delay_s?: number };
    for (const list of [definition.defends ?? [], definition.entry ?? []]) {
      if (list.length > MAX_REFS) found.add("too_many");
      if (list.some(item => !isRef(item))) found.add("bad_reference");
      if (new Set(list.map(item => item.toLowerCase())).size !== list.length) found.add("duplicate_reference");
    }
    for (const delay of [definition.exit_delay_s, definition.entry_delay_s]) if (delay !== undefined && (!Number.isInteger(delay) || delay < 0 || delay > 300)) found.add("bad_delay");
  }
  const schedule = document.schedule ?? [];
  if (schedule.length > maxSchedule) found.add("too_many_entries");
  const minutes = new Set<string>();
  for (const entry of schedule) {
    if (!AT.test(entry.at)) found.add("bad_time");
    if (!entry.days.length || entry.days.some(day => !Number.isInteger(day) || day < 1 || day > 7) || new Set(entry.days).size !== entry.days.length) found.add("bad_days");
    for (const day of entry.days) { const slot = `${day}@${entry.at}`; if (minutes.has(slot)) found.add("clash"); minutes.add(slot); }
  }
  return [...found];
}

/** The document without the empty pieces the editor leaves (a list with nothing in it, a delay that was cleared). */
export function cleanedDocument(document: ArmingModesDocument): ArmingModesDocument {
  const clean = <T extends { defends?: string[]; entry?: string[]; exit_delay_s?: number; entry_delay_s?: number }>(definition: T): T => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(definition)) {
      if (Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null) out[key] = value;
    }
    return out as T;
  };
  return { modes: { away: clean(document.modes.away), home: clean(document.modes.home), night: clean(document.modes.night) }, schedule: (document.schedule ?? []).map(entry => ({ ...entry, days: [...entry.days].sort((a, b) => a - b) })) };
}

/** The key of the words for a mode (`am_mode_<mode>`). */
export const modeKey = (mode: ArmingMode): string => `am_mode_${mode}`;
export const modeName = (mode: ArmingMode, t: Translate): string => t(modeKey(mode));
/** "ARMED - Home", or "ARMED" when the server does not announce a mode. */
export function armedLabel(mode: "armed" | "disarmed", armingMode: ArmingMode | undefined, t: Translate): string {
  if (mode === "disarmed") return t("disarmed");
  return armingMode && armingMode !== "disarmed" ? `${t("armed")} - ${modeName(armingMode, t)}` : t("armed");
}

/** How many things a mode defends, as a short count for the dialog; away defends everything. */
export function defendedCount(modes: ArmingModesDocument["modes"], mode: ArmedMode): number | "all" {
  return mode === "away" ? "all" : (modes[mode].defends ?? []).length;
}
