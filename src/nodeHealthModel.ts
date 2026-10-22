/**
 * What the health report of a node means to a person: sizes and times in words, how good a Wi-Fi signal is, which reasons for a restart are a fault, and the line a history is drawn
 * with. Pure functions of the report, so they are tested without a screen.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { BootReport, ConfigCheck, HealthFamily, HealthSample, HealthWarning, NodeHealthItem, SensorHealth } from "./api";

type Translate = (key: string) => string;

export const HEALTH_FAMILIES: readonly HealthFamily[] = ["radar", "solar", "electrical", "alarm", "hmi"];
/** The reasons for a restart nobody asked for (the same list the server uses). */
export const ABNORMAL_RESETS: readonly string[] = ["panic", "int_wdt", "task_wdt", "other_wdt", "brownout", "power_glitch", "cpu_lockup"];
export const isAbnormalReset = (reason: string): boolean => ABNORMAL_RESETS.includes(reason);

/** 142000 is "139 KB"; a megabyte or more is told in MB. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "–";
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes)} B`;
}

/** Seconds as "3 d 4 h", "5 h 12 min" or "7 min" (with the words of the language: daysShort, hoursShort, minutesShort). */
export function formatUptime(seconds: number, t: Translate): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "–";
  const days = Math.floor(seconds / 86400), hours = Math.floor((seconds % 86400) / 3600), minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} ${t("daysShort")} ${hours} ${t("hoursShort")}`;
  if (hours > 0) return `${hours} ${t("hoursShort")} ${minutes} ${t("minutesShort")}`;
  return `${Math.max(0, minutes)} ${t("minutesShort")}`;
}

export type SignalLevel = "good" | "fair" | "weak" | "bad";
/** The usual reading of a Wi-Fi signal: -60 dBm or better is good, down to -70 fair, down to -80 weak, below that very weak. */
export const signalLevel = (dbm: number): SignalLevel => (dbm >= -60 ? "good" : dbm >= -70 ? "fair" : dbm >= -80 ? "weak" : "bad");

/** How full the bar of the free memory is: it is full at six times the level the server warns at (180 KB for 30 KB), and it is "low" under that level. */
export function heapMeter(free: number, warnBelow: number): { percent: number; level: "ok" | "low" } {
  const full = Math.max(warnBelow, 1) * 6;
  return { percent: Math.max(0, Math.min(100, Math.round((free / full) * 100))), level: free < warnBelow ? "low" : "ok" };
}

/** The colour class of a node's pill. */
export const statusClass = (item: Pick<NodeHealthItem, "status">): "good" | "warn" | "bad" => (item.status === "ok" ? "good" : item.status === "warning" ? "warn" : "bad");

/** "{0}" and "{1}" ... filled in. */
export const fillAll = (text: string, ...values: Array<string | number>): string => values.reduce<string>((out, value, index) => out.split(`{${index}}`).join(String(value)), text);

/** The words for the reason of a restart: the contract's value, translated (an unknown one is "unknown"). */
export function resetText(reason: string, t: Translate): string {
  const key = `nh_reset_${reason}`;
  const word = t(key);
  return word === key ? t("nh_reset_unknown") : word;
}

/** The points of a line for a history drawn in `width` by `height`: the values are scaled between their lowest and highest (a flat series is drawn in the middle). */
export function sparkline(values: readonly number[], width: number, height: number, pad = 2): string {
  if (values.length < 2) return "";
  const low = Math.min(...values), high = Math.max(...values), span = high - low;
  const x = (index: number) => pad + (index / (values.length - 1)) * (width - 2 * pad);
  const y = (value: number) => (span === 0 ? height / 2 : height - pad - ((value - low) / span) * (height - 2 * pad));
  return values.map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");
}

export const heapSeries = (samples: readonly HealthSample[]): number[] => samples.map(sample => sample.heap_internal_free ?? sample.heap_free);   // the internal memory when the node tells it: the total adds the external RAM and never looks short
export const signalSeries = (samples: readonly HealthSample[]): number[] => samples.filter(sample => sample.rssi_dbm !== undefined).map(sample => sample.rssi_dbm as number);

/** The nodes of one family (or all), those that need a look first, then the silent ones, then the healthy, each in order of name. */
export function visibleNodes(nodes: readonly NodeHealthItem[], family: HealthFamily | "all"): NodeHealthItem[] {
  const rank = { warning: 0, stale: 1, ok: 2 } as const;
  return nodes.filter(node => family === "all" || node.family === family).sort((a, b) => rank[a.status] - rank[b.status] || a.node_id.localeCompare(b.node_id));
}

// ---- how a node last started, its memory gate, its settings check, and the sensors of a radar node ---------------------------------------------------------------

/** The cause of a dirty start in words (an unknown one is written as the node gave it). */
export function causeText(cause: string, t: Translate): string {
  const key = `nh_cause_${cause}`;
  const word = t(key);
  return word === key ? cause : word;
}

/** What to tell about a dirty start: the cause and how long the node had been up, the internal memory at that moment, whether a core dump was kept and whether the node itself decided the restart. */
export function bootLines(boot: BootReport, t: Translate): string[] {
  const lines: string[] = [];
  const cause = causeText(boot.cause, t);
  lines.push(boot.uptime_before_s !== undefined ? fillAll(t("nh_boot_line"), cause, formatUptime(boot.uptime_before_s, t)) : fillAll(t("nh_boot_line_short"), cause));
  if (boot.heap_internal_free !== undefined && boot.heap_internal_largest !== undefined) lines.push(fillAll(t("nh_boot_memory"), formatBytes(boot.heap_internal_free), formatBytes(boot.heap_internal_largest)));
  if (boot.coredump) lines.push(t("nh_boot_coredump"));
  if (boot.guard) lines.push(t("nh_boot_guard"));
  else if (boot.deliberate) lines.push(t("nh_boot_deliberate"));
  return lines;
}

/** The lines of the settings check of a node (a copy restored after the start, a change that was undone); nothing when it did not check anything. */
export function configCheckLines(check: ConfigCheck | undefined, t: Translate): Array<{ text: string; bad: boolean }> {
  const lines: Array<{ text: string; bad: boolean }> = [];
  if (check?.snapshot) lines.push({ text: t(`nh_cfg_snapshot_${check.snapshot}`), bad: check.snapshot === "failed" });
  if (check?.reverted) lines.push({ text: t(`nh_cfg_reverted_${check.reverted}`), bad: check.reverted === "failed" });
  return lines;
}

/** The model of a sensor as it is written on the sensor itself. */
export const sensorModelName = (model: string): string => model.toUpperCase();

/** The Bluetooth address of a sensor is shown only to an administrator, and only while the sensor's Bluetooth is open (it is the one case the node tells it). */
export const sensorAddress = (sensor: SensorHealth, isAdmin: boolean): string | null => (isAdmin && sensor.bluetooth === "open" && sensor.mac ? sensor.mac : null);

/** A sensor whose Bluetooth is a danger: open, or one that cannot be told closed while the node's rule is to keep it closed (the node says so with `bluetooth_alert`). */
export const bluetoothAlert = (sensor: SensorHealth): boolean => sensor.bluetooth_alert === true || sensor.bluetooth === "open";

/** The sensors in the order of their number. */
export const sortedSensors = (sensors: readonly SensorHealth[]): SensorHealth[] => [...sensors].sort((a, b) => a.sensor_id - b.sensor_id);

/** The explanation of a warning with what to do, with the details the server gave filled in; empty when the warning has no explanation of its own. */
export function warningExplanation(warning: HealthWarning, t: Translate): string {
  const key = `nh_warn_${warning.code}_d`;
  const text = t(key);
  if (text === key) return "";
  const detail = warning.detail;
  if (warning.code === "node_sensor_bluetooth_open") return fillAll(text, String(detail.sensors ?? ""), String(detail.models ?? "").split(",").map(sensorModelName).join(", "));
  if (warning.code === "node_radar_masked") return fillAll(text, String(detail.events_buffered ?? 0));
  if (warning.code === "node_wifi_jam") return fillAll(text, String(detail.rssi_dbm ?? "?"));
  return text;
}
