/**
 * The history of the Batteries menu at four depths: the whole bank, one socket's stack, one battery and its cells. The bank and the stack come from the server's history; the server keeps
 * none by battery or cell, so those two show what this browser has seen since Studio was opened.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState } from "react";
import { solarHistory } from "./api";
import type { Translate } from "./components/camera";
import { usePolled } from "./hooks";
import type { Threshold } from "./solarChartData";
import { ProChart } from "./solarCharts";
import { isLfp } from "./solarFaults";
import { solarRecorder } from "./solarRecorder";
import { SOLAR_THRESHOLDS, type SolarLevels } from "./solarThresholds";
import { SOLAR_COLOURS } from "./solarGraphics";
import { displayName, type ChartSeries, type SolarSample } from "./solarModel";
import { bankBucketMs, derivedSamples, mergeBank, presentModules, stackKey, type BatteryView } from "./solarTotals";

export const CHART_RANGES = [{ minutes: 60, key: "solarRange1" }, { minutes: 360, key: "solarRange6" }, { minutes: 1440, key: "solarRange24" }, { minutes: 10_080, key: "solarRange7" }, { minutes: 43_200, key: "solarRange30" }] as const;
type Scope = "bank" | "stack" | "battery" | "cells";
const SCOPES: ReadonlyArray<{ id: Scope; key: string }> = [{ id: "bank", key: "solx_scope_bank" }, { id: "stack", key: "solx_scope_stack" }, { id: "battery", key: "solx_scope_battery" }, { id: "cells", key: "solx_scope_cells" }];

/** A colour for each cell, spread around the wheel so neighbours differ. */
export const cellColour = (index: number): string => `hsl(${(index * 137) % 360} 75% 65%)`;

type Props = { t: Translate; origin: string; stacks: BatteryView[]; current: BatteryView; now: number; history: readonly SolarSample[]; minutes: number; setMinutes: (value: number) => void; levels: SolarLevels };

