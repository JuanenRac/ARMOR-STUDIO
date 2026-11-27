/**
 * The Batteries menu: every battery stack the gateway nodes read, with its charge as a liquid level, the capacities, the modules one by one, the cells of each
 * module as bars, and the history of charge, voltage, current, temperature and cell range. Read-only.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readEnergyAlarms, solarHistory } from "../api";
import { BankPanel, FaultList } from "../BatteryBank";
import { BatteryCharts } from "../BatteryCharts";
import { BatterySerials } from "../BatterySerials";
import { BatteryVerify } from "../BatteryVerify";
import { bankFaults, blinking, isLfp, moduleFaults, type Fault } from "../solarFaults";
import { SOLAR_THRESHOLDS, type SolarLevels } from "../solarThresholds";
import { bankSummary, stackFigures, stackKey } from "../solarTotals";
import type { VerifyTarget } from "../solarVerify";
import { chipKey } from "../solarSerials";
import type { Translate } from "../components/camera";
import { usePolled } from "../hooks";
import { BatteryGraphic, BatteryLogo, CellBars, SOLAR_COLOURS } from "../solarGraphics";
import {
  abnormalCells, capacityPercent, cellStats, compositionWarnings, counterLines, repeatedEvents, deltaMv, formatReach, displayName, formatAmps, formatEnergy, formatPower, formatVolts, healthTone, levelTone, spreadTone,
  type LoggedSolarEvent, type ModuleDayCells, type SolarBatteryReading, type SolarCatalog, type SolarDeviceView, type SolarModuleReading, type SolarRegistration, type SolarTotals, sheetUnanswered,
} from "../solarModel";
import { SolarEquipment } from "../SolarEquipment";
import { EnergyAlarmsCard, EnergyCard } from "./InvertersView";
import { SolarNodes } from "../SolarNodes";
import type { NetworkOverview } from "../networkModel";
import "./solar.css";
import "./batteries.css";
import "./battery-faults.css";
import { ExamplesBar } from "./ExamplesBar";

type Props = { t: Translate; origin: string; devices: SolarDeviceView[]; waiting: SolarRegistration[]; catalog: SolarCatalog | null; reload: () => void; totals: SolarTotals | null; now: number; unreachable: boolean; network?: NetworkOverview | null; isAdmin?: boolean };
type Battery = SolarDeviceView & { reading: SolarBatteryReading };
const TONE = { ok: SOLAR_COLOURS.battery, warn: SOLAR_COLOURS.pv, bad: SOLAR_COLOURS.bad } as const;

export function BatteriesView({ t, origin, devices, totals, now, unreachable, waiting, catalog, reload, network, isAdmin = false }: Props) {
  const stacks = useMemo(() => devices.filter((d): d is Battery => d.kind === "battery"), [devices]);
  const registrations = useMemo(() => [...stacks.flatMap(d => (d.registered ? [d.registered] : [])), ...waiting.filter(item => item.kind === "battery")], [stacks, waiting]);
  const [chosen, setChosen] = useState("");
  const [minutes, setMinutes] = useState<number>(60);
  const current = stacks.find(item => `${item.node_id}/${item.device}` === chosen) ?? stacks[0];
  const history = usePolled(() => (current ? solarHistory(origin, current.node_id, current.device, minutes) : Promise.resolve(null)), 15_000, `${current?.node_id}/${current?.device}/${minutes}/${origin}`);
  const alarms = usePolled(() => readEnergyAlarms(origin), 300_000, origin);
  const levels: SolarLevels = alarms.data?.settings ?? SOLAR_THRESHOLDS.levels;
  const bank = useMemo(() => bankSummary(stacks), [stacks]);
  const faults = useMemo(() => bankFaults(stacks, levels), [stacks, levels]);
  const [verifying, setVerifying] = useState<VerifyTarget | null>(null);
  const verifyBox = useRef<HTMLDivElement>(null);
  const verify = useCallback((target: VerifyTarget) => { setChosen(target.stack); setVerifying(target); }, []);
  useEffect(() => { if (verifying) verifyBox.current?.scrollIntoView?.({ block: "nearest" }); }, [verifying]);
  const verified = verifying ? stacks.find(item => stackKey(item) === verifying.stack) : undefined;
  const capacity = capacityPercent(bank.capacity_ah ?? undefined, bank.full_capacity_ah ?? undefined);
  const nodeCount = new Set([...devices.map(d => d.node_id), ...waiting.map(item => item.node_id)]).size;
  return <div className="solar-view bat-view">
    <header className="solar-head" data-tour="bat-head">
      <BatteryLogo size={68} percent={totals?.soc_percent ?? 70} />
      <div className="solar-title"><p className="eyebrow">{t("navEnergy")}</p><h2>{t("batteries")}</h2><span className="muted">{t("solarHelp")}</span></div>
      {totals && <div className="solar-totals" data-tour="bat-totals">
        <Tile colour={bank.soc_percent === null ? SOLAR_COLOURS.muted : TONE[levelTone(bank.soc_percent)]} label={t("solarSoc")} value={bank.soc_percent === null ? "–" : `${bank.soc_percent} %`} />
        <Tile colour={SOLAR_COLOURS.battery} label="kWh" value={bank.energy_kwh === null ? "–" : formatEnergy(bank.energy_kwh)} />
        <Tile colour={SOLAR_COLOURS.load} label="Ah" value={bank.capacity_ah === null ? "–" : `${bank.partial || bank.estimated || bank.fullEstimated ? "≈ " : ""}${bank.capacity_ah.toFixed(0)}${bank.full_capacity_ah === null ? "" : ` / ${bank.full_capacity_ah.toFixed(0)}`}${capacity === null ? "" : ` (${capacity} %)`}`} />
        <Tile colour={SOLAR_COLOURS.pv} label={t("solarBatteryPower")} value={bank.power_w === null ? "–" : formatPower(bank.power_w)} />
      </div>}
    </header>
    {unreachable && <p className="solar-notice bad">{t("solarNoHistory")}</p>}
    <details className="bat-section" open={stacks.length === 0}>
      <summary><b>{t("bat_nodes_equipment")}</b><span className="muted">{nodeCount} {t("bat_nodes_word")} · {registrations.length} {t("bat_equipment_word")}</span></summary>
      <div className="bat-section-body">
        <SolarNodes t={t} origin={origin} isAdmin={isAdmin} network={network} devices={devices} registrations={[...devices.flatMap(d => (d.registered ? [d.registered] : [])), ...waiting]} now={now} />
        <SolarEquipment kind="battery" network={network} t={t} origin={origin} catalog={catalog} registrations={registrations} reporting={stacks} reload={reload} />
      </div>
    </details>
    {stacks.length === 0 ? (registrations.length > 0 ? <p className="solar-notice">{t("solarWaitingHelp")}</p> : <div className="solar-empty"><BatteryLogo size={92} /><h3>{t("solarNone")}</h3><p>{t("solarNoneHelp")}</p><p>{t("solarNoneAdd")}</p></div>) : <>
      <ExamplesBar t={t} origin={origin} count={stacks.filter(item => item.example).length} reload={reload} />
      <FaultList t={t} faults={faults} verify={verify} choose={key => setChosen(key)} />
      <div ref={verifyBox}>{verifying && verified && <BatteryVerify key={JSON.stringify(verifying)} t={t} origin={origin} isAdmin={isAdmin} target={verifying} stack={verified} levels={levels} close={() => setVerifying(null)} />}</div>
      <BankPanel t={t} bank={bank} stacks={stacks} />
      <BatterySerials t={t} devices={stacks} />
      <Fleet t={t} stacks={stacks} faults={faults} current={current} choose={key => setChosen(key)} />
      {current && <StackPanel t={t} origin={origin} stacks={stacks} stack={current} now={now} history={history.data?.samples ?? []} minutes={minutes} setMinutes={setMinutes} levels={levels} faults={faults} verify={verify} />}
      <details className="bat-section">
        <summary><b>{t("bat_energy_alarms")}</b></summary>
        <div className="bat-section-body"><EnergyCard t={t} origin={origin} kind="battery" /><EnergyAlarmsCard t={t} origin={origin} /></div>
      </details>
    </>}
  </div>;
}

const stateWord = (state: string | undefined, t: Translate): string => (state === "charging" ? t("solarCharging") : state === "discharging" ? t("solarDischarging") : t("solarIdle"));

/** Every battery stack of every node, one row each and grouped by node: the whole installation at a glance, and the way to choose the stack that the detail below shows. */
function Fleet({ t, stacks, faults, current, choose }: { t: Translate; stacks: Battery[]; faults: readonly Fault[]; current: Battery | undefined; choose: (key: string) => void }) {
  const groups = useMemo(() => {
    const byNode = new Map<string, Battery[]>();
    for (const stack of stacks) byNode.set(stack.node_id, [...(byNode.get(stack.node_id) ?? []), stack]);
    return [...byNode.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [stacks]);
  return <section className="bat-fleet" data-tour="bat-fleet" aria-label={t("bat_fleet")}>
    <div className="bat-row head" role="row"><span>{t("bat_node_col")}</span><span>{t("bat_fleet")}</span><span>{t("solarSoc")}</span><span>{t("solarVoltage")}</span><span>{t("solarCurrent")}</span><span>{t("solarBatteryPower")}</span><span>{t("solarTemperature")}</span><span>{t("solarCells")} Δ</span><span>{t("solarModules")}</span></div>
    {groups.map(([node, items]) => <div key={node} className="bat-group" role="rowgroup">
      {items.map((stack, index) => {
        const key = `${stack.node_id}/${stack.device}`, r = stack.reading;
        const cells = cellStats(r.stack.flatMap(module => module.cells_v ?? []));
        const spread = cells ? cells.spreadMv : r.cell_min_v !== undefined && r.cell_max_v !== undefined ? Math.round((r.cell_max_v - r.cell_min_v) * 1000) : null;
        const level = r.soc_percent ?? 0;
        const faulty = faults.some(fault => fault.stack === key && fault.severity === "fault");
        return <button type="button" key={key} role="row" aria-pressed={stack === current} className={`bat-row ${stack === current ? "on" : ""} ${stack.stale ? "is-stale" : ""} ${r.alarm || faulty ? "is-fault" : ""} ${blinking(faults, key) ? "sl-blink-fault" : ""}`} onClick={() => choose(key)}>
          <span className="bat-node">{index === 0 ? <><b>{node}</b><small>{items.reduce((sum, item) => sum + item.reading.stack.filter(module => module.present).length, 0)} {t("solarModules").toLowerCase()}</small></> : null}</span>
          <span className="bat-name"><b>{displayName(stack)}</b><small>{r.model ?? stateWord(r.state, t)}</small>{stack.stale && <i className="solar-stale-dot" title={t("solarStale")} />}{faulty && <span className="solar-pill bad"><span aria-hidden="true">✖ </span>{t("solx_severity_fault")}</span>}{r.alarm && <span className="solar-pill bad">{t("solarAlarmOn")}</span>}{stack.example && <span className="solar-pill warn">{t("solarExampleBadge")}</span>}</span>
          <span className="bat-soc"><span className="solar-bar"><i style={{ width: `${level}%`, background: TONE[levelTone(level)] }} /></span><b>{r.soc_percent === undefined ? "–" : `${r.soc_percent} %`}</b></span>
          <span>{r.voltage_v === undefined ? "–" : formatVolts(r.voltage_v, 2)}</span>
          <span>{r.current_a === undefined ? "–" : formatAmps(r.current_a)}</span>
          <span>{r.voltage_v !== undefined && r.current_a !== undefined ? formatPower(r.voltage_v * r.current_a) : "–"}</span>
          <span>{r.temperature_min_c !== undefined && r.temperature_max_c !== undefined ? `${r.temperature_min_c.toFixed(0)}–${r.temperature_max_c.toFixed(0)} °C` : "–"}</span>
          <span className={spread === null ? "" : spreadTone(spread)}>{spread === null ? "–" : `${spread} mV`}</span>
          <span>{r.stack.filter(module => module.present).length}/{r.stack.length}</span>
        </button>;
      })}
    </div>)}
  </section>;
}

function Tile({ colour, label, value }: { colour: string; label: string; value: string }) {
  return <div className="solar-tile" style={{ borderColor: `${colour}55` }}><small>{label}</small><b style={{ color: colour }}>{value}</b></div>;
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "bad" }) {
  return <div className={`solar-fact ${tone ?? ""}`}><dt>{label}</dt><dd>{value}</dd></div>;
}

type PanelProps = {
  t: Translate; origin: string; stacks: Battery[]; stack: Battery; now: number; history: Parameters<typeof BatteryCharts>[0]["history"]; minutes: number; setMinutes: (value: number) => void;
  levels: SolarLevels; faults: readonly Fault[]; verify: (target: VerifyTarget) => void;
};

function StackPanel({ t, origin, stacks, stack, now, history, minutes, setMinutes, levels, faults, verify }: PanelProps) {
  const r = stack.reading;
  const figures = stackFigures(r);
  const key = stackKey(stack);
  const age = Math.max(0, Math.round((now - Date.parse(stack.received_at)) / 1000));
  const allCells = r.stack.flatMap(module => module.cells_v ?? []);
  const cells = cellStats(allCells);
  const held = figures.capacity_ah ?? undefined, whole = figures.full_capacity_ah ?? undefined;
  const remaining = capacityPercent(held, whole);
  const stateText = stateWord(r.state, t);
  const [unfolded, setUnfolded] = useState<"all" | "none" | null>(null);
  return <>
    <section className={`solar-card bat-detail ${stack.stale ? "is-stale" : ""} ${r.alarm || faults.some(fault => fault.stack === key && fault.severity === "fault") ? "is-fault" : ""} ${blinking(faults, key) ? "sl-blink-fault" : ""}`}>
      <div className="solar-card-head">
        <h3>{displayName(stack)} <small>{stack.node_id}{r.model ? ` · ${r.model}` : ""}</small></h3>
        {stack.example && <span className="solar-pill warn">{t("solarExampleBadge")}</span>}
        {r.alarm && <span className="solar-pill bad">{t("solarAlarmOn")}</span>}
        <span className={`solar-pill ${r.state === "charging" ? "ok" : r.state === "discharging" ? "warn" : ""}`}>{stateText}</span>
        <span className="muted">{stack.stale ? t("solarStale") : `${t("solarUpdated")} ${age} s`}</span>
      </div>
      {r.modules === 0 ? <p className="solar-notice">{t("solarNoModules")}</p> : <div className="solar-stack-top bat-summary" data-tour="bat-stack">
        <BatteryGraphic percent={r.soc_percent} state={r.state} alarm={r.alarm === true || blinking(faults, key)} />
        <div className="bat-facts-col">
        <dl className="solar-facts">
          {r.voltage_v !== undefined && <Fact label={t("solarVoltage")} value={formatVolts(r.voltage_v, 2)} />}
          {r.current_a !== undefined && <Fact label={t("solarCurrent")} value={formatAmps(r.current_a)} />}
          {r.voltage_v !== undefined && r.current_a !== undefined && <Fact label={t("solarBatteryPower")} value={formatPower(r.voltage_v * r.current_a)} />}
          {r.temperature_min_c !== undefined && r.temperature_max_c !== undefined && <Fact label={t("solarTemperature")} value={`${r.temperature_min_c.toFixed(1)} – ${r.temperature_max_c.toFixed(1)} °C`} />}
          {cells && <Fact label={t("solarCells")} value={`${cells.min.toFixed(3)} – ${cells.max.toFixed(3)} V · Δ ${cells.spreadMv} mV`} tone={spreadTone(cells.spreadMv)} />}
          {!cells && r.cell_min_v !== undefined && r.cell_max_v !== undefined && <Fact label={t("solarCells")} value={`${r.cell_min_v.toFixed(3)} – ${r.cell_max_v.toFixed(3)} V · Δ ${Math.round((r.cell_max_v - r.cell_min_v) * 1000)} mV`} tone={spreadTone((r.cell_max_v - r.cell_min_v) * 1000)} />}
          {stack.day_cells && stack.day_cells.bank_delta_v > 0 && <Fact label={t("solarBankDeltaToday")} value={`Δ ${deltaMv(stack.day_cells.bank_delta_v)} mV`} tone={spreadTone(deltaMv(stack.day_cells.bank_delta_v))} />}
          {r.power_w !== undefined && <Fact label={t("bmsPower")} value={formatPower(r.power_w)} />}
          {r.balancing !== undefined && <Fact label={t("bmsBalancing")} value={String(r.balancing)} tone={r.balancing > 0 ? "warn" : undefined} />}
          {r.protecting === true && <Fact label={t("bmsProtecting")} value={`${r.charge_mos ?? "–"} / ${r.discharge_mos ?? "–"}`} tone="bad" />}
          {r.protecting !== true && r.charge_mos !== undefined && <Fact label={t("bmsMos")} value={`${r.charge_mos} / ${r.discharge_mos ?? "–"}`} />}
          {figures.energy_kwh !== null && <Fact label="kWh" value={formatEnergy(figures.energy_kwh)} />}
          {r.cycles !== undefined && <Fact label={t("solarCycles")} value={String(r.cycles)} />}
          {r.health_percent !== undefined && <Fact label={t("solarHealth")} value={`${r.health_percent} %`} tone={healthTone(r.health_percent)} />}
          <Fact label={t("solarModules")} value={`${r.stack.filter(module => module.present).length} / ${r.stack.length}`} />
        </dl>
        {held !== undefined && whole !== undefined && <div className="solar-capacity" data-tour="bat-capacity">
        <div className="solar-capacity-head"><span>{t("solarCapacity")}</span><b title={figures.fullEstimated ? t("solx_full_estimated") : undefined}>{figures.partial || figures.estimated || figures.fullEstimated ? "≈ " : ""}{held.toFixed(1)} / {whole.toFixed(1)} Ah{remaining === null ? "" : ` · ${remaining} %`}</b></div>
        <div className="solar-bar"><i style={{ width: `${remaining ?? 0}%`, background: TONE[levelTone(remaining ?? 0)] }} /></div>
      </div>}
        </div>
      </div>}
    </section>
    <Composition t={t} stack={r.stack} />
    <section className="bat-modules" aria-label={t("solarModules")}>
      <div className="bat-section-head"><h3>{t("solarModules")} <small>{r.stack.filter(module => module.present).length} / {r.stack.length}</small></h3>
        <span className="bat-fold"><button type="button" onClick={() => setUnfolded("all")}>{t("bat_expand")}</button><button type="button" onClick={() => setUnfolded("none")}>{t("bat_fold")}</button></span></div>
      <div className="bat-module-grid" key={unfolded ?? "keep"}>
        {r.stack.map(module => <ModuleCard key={module.n} t={t} module={module} stack={stack} levels={levels} verify={verify} today={stack.day_cells?.modules.find(item => item.n === module.n)} open={unfolded === "all" ? true : unfolded === "none" ? false : undefined} />)}
      </div>
    </section>
    <BatteryCharts t={t} origin={origin} stacks={stacks} current={stack} now={now} history={history} minutes={minutes} setMinutes={setMinutes} levels={levels} />
    {stack.events && stack.events.length > 0 && <details className="bat-section"><summary><b>{t("solarEventLog")}</b><span className="muted">{stack.events.length}</span></summary><div className="bat-section-body"><EventLog t={t} events={stack.events} /></div></details>}
  </>;
}

function ModuleCard({ t, module, stack, levels, verify, today, open }: { t: Translate; module: SolarModuleReading; stack: Battery; levels: SolarLevels; verify: (target: VerifyTarget) => void; today?: ModuleDayCells; open?: boolean }) {
  const cells = cellStats(module.cells_v);
  const remaining = capacityPercent(module.capacity_ah, module.full_capacity_ah);
  if (!module.present) return <div className="bat-module absent"><div className="bat-module-sum"><b>{t("solarModule")} {module.n}</b><span className="solar-pill">{t("solarModuleAbsent")}</span></div></div>;
  const found = moduleFaults(module, levels, isLfp(module, stack.registered?.model));
  const noSheet = sheetUnanswered(module, stack.reading.stack);
  const faulty = found.some(item => item.severity === "fault");
  const abnormal = abnormalCells(module).length > 0 || faulty;
  const cellFaults = new Map(found.filter(item => item.cell !== undefined).map(item => [item.cell as number, t(`solx_fault_${item.code}`)]));
  const where = { stack: stackKey(stack), node: stack.node_id, module: module.n };
  return <details className={`bat-module ${abnormal ? "abnormal" : ""} ${faulty && !stack.stale ? "sl-blink-fault" : ""}`} open={open ?? (abnormal ? true : undefined)}>
    <summary className="bat-module-sum">
      <b>{t("solarModule")} {module.n}</b>
      {found.length > 0 && <span className={`solar-pill ${faulty ? "bad" : "warn"}`}><span aria-hidden="true">{faulty ? "✖" : "⚠"} </span>{t(`solx_fault_${found[0].code}`)}{found.length > 1 ? ` +${found.length - 1}` : ""}</span>}
      {module.state && <span className="solar-pill">{module.state}</span>}
      {noSheet && <span className="solar-pill warn" title={t("solx_no_sheet")}>{t("solx_no_sheet_pill")}</span>}
      {module.soc_percent !== undefined && <span className={`solar-pill ${levelTone(module.soc_percent)}`}>{module.soc_percent} %</span>}
      {cells && <span className={`solar-pill ${spreadTone(cells.spreadMv)}`}>Δ {cells.spreadMv} mV</span>}
      {module.voltage_v !== undefined && <span className="bat-mini">{formatVolts(module.voltage_v, 2)}</span>}
      {module.current_a !== undefined && <span className="bat-mini">{formatAmps(module.current_a)}</span>}
      {module.temperature_c !== undefined && <span className="bat-mini">{module.temperature_c.toFixed(0)} °C</span>}
      {module.soc_percent !== undefined && <span className="solar-bar bat-mini-bar"><i style={{ width: `${module.soc_percent}%`, background: TONE[levelTone(module.soc_percent)] }} /></span>}
    </summary>
    <div className="bat-module-body">
    {noSheet && <p className="muted small" data-testid="no-sheet">{t("solx_no_sheet")}</p>}
    <dl className="solar-facts compact">
      {module.voltage_v !== undefined && <Fact label={t("solarVoltage")} value={formatVolts(module.voltage_v, 3)} />}
      {module.current_a !== undefined && <Fact label={t("solarCurrent")} value={formatAmps(module.current_a)} />}
      {module.temperature_c !== undefined && <Fact label={t("solarTemperature")} value={`${module.temperature_c.toFixed(1)} °C`} />}
      {module.capacity_ah !== undefined && <Fact label={t("solarCapacity")} value={`${module.capacity_ah.toFixed(1)}${module.full_capacity_ah !== undefined ? ` / ${module.full_capacity_ah.toFixed(1)}` : ""} Ah${remaining === null ? "" : ` · ${remaining} %`}`} />}
      {today && <Fact label={t("solarCellsToday")} value={`${formatReach(today.min, t("solarCellWord"))} – ${formatReach(today.max, t("solarCellWord"))} · Δ ${deltaMv(today.delta_v)} mV`} tone={spreadTone(deltaMv(today.delta_v))} />}
      {module.model && <Fact label={t("solarModuleModel")} value={module.model} />}
      {module.serial && <Fact label={t("solx_serial")} value={module.serial} />}
      {module.chip && <Fact label={t("solx_chip")} value={t(chipKey(module.chip))} />}
      {module.board && <Fact label={t("solx_board")} value={module.board} />}
      {module.specification && <Fact label={t("solx_spec")} value={module.specification} />}
      {module.boot_version && <Fact label={t("solx_boot")} value={module.boot_version} />}
      {module.comm_version && <Fact label={t("solx_comm")} value={module.comm_version} />}
      {module.release_date && <Fact label={t("solx_released")} value={module.release_date} />}
      {(module.board_version || module.main_soft_version || module.soft_version) && <Fact label={t("solarModuleFirmware")} value={[module.board_version, module.main_soft_version, module.soft_version].filter(Boolean).join(" · ")} />}
      {module.cell_count !== undefined && <Fact label={t("solarCellCount")} value={String(module.cell_count)} />}
      {(module.max_charge_a !== undefined || module.max_discharge_a !== undefined) && <Fact label={t("solarCurrentLimits")} value={`${module.max_charge_a !== undefined ? module.max_charge_a.toFixed(0) : "–"} / ${module.max_discharge_a !== undefined ? module.max_discharge_a.toFixed(0) : "–"} A`} />}
      {module.console_baud !== undefined && <Fact label={t("solarConsoleSpeed")} value={String(module.console_baud)} />}
      {module.cycles !== undefined && <Fact label={t("solarCycles")} value={String(module.cycles)} />}
      {module.health_percent !== undefined && <Fact label={t("solarHealth")} value={`${module.health_percent} %`} tone={healthTone(module.health_percent)} />}
      {module.temperatures_c && module.temperatures_c.length > 0 && <Fact label={t("solarTemperature")} value={module.temperatures_c.map(v => v.toFixed(1)).join(" · ") + " °C"} />}
    </dl>
    {module.cells_v && module.cells_v.length > 0 && <CellBars cells={module.cells_v} t={t} faults={cellFaults} blink={!stack.stale} />}
    {module.soh_counts && module.soh_counts.length > 0 && <details className="solar-counters" open={abnormalCells(module).length > 0}>
      <summary>{t("solarSoh")}{abnormalCells(module).length > 0 && <span className="solar-pill bad">{t("solarSohAbnormal")}: {abnormalCells(module).join(", ")}</span>}</summary>
      <p className="muted small">{t("solarSohNote")}</p>
      <dl className="solar-facts compact">{module.soh_counts.map((count, cell) => <Fact key={cell} label={`${t("solarCellWord")} ${cell + 1}`} value={String(count)} tone={(module.soh_abnormal ?? []).includes(cell) ? "bad" : undefined} />)}</dl>
      <p className="bat-verify-row">{module.soh_counts.map((count, cell) => ((module.soh_abnormal ?? []).includes(cell) || count > 0 ? <button type="button" key={cell} onClick={() => verify({ kind: "soh", ...where, cell: cell + 1, value: count })}>{t("solx_verify")}: {t("solarCellWord")} {cell + 1}</button> : null))}</p>
    </details>}
    {module.counters && Object.keys(module.counters).length > 0 && <details className="solar-counters">
      <summary>{t("solarCounters")}</summary>
      <p className="muted small">{t("solarCountersNote")}</p>
      <dl className="solar-facts compact">{counterLines(module.counters).map(line => <Fact key={line.name} label={line.label} value={String(line.value)} tone={line.raised ? "warn" : undefined} />)}</dl>
      <p className="bat-verify-row">{counterLines(module.counters).filter(line => line.raised).map(line => <button type="button" key={line.name} onClick={() => verify({ kind: "counter", ...where, counter: line.name, value: line.value })}>{t("solx_verify")}: {line.label}</button>)}</p>
    </details>}
    </div>
  </details>;
}

/** The warnings about the models a group mixes, from the makers' manuals (a warning, not a block); nothing is drawn when every module is fine or reports no model. */
function Composition({ t, stack }: { t: Translate; stack: SolarModuleReading[] }) {
  const warnings = compositionWarnings(stack);
  if (warnings.length === 0) return null;
  return <section className="solar-card composition-card" data-testid="composition">
    <div className="solar-card-head"><h3>{t("solarCompTitle")}</h3><span className="solar-pill warn">{warnings.length}</span></div>
    {warnings.map(warning => <p key={warning.code} className="solar-notice">{t(warning.code)} {warning.modules.map(n => `${t("solarModule")} ${n} (${stack.find(module => module.n === n)?.model ?? "?"})`).join(", ")}</p>)}
    <p className="muted small">{t("solarCompNote")}</p>
  </section>;
}

/** The entries of the modules' own event logs the node has read, newest first, as the console prints them. Read-only. */
function EventLog({ t, events }: { t: Translate; events: LoggedSolarEvent[] }) {
  const repeated = repeatedEvents(events).filter(item => item.count > 1).slice(0, 6);
  return <section className="solar-card" data-testid="event-log">
    <div className="solar-card-head"><h3>{t("solarEventLog")}</h3></div>
    <p className="muted small">{t("solarEventLogNote")}</p>
    {repeated.length > 0 && <p className="solar-events-repeated">{repeated.map(item => <span key={item.word} className="solar-pill warn">{item.word} × {item.count}</span>)}</p>}
    <div className="scroll"><table className="solar-events">
      <thead><tr><th>{t("solarModule")}</th><th>{t("solarEventItem")}</th><th>{t("solarEventClock")}</th><th>{t("solarEventSeen")}</th><th>{t("solarEventStates")}</th><th>{t("solarEventPower")}</th><th>{t("solarEventBattery")}</th><th>{t("solarEventFault")}</th></tr></thead>
      <tbody>{events.map(item => <tr key={`${item.n}/${item.event.index}/${item.event.time}`}>
        <td>{item.n}</td><td>{item.event.index}</td><td>{item.event.time}</td><td>{new Date(item.seen_at).toLocaleString()}</td>
        <td>{[item.event.base_state, item.event.voltage_state, item.event.current_state, item.event.temperature_state].filter(Boolean).join(" · ")}</td>
        <td className="mono">{item.event.power_events ?? "–"}</td><td className="mono">{item.event.battery_events ?? "–"}</td><td className="mono">{item.event.system_fault ?? "–"}</td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}
