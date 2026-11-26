/**
 * The arithmetic of the detailed history charts: the figures of a series, the levels worth drawing and the CSV of the samples.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { ChartSeries, SolarSample } from "./solarModel";

export type Threshold = { value: number; label: string; tone: "warn" | "bad" };
export type SeriesStats = { min: number; max: number; last: number };

export function seriesStats(samples: readonly SolarSample[], key: string): SeriesStats | null {
  const values = samples.map(sample => sample[key]).filter((value): value is number => typeof value === "number");
  return values.length === 0 ? null : { min: Math.min(...values), max: Math.max(...values), last: values[values.length - 1] };
}

/** The levels worth drawing: those no further from the data than the data is wide, so a far one never flattens the curves. */
export function thresholdsInView(values: readonly number[], thresholds: readonly Threshold[]): Threshold[] {
  if (values.length === 0) return [];
  const low = Math.min(...values), high = Math.max(...values), reach = Math.max(high - low, Math.abs(high) * 0.1, 0.1);
  return thresholds.filter(item => item.value >= low - reach && item.value <= high + reach);
}

/** The samples as CSV: the time (ISO 8601, UTC) and one column per series; a value a sample does not have is empty. */
export function samplesToCsv(samples: readonly SolarSample[], series: readonly ChartSeries[]): string {
  const cell = (text: string): string => {
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return /[",\r\n]/.test(safe) ? `"${safe.replaceAll("\"", "\"\"")}"` : safe;
  };
  const head = ["time", ...series.map(item => cell(`${item.label} (${item.unit})`))].join(",");
  const rows = samples.map(sample => [new Date(sample.t).toISOString(), ...series.map(item => (typeof sample[item.key] === "number" ? String(sample[item.key]) : ""))].join(","));
  return [head, ...rows].join("\r\n") + "\r\n";
}
