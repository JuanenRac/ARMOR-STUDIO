/**
 * The equipment of the solar menus: declare an inverter or a battery stack (name, model, connection, gateway node), see what is declared and whether
 * its gateway node has reported yet, try the menu with example readings, edit and forget. A declared device waits until the first real reading.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState, type FormEvent } from "react";
import { deleteSolarDevice, saveSolarDevice, solarExample } from "./api";
import type { Translate } from "./components/camera";
import { CONNECTION_LABEL, modelName, type SolarCatalog, type SolarDeviceView, type SolarKind, type SolarRegistration } from "./solarModel";
import { InverterLogo, BatteryLogo } from "./solarGraphics";
import "./views/devices.css";

type Props = {
  kind: SolarKind; t: Translate; origin: string; catalog: SolarCatalog | null;
  /** Everything declared of this kind, and what reports of it (to say whether each one has). */
  registrations: SolarRegistration[]; reporting: SolarDeviceView[]; reload: () => void;
};
type Form = { editing: boolean; name: string; node_id: string; device: string; model: string; connection: string; notes: string };

const blank = (kind: SolarKind): Form => ({ editing: false, name: "", node_id: "solar-1", device: "", model: kind === "inverter" ? "voltronic" : "pylontech-us3000", connection: kind === "inverter" ? "rs232" : "rs485", notes: "" });
const label = (t: Translate, value: string, table: Record<string, string>) => table[value] ?? t("solarOther");

export function SolarEquipment({ kind, t, origin, catalog, registrations, reporting, reload }: Props) {
  const [form, setForm] = useState<Form | null>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const models = catalog ? (kind === "inverter" ? catalog.inverter_models : catalog.battery_models) : [];
  const connections = catalog?.connections ?? ["rs232", "rs485", "usb", "can", "wifi", "other"];
  const dialect = form && kind === "inverter" ? catalog?.inverter_dialects?.[form.model] : undefined;
  const say = (text: string, bad = false) => setMessage({ text, bad });
  const edit = (patch: Partial<Form>) => setForm(current => current && { ...current, ...patch });

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      await saveSolarDevice(origin, { kind, name: form.name, node_id: form.node_id.trim().toLowerCase(), ...(form.device.trim() ? { device: form.device.trim().toLowerCase() } : {}), model: form.model, connection: form.connection, notes: form.notes });
      setForm(null); say(t("solarSaved")); reload();
    } catch { say(t("solarSaveFailed"), true); } finally { setBusy(false); }
  };
  const act = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try { await work(); say(done); reload(); } catch { say(t("solarSaveFailed"), true); } finally { setBusy(false); }
  };
  const state = (item: SolarRegistration): "waiting" | "example" | "reporting" => {
    const view = reporting.find(entry => entry.node_id === item.node_id && entry.device === item.device);
    return !view ? "waiting" : view.example ? "example" : "reporting";
  };

  return <section className="solar-setup">
    <div className="solar-setup-bar">
      <button className="primary" onClick={() => { setMessage(null); setForm(blank(kind)); }}>{kind === "inverter" ? t("solarAddInverter") : t("solarAddBattery")}</button>
      {registrations.length > 0 && <span className="muted">{t("solarDeclared")}: {registrations.length}</span>}
    </div>
    {message && <p className={`notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p>}

    {form && <form className="device-form stack-card" onSubmit={event => void save(event)}>
      <h3>{form.editing ? t("solarEditDevice") : kind === "inverter" ? t("solarAddInverter") : t("solarAddBattery")}</h3>
      <div className="device-form-grid">
        <label>{t("solarName")}<input value={form.name} maxLength={60} required autoFocus onChange={event => edit({ name: event.target.value })} placeholder={kind === "inverter" ? "Axpert 5 kW" : "US3000C"} /></label>
        <label>{t("solarModelLabel")}<select value={form.model} onChange={event => edit({ model: event.target.value })}>{models.map(model => <option key={model} value={model}>{modelName(model, catalog) ?? t("solarOther")}</option>)}</select></label>
        {kind === "inverter" && dialect && <p className="muted small wide">{t("solarDialectHint")} {dialect === "auto" ? t("solarDialectAuto") : dialect.toUpperCase()}</p>}
        <label>{t("solarConnection")}<select value={form.connection} onChange={event => edit({ connection: event.target.value })}>{connections.map(item => <option key={item} value={item}>{label(t, item, CONNECTION_LABEL)}</option>)}</select></label>
        <label>{t("solarNode")}<input value={form.node_id} readOnly={form.editing} maxLength={64} required pattern="[a-z0-9][a-z0-9_\-]*" onChange={event => edit({ node_id: event.target.value })} /></label>
        <p className="muted small wide">{t("solarNodeHelp")}</p>
        <label className="wide">{t("solarNotes")}<input value={form.notes} maxLength={200} onChange={event => edit({ notes: event.target.value })} /></label>
        {form.editing && <label>{t("solarIdentifier")}<input value={form.device} readOnly /></label>}
      </div>
      <div className="device-form-actions"><button type="submit" className="primary" disabled={busy}>{t("solarSave")}</button><button type="button" onClick={() => setForm(null)}>{t("solarCancel")}</button></div>
    </form>}

    {registrations.length > 0 && <div className="solar-declared">
      {registrations.map(item => {
        const status = state(item);
        return <article key={`${item.node_id}/${item.device}`} className={`solar-declared-card ${status}`}>
          <span className="solar-declared-logo">{item.kind === "inverter" ? <InverterLogo size={38} /> : <BatteryLogo size={38} percent={status === "waiting" ? 30 : 75} />}</span>
          <div className="solar-declared-text">
            <strong>{item.name}</strong>
            <small>{modelName(item.model, catalog) ?? t("solarOther")} · {label(t, item.connection, CONNECTION_LABEL)} · {item.node_id}/{item.device}{item.notes ? ` · ${item.notes}` : ""}</small>
            <span className={`solar-pill ${status === "reporting" ? "ok" : status === "example" ? "warn" : ""}`}>{status === "waiting" ? t("solarWaiting") : status === "example" ? t("solarExampleBadge") : t("solarReporting")}</span>
          </div>
          <div className="solar-declared-actions">
            <button disabled={busy} onClick={() => void act(() => solarExample(origin, item.node_id, item.device), t("solarExampleDone"))}>{t("solarExampleButton")}</button>
            <button disabled={busy} onClick={() => { setMessage(null); setForm({ editing: true, name: item.name, node_id: item.node_id, device: item.device, model: item.model, connection: item.connection, notes: item.notes }); }}>{t("solarEditDevice")}</button>
            <button disabled={busy} className="danger-button" onClick={() => { if (window.confirm(t("solarConfirmDelete"))) void act(() => deleteSolarDevice(origin, item.node_id, item.device), t("solarDeleted")); }}>{t("solarDelete")}</button>
          </div>
        </article>;
      })}
    </div>}
  </section>;
}
