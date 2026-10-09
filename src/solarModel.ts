/**
 * The arithmetic of the solar menus, apart from React so it can be tested: the cells of a battery module, the flows of an inverter (which arrow
 * moves, how fast), the scale and the paths of a history chart, and the words of numbers. Types mirror what ARMOR-SERVER sends (ARMOR-COMMON's
 * solar_inverter and solar_battery messages).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */

export type SolarMode = "power_on" | "standby" | "line" | "battery" | "fault" | "power_saving" | "shutdown" | "unknown";
export type SolarInverterReading = {
  kind: "inverter"; node_id: string; device: string; timestamp_ms: number; mode: SolarMode;
  grid_v: number; grid_hz: number; out_v: number; out_hz: number; out_va: number; out_w: number; load_percent: number;
  battery_v: number; battery_a: number; battery_percent: number; pv_v: number; pv_a: number; pv_w: number; heatsink_c: number;
  ac_charging: boolean; pv_charging: boolean; load_on: boolean; warnings: string[];
  /** A second PV input (pv_w is already the sum of both) and, for a parallel system, the totals and the units the node reads. */
  pv2_v?: number; pv2_a?: number; pv2_w?: number;
  /** The DC bus voltage inside the inverter, when it says it. */
  bus_v?: number;
  total_out_w?: number; total_out_va?: number; total_load_percent?: number; total_charging_a?: number;
  units?: SolarUnitReading[];
};
export type SolarUnitReading = {
  unit: number; mode: SolarMode; serial?: string; fault_code?: string; grid_v?: number; out_v?: number; out_va?: number; out_w?: number;
  load_percent?: number; battery_v?: number; battery_percent?: number; pv_v?: number; charging_a?: number;
};
export type SolarModuleReading = {
  n: number; present: boolean; voltage_v?: number; current_a?: number; temperature_c?: number; soc_percent?: number; state?: string;
  cells_v?: number[]; temperatures_c?: number[]; capacity_ah?: number; full_capacity_ah?: number; cycles?: number; health_percent?: number;
};
export type SolarBatteryReading = {
  kind: "battery"; node_id: string; device: string; timestamp_ms: number; modules: number; stack: SolarModuleReading[];
  state?: "charging" | "discharging" | "idle"; voltage_v?: number; current_a?: number; temperature_min_c?: number; temperature_max_c?: number;
  cell_min_v?: number; cell_max_v?: number; soc_percent?: number; alarm?: boolean;
  model?: string; capacity_ah?: number; full_capacity_ah?: number; energy_kwh?: number; cycles?: number; health_percent?: number;
  /** What a battery management system adds: its own power (negative while discharging), the cells being balanced, a protection active and the status codes of its MOSFETs. */
  power_w?: number; balancing?: number; protecting?: boolean; charge_mos?: number; discharge_mos?: number;
};
export type SolarReading = SolarInverterReading | SolarBatteryReading;
export type SolarKind = "inverter" | "battery";
/** A device an operator declared: what it is, how it is connected and which gateway node reads it. */
export type SolarRegistration = { node_id: string; device: string; kind: SolarKind; name: string; model: string; connection: string; notes: string; created_at: string };
/** What the server offers when equipment is declared: the models (with their names and, for inverters, the serial dialect each answers in) and the connections. */
export type SolarCatalog = { inverter_models: string[]; battery_models: string[]; connections: string[]; labels?: Record<string, string>; inverter_dialects?: Record<string, string> };
export type SolarDeviceView = { node_id: string; device: string; kind: SolarKind; reading: SolarReading; received_at: string; stale: boolean; example?: boolean; registered?: SolarRegistration };

