/**
 * The sums of the Batteries menu, computed from what each socket's stack reports battery by battery: how many sockets, batteries and cells there are, what they hold, what flows, and
 * where the lowest and highest cell and temperature are. The rules for the capacity and the charge are the server's (ARMOR-SERVER src/solar_totals.ts): charge left and full capacity
 * from the same batteries, the charge weighted by capacity, stale stacks left out, an example only while nothing real is there.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { SolarBatteryReading, SolarDeviceView, SolarModuleReading, SolarSample } from "./solarModel";

export type BatteryView = SolarDeviceView & { reading: SolarBatteryReading };

export type StackFigures = {
  /** Batteries present and the places the stack lists. */
  present: number; slots: number; cells: number;
  capacity_ah: number | null; full_capacity_ah: number | null; energy_kwh: number | null;
  /** Some battery present is not counted in the capacities (it did not say them). */
  partial: boolean;
  /** Some battery's charge left was worked out from its state of charge. */
  estimated: boolean;
};

export function stackFigures(reading: SolarBatteryReading): StackFigures {
  const present = reading.stack.filter(module => module.present);
  const counts = { present: present.length, slots: reading.stack.length, cells: present.reduce((sum, module) => sum + (module.cells_v?.length ?? 0), 0) };
  const judged = present.filter(module => module.full_capacity_ah !== undefined && (module.capacity_ah !== undefined || module.soc_percent !== undefined));
  // the node's own pair is only wrong when some battery says one side and not the other; otherwise it is kept
  const mismatched = present.some(module => (module.capacity_ah === undefined) !== (module.full_capacity_ah === undefined));
  if (!mismatched || judged.length === 0) {
    const some = present.some(module => module.capacity_ah !== undefined) && present.some(module => module.capacity_ah === undefined);
    return { ...counts, capacity_ah: reading.capacity_ah ?? null, full_capacity_ah: reading.full_capacity_ah ?? null, energy_kwh: reading.energy_kwh ?? null, partial: some, estimated: false };
  }
  let remaining = 0, full = 0, estimated = false;
  for (const module of judged) {
    const whole = module.full_capacity_ah as number;
    full += whole;
    if (module.capacity_ah !== undefined) remaining += module.capacity_ah;
    else { remaining += whole * (module.soc_percent as number) / 100; estimated = true; }
  }
  const partial = judged.length < present.length;
  const energy = !partial && !estimated && reading.energy_kwh !== undefined ? reading.energy_kwh : reading.voltage_v !== undefined ? remaining * reading.voltage_v / 1000 : null;
  return { ...counts, capacity_ah: remaining, full_capacity_ah: full, energy_kwh: energy, partial, estimated };
}

/** Where an extreme is: its value, the stack ("node/device"), the battery and, for a cell, the cell (counted from 1). */
export type Where = { value: number; stack: string; module?: number; cell?: number };

export type BankSummary = {
  /** Sockets (stacks) listed, those that report now and those left out for being stale. */
  sockets: number; live: number; stale: number;
  batteries: number; slots: number; cells: number;
  soc_percent: number | null; capacity_ah: number | null; full_capacity_ah: number | null; energy_kwh: number | null;
  current_a: number | null; power_w: number | null;
  cell_min: Where | null; cell_max: Where | null; delta_mv: number | null;
  temperature_min: Where | null; temperature_max: Where | null;
  partial: boolean; estimated: boolean; examples: boolean;
};

export const stackKey = (view: Pick<SolarDeviceView, "node_id" | "device">): string => `${view.node_id}/${view.device}`;

/** The stacks the sums are made of: an example stays out as soon as something real is there. */
export function countableStacks(devices: readonly SolarDeviceView[]): BatteryView[] {
  const stacks = devices.filter((view): view is BatteryView => view.kind === "battery");
  const real = stacks.filter(view => !view.example);
  return real.length > 0 ? real : stacks;
}

