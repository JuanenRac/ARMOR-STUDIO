/**
 * Pure helpers of the history view: how an event reads, and how the zone form
 * becomes a validated zone. Kept apart from React so they are unit-tested.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { AlertLevel, ArmorEvent, EventType, HistoryQuery, Zone } from "./api";

export type ZoneDraft = { name: string; node_id: string; sensor_id: string; x_min_mm: string; x_max_mm: string; y_min_mm: string; y_max_mm: string };
export const emptyZoneDraft = (): ZoneDraft => ({ name: "", node_id: "", sensor_id: "", x_min_mm: "", x_max_mm: "", y_min_mm: "", y_max_mm: "" });

const slug = (name: string): string => name.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);

/** A zone from the form, with a unique id derived from its name; null when anything is missing or out of range. */
export function zoneFromDraft(draft: ZoneDraft, existing: Zone[]): Zone | null {
  const name = draft.name.trim();
  const numbers = [draft.x_min_mm, draft.x_max_mm, draft.y_min_mm, draft.y_max_mm].map(value => (value.trim() === "" ? NaN : Number(value)));
  if (!name || name.length > 80 || numbers.some(value => !Number.isFinite(value) || Math.abs(value) > 100_000)) return null;
  const [xMin, xMax, yMin, yMax] = numbers;
  if (xMin >= xMax || yMin >= yMax) return null;
  const node = draft.node_id.trim().toLowerCase();
  if (node && !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(node)) return null;
  const sensorText = draft.sensor_id.trim();
  const sensor = sensorText === "" ? undefined : Number(sensorText);
  if (sensor !== undefined && (!Number.isInteger(sensor) || sensor < 1 || sensor > 3)) return null;
  const base = slug(name) || "zone";
  let id = base;
  for (let index = 2; existing.some(zone => zone.id === id) && index < 100; index += 1) id = `${base.slice(0, 36)}-${index}`;
  if (existing.some(zone => zone.id === id) || existing.length >= 64) return null;
  return {
    id, name, action: "ignore", x_min_mm: xMin, x_max_mm: xMax, y_min_mm: yMin, y_max_mm: yMax,
    ...(node ? { node_id: node } : {}), ...(sensor !== undefined ? { sensor_id: sensor } : {}),
  };
}

/** One line for the event list, in the operator's language. */
export function describeEvent(event: ArmorEvent, t: (key: string) => string): string {
  if (event.type === "camera") return `${event.camera_id}: ${t(`status_${event.from}`)} → ${t(`status_${event.to}`)}`;
  if (event.type === "mode") return event.mode === "armed" ? t("armed") : t("disarmed");
  if (event.type === "device") return `${event.device_id}: ${event.field} ${event.from === null ? "" : `${String(event.from)} → `}${String(event.to)}`;
  if (event.type === "alarm") return `${t(`alarm_${event.code}`)} · ${event.source} · ${t(event.state === "raised" ? "alarmRaised" : event.state === "acknowledged" ? "alarmAcknowledged" : "alarmCleared")}`;
  if (event.type === "alert") return `${event.node_id}: ${t(`level_${event.from}`)} → ${t(`level_${event.to}`)} (${event.targets} ${t("targetsShort")})`;
  return `${event.node_id}: ${event.from ? `${t(`status_${event.from}`)} → ` : ""}${t(`status_${event.to}`)}`;
}

/**
 * What the zone canvas shows: a window on the sensor frame, in millimetres, sized to the HLK-LD2450's rated
 * detection area (6 m, azimuth plus or minus 60 degrees, per the Hi-Link manual).
 */
export type ZoneView = { xMin: number; xMax: number; yMin: number; yMax: number };
export const DEFAULT_ZONE_VIEW: ZoneView = { xMin: -6000, xMax: 6000, yMin: 0, yMax: 6000 };
const SNAP_MM = 10;