/** How the models and connections are written (the brands are the same in every language; "other" is translated where it is shown). */
export const MODEL_LABEL: Record<string, string> = {
  voltronic: "Voltronic (Axpert, PIP)", "mpp-solar": "MPP Solar (Axpert, PIP, InfiniSolar)", "pylontech-us2000": "Pylontech US2000", "pylontech-us3000": "Pylontech US3000",
  "pylontech-us5000": "Pylontech US5000", "ant-bms": "ANT-BMS (own battery)",
};
/** A model as words: the server's name for it, else the built-in one, else an ANT-BMS combination (`ant-bms-16s-100a`) read from its identifier; undefined when nothing knows it. */
export function modelName(model: string, catalog?: SolarCatalog | null): string | undefined {
  const named = catalog?.labels?.[model] ?? MODEL_LABEL[model];
  if (named) return named;
  const ant = /^ant-bms-(\d{1,2})s-(\d{2,3})a$/.exec(model);
  return ant ? `ANT-BMS ${Number(ant[1])}S · ${Number(ant[2])} A` : undefined;
}
/** How worn a battery looks from the capacity it has learned against its rated one: 80 or more is fine, from 60 a warning, below that bad. */
export const healthTone = (percent: number): "ok" | "warn" | "bad" => (percent >= 80 ? "ok" : percent >= 60 ? "warn" : "bad");
export const CONNECTION_LABEL: Record<string, string> = { rs232: "RS232", rs485: "RS485", usb: "USB", can: "CAN", wifi: "Wi-Fi" };
/** The name an operator gave a device, or its identifier when nobody declared it. */
export const displayName = (view: Pick<SolarDeviceView, "device" | "registered">): string => view.registered?.name ?? view.device;
export type SolarTotals = {
  inverters: number; batteries: number; stale: number; pv_w: number; load_w: number; battery_w: number | null; soc_percent: number | null;
  capacity_ah: number | null; full_capacity_ah: number | null; energy_kwh: number | null; grid_present: boolean; mode: SolarMode | null;
};
export type SolarSample = { t: number } & Record<string, number | string>;

// ---- cells -----------------------------------------------------------------------------------------------------------------------------

export type CellStats = { min: number; max: number; mean: number; spreadMv: number; minIndex: number; maxIndex: number };

/** The extremes and the spread of a module's cells (volts); null when there are none. */
export function cellStats(cells: readonly number[] | undefined): CellStats | null {
  if (!cells || cells.length === 0) return null;
  let min = cells[0], max = cells[0], minIndex = 0, maxIndex = 0, sum = 0;
  cells.forEach((v, i) => { sum += v; if (v < min) { min = v; minIndex = i; } if (v > max) { max = v; maxIndex = i; } });
  return { min, max, mean: sum / cells.length, spreadMv: Math.round((max - min) * 1000), minIndex, maxIndex };
}

export type Tone = "ok" | "warn" | "bad";
/** How a cell looks next to its neighbours: within 30 mV of the mean is fine, within 80 mV worth a look, beyond that a problem. */
export function cellTone(volts: number, mean: number): Tone {
  const off = Math.abs(volts - mean) * 1000;
  return off < 30 ? "ok" : off < 80 ? "warn" : "bad";
}
/** The state of a whole module from its cells: the spread is what matters (a balanced stack of any charge is healthy). */
export function spreadTone(spreadMv: number): Tone { return spreadMv < 30 ? "ok" : spreadMv < 80 ? "warn" : "bad"; }

/** Where a cell voltage sits on a bar, 0 to 1, for a lithium iron phosphate cell (2.8 V empty, 3.65 V full): the kind of cell of the batteries this menu is built for. */
export const cellFill = (volts: number): number => Math.min(1, Math.max(0, (volts - 2.8) / (3.65 - 2.8)));

// ---- numbers as words ------------------------------------------------------------------------------------------------------------------

export function formatPower(watts: number): string {
  const magnitude = Math.abs(watts);
  return magnitude >= 1000 ? `${(watts / 1000).toFixed(magnitude >= 10_000 ? 1 : 2)} kW` : `${Math.round(watts)} W`;
}
export const formatEnergy = (kwh: number): string => `${kwh.toFixed(kwh >= 100 ? 0 : kwh >= 10 ? 1 : 2)} kWh`;
export const formatVolts = (v: number, digits = 1): string => `${v.toFixed(digits)} V`;
export const formatAmps = (a: number): string => `${a.toFixed(Math.abs(a) >= 100 ? 0 : 1)} A`;
/** A warning's name (line_fail) as words when the catalogue has none: "Line fail". */
export const humanize = (name: string): string => { const text = name.replace(/_/g, " ").trim(); return text.charAt(0).toUpperCase() + text.slice(1); };
/** The colour a state of charge wears: green well charged, amber getting low, red nearly empty. */
export const levelTone = (percent: number): Tone => (percent >= 40 ? "ok" : percent >= 20 ? "warn" : "bad");

// ---- the flows of an inverter ----------------------------------------------------------------------------------------------------------

export type Flows = {
  pvW: number; loadW: number; batteryW: number; gridW: number;
  /** Which arrows move. */
  pvToInverter: boolean; gridToInverter: boolean; inverterToLoad: boolean; inverterToBattery: boolean; batteryToInverter: boolean;
  gridPresent: boolean;
};
const MOVING_W = 5;

