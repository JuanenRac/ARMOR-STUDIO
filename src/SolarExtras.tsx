/**
 * What the equipment itself counts and says besides its readings: the totals and limits of a battery stack, the energy an inverter counts, its options, factory
 * settings, accepted charge currents and the battery it hears, and the cell gap of each full charge. All of it is read only, and shown only when it was said.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { ReactNode } from "react";
import { readFullCharges } from "./api";
import type { Translate } from "./components/camera";
import { downloadText } from "./download";
import { fill } from "./FirmwarePanel";
import { usePolled } from "./hooks";
import { formatEnergy, ratingRows, type SolarBmsSystem, type SolarInverterReading } from "./solarModel";
import { fullChargesCsv } from "./solarSerials";

const ENERGY = ["pv_today_wh", "pv_month_wh", "pv_year_wh", "load_today_wh", "load_month_wh", "load_year_wh", "load_total_wh"] as const;

const row = (label: string, value: ReactNode) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>;
const rows = (items: Array<[string, number | string | undefined]>) => items.filter(([, value]) => value !== undefined).map(([label, value]) => row(label, value));
const unit = (value: number | undefined, name: string) => (value === undefined ? undefined : `${value} ${name}`);

/** The whole stack as its first battery says it, with the limits it recommends. */
export function BmsSystemCard({ t, system }: { t: Translate; system: SolarBmsSystem }) {
  const items = rows([
    [t("solarSoc"), unit(system.soc_percent, "%")],
    [t("solarHealth"), unit(system.health_percent, "%")],
    [t("sxx_remaining"), unit(system.remaining_ah, "Ah")],
    [t("sxx_full"), unit(system.full_capacity_ah, "Ah")],
    [t("sxx_modules_present"), system.modules_present],
    [t("sxx_modules_asleep"), system.modules_sleep],
    [t("sxx_charge_voltage"), unit(system.charge_voltage_v, "V")],
    [t("sxx_charge_current"), unit(system.charge_current_a, "A")],
    [t("sxx_discharge_voltage"), unit(system.discharge_voltage_v, "V")],
    [t("sxx_discharge_current"), unit(system.discharge_current_a, "A")],
  ]);
  if (items.length === 0) return null;
  return <section className="solar-card" data-testid="bms-system">
    <div className="solar-card-head"><h3>{t("sxx_stack_title")}</h3></div>
    <p className="muted small">{t("sxx_stack_help")}</p>
    <dl className="solar-readings">{items}</dl>
  </section>;
}

/** Whether an inverter said any of what InverterExtrasCards shows. */
export const hasInverterExtras = (r: SolarInverterReading): boolean => Boolean(r.energy || r.options_on || r.defaults || r.charge_current_options_a || r.ac_charge_current_options_a || r.bms);

/** The energy the inverter counts, its options, factory settings, accepted currents and battery. */
export function InverterExtrasCards({ t, reading }: { t: Translate; reading: SolarInverterReading }) {
  if (!hasInverterExtras(reading)) return null;
  const { energy, options_on: on, options_off: off, defaults, bms } = reading;
  const word = (value: string) => (value.startsWith("@") ? t(value.slice(1)) : value);
  const yesNo = (value: boolean | undefined) => (value === undefined ? undefined : t(value ? "sxx_yes" : "sxx_no"));
  const current = new Map(reading.ratings ? ratingRows(reading.ratings) : []);
  const factory = defaults ? ratingRows(defaults) : [];
  const currents = (label: string, values: number[] | undefined) => (values?.length ? row(label, `${values.join(", ")} A`) : null);
  return <section className="solar-card" data-testid="inverter-extras">
    {energy && <>
      <div className="solar-card-head"><h3>{t("sxx_energy_title")}</h3></div>
      <p className="muted small">{energy.day ? fill(t("sxx_energy_help"), `${energy.day.slice(0, 4)}-${energy.day.slice(4, 6)}-${energy.day.slice(6)}`) : t("sxx_energy_help_nodate")}</p>
      <dl className="solar-readings">{ENERGY.filter(key => energy[key] !== undefined).map(key => row(t(`sxx_${key}`), formatEnergy(energy[key]! / 1000)))}</dl>
    </>}
    {(on || off) && <>
      <small>{t("sxx_options")}</small>
      <p>{(on ?? []).map(name => <span key={name} className="solar-chip ok">✓ {t(`sxx_opt_${name}`)}</span>)}{(off ?? []).map(name => <span key={name} className="solar-chip">✗ {t(`sxx_opt_${name}`)}</span>)}</p>
    </>}
    {factory.length > 0 && <details>
      <summary>{t("sxx_defaults")}</summary>
      <dl className="solar-readings">{factory.map(([label, value]) => row(t(label), <>{word(value)}{current.has(label) && current.get(label) !== value && <small> · {fill(t("sxx_now"), word(current.get(label)!))}</small>}</>))}</dl>
    </details>}
    {(reading.charge_current_options_a || reading.ac_charge_current_options_a) && <dl className="solar-readings">
      {currents(t("sxx_currents"), reading.charge_current_options_a)}
      {currents(t("sxx_ac_currents"), reading.ac_charge_current_options_a)}
    </dl>}
    {bms && <>
      <small>{t("sxx_bms_title")}</small>
      {!bms.connected ? <p className="muted small">{t("sxx_bms_none")}</p> : <dl className="solar-readings">{rows([
        [t("solarSoc"), unit(bms.soc_percent, "%")],
        [t("sxx_force_charge"), yesNo(bms.force_charge)],
        [t("sxx_stop_charge"), yesNo(bms.stop_charge)],
        [t("sxx_stop_discharge"), yesNo(bms.stop_discharge)],
        [t("sxx_charge_voltage"), unit(bms.bulk_v, "V")],
        [t("rt_battery_float_v"), unit(bms.float_v, "V")],
        [t("sxx_discharge_voltage"), unit(bms.cutoff_v, "V")],
        [t("sxx_charge_current"), unit(bms.max_charge_a, "A")],
        [t("sxx_discharge_current"), unit(bms.max_discharge_a, "A")],
      ])}</dl>}
    </>}
  </section>;
}

const SHOWN = 10;

/** The cell gap at the top of each of the last full charges of one battery stack, the newest first. Nothing until the server has recorded one. */
export function FullChargesCard({ t, origin, id }: { t: Translate; origin: string; id: string }) {
  const loaded = usePolled(async () => readFullCharges(origin), 300_000, origin);
  const charges = loaded.data?.batteries?.find(item => item.id === id)?.charges ?? [];
  if (charges.length === 0) return null;
  return <section className="solar-card" data-testid="full-charges">
    <div className="solar-card-head"><h3>{t("sxx_full_title")}</h3></div>
    <p className="muted small">{t("sxx_full_help")}</p>
    <table>
      <thead><tr><th>{t("sxx_full_when")}</th><th>{t("sxx_full_minutes")}</th><th>{t("sxx_full_mean")}</th><th>{t("sxx_full_max")}</th></tr></thead>
      <tbody>{charges.slice(-SHOWN).reverse().map(charge => <tr key={charge.ended_ms}><td>{new Date(charge.ended_ms).toLocaleString()}</td><td>{charge.minutes}</td><td>{charge.mean_gap_mv} mV</td><td>{charge.max_gap_mv} mV</td></tr>)}</tbody>
    </table>
    <button type="button" onClick={() => downloadText(`armor-full-charges-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${fullChargesCsv(charges, t)}`, "text/csv;charset=utf-8")}>{t("sxx_full_export")}</button>
  </section>;
}
