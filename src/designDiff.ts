/**
 * What taking back a kept version of a design would change in the current one: for each list of items that carry an id (buildings, openings, sensors, nodes...), the items that come
 * back, the ones that go away and the ones that change (a move counts as a change); any other part that differs is listed by its name. Pure: it reads two documents and writes nothing.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export type DesignDiffPart = { name: string; back: string[]; gone: string[]; changed: string[] };
export type DesignDiff = { parts: DesignDiffPart[]; same: boolean };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
/** The same value, with the keys of every object in order, as text: two values are equal when their texts are. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
const idOf = (item: unknown): string | undefined => (isRecord(item) && (typeof item.id === "string" || typeof item.id === "number") ? String(item.id) : undefined);
const items = (value: unknown): unknown[] | null => (value === undefined ? [] : Array.isArray(value) ? value : null);

/** `version` is the kept version, `current` the design now. "back" = in the version and not in the current design. */
export function diffDesigns(version: Record<string, unknown>, current: Record<string, unknown>): DesignDiff {
  const parts: DesignDiffPart[] = [];
  for (const name of [...new Set([...Object.keys(version), ...Object.keys(current)])].sort()) {
    const was = version[name], now = current[name];
    if (canonical(was) === canonical(now)) continue;
    const before = items(was), after = items(now);
    if (before && after && [...before, ...after].every(item => idOf(item) !== undefined)) {
      const kept = new Map(before.map(item => [idOf(item)!, canonical(item)])), live = new Map(after.map(item => [idOf(item)!, canonical(item)]));
      parts.push({
        name,
        back: [...kept.keys()].filter(id => !live.has(id)),
        gone: [...live.keys()].filter(id => !kept.has(id)),
        changed: [...kept.keys()].filter(id => live.has(id) && live.get(id) !== kept.get(id)),
      });
    } else parts.push({ name, back: [], gone: [], changed: [name] });
  }
  return { parts, same: parts.length === 0 };
}