/**
 * What moves where, from one inverter's reading: the panels feed the inverter, the inverter feeds the load, the battery charges (positive battery power) or
 * discharges, and the grid makes up what the panels and the battery do not, when there is a grid and the inverter is on it.
 */
export function flowsOf(inverter: SolarInverterReading): Flows {
  const pvW = inverter.pv_w, loadW = inverter.out_w, batteryW = inverter.battery_v * inverter.battery_a;
  const gridPresent = inverter.grid_v > 100;
  const onGrid = gridPresent && (inverter.mode === "line" || inverter.mode === "standby" || inverter.mode === "power_on");
  const gridW = onGrid ? Math.max(0, loadW + Math.max(0, batteryW) - pvW) : 0;
  return {
    pvW, loadW, batteryW, gridW, gridPresent,
    pvToInverter: pvW > MOVING_W, gridToInverter: gridW > MOVING_W || (inverter.ac_charging && gridPresent), inverterToLoad: loadW > MOVING_W,
    inverterToBattery: batteryW > MOVING_W, batteryToInverter: batteryW < -MOVING_W,
  };
}

/** How long one dash takes to run along an arrow, in seconds: fast for a lot of power, slow for a little. */
export const flowSeconds = (watts: number): number => Math.min(4, Math.max(0.7, 4 - Math.abs(watts) / 1200));

// ---- history charts --------------------------------------------------------------------------------------------------------------------

export type ChartSeries = { key: string; label: string; color: string; unit: string };
export type Point = { x: number; y: number };

/** A pleasant axis for values: [low, high, step], with at most about `ticks` steps and zero kept in when the data is near it. */
export function niceScale(values: readonly number[], ticks = 4): { low: number; high: number; step: number } {
  if (values.length === 0) return { low: 0, high: 1, step: 0.25 };
  let low = Math.min(...values), high = Math.max(...values);
  if (low === high) { low -= 1; high += 1; }
  if (low > 0 && low < (high - low) * 0.5) low = 0;
  const raw = (high - low) / Math.max(1, ticks), magnitude = 10 ** Math.floor(Math.log10(raw)), norm = raw / magnitude;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * magnitude;
  return { low: Math.floor(low / step) * step, high: Math.ceil(high / step) * step, step };
}

/** The samples of a series inside a time window, as points in a box of `width` by `height` (y up is smaller): a path of "M x y L x y ..." and the points. */
export function seriesPoints(samples: readonly SolarSample[], key: string, from: number, to: number, scale: { low: number; high: number }, width: number, height: number): Point[] {
  const span = Math.max(1, to - from), rise = Math.max(1e-9, scale.high - scale.low);
  const points: Point[] = [];
  for (const sample of samples) {
    const value = sample[key];
    if (typeof value !== "number" || sample.t < from || sample.t > to) continue;
    points.push({ x: ((sample.t - from) / span) * width, y: height - ((value - scale.low) / rise) * height });
  }
  return points;
}
export const pathOf = (points: readonly Point[]): string => points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
/** The same points closed down to the bottom edge, for an area fill. */
export const areaOf = (points: readonly Point[], height: number): string => (points.length === 0 ? "" : `${pathOf(points)} L${points[points.length - 1].x.toFixed(1)} ${height} L${points[0].x.toFixed(1)} ${height} Z`);

/** The sample nearest to a time, or undefined for none. */
export function nearestSample(samples: readonly SolarSample[], t: number): SolarSample | undefined {
  let best: SolarSample | undefined, distance = Infinity;
  for (const sample of samples) { const d = Math.abs(sample.t - t); if (d < distance) { distance = d; best = sample; } }
  return best;
}

/** Clock ticks for a window: whole hours (or half hours, or ten minutes) that fall inside it. */
export function timeTicks(from: number, to: number): number[] {
  const hour = 3_600_000, span = to - from, step = span <= hour * 1.5 ? 600_000 : span <= hour * 8 ? hour : span <= hour * 36 ? 4 * hour : span <= hour * 96 ? 12 * hour : span <= hour * 24 * 12 ? 24 * hour : 5 * 24 * hour;
  const first = Math.ceil(from / step) * step, ticks: number[] = [];
  for (let t = first; t <= to; t += step) ticks.push(t);
  return ticks;
}

/** How much of the remaining capacity is left of the full one, 0 to 100, or null when either is unknown. */
export const capacityPercent = (remaining: number | undefined, full: number | undefined): number | null => (remaining === undefined || full === undefined || full <= 0 ? null : Math.min(100, Math.max(0, Math.round((remaining / full) * 100))));