/** A point of the canvas (0..width, 0..height in pixels) as millimetres; y grows away from the sensor, downwards on screen. */
export function pixelToMm(view: ZoneView, size: { width: number; height: number }, point: { x: number; y: number }): { x: number; y: number } {
  const fx = Math.min(1, Math.max(0, point.x / size.width)), fy = Math.min(1, Math.max(0, point.y / size.height));
  const snap = (value: number) => Math.round(value / SNAP_MM) * SNAP_MM;
  return { x: snap(view.xMin + fx * (view.xMax - view.xMin)), y: snap(view.yMin + fy * (view.yMax - view.yMin)) };
}

/** The form fields a dragged rectangle fills in; null when it is too small to be a deliberate zone. */
export function rectFromDrag(a: { x: number; y: number }, b: { x: number; y: number }): Pick<ZoneDraft, "x_min_mm" | "x_max_mm" | "y_min_mm" | "y_max_mm"> | null {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  if (x1 - x0 < 50 || y1 - y0 < 50) return null;
  return { x_min_mm: String(x0), x_max_mm: String(x1), y_min_mm: String(y0), y_max_mm: String(y1) };
}

// ---- filters, export and durations for the history view ------------------------------------------------------------------

export type HistoryRange = "24h" | "7d" | "30d" | "all" | "custom";
export type HistoryFilters = { type: EventType | "all"; q: string; range: HistoryRange; from: string; to: string; level: AlertLevel | "any"; order: "desc" | "asc" };
export const DEFAULT_FILTERS: HistoryFilters = { type: "all", q: "", range: "all", from: "", to: "", level: "any", order: "desc" };

const RANGE_MS: Record<"24h" | "7d" | "30d", number> = { "24h": 86_400_000, "7d": 7 * 86_400_000, "30d": 30 * 86_400_000 };

/** A `YYYY-MM-DD` date as the start (or, with `end`, the last millisecond) of that local day; undefined when it is not a date. */
export function localDayBound(value: string, end: boolean): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = end ? new Date(year, month - 1, day, 23, 59, 59, 999) : new Date(year, month - 1, day, 0, 0, 0, 0);
  // JavaScript rolls 2026-13-40 over into another year; a date must be the day it says it is.
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date.getTime() : undefined;
}

/** The server query for a set of filters. The level applies to alerts only, so choosing one narrows the type. */
export function historyQuery(filters: HistoryFilters, now: number = Date.now()): HistoryQuery {
  const query: HistoryQuery = { order: filters.order };
  const q = filters.q.trim();
  if (q) query.q = q.slice(0, 80);
  let since: number | undefined, until: number | undefined;
  if (filters.range === "custom") { since = localDayBound(filters.from, false); until = localDayBound(filters.to, true); }
  else if (filters.range !== "all") since = now - RANGE_MS[filters.range];
  if (since !== undefined) query.since = new Date(since).toISOString();
  if (until !== undefined) query.until = new Date(until).toISOString();
  if (filters.level !== "any") { query.level = filters.level; query.type = "alert"; }
  else if (filters.type !== "all") query.type = filters.type;
  return query;
}

/** A CSV cell: quoted when needed, and a leading = + - or @ is neutralised so a spreadsheet never runs an id as a formula. */
export function csvCell(value: string | number | boolean | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function eventsToCsv(events: readonly ArmorEvent[]): string {
  const rows = events.map(event => [
    event.id, event.at, event.type,
    event.type === "mode" ? "" : event.type === "camera" ? event.camera_id : event.type === "device" ? event.device_id : event.type === "alarm" ? event.source : event.node_id,
    event.type === "mode" || event.type === "alarm" ? "" : event.from ?? "", event.type === "mode" ? event.mode : event.type === "alarm" ? `${event.code}:${event.state}` : event.to,
    event.type === "alert" ? event.targets : "",
  ].map(csvCell).join(","));
  return ["id,time,type,subject,from,to,targets", ...rows].join("\r\n") + "\r\n";
}

/** 93784 seconds as "1d 2h", 3700 as "1h 1m", 59 as "59s". */
export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "-";
  const s = Math.floor(seconds), d = Math.floor(s / 86_400), h = Math.floor((s % 86_400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
