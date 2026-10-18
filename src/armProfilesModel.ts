/**
 * The arming modes (profiles) as the editor handles them: the names of the three that exist from the start, a new mode, the rules the server will apply (so Save is not offered for a list it
 * would refuse) and a one-line summary of a mode. Pure functions, tested without a screen.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { ArmProfile, ArmProfileZone } from "./api";

type Translate = (key: string) => string;

export const MAX_PROFILES = 8;
export const RESERVED = ["away", "stay"] as const;
/** The English names the server gives the three modes it starts with; they are shown in the language of the person until somebody renames them. */
const BUILT_IN_NAMES: Record<string, string> = { away: "Away", stay: "Home", night: "Night" };

export function profileName(profile: Pick<ArmProfile, "id" | "name">, t: Translate): string {
  return BUILT_IN_NAMES[profile.id] === profile.name ? t(`apm_name_${profile.id}`) : profile.name;
}

export const isReserved = (id: string): boolean => (RESERVED as readonly string[]).includes(id);

/** "night", "night-2" ...: an id from a name, free in the list (lowercase letters, digits, - and _, at most 16). */
export function newProfileId(name: string, existing: readonly string[]): string {
  const base = (name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^[-_]+|[-_]+$/g, "").slice(0, 12)) || "mode";
  if (!existing.includes(base)) return base;
  for (let n = 2; n < 100; n += 1) { const candidate = `${base}-${n}`.slice(0, 16); if (!existing.includes(candidate)) return candidate; }
  return `${base}-x`.slice(0, 16);
}

export function newProfile(list: readonly ArmProfile[], name: string): ArmProfile {
  return { id: newProfileId(name, list.map(item => item.id)), name, base: "stay" };
}

/** Keeps only what a mode says: a delay of 0 is a delay, an empty one is the panel's own, a zone with nothing to say is dropped. */
export function cleaned(profile: ArmProfile): ArmProfile {
  const out: ArmProfile = { id: profile.id, name: profile.name.trim(), base: profile.base };
  if (profile.exit_delay_s !== undefined) out.exit_delay_s = profile.exit_delay_s;
  if (profile.entry_delay_s !== undefined) out.entry_delay_s = profile.entry_delay_s;
  if (profile.siren === false) out.siren = false;
  if (profile.notify === "normal") out.notify = "normal";
  const zones = (profile.zones ?? []).filter(zone => zone.id && (zone.armed !== undefined || zone.delay !== undefined)).map((zone): ArmProfileZone => {
    const item: ArmProfileZone = { id: zone.id };
    if (zone.armed !== undefined) item.armed = zone.armed;
    if (zone.delay !== undefined && zone.armed !== false) item.delay = zone.delay;
    return item;
  });
  if (zones.length) out.zones = zones;
  return out;
}

export type ProfileProblem = "name" | "delay" | "duplicate_zone" | "duplicate_id" | "reserved" | "count";

/** What the server would refuse, found first: an empty or long name, a delay out of range, a zone chosen twice, a missing away or stay, more than eight modes. */
export function problemsOf(list: readonly ArmProfile[]): ProfileProblem[] {
  const found = new Set<ProfileProblem>();
  if (list.length > MAX_PROFILES) found.add("count");
  if (new Set(list.map(item => item.id)).size !== list.length) found.add("duplicate_id");
  for (const reserved of RESERVED) { const item = list.find(profile => profile.id === reserved); if (!item || item.base !== reserved) found.add("reserved"); }
  for (const item of list) {
    const length = Array.from(item.name.trim()).length;
    if (length < 1 || Array.from(item.name).length > 32) found.add("name");
    for (const delay of [item.exit_delay_s, item.entry_delay_s]) if (delay !== undefined && (!Number.isInteger(delay) || delay < 0 || delay > 300)) found.add("delay");
    const ids = (item.zones ?? []).map(zone => zone.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) found.add("duplicate_zone");
  }
  return [...found];
}

/** A line that says what a mode does beyond its base: "entry 45 s · silent siren · 2 zones differ". */
export function summaryOf(profile: ArmProfile, t: Translate): string {
  const parts: string[] = [t(`apm_base_short_${profile.base}`)];
  if (profile.exit_delay_s !== undefined) parts.push(t("apm_s_exit").replace("{0}", String(profile.exit_delay_s)));
  if (profile.entry_delay_s !== undefined) parts.push(t("apm_s_entry").replace("{0}", String(profile.entry_delay_s)));
  if (profile.siren === false) parts.push(t("apm_s_silent"));
  const differing = (profile.zones ?? []).length;
  if (differing > 0) parts.push(t("apm_s_zones").replace("{0}", String(differing)));
  return parts.join(" · ");
}

/** Every zone any panel has, once: [id, the name to show]. */
export function knownZones(nodes: ReadonlyArray<{ state: { zones: ReadonlyArray<{ id: string; name?: string }> } }>): Array<[string, string]> {
  const seen = new Map<string, string>();
  for (const node of nodes) for (const zone of node.state.zones) if (!seen.has(zone.id)) seen.set(zone.id, zone.name ?? zone.id);
  return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
}
