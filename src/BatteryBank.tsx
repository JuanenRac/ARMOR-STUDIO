/**
 * The top of the Batteries menu: the whole bank in figures (sockets, batteries, cells, charge, capacity, current, power, the lowest and highest cell and where they are) and the list of
 * what is wrong right now, each with its place, its value and a button to verify it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Translate } from "./components/camera";
import { fill } from "./FirmwarePanel";
import type { Fault } from "./solarFaults";
import { displayName, formatAmps, formatEnergy, formatPower, spreadTone } from "./solarModel";
import { formatHours, stackKey, timeLeft, type BankSummary, type BatteryView, type Where } from "./solarTotals";
import type { VerifyTarget } from "./solarVerify";

const SHOWN = 12;

export function BankPanel({ t, bank, stacks }: { t: Translate; bank: BankSummary; stacks: readonly BatteryView[] }) {
  const place = (at: Where): string => {
    const view = stacks.find(item => stackKey(item) === at.stack);
    return [view ? displayName(view) : at.stack, at.module === undefined ? null : `${t("solarModule")} ${at.module}`, at.cell === undefined ? null : `${t("solarCellWord")} ${at.cell}`].filter(Boolean).join(" · ");
  };
  const about = bank.estimated || bank.partial || bank.fullEstimated ? "≈ " : "";
  const left = timeLeft(bank);
  const fact = (label: string, value: string, note?: string, tone?: string) => <div className={`solar-fact ${tone ?? ""}`}><dt>{label}</dt><dd>{value}{note && <small>{note}</small>}</dd></div>;
  return <section className="solar-card bat-bank" data-testid="bank-summary" aria-label={t("solx_bank_title")}>
    <div className="solar-card-head"><h3>{t("solx_bank_title")}</h3></div>
    <dl className="solar-facts bat-bank-facts">
      {fact(t("solx_sockets"), bank.live === bank.sockets ? String(bank.sockets) : `${bank.live} / ${bank.sockets}`)}
      {fact(t("solx_batteries"), bank.batteries === bank.slots ? String(bank.batteries) : `${bank.batteries} / ${bank.slots}`)}
      {fact(t("solx_cells"), String(bank.cells))}
      {fact(t("solarSoc"), bank.soc_percent === null ? "–" : `${bank.soc_percent} %`)}
      {fact(t("solarCapacity"), bank.capacity_ah === null ? "–" : `${about}${bank.capacity_ah.toFixed(1)}${bank.full_capacity_ah === null ? "" : ` / ${bank.full_capacity_ah.toFixed(0)}`} Ah`)}
      {fact("kWh", bank.energy_kwh === null ? "–" : `${about}${formatEnergy(bank.energy_kwh)}`)}
      {fact(t("solx_current_total"), bank.current_a === null ? "–" : formatAmps(bank.current_a))}
      {fact(t("solarBatteryPower"), bank.power_w === null ? "–" : formatPower(bank.power_w))}
      {left && fact(t(left.toFull ? "solx_time_full" : "solx_time_empty"), `≈ ${formatHours(left.hours)}`, t("solx_time_note"))}
      {fact(t("solx_cell_lowest"), bank.cell_min === null ? "–" : `${bank.cell_min.value.toFixed(3)} V`, bank.cell_min ? place(bank.cell_min) : undefined)}
      {fact(t("solx_cell_highest"), bank.cell_max === null ? "–" : `${bank.cell_max.value.toFixed(3)} V`, bank.cell_max ? place(bank.cell_max) : undefined)}
      {fact(t("solx_delta"), bank.delta_mv === null ? "–" : `${bank.delta_mv} mV`, undefined, bank.delta_mv === null ? undefined : spreadTone(bank.delta_mv))}
      {fact(t("solx_temp_range"), bank.temperature_min && bank.temperature_max ? `${bank.temperature_min.value.toFixed(1)} – ${bank.temperature_max.value.toFixed(1)} °C` : "–")}
    </dl>
    {bank.stale > 0 && <p className="solar-notice bad">{fill(t("solx_stale_left_out"), bank.stale)}</p>}
    {bank.partial && <p className="muted small">{t("solx_partial")}</p>}
    {bank.estimated && <p className="muted small">{t("solx_estimated")}</p>}
    {bank.fullEstimated && <p className="muted small">{t("solx_full_estimated")}</p>}
  </section>;
}

export function targetOfFault(fault: Fault): VerifyTarget | null {
  if (fault.module === undefined) return null;
  const [node] = fault.stack.split("/");
  return { kind: "live", stack: fault.stack, node, module: fault.module, code: fault.code, ...(fault.cell === undefined ? {} : { cell: fault.cell }) };
}

export function FaultList({ t, faults, verify, choose }: { t: Translate; faults: readonly Fault[]; verify: (target: VerifyTarget) => void; choose: (stack: string) => void }) {
  if (faults.length === 0) return <p className="solar-notice bat-all-ok" role="status">✓ {t("solx_all_ok")}</p>;
  const bad = faults.filter(fault => fault.severity === "fault").length;
  const active = faults.some(fault => fault.severity === "fault" && !fault.stale);
  const row = (fault: Fault, index: number) => {
    const target = targetOfFault(fault);
    const value = fault.value === undefined ? "" : ` ${fault.unit === "V" ? fault.value.toFixed(3) : Number(fault.value.toFixed(1))} ${fault.unit}`;
    return <li key={`${fault.stack}/${fault.module}/${fault.cell}/${fault.code}/${index}`} className={`${fault.severity}${fault.code === "bms_fault" ? " bms" : fault.severity === "fault" && !fault.stale ? " sl-blink-fault" : ""}`}>
      <span aria-hidden="true" className="bat-fault-icon">{fault.severity === "fault" ? "✖" : "⚠"}</span>
      <strong>{t(fault.severity === "fault" ? "solx_severity_fault" : "solx_severity_warn")}</strong>
      <button type="button" className="bat-fault-place" onClick={() => choose(fault.stack)}>{fault.name}{fault.module === undefined ? "" : ` · ${t("solarModule")} ${fault.module}`}{fault.cell === undefined ? "" : ` · ${t("solarCellWord")} ${fault.cell}`}</button>
      <span>{t(`solx_fault_${fault.code}`)}{fault.detail ? `: ${fault.detail}` : ""}{value}{fault.stale ? ` (${t("solx_last_known")})` : ""}</span>
      {target && <button type="button" onClick={() => verify(target)}>{t("solx_verify")}</button>}
    </li>;
  };
  return <section className={`solar-card bat-faults ${bad > 0 ? "is-fault" : ""}`} data-testid="fault-summary">
    <div className="solar-card-head" role={active ? "alert" : "status"}><h3><span aria-hidden="true">{bad > 0 ? "✖" : "⚠"}</span> {fill(t("solx_attention"), bad, faults.length - bad)}</h3></div>
    <ul>{faults.slice(0, SHOWN).map(row)}</ul>
    {faults.length > SHOWN && <details><summary>+{faults.length - SHOWN}</summary><ul>{faults.slice(SHOWN).map((fault, index) => row(fault, index + SHOWN))}</ul></details>}
  </section>;
}
