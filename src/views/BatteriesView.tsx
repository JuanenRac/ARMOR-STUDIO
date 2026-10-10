/**
 * The Batteries menu: every battery stack the gateway nodes read, with its charge as a liquid level, the capacities, the modules one by one, the cells of each
 * module as bars, and the history of charge, voltage, current, temperature and cell range. Read-only.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useMemo, useState } from "react";
import { solarHistory } from "../api";
import type { Translate } from "../components/camera";
import { usePolled } from "../hooks";
import { BatteryGraphic, BatteryLogo, CellBars, LineChart, SOLAR_COLOURS } from "../solarGraphics";
import {
  capacityPercent, cellStats, displayName, formatAmps, formatEnergy, formatPower, formatVolts, healthTone, levelTone, spreadTone,
  type SolarBatteryReading, type SolarCatalog, type SolarDeviceView, type SolarModuleReading, type SolarRegistration, type SolarTotals,
} from "../solarModel";
import { SolarEquipment } from "../SolarEquipment";
import { EnergyAlarmsCard, EnergyCard } from "./InvertersView";
import { SolarNodes } from "../SolarNodes";
import type { NetworkOverview } from "../networkModel";
import "./solar.css";

type Props = { t: Translate; origin: string; devices: SolarDeviceView[]; waiting: SolarRegistration[]; catalog: SolarCatalog | null; reload: () => void; totals: SolarTotals | null; now: number; unreachable: boolean; network?: NetworkOverview | null };
type Battery = SolarDeviceView & { reading: SolarBatteryReading };
const RANGES = [{ minutes: 60, key: "solarRange1" }, { minutes: 360, key: "solarRange6" }, { minutes: 1440, key: "solarRange24" }, { minutes: 10_080, key: "solarRange7" }, { minutes: 43_200, key: "solarRange30" }] as const;
const TONE = { ok: SOLAR_COLOURS.battery, warn: SOLAR_COLOURS.pv, bad: SOLAR_COLOURS.bad } as const;

export function BatteriesView({ t, origin, devices, totals, now, unreachable, waiting, catalog, reload, network }: Props) {
  const stacks = useMemo(() => devices.filter((d): d is Battery => d.kind === "battery"), [devices]);
  const registrations = useMemo(() => [...stacks.flatMap(d => (d.registered ? [d.registered] : [])), ...waiting.filter(item => item.kind === "battery")], [stacks, waiting]);
  const [chosen, setChosen] = useState("");
  const [minutes, setMinutes] = useState<number>(60);
  const current = stacks.find(item => `${item.node_id}/${item.device}` === chosen) ?? stacks[0];
  const history = usePolled(() => (current ? solarHistory(origin, current.node_id, current.device, minutes) : Promise.resolve(null)), 15_000, `${current?.node_id}/${current?.device}/${minutes}/${origin}`);
  const capacity = totals ? capacityPercent(totals.capacity_ah ?? undefined, totals.full_capacity_ah ?? undefined) : null;
  return <div className="solar-view">
    <header className="solar-head">
      <BatteryLogo size={68} percent={totals?.soc_percent ?? 70} />
      <div className="solar-title"><p className="eyebrow">{t("navEnergy")}</p><h2>{t("batteries")}</h2><span className="muted">{t("solarHelp")}</span></div>
      {totals && <div className="solar-totals">
        <Tile colour={totals.soc_percent === null ? SOLAR_COLOURS.muted : TONE[levelTone(totals.soc_percent)]} label={t("solarSoc")} value={totals.soc_percent === null ? "–" : `${totals.soc_percent} %`} />
        <Tile colour={SOLAR_COLOURS.battery} label="kWh" value={totals.energy_kwh === null ? "–" : formatEnergy(totals.energy_kwh)} />
        <Tile colour={SOLAR_COLOURS.load} label="Ah" value={totals.capacity_ah === null ? "–" : `${totals.capacity_ah.toFixed(0)}${totals.full_capacity_ah === null ? "" : ` / ${totals.full_capacity_ah.toFixed(0)}`}${capacity === null ? "" : ` (${capacity} %)`}`} />
        <Tile colour={SOLAR_COLOURS.pv} label={t("solarBatteryPower")} value={totals.battery_w === null ? "–" : formatPower(totals.battery_w)} />
      </div>}
    </header>
    {unreachable && <p className="solar-notice bad">{t("solarNoHistory")}</p>}
    <SolarNodes t={t} devices={devices} registrations={[...devices.flatMap(d => (d.registered ? [d.registered] : [])), ...waiting]} now={now} />
    <SolarEquipment kind="battery" network={network} t={t} origin={origin} catalog={catalog} registrations={registrations} reporting={stacks} reload={reload} />
    {stacks.length === 0 ? (registrations.length > 0 ? <p className="solar-notice">{t("solarWaitingHelp")}</p> : <div className="solar-empty"><BatteryLogo size={92} /><h3>{t("solarNone")}</h3><p>{t("solarNoneHelp")}</p><p>{t("solarNoneAdd")}</p></div>) : <>
      {stacks.length > 1 && <div className="solar-tabs" role="tablist">{stacks.map(item => {
        const key = `${item.node_id}/${item.device}`;
        return <button key={key} role="tab" aria-selected={item === current} className={item === current ? "active" : ""} onClick={() => setChosen(key)}>{displayName(item)}{item.stale && <i className="solar-stale-dot" title={t("solarStale")} />}</button>;
      })}</div>}
      {current && <StackPanel t={t} stack={current} now={now} history={history.data?.samples ?? []} minutes={minutes} setMinutes={setMinutes} />}
      <EnergyCard t={t} origin={origin} kind="battery" />
      <EnergyAlarmsCard t={t} origin={origin} />
    </>}
  </div>;
}

function Tile({ colour, label, value }: { colour: string; label: string; value: string }) {
  return <div className="solar-tile" style={{ borderColor: `${colour}55` }}><small>{label}</small><b style={{ color: colour }}>{value}</b></div>;
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "bad" }) {
  return <div className={`solar-fact ${tone ?? ""}`}><dt>{label}</dt><dd>{value}</dd></div>;
}

function StackPanel({ t, stack, now, history, minutes, setMinutes }: { t: Translate; stack: Battery; now: number; history: Parameters<typeof LineChart>[0]["samples"]; minutes: number; setMinutes: (value: number) => void }) {
  const r = stack.reading;
  const from = now - minutes * 60_000;
  const age = Math.max(0, Math.round((now - Date.parse(stack.received_at)) / 1000));
  const allCells = r.stack.flatMap(module => module.cells_v ?? []);
  const cells = cellStats(allCells);
  const remaining = capacityPercent(r.capacity_ah, r.full_capacity_ah);
  const stateText = r.state === "charging" ? t("solarCharging") : r.state === "discharging" ? t("solarDischarging") : t("solarIdle");
  return <>
    <section className={`solar-card ${stack.stale ? "is-stale" : ""} ${r.alarm ? "is-fault" : ""}`}>
      <div className="solar-card-head">
        <h3>{displayName(stack)} <small>{stack.node_id}{r.model ? ` · ${r.model}` : ""}</small></h3>
        {stack.example && <span className="solar-pill warn">{t("solarExampleBadge")}</span>}
        {r.alarm && <span className="solar-pill bad">{t("solarAlarmOn")}</span>}
        <span className={`solar-pill ${r.state === "charging" ? "ok" : r.state === "discharging" ? "warn" : ""}`}>{stateText}</span>
        <span className="muted">{stack.stale ? t("solarStale") : `${t("solarUpdated")} ${age} s`}</span>
      </div>
      {r.modules === 0 ? <p className="solar-notice">{t("solarNoModules")}</p> : <div className="solar-stack-top">
        <BatteryGraphic percent={r.soc_percent} state={r.state} alarm={r.alarm === true} />
        <dl className="solar-facts">
          {r.voltage_v !== undefined && <Fact label={t("solarVoltage")} value={formatVolts(r.voltage_v, 2)} />}
          {r.current_a !== undefined && <Fact label={t("solarCurrent")} value={formatAmps(r.current_a)} />}
          {r.voltage_v !== undefined && r.current_a !== undefined && <Fact label={t("solarBatteryPower")} value={formatPower(r.voltage_v * r.current_a)} />}
          {r.temperature_min_c !== undefined && r.temperature_max_c !== undefined && <Fact label={t("solarTemperature")} value={`${r.temperature_min_c.toFixed(1)} – ${r.temperature_max_c.toFixed(1)} °C`} />}
          {cells && <Fact label={t("solarCells")} value={`${cells.min.toFixed(3)} – ${cells.max.toFixed(3)} V · Δ ${cells.spreadMv} mV`} tone={spreadTone(cells.spreadMv)} />}
          {!cells && r.cell_min_v !== undefined && r.cell_max_v !== undefined && <Fact label={t("solarCells")} value={`${r.cell_min_v.toFixed(3)} – ${r.cell_max_v.toFixed(3)} V · Δ ${Math.round((r.cell_max_v - r.cell_min_v) * 1000)} mV`} tone={spreadTone((r.cell_max_v - r.cell_min_v) * 1000)} />}
          {r.power_w !== undefined && <Fact label={t("bmsPower")} value={formatPower(r.power_w)} />}
          {r.balancing !== undefined && <Fact label={t("bmsBalancing")} value={String(r.balancing)} tone={r.balancing > 0 ? "warn" : undefined} />}
          {r.protecting === true && <Fact label={t("bmsProtecting")} value={`${r.charge_mos ?? "–"} / ${r.discharge_mos ?? "–"}`} tone="bad" />}
          {r.protecting !== true && r.charge_mos !== undefined && <Fact label={t("bmsMos")} value={`${r.charge_mos} / ${r.discharge_mos ?? "–"}`} />}
          {r.energy_kwh !== undefined && <Fact label="kWh" value={formatEnergy(r.energy_kwh)} />}
          {r.cycles !== undefined && <Fact label={t("solarCycles")} value={String(r.cycles)} />}
          {r.health_percent !== undefined && <Fact label={t("solarHealth")} value={`${r.health_percent} %`} tone={healthTone(r.health_percent)} />}
          <Fact label={t("solarModules")} value={`${r.stack.filter(module => module.present).length} / ${r.stack.length}`} />
        </dl>
      </div>}
      {r.capacity_ah !== undefined && r.full_capacity_ah !== undefined && <div className="solar-capacity">
        <div className="solar-capacity-head"><span>{t("solarCapacity")}</span><b>{r.capacity_ah.toFixed(1)} / {r.full_capacity_ah.toFixed(1)} Ah{remaining === null ? "" : ` · ${remaining} %`}</b></div>
        <div className="solar-bar"><i style={{ width: `${remaining ?? 0}%`, background: TONE[levelTone(remaining ?? 0)] }} /></div>
      </div>}
    </section>
    {r.stack.map(module => <ModuleCard key={module.n} t={t} module={module} />)}
    <section className="solar-card">
      <div className="solar-card-head"><h3>{t("solarHistory")}</h3>
        <div className="solar-ranges">{RANGES.map(range => <button key={range.minutes} className={minutes === range.minutes ? "active" : ""} onClick={() => setMinutes(range.minutes)}>{t(range.key)}</button>)}</div>
      </div>
      <LineChart t={t} samples={history} from={from} to={now} series={[{ key: "soc_percent", label: t("solarChargeLevel"), color: SOLAR_COLOURS.battery, unit: "%" }]} />
      <LineChart t={t} samples={history} from={from} to={now} decimals={2} series={[{ key: "voltage_v", label: t("solarVoltage"), color: SOLAR_COLOURS.load, unit: "V" }]} />
      <LineChart t={t} samples={history} from={from} to={now} decimals={1} series={[{ key: "current_a", label: t("solarCurrent"), color: SOLAR_COLOURS.pv, unit: "A" }]} />
      <LineChart t={t} samples={history} from={from} to={now} decimals={3} series={[{ key: "cell_max_v", label: `${t("solarCells")} ↑`, color: SOLAR_COLOURS.pv, unit: "V" }, { key: "cell_min_v", label: `${t("solarCells")} ↓`, color: SOLAR_COLOURS.grid, unit: "V" }]} />
      <LineChart t={t} samples={history} from={from} to={now} decimals={1} series={[{ key: "temperature_max_c", label: t("solarTemperature"), color: SOLAR_COLOURS.bad, unit: "°C" }]} />
    </section>
  </>;
}

function ModuleCard({ t, module }: { t: Translate; module: SolarModuleReading }) {
  const cells = cellStats(module.cells_v);
  const remaining = capacityPercent(module.capacity_ah, module.full_capacity_ah);
  if (!module.present) return <section className="solar-card module-card absent"><div className="solar-card-head"><h3>{t("solarModule")} {module.n}</h3><span className="solar-pill">{t("solarModuleAbsent")}</span></div></section>;
  return <section className="solar-card module-card">
    <div className="solar-card-head">
      <h3>{t("solarModule")} {module.n}</h3>
      {module.state && <span className="solar-pill">{module.state}</span>}
      {module.soc_percent !== undefined && <span className={`solar-pill ${levelTone(module.soc_percent)}`}>{module.soc_percent} %</span>}
      {cells && <span className={`solar-pill ${spreadTone(cells.spreadMv)}`}>Δ {cells.spreadMv} mV</span>}
    </div>
    <dl className="solar-facts compact">
      {module.voltage_v !== undefined && <Fact label={t("solarVoltage")} value={formatVolts(module.voltage_v, 3)} />}
      {module.current_a !== undefined && <Fact label={t("solarCurrent")} value={formatAmps(module.current_a)} />}
      {module.temperature_c !== undefined && <Fact label={t("solarTemperature")} value={`${module.temperature_c.toFixed(1)} °C`} />}
      {module.capacity_ah !== undefined && <Fact label={t("solarCapacity")} value={`${module.capacity_ah.toFixed(1)}${module.full_capacity_ah !== undefined ? ` / ${module.full_capacity_ah.toFixed(1)}` : ""} Ah${remaining === null ? "" : ` · ${remaining} %`}`} />}
      {module.cycles !== undefined && <Fact label={t("solarCycles")} value={String(module.cycles)} />}
      {module.health_percent !== undefined && <Fact label={t("solarHealth")} value={`${module.health_percent} %`} tone={healthTone(module.health_percent)} />}
      {module.temperatures_c && module.temperatures_c.length > 0 && <Fact label={t("solarTemperature")} value={module.temperatures_c.map(v => v.toFixed(1)).join(" · ") + " °C"} />}
    </dl>
    {module.cells_v && module.cells_v.length > 0 && <CellBars cells={module.cells_v} t={t} />}
  </section>;
}
