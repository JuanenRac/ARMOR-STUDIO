/**
 * "Verify": whether a high or odd figure of a battery is real or a misread, and what may be cleared in the battery.
 *
 * A measured value (a cell's voltage, a temperature) is read again by the gateway node in each of its cycles, so the next readings tell. A counter the battery keeps is read by the node
 * only about every half hour: the readings repeat the kept figure and prove nothing, so it is read again from the battery itself by preparing the typed operation, which reads and writes
 * nothing until it is confirmed (ARMOR-SERVER src/battery_write.ts, ARMOR-NODE-SOLAR core/battery_ops.hpp).
 *
 * Only what the maker's console documents is offered for writing: `statc` ("Clear statistic") for the counters of `stat`. No documented command clears the health count of a cell, and a
 * measured value is not something stored that could be cleared.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cellFault, implausibleTemperature, type Fault } from "./solarFaults";
import { cellStats, type SolarModuleReading } from "./solarModel";
import type { SolarLevels } from "./solarThresholds";

export type VerifyTarget =
  | { kind: "live"; stack: string; node: string; module: number; code: Fault["code"]; cell?: number }
  | { kind: "counter"; stack: string; node: string; module: number; counter: string; value: number }
  | { kind: "soh"; stack: string; node: string; module: number; cell: number; value: number };

export type LiveCheck = { bad: boolean; value: number | null };

/** Whether a new reading of the battery still shows the problem; null when it does not carry the figure at all. */
export function checkLive(target: Extract<VerifyTarget, { kind: "live" }>, module: SolarModuleReading | undefined, levels: SolarLevels, lfp: boolean): LiveCheck | null {
  if (!module || !module.present) return null;
  if (target.cell !== undefined) {
    if (target.code === "cell_soh") return module.soh_abnormal === undefined ? null : { bad: module.soh_abnormal.includes(target.cell - 1), value: null };
    const volts = module.cells_v?.[target.cell - 1];
    return volts === undefined ? null : { bad: cellFault(volts, lfp) !== null, value: volts };
  }
  if (target.code === "delta_high") { const stats = cellStats(module.cells_v); return stats ? { bad: stats.spreadMv > levels.cell_spread_mv, value: stats.spreadMv } : null; }
  if (target.code === "health_low") return module.health_percent === undefined ? null : { bad: module.health_percent < levels.health_low_percent, value: module.health_percent };
  const temperatures = [module.temperature_c, ...(module.temperatures_c ?? [])].filter((value): value is number => typeof value === "number");
  if (temperatures.length === 0) return null;
  if (target.code === "temp_low") { const coldest = Math.min(...temperatures); return { bad: coldest < levels.battery_temp_low_c, value: coldest }; }
  const hottest = Math.max(...temperatures);
  if (target.code === "temp_implausible") return { bad: temperatures.some(implausibleTemperature), value: temperatures.find(implausibleTemperature) ?? hottest };
  return { bad: hottest > levels.battery_temp_high_c, value: hottest };
}

export type Verdict = "pending" | "real" | "read_error" | "intermittent" | "no_data";

/** What the new readings say: all of them show it (real), none does (it was a misread, or it has gone), or some (intermittent). */
export function verdictOf(checks: readonly LiveCheck[], wanted: number, timedOut: boolean): Verdict {
  if (checks.length < wanted && !timedOut) return "pending";
  if (checks.length === 0) return "no_data";
  const bad = checks.filter(check => check.bad).length;
  return bad === checks.length ? "real" : bad === 0 ? "read_error" : "intermittent";
}

export type Clearing = { op: "clear_stats" } | { reason: "solx_clear_no_command" | "solx_clear_not_stored" | "solx_clear_master_only" | "solx_clear_admin" };

/**
 * What may be cleared in the battery for a target. `statc` is sent on the console the node is plugged into, which answers for the first battery of the stack (the master): a counter of
 * another battery can only be cleared with the cable on that battery.
 */
export function clearingFor(target: VerifyTarget, isAdmin: boolean): Clearing {
  if (target.kind === "live") return { reason: "solx_clear_not_stored" };
  if (target.kind === "soh") return { reason: "solx_clear_no_command" };
  if (target.module !== 1) return { reason: "solx_clear_master_only" };
  return isAdmin ? { op: "clear_stats" } : { reason: "solx_clear_admin" };
}

/** The value of a counter in the text the node kept before writing ("## stat" and the lines "Bat OV Times  :  523"); null when it is not there. */
export function parseStatCounter(snapshot: string | undefined, counter: string): number | null {
  if (!snapshot) return null;
  const section = snapshot.split(/^## /m).find(part => /^stat\b/.test(part));
  if (!section) return null;
  // the names of the message are the console's, lowercase with underscores; the two "half C" ones are printed with an "@0.5C"
  const printed = counter.replace(/_half_c_/, "@0.5c_").split("_").map(word => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
  const match = new RegExp(`^\\s*${printed}\\.?\\s*:?\\s+(\\d+)\\s*$`, "im").exec(section);
  return match ? Number(match[1]) : null;
}
