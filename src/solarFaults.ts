/**
 * What is wrong with a battery or a cell right now, worked out from its latest reading: voltages out of the window of its chemistry, figures that cannot be, the cells' health as the
 * console calls it, the spread of the cells, temperatures, health, and the alarm the stack raises. A fault (something is wrong) blinks; a warning only wears its colour.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { SOLAR_THRESHOLDS, type SolarLevels } from "./solarThresholds";
import { cellStats, displayName, type SolarModuleReading } from "./solarModel";
import { countableStacks, stackKey, type BatteryView } from "./solarTotals";
import type { SolarDeviceView } from "./solarModel";

export type FaultCode = "cell_over" | "cell_under" | "cell_implausible" | "cell_soh" | "delta_high" | "temp_high" | "temp_low" | "temp_implausible" | "health_low" | "stack_alarm" | "protecting";
export type Severity = "fault" | "warn";
export type Fault = {
  code: FaultCode; severity: Severity; stack: string; name: string;
  /** The battery of the stack, and the cell counted from 1. */
  module?: number; cell?: number;
  value?: number; unit?: "V" | "mV" | "°C" | "%";
  /** The stack stopped reporting: this is what it said last. */
  stale: boolean;
};

/** Whether the cells of a battery are lithium iron phosphate ones (Pylontech), by what it was declared as or what it says it is. A battery nobody knows is not judged by its window. */
export function isLfp(module: Pick<SolarModuleReading, "model">, declared?: string): boolean {
  if (declared && /^ant-bms/i.test(declared)) return false;
  if (declared && /^pylontech/i.test(declared)) return true;
  return /^(US\d|UP\d|UF\d|FB|FORCE|PHANTOM)/i.test(module.model ?? "");
}

export const implausibleCell = (volts: number): boolean => volts < SOLAR_THRESHOLDS.plausibleCellV[0] || volts > SOLAR_THRESHOLDS.plausibleCellV[1];
export const implausibleTemperature = (celsius: number): boolean => celsius < SOLAR_THRESHOLDS.plausibleTempC[0] || celsius > SOLAR_THRESHOLDS.plausibleTempC[1];

/** What is wrong with one cell, or null. */
export function cellFault(volts: number, lfp: boolean): "cell_over" | "cell_under" | "cell_implausible" | null {
  if (implausibleCell(volts)) return "cell_implausible";
  if (!lfp) return null;
  return volts > SOLAR_THRESHOLDS.lfpCellHighV ? "cell_over" : volts < SOLAR_THRESHOLDS.lfpCellLowV ? "cell_under" : null;
}

type Found = Pick<Fault, "code" | "severity" | "cell" | "value" | "unit">;

export function moduleFaults(module: SolarModuleReading, levels: SolarLevels, lfp: boolean): Found[] {
  if (!module.present) return [];
  const out: Found[] = [];
  module.cells_v?.forEach((volts, index) => {
    const code = cellFault(volts, lfp);
    if (code) out.push({ code, severity: "fault", cell: index + 1, value: volts, unit: "V" });
  });
  for (const cell of module.soh_abnormal ?? []) out.push({ code: "cell_soh", severity: "fault", cell: cell + 1 });
  const stats = cellStats(module.cells_v);
  if (stats && stats.spreadMv > levels.cell_spread_mv) out.push({ code: "delta_high", severity: "fault", value: stats.spreadMv, unit: "mV" });
  const temperatures = [module.temperature_c, ...(module.temperatures_c ?? [])].filter((value): value is number => typeof value === "number");
  if (temperatures.length > 0) {
    const hottest = Math.max(...temperatures), coldest = Math.min(...temperatures);
    const odd = temperatures.find(implausibleTemperature);
    if (odd !== undefined) out.push({ code: "temp_implausible", severity: "fault", value: odd, unit: "°C" });
    else {
      if (hottest > levels.battery_temp_high_c) out.push({ code: "temp_high", severity: "fault", value: hottest, unit: "°C" });
      if (coldest < levels.battery_temp_low_c) out.push({ code: "temp_low", severity: "warn", value: coldest, unit: "°C" });
    }
  }
  if (module.health_percent !== undefined && module.health_percent < levels.health_low_percent) out.push({ code: "health_low", severity: "warn", value: module.health_percent, unit: "%" });
  return out;
}

export function stackFaults(view: BatteryView, levels: SolarLevels): Fault[] {
  const reading = view.reading, base = { stack: stackKey(view), name: displayName(view), stale: view.stale };
  const out: Fault[] = [];
  for (const module of reading.stack) out.push(...moduleFaults(module, levels, isLfp(module, view.registered?.model)).map(found => ({ ...base, module: module.n, ...found })));
  if (reading.protecting === true) out.push({ ...base, code: "protecting", severity: "fault" });
  // the alarm of the stack is said by itself only when nothing above explains it
  if (reading.alarm === true && !out.some(fault => fault.severity === "fault")) out.push({ ...base, code: "stack_alarm", severity: "fault" });
  return out;
}

/** Every fault of every stack, faults before warnings. */
export function bankFaults(devices: readonly SolarDeviceView[], levels: SolarLevels): Fault[] {
  return countableStacks(devices).flatMap(view => stackFaults(view, levels)).sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "fault" ? -1 : 1));
}

/** Whether something of this stack, battery or cell is a fault that is still being reported. */
export function blinking(faults: readonly Fault[], stack: string, module?: number, cell?: number): boolean {
  return faults.some(fault => fault.severity === "fault" && !fault.stale && fault.stack === stack && (module === undefined || fault.module === module) && (cell === undefined || fault.cell === cell));
}
