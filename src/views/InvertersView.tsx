/**
 * The Inverters menu: every solar inverter the gateway nodes read, with an animated picture of where the power goes, gauges and readings, the warnings in
 * words and the history of the power and of the battery. Read-only.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useMemo, useState } from "react";
import { readEnergyAlarms, saveEnergyAlarms, solarEnergy, solarHistory, type EnergyAlarmSettings } from "../api";
import type { Translate } from "../components/camera";
import { usePolled } from "../hooks";
import { EnergyBars, FlowDiagram, Gauge, InverterLogo, LineChart, SOLAR_COLOURS } from "../solarGraphics";
import { displayName, flowsOf, formatEnergy, formatPower, humanize, levelTone, niceScale, ratingRows, type SolarCatalog, type SolarDeviceView, type SolarInverterReading, type SolarRegistration, type SolarTotals } from "../solarModel";
import { SolarEquipment } from "../SolarEquipment";
import { SolarNodes } from "../SolarNodes";
import type { NetworkOverview } from "../networkModel";
import "./solar.css";
import "./batteries.css";
import { ExamplesBar } from "./ExamplesBar";

type Props = { t: Translate; origin: string; devices: SolarDeviceView[]; waiting: SolarRegistration[]; catalog: SolarCatalog | null; reload: () => void; totals: SolarTotals | null; now: number; unreachable: boolean; network?: NetworkOverview | null; isAdmin?: boolean };
type Inverter = SolarDeviceView & { reading: SolarInverterReading };
const RANGES = [{ minutes: 60, key: "solarRange1" }, { minutes: 360, key: "solarRange6" }, { minutes: 1440, key: "solarRange24" }, { minutes: 10_080, key: "solarRange7" }, { minutes: 43_200, key: "solarRange30" }] as const;
const TONE = { ok: SOLAR_COLOURS.battery, warn: SOLAR_COLOURS.pv, bad: SOLAR_COLOURS.bad } as const;

export function InvertersView({ t, origin, devices, totals, now, unreachable, waiting, catalog, reload, network, isAdmin = false }: Props) {
  const inverters = useMemo(() => devices.filter((d): d is Inverter => d.kind === "inverter"), [devices]);
  const registrations = useMemo(() => [...inverters.flatMap(d => (d.registered ? [d.registered] : [])), ...waiting.filter(item => item.kind === "inverter")], [inverters, waiting]);
  const [chosen, setChosen] = useState("");
  const [minutes, setMinutes] = useState<number>(60);
  const current = inverters.find(item => `${item.node_id}/${item.device}` === chosen) ?? inverters[0];
  const history = usePolled(() => (current ? solarHistory(origin, current.node_id, current.device, minutes) : Promise.resolve(null)), 15_000, `${current?.node_id}/${current?.device}/${minutes}/${origin}`);
  const nodeCount = new Set([...devices.map(d => d.node_id), ...waiting.map(item => item.node_id)]).size;
  return <div className="solar-view bat-view">
    <header className="solar-head" data-tour="inv-head">
      <InverterLogo size={68} />
      <div className="solar-title"><p className="eyebrow">{t("navEnergy")}</p><h2>{t("inverters")}</h2><span className="muted">{t("solarHelp")}</span></div>
      {totals && <div className="solar-totals" data-tour="inv-totals">
        <Tile colour={SOLAR_COLOURS.pv} label={t("solarPv")} value={formatPower(totals.pv_w)} />
        <Tile colour={SOLAR_COLOURS.load} label={t("solarLoad")} value={formatPower(totals.load_w)} />
        <Tile colour={SOLAR_COLOURS.battery} label={t("solarBatteryPower")} value={totals.battery_w === null ? "–" : formatPower(totals.battery_w)} />
        <Tile colour={SOLAR_COLOURS.grid} label={t("solarGrid")} value={totals.grid_present ? t("solarGridOn") : t("solarGridOff")} />
      </div>}
    </header>
    {unreachable && <p className="solar-notice bad">{t("solarNoHistory")}</p>}
    <details className="bat-section" open={inverters.length === 0}>
      <summary><b>{t("bat_nodes_equipment")}</b><span className="muted">{nodeCount} {t("bat_nodes_word")} · {registrations.length} {t("bat_equipment_word")}</span></summary>
      <div className="bat-section-body">
        <SolarNodes t={t} origin={origin} isAdmin={isAdmin} network={network} devices={devices} registrations={[...devices.flatMap(d => (d.registered ? [d.registered] : [])), ...waiting]} now={now} />
        <SolarEquipment kind="inverter" network={network} t={t} origin={origin} catalog={catalog} registrations={registrations} reporting={inverters} reload={reload} />
      </div>
    </details>
    {inverters.length === 0 ? (registrations.length > 0 ? <p className="solar-notice">{t("solarWaitingHelp")}</p> : <div className="solar-empty"><InverterLogo size={92} /><h3>{t("solarNone")}</h3><p>{t("solarNoneHelp")}</p><p>{t("solarNoneAdd")}</p></div>) : <>
      <ExamplesBar t={t} origin={origin} count={inverters.filter(item => item.example).length} reload={reload} />
      <InvFleet t={t} inverters={inverters} current={current} choose={key => setChosen(key)} />
      {current && <InverterPanel t={t} inverter={current} now={now} history={history.data?.samples ?? []} minutes={minutes} setMinutes={setMinutes} />}
      <details className="bat-section">
        <summary><b>{t("bat_energy_alarms")}</b></summary>
        <div className="bat-section-body"><EnergyCard t={t} origin={origin} kind="inverter" /><EnergyAlarmsCard t={t} origin={origin} /></div>
      </details>
    </>}
  </div>;
}

/** Every inverter of every node, one row each and with the node in the first column: the whole installation at a glance, and the way to choose the inverter that the detail shows. */
function InvFleet({ t, inverters, current, choose }: { t: Translate; inverters: Inverter[]; current: Inverter | undefined; choose: (key: string) => void }) {
  const groups = useMemo(() => {
    const byNode = new Map<string, Inverter[]>();
    for (const item of inverters) byNode.set(item.node_id, [...(byNode.get(item.node_id) ?? []), item]);
    return [...byNode.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [inverters]);
  return <section className="bat-fleet inv-fleet" data-tour="inv-fleet" aria-label={t("inverters")}>
    <div className="bat-row head" role="row"><span>{t("bat_node_col")}</span><span>{t("inverters")}</span><span>{t("solarMode")}</span><span>{t("solarPv")}</span><span>{t("solarLoad")}</span><span>{t("solarBattery")}</span><span>{t("solarGrid")}</span><span>{t("solarHeatsink")}</span><span>{t("solarWarnings")}</span></div>
    {groups.map(([node, items]) => <div key={node} className="bat-group" role="rowgroup">
      {items.map((item, index) => {
        const key = `${item.node_id}/${item.device}`, r = item.reading;
        return <button type="button" key={key} role="row" aria-pressed={item === current} className={`bat-row ${item === current ? "on" : ""} ${item.stale ? "is-stale" : ""} ${r.mode === "fault" ? "is-fault" : ""}`} onClick={() => choose(key)}>
          <span className="bat-node">{index === 0 ? <><b>{node}</b><small>{items.length} {t("inverters").toLowerCase()}</small></> : null}</span>
          <span className="bat-name"><b>{displayName(item)}</b>{item.stale && <i className="solar-stale-dot" title={t("solarStale")} />}{item.example && <span className="solar-pill warn">{t("solarExampleBadge")}</span>}</span>
          <span><span className={`solar-pill ${r.mode === "fault" ? "bad" : r.mode === "battery" ? "warn" : "ok"}`}>{t(`solarMode_${r.mode}`)}</span></span>
          <span>{formatPower(r.pv_w)}</span>
          <span className="bat-soc"><span className="solar-bar"><i style={{ width: `${Math.min(100, Math.round(r.load_percent))}%`, background: r.load_percent > 85 ? SOLAR_COLOURS.bad : SOLAR_COLOURS.load }} /></span><b>{formatPower(r.out_w)}</b></span>
          <span>{Math.round(r.battery_percent)} % · {r.battery_v.toFixed(1)} V</span>
          <span>{r.grid_v.toFixed(0)} V</span>
          <span className={r.heatsink_c > 80 ? "bad" : r.heatsink_c > 60 ? "warn" : ""}>{Math.round(r.heatsink_c)} °C</span>
          <span className={r.warnings.length > 0 ? "warn" : ""}>{r.warnings.length > 0 ? r.warnings.length : "–"}</span>
        </button>;
      })}
    </div>)}
  </section>;
}

function Tile({ colour, label, value }: { colour: string; label: string; value: string }) {
  return <div className="solar-tile" style={{ borderColor: `${colour}55` }}><small>{label}</small><b style={{ color: colour }}>{value}</b></div>;
}

function InverterPanel({ t, inverter, now, history, minutes, setMinutes }: { t: Translate; inverter: Inverter; now: number; history: Parameters<typeof LineChart>[0]["samples"]; minutes: number; setMinutes: (value: number) => void }) {
  const r = inverter.reading;
  const flow = flowsOf(r);
  const seen = Math.max(r.pv_w, ...history.map(sample => (typeof sample.pv_w === "number" ? sample.pv_w : 0)));
  const from = now - minutes * 60_000;
  const age = Math.max(0, Math.round((now - Date.parse(inverter.received_at)) / 1000));
  return <>
    <section data-tour="inv-flow" className={`solar-card flow-card bat-detail ${inverter.stale ? "is-stale" : ""} ${r.mode === "fault" ? "is-fault" : ""}`}>
      <div className="solar-card-head">
        <h3>{displayName(inverter)} <small>{inverter.node_id}</small></h3>
        {inverter.example && <span className="solar-pill warn">{t("solarExampleBadge")}</span>}
        <span className={`solar-pill ${r.mode === "fault" ? "bad" : r.mode === "battery" ? "warn" : "ok"}`}>{t(`solarMode_${r.mode}`)}</span>
        <span className="muted">{inverter.stale ? t("solarStale") : `${t("solarUpdated")} ${age} s`}</span>
      </div>
      <div className="inv-top">
      <FlowDiagram inverter={r} t={t} />
      <div className="solar-gauges" data-tour="inv-gauges">
        <Gauge value={r.pv_w} max={niceScale([0, seen]).high || 1000} label={t("solarPv")} display={formatPower(r.pv_w)} colour={SOLAR_COLOURS.pv} />
        <Gauge value={r.load_percent} max={100} label={t("solarLoad")} display={`${Math.round(r.load_percent)} %`} colour={r.load_percent > 85 ? SOLAR_COLOURS.bad : SOLAR_COLOURS.load} />
        <Gauge value={r.battery_percent} max={100} label={t("solarBattery")} display={`${Math.round(r.battery_percent)} %`} colour={TONE[levelTone(r.battery_percent)]} />
        <Gauge value={r.heatsink_c} max={100} label={t("solarHeatsink")} display={`${Math.round(r.heatsink_c)} °C`} colour={r.heatsink_c > 80 ? SOLAR_COLOURS.bad : r.heatsink_c > 60 ? SOLAR_COLOURS.pv : SOLAR_COLOURS.battery} />
      </div>
      </div>
    </section>
    <section className="solar-card bat-detail">
      <dl className="solar-readings">
        <div><dt>{t("solarGrid")}</dt><dd>{r.grid_v.toFixed(1)} V · {r.grid_hz.toFixed(1)} Hz</dd></div>
        <div><dt>{t("solarOutput")}</dt><dd>{r.out_v.toFixed(1)} V · {r.out_hz.toFixed(1)} Hz</dd></div>
        <div><dt>{t("solarOutput")}</dt><dd>{Math.round(r.out_va)} VA · {Math.round(r.out_w)} W</dd></div>
        <div><dt>{t("solarBattery")}</dt><dd>{r.battery_v.toFixed(2)} V · {r.battery_a.toFixed(1)} A</dd></div>
        <div><dt>{t("solarPv")}</dt><dd>{r.pv_v.toFixed(1)} V · {r.pv_a.toFixed(1)} A</dd></div>
        {typeof r.pv2_w === "number" && <div><dt>{t("solarPv2")}</dt><dd>{(r.pv2_v ?? 0).toFixed(1)} V · {(r.pv2_a ?? 0).toFixed(1)} A · {formatPower(r.pv2_w)}</dd></div>}
        <div><dt>{t("solarBatteryPower")}</dt><dd>{formatPower(flow.batteryW)}</dd></div>
        {typeof r.bus_v === "number" && <div><dt>{t("solarBus")}</dt><dd>{r.bus_v.toFixed(1)} V</dd></div>}
      </dl>
      {r.units && r.units.length > 0 && <>
        <small>{t("solarUnits")}{typeof r.total_out_w === "number" ? ` · ${t("solarSystemTotal")}: ${formatPower(r.total_out_w)}${typeof r.total_load_percent === "number" ? ` · ${Math.round(r.total_load_percent)} %` : ""}` : ""}</small>
        <dl className="solar-readings solar-units">
          {r.units.map(unit => <div key={unit.unit}>
            <dt>{t("solarUnit")} {unit.unit + 1}{unit.serial ? ` · ${unit.serial}` : ""}</dt>
            <dd>{t(`solarMode_${unit.mode}`)}{unit.fault_code && unit.fault_code !== "00" ? ` · ${t("solarFault")} ${unit.fault_code}` : ""}{typeof unit.out_w === "number" ? ` · ${Math.round(unit.out_w)} W` : ""}{typeof unit.load_percent === "number" ? ` · ${Math.round(unit.load_percent)} %` : ""}{typeof unit.battery_v === "number" ? ` · ${unit.battery_v.toFixed(1)} V` : ""}</dd>
          </div>)}
        </dl>
      </>}
      <div className="solar-leds">
        <span className={r.pv_charging ? "on" : ""}><i />{t("solarPv")} ▸ {t("solarBattery")}</span>
        <span className={r.ac_charging ? "on" : ""}><i />{t("solarGrid")} ▸ {t("solarBattery")}</span>
        <span className={r.load_on ? "on" : ""}><i />{t("solarLoad")}</span>
      </div>
      <div className="solar-warnings" data-tour="inv-warnings">
        <small>{t("solarWarnings")}</small>
        {r.warnings.length === 0 ? (r.warnings_known === false ? <span className="solar-chip" title={t("solarWarningsUnknownTip")}>{t("solarWarningsUnknown")}</span> : <span className="solar-chip ok">{t("solarNoWarnings")}</span>) : r.warnings.map(name => <span key={name} className="solar-chip bad">{humanize(name)}</span>)}
      </div>
    </section>
    {hasUnitInfo(r) && <details className="bat-section"><summary><b>{t("solarUnitInfo")}</b></summary><div className="bat-section-body"><UnitInfoCard t={t} reading={r} /></div></details>}
    <section className="solar-card bat-history">
      <div className="solar-card-head"><h3>{t("solarHistory")}</h3>
        <div className="solar-ranges" data-tour="inv-history">{RANGES.map(range => <button key={range.minutes} className={minutes === range.minutes ? "active" : ""} onClick={() => setMinutes(range.minutes)}>{t(range.key)}</button>)}</div>
      </div>
      <div className="bat-charts">
      <LineChart t={t} samples={history} from={from} to={now} series={[{ key: "pv_w", label: t("solarPvPower"), color: SOLAR_COLOURS.pv, unit: "W" }, { key: "out_w", label: t("solarLoadPower"), color: SOLAR_COLOURS.load, unit: "W" }]} />
      <LineChart t={t} samples={history} from={from} to={now} series={[{ key: "battery_percent", label: t("solarChargeLevel"), color: SOLAR_COLOURS.battery, unit: "%" }]} />
      </div>
    </section>
  </>;
}

/** Whether the unit said anything about itself (see UnitInfoCard). */
export const hasUnitInfo = (reading: SolarInverterReading): boolean => Boolean(reading.serial || reading.firmware || typeof reading.pv_energy_total_wh === "number" || (reading.ratings && ratingRows(reading.ratings).length > 0));

/** What the unit says about itself: the serial number and the firmware, the energy the panels have made in all, and its ratings and settings. Nothing when it said none of it. */
export function UnitInfoCard({ t, reading }: { t: Translate; reading: SolarInverterReading }) {
  const rows = reading.ratings ? ratingRows(reading.ratings) : [];
  const text = (value: string) => (value.startsWith("@") ? t(value.slice(1)) : value);
  if (!reading.serial && !reading.firmware && typeof reading.pv_energy_total_wh !== "number" && rows.length === 0) return null;
  return <section className="solar-card unit-info">
    <div className="solar-card-head"><h3>{t("solarUnitInfo")}</h3></div>
    <dl className="solar-readings">
      {reading.serial && <div><dt>{t("solarSerial")}</dt><dd className="mono">{reading.serial}</dd></div>}
      {reading.firmware && <div><dt>{t("solarFirmware")}</dt><dd className="mono">{reading.firmware}</dd></div>}
      {typeof reading.pv_energy_total_wh === "number" && <div><dt>{t("solarEnergyTotal")}</dt><dd>{formatEnergy(reading.pv_energy_total_wh / 1000)}</dd></div>}
    </dl>
    {rows.length > 0 && <>
      <small>{t("solarRatings")}</small>
      <dl className="solar-readings">{rows.map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd>{text(value)}</dd></div>)}</dl>
    </>}
  </section>;
}

/** The energy of each day (what the panels made and the load used, or what the battery took and gave): the last week or month, as bars. */
export function EnergyCard({ t, origin, kind }: { t: Translate; origin: string; kind: "inverter" | "battery" }) {
  const [days, setDays] = useState(14);
  const energy = usePolled(() => solarEnergy(origin, days), 60_000, `${origin}/${days}`).data?.days ?? [];
  const series = kind === "inverter"
    ? [{ key: "pv_kwh", label: t("enPv"), color: SOLAR_COLOURS.pv }, { key: "load_kwh", label: t("enLoad"), color: SOLAR_COLOURS.load }]
    : [{ key: "battery_in_kwh", label: t("enIn"), color: SOLAR_COLOURS.battery }, { key: "battery_out_kwh", label: t("enOut"), color: SOLAR_COLOURS.pv }];
  return <section className="solar-card">
    <div className="solar-card-head"><h3>{t("enTitle")}</h3>
      <div className="solar-ranges">{[14, 30, 90].map(count => <button key={count} className={days === count ? "active" : ""} onClick={() => setDays(count)}>{count} {t("daysShort")}</button>)}</div>
    </div>
    <p className="muted small">{t("enHelp")}</p>
    <EnergyBars t={t} days={energy} series={series} />
  </section>;
}

const ALARM_FIELDS: ReadonlyArray<{ key: keyof EnergyAlarmSettings; label: string; min: number; max: number }> = [
  { key: "soc_low", label: "eaSocLow", min: 1, max: 90 }, { key: "soc_ok", label: "eaSocOk", min: 2, max: 100 }, { key: "cell_spread_mv", label: "eaCells", min: 10, max: 1000 }, { key: "cell_spread_minutes", label: "eaCellsMinutes", min: 0, max: 240 },
  { key: "battery_temp_high_c", label: "eaHot", min: 30, max: 90 }, { key: "battery_temp_low_c", label: "eaCold", min: -20, max: 15 }, { key: "heatsink_high_c", label: "eaHeatsink", min: 50, max: 120 },
  { key: "health_low_percent", label: "eaWorn", min: 10, max: 95 },
];

/** The levels at which batteries and inverters raise alarms: edited here, kept by the server. */
export function EnergyAlarmsCard({ t, origin }: { t: Translate; origin: string }) {
  const loaded = usePolled(() => readEnergyAlarms(origin), 300_000, origin);
  const [draft, setDraft] = useState<EnergyAlarmSettings | null>(null);
  const [state, setState] = useState<"" | "saved" | "failed">("");
  const current = draft ?? loaded.data?.settings ?? null;
  if (!current) return null;
  const save = async (settings: Partial<EnergyAlarmSettings>) => {
    try { const answer = await saveEnergyAlarms(origin, settings); setDraft(answer.settings); setState("saved"); } catch { setState("failed"); }
  };
  return <section className="solar-card energy-alarms" data-tour="inv-alarms">
    <div className="solar-card-head"><h3>{t("eaTitle")}</h3></div>
    <p className="muted small">{t("eaHelp")}</p>
    <div className="inspector-grid">
      {ALARM_FIELDS.map(field => <label key={field.key}>{t(field.label)}<input type="number" min={field.min} max={field.max} value={current[field.key]} onChange={event => { setState(""); setDraft({ ...current, [field.key]: Number(event.target.value) }); }} /></label>)}
    </div>
    <div className="inspector-actions"><button className="primary" onClick={() => void save(current)}>{t("eaSave")}</button><button onClick={() => void save({})}>{t("eaDefaults")}</button></div>
    {state === "saved" && <p className="muted small" role="status">{t("eaSaved")}</p>}
    {state === "failed" && <p className="solar-notice bad" role="alert">{t("eaFailed")}</p>}
  </section>;
}