export function bankSummary(devices: readonly SolarDeviceView[]): BankSummary {
  const stacks = countableStacks(devices);
  const live = stacks.filter(view => !view.stale && view.reading.modules > 0);
  const sum: BankSummary = {
    sockets: stacks.length, live: live.length, stale: stacks.filter(view => view.stale).length, batteries: 0, slots: 0, cells: 0, soc_percent: null, capacity_ah: null, full_capacity_ah: null,
    energy_kwh: null, current_a: null, power_w: null, cell_min: null, cell_max: null, delta_mv: null, temperature_min: null, temperature_max: null, partial: false, estimated: false,
    examples: stacks.length > 0 && stacks.every(view => view.example),
  };
  const add = (total: number | null, value: number | null): number | null => (value === null ? total : (total ?? 0) + value);
  const lower = (best: Where | null, next: Where): Where => (best === null || next.value < best.value ? next : best);
  const higher = (best: Where | null, next: Where): Where => (best === null || next.value > best.value ? next : best);
  const charges: Array<{ soc: number; full: number | null; modules: number }> = [];
  for (const view of live) {
    const reading = view.reading, key = stackKey(view), figures = stackFigures(reading);
    sum.batteries += figures.present; sum.slots += figures.slots; sum.cells += figures.cells;
    sum.capacity_ah = add(sum.capacity_ah, figures.capacity_ah); sum.full_capacity_ah = add(sum.full_capacity_ah, figures.full_capacity_ah); sum.energy_kwh = add(sum.energy_kwh, figures.energy_kwh);
    sum.partial = sum.partial || figures.partial || figures.capacity_ah === null; sum.estimated = sum.estimated || figures.estimated;
    sum.current_a = add(sum.current_a, reading.current_a ?? null);
    sum.power_w = add(sum.power_w, reading.voltage_v !== undefined && reading.current_a !== undefined ? reading.voltage_v * reading.current_a : null);
    if (reading.soc_percent !== undefined) charges.push({ soc: reading.soc_percent, full: figures.full_capacity_ah, modules: figures.present });
    let cellsSeen = false;
    for (const module of reading.stack) {
      if (!module.present) continue;
      module.cells_v?.forEach((value, index) => {
        cellsSeen = true;
        const at = { value, stack: key, module: module.n, cell: index + 1 };
        sum.cell_min = lower(sum.cell_min, at); sum.cell_max = higher(sum.cell_max, at);
      });
    }
    if (!cellsSeen) {
      if (reading.cell_min_v !== undefined) sum.cell_min = lower(sum.cell_min, { value: reading.cell_min_v, stack: key });
      if (reading.cell_max_v !== undefined) sum.cell_max = higher(sum.cell_max, { value: reading.cell_max_v, stack: key });
    }
    if (reading.temperature_min_c !== undefined) sum.temperature_min = lower(sum.temperature_min, { value: reading.temperature_min_c, stack: key });
    if (reading.temperature_max_c !== undefined) sum.temperature_max = higher(sum.temperature_max, { value: reading.temperature_max_c, stack: key });
  }
  if (charges.length > 0) {
    const byCapacity = charges.every(item => item.full !== null && item.full > 0);
    const weight = (item: (typeof charges)[number]): number => (byCapacity ? item.full as number : Math.max(1, item.modules));
    sum.soc_percent = Math.round(charges.reduce((total, item) => total + item.soc * weight(item), 0) / charges.reduce((total, item) => total + weight(item), 0));
  }
  if (sum.cell_min && sum.cell_max) sum.delta_mv = Math.round((sum.cell_max.value - sum.cell_min.value) * 1000);
  return sum;
}

// ---- histories -------------------------------------------------------------------------------------------------------------------------

/** The samples of a stack with the figures that follow from them: the power and the spread of the cells. */
export function derivedSamples(samples: readonly SolarSample[]): SolarSample[] {
  return samples.map(sample => {
    const out: SolarSample = { ...sample };
    const { voltage_v, current_a, cell_min_v, cell_max_v } = sample;
    if (typeof voltage_v === "number" && typeof current_a === "number") out.power_w = voltage_v * current_a;
    if (typeof cell_min_v === "number" && typeof cell_max_v === "number") out.delta_mv = Math.round((cell_max_v - cell_min_v) * 1000);
    return out;
  });
}

/**
 * The history of the whole bank from the histories of its stacks, in steps of `bucketMs`. A step is given only when every stack that has a history said something in it: a sum with a stack
 * missing would look like a drop. Currents, powers and energies add up; the voltage and the charge are the mean; the extremes are the extremes.
 */
export function mergeBank(histories: ReadonlyArray<readonly SolarSample[]>, bucketMs: number): SolarSample[] {
  const used = histories.filter(history => history.length > 0);
  if (used.length === 0) return [];
  const buckets = new Map<number, Array<SolarSample | undefined>>();
  used.forEach((history, index) => {
    for (const sample of derivedSamples(history)) {
      const at = Math.floor(sample.t / bucketMs) * bucketMs;
      let row = buckets.get(at);
      if (!row) { row = new Array<SolarSample | undefined>(used.length); buckets.set(at, row); }
      row[index] = sample;   // the last of the step
    }
  });
  const numbers = (row: SolarSample[], key: string): number[] => row.map(sample => sample[key]).filter((value): value is number => typeof value === "number");
  const out: SolarSample[] = [];
  for (const [t, row] of [...buckets.entries()].sort(([a], [b]) => a - b)) {
    const filled = row.filter((sample): sample is SolarSample => sample !== undefined);
    if (filled.length < used.length) continue;
    const merged: SolarSample = { t };
    const put = (key: string, how: (values: number[]) => number, everyStack: boolean) => {
      const values = numbers(filled, key);
      if (values.length > 0 && (!everyStack || values.length === used.length)) merged[key] = how(values);
    };
    const total = (values: number[]) => values.reduce((a, b) => a + b, 0), mean = (values: number[]) => total(values) / values.length;
    put("current_a", total, true); put("power_w", total, true); put("energy_kwh", total, true); put("voltage_v", mean, false); put("soc_percent", mean, false);
    put("temperature_max_c", values => Math.max(...values), false); put("cell_min_v", values => Math.min(...values), false); put("cell_max_v", values => Math.max(...values), false);
    if (typeof merged.cell_min_v === "number" && typeof merged.cell_max_v === "number") merged.delta_mv = Math.round((merged.cell_max_v - merged.cell_min_v) * 1000);
    out.push(merged);
  }
  return out;
}

/** The step of the bank's history for a window: at least a minute (a device keeps one sample every 30 s), at most 600 steps. */
export const bankBucketMs = (minutes: number): number => Math.max(60_000, Math.ceil(minutes * 60_000 / 600));

export const presentModules = (view: BatteryView): SolarModuleReading[] => view.reading.stack.filter(module => module.present);