export function BatteryCharts({ t, origin, stacks, current, now, history, minutes, setMinutes, levels }: Props) {
  const [scope, setScope] = useState<Scope>("stack");
  const [chosen, setChosen] = useState(0);
  const key = stackKey(current);
  const modules = presentModules(current);
  const module = modules.find(item => item.n === chosen) ?? modules[0];
  const everyStack = stacks.map(stackKey).join(",");
  const bank = usePolled(
    () => (scope === "bank" ? Promise.all(stacks.map(stack => solarHistory(origin, stack.node_id, stack.device, minutes).then(answer => answer.samples))) : Promise.resolve(null)),
    30_000, `${scope === "bank" ? everyStack : ""}/${minutes}/${origin}`);
  const from = now - minutes * 60_000;
  const samples: SolarSample[] = scope === "bank" ? mergeBank(bank.data ?? [], bankBucketMs(minutes)) : scope === "stack" ? derivedSamples(history) : module ? solarRecorder.samples(key, module.n) : [];
  const lfp = module ? isLfp(module, current.registered?.model) : false;
  const cellLevels: Threshold[] = scope !== "bank" && lfp ? [{ value: SOLAR_THRESHOLDS.lfpCellHighV, label: t("solx_level_high"), tone: "bad" }, { value: SOLAR_THRESHOLDS.lfpCellLowV, label: t("solx_level_low"), tone: "bad" }] : [];
  const deltaLevels: Threshold[] = [{ value: levels.cell_spread_mv, label: t("solx_level_high"), tone: "warn" }];
  const temperatureLevels: Threshold[] = [{ value: levels.battery_temp_high_c, label: t("solx_level_high"), tone: "bad" }, { value: levels.battery_temp_low_c, label: t("solx_level_low"), tone: "warn" }];
  const socLevels: Threshold[] = [{ value: levels.soc_low, label: t("solx_level_low"), tone: "warn" }];
  const one = (seriesKey: string, label: string, color: string, unit: string): ChartSeries[] => [{ key: seriesKey, label, color, unit }];
  const name = (what: string) => `battery-${scope === "bank" ? "bank" : `${current.node_id}-${current.device}${scope === "stack" ? "" : `-${module?.n ?? 0}`}`}-${what}.csv`;
  const common = { t, samples, from, to: now };
  const temperatureKey = scope === "battery" ? "temperature_c" : "temperature_max_c";
  const cellCount = module?.cells_v?.length ?? 0;
  return <section className="solar-card bat-history">
    <div className="solar-card-head"><h3>{t("solarHistory")} <small>{scope === "bank" ? t("solx_scope_bank") : displayName(current)}</small></h3>
      <div className="solar-ranges" role="group" aria-label={t("solx_scope")}>{SCOPES.map(item => <button type="button" key={item.id} className={scope === item.id ? "active" : ""} aria-pressed={scope === item.id} onClick={() => setScope(item.id)}>{t(item.key)}</button>)}</div>
      <div className="solar-ranges" data-tour="bat-history">{CHART_RANGES.map(range => <button type="button" key={range.minutes} className={minutes === range.minutes ? "active" : ""} onClick={() => setMinutes(range.minutes)}>{t(range.key)}</button>)}</div>
    </div>
    {(scope === "battery" || scope === "cells") && <>
      <label className="sl-pro-pick">{t("solarModule")} <select value={module?.n ?? 0} onChange={event => setChosen(Number(event.target.value))}>{modules.map(item => <option key={item.n} value={item.n}>{item.n}</option>)}</select></label>
      <p className="muted small">{t("solx_recorded_note")}</p>
    </>}
    <p className="muted small">{t("solx_chart_help")}</p>
    <div className="bat-charts" key={`${scope}/${key}/${module?.n ?? 0}/${minutes}`}>
      {scope === "cells" ? <>
        <ProChart {...common} title={t("solarCells")} decimals={3} thresholds={cellLevels} csvName={name("cells")}
          series={Array.from({ length: cellCount }, (_, index) => ({ key: `cell${index + 1}`, label: `${t("solarCellWord")} ${index + 1}`, color: cellColour(index), unit: "V" }))} />
        <ProChart {...common} title={t("solx_delta")} decimals={0} thresholds={deltaLevels} csvName={name("delta")} series={one("delta_mv", t("solx_delta"), SOLAR_COLOURS.pv, "mV")} />
      </> : <>
        <ProChart {...common} title={t("solarVoltage")} decimals={2} csvName={name("voltage")} series={one("voltage_v", t("solarVoltage"), SOLAR_COLOURS.load, "V")} />
        <ProChart {...common} title={t("solarCurrent")} csvName={name("current")} series={one("current_a", t("solarCurrent"), SOLAR_COLOURS.pv, "A")} />
        <ProChart {...common} title={t("solarBatteryPower")} decimals={0} csvName={name("power")} series={one("power_w", t("solarBatteryPower"), SOLAR_COLOURS.grid, "W")} />
        <ProChart {...common} title={t("solarChargeLevel")} decimals={0} thresholds={socLevels} csvName={name("soc")} series={one("soc_percent", t("solarChargeLevel"), SOLAR_COLOURS.battery, "%")} />
        <ProChart {...common} title={t("solarTemperature")} thresholds={temperatureLevels} csvName={name("temperature")} series={one(temperatureKey, t("solarTemperature"), SOLAR_COLOURS.bad, "°C")} />
        <ProChart {...common} title={`${t("solarCells")} ↑ ↓`} decimals={3} thresholds={cellLevels} csvName={name("cell-range")}
          series={[{ key: "cell_max_v", label: t("solx_max"), color: SOLAR_COLOURS.pv, unit: "V" }, { key: "cell_min_v", label: t("solx_min"), color: SOLAR_COLOURS.grid, unit: "V" }]} />
        <ProChart {...common} title={t("solx_delta")} decimals={0} thresholds={deltaLevels} csvName={name("delta")} series={one("delta_mv", t("solx_delta"), SOLAR_COLOURS.pv, "mV")} />
      </>}
    </div>
  </section>;
}
