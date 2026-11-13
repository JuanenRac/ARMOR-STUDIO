/**
 * The cards of the encrypted backups (Configuration > Administration), the load shedding and the energy balance (Electrical menu). Each is off until its security option is on, and says so;
 * an administrator sets them, an operator reads. The passphrase of the backups is typed here, sent once and never shown again.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useState } from "react";
import { ApiError, readBackup, readEnergyBalance, readLoadShedding, runBackup, saveBackup, saveEnergyBalance, saveLoadShedding, verifyBackup, type BackupResult, type BackupState, type EnergyBalance, type LoadShedding } from "./api";

type Translate = (key: string) => string;
type Message = { text: string; bad: boolean };

/** What a refusal of the server says to the person, in their language. */
export function tandaError(t: Translate, error: unknown): string {
  const code = error instanceof ApiError ? error.code : "generic";
  const key = ({ weak_passphrase: "scr_err_passphrase", passphrase_needed: "bk_pass_none", destination_not_allowed: "scr_err_destination", not_mounted: "scr_err_mount", invalid_settings: "scr_err_invalid" } as Record<string, string>)[code];
  return key ? t(key) : t("adm_err_generic");
}
const whole = (text: string): number => Math.round(Number(text));
const list = (text: string): string[] => text.split(",").map(item => item.trim()).filter(Boolean);
const resultLine = (t: Translate, result: BackupResult | null): string => (result ? `${new Date(result.at).toLocaleString()} - ${t(result.ok ? "bk_ok" : "bk_failed")}${result.files ? ` (${result.files} ${t("bk_files")})` : ""}` : "-");

export function BackupCard({ t, origin, isAdmin }: { t: Translate; origin: string; isAdmin: boolean }) {
  const [state, setState] = useState<BackupState | null>(null);
  const [form, setForm] = useState({ schedule: false, every_h: "24", keep: "7", destination: "", require_mount: true, include_media: false, passphrase: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>({ text: "", bad: false });
  const adopt = useCallback((next: BackupState) => {
    setState(next);
    setForm(current => ({ ...current, schedule: next.settings.schedule, every_h: String(next.settings.every_h), keep: String(next.settings.keep), destination: next.settings.destination, require_mount: next.settings.require_mount, include_media: next.settings.include_media, passphrase: "" }));
  }, []);
  useEffect(() => { void readBackup(origin).then(adopt, () => setState(null)); }, [origin, adopt]);
  if (!state) return null;
  if (!state.enabled) return <article className="stack-card adm-card" data-testid="backup-off"><h3>{t("bk_title")}</h3><p className="muted">{t("scr_off")}</p></article>;
  const act = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true); setMessage({ text: "", bad: false });
    try { await work(); setMessage({ text: done, bad: false }); adopt(await readBackup(origin)); } catch (error) { setMessage({ text: tandaError(t, error), bad: true }); } finally { setBusy(false); }
  };
  const save = () => act(() => saveBackup(origin, { schedule: form.schedule, every_h: whole(form.every_h), keep: whole(form.keep), destination: form.destination.trim(), require_mount: form.require_mount, include_media: form.include_media, ...(form.passphrase ? { passphrase: form.passphrase } : {}) }), t("scr_saved"));
  return <article className="stack-card adm-card" data-testid="backup-on"><h3>{t("bk_title")}</h3><p className="muted">{t("bk_help")}</p>
    <p className={`notice ${state.key_set ? "" : "bad"}`} role="note">{t(state.key_set ? "bk_pass_set" : "bk_pass_none")}</p>
    <small data-testid="backup-last">{t("bk_last")}: {resultLine(t, state.last)}</small><br /><small data-testid="backup-proof">{t("bk_proof")}: {resultLine(t, state.last_verify)}</small>
    {isAdmin && <>
      <label><input type="checkbox" checked={form.schedule} onChange={event => setForm({ ...form, schedule: event.target.checked })} /> {t("bk_schedule")}</label>
      <label>{t("bk_every")}<input type="number" min={1} max={720} value={form.every_h} onChange={event => setForm({ ...form, every_h: event.target.value })} /></label>
      <label>{t("bk_keep")}<input type="number" min={1} max={60} value={form.keep} onChange={event => setForm({ ...form, keep: event.target.value })} /></label>
      <label>{t("bk_dest")}<input value={form.destination} placeholder="/media/usb" onChange={event => setForm({ ...form, destination: event.target.value })} /></label>
      <label><input type="checkbox" checked={form.require_mount} onChange={event => setForm({ ...form, require_mount: event.target.checked })} /> {t("bk_mount")}</label>
      <label><input type="checkbox" checked={form.include_media} onChange={event => setForm({ ...form, include_media: event.target.checked })} /> {t("bk_media")}</label>
      <label>{t("bk_pass")}<input type="password" autoComplete="new-password" value={form.passphrase} onChange={event => setForm({ ...form, passphrase: event.target.value })} /></label>
      <div className="adm-foot">
        <button disabled={busy} data-testid="backup-save" onClick={() => void save()}>{t("scr_save")}</button>
        <button disabled={busy || !state.key_set} data-testid="backup-run" onClick={() => void act(() => runBackup(origin), t("bk_ok"))}>{t("bk_run")}</button>
        <button disabled={busy || state.backups.length === 0} data-testid="backup-verify" onClick={() => void act(() => verifyBackup(origin), t("bk_ok"))}>{t("bk_verify")}</button>
      </div></>}
    {message.text && <p className={`notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p>}
    <h4>{t("bk_list")}</h4>
    {state.backups.length === 0 ? <p className="muted">{t("bk_none")}</p> : <ul>{state.backups.slice(0, 8).map(item => <li key={item.name}><small>{item.name} - {Math.round(item.bytes / 1024)} KiB</small></li>)}</ul>}
  </article>;
}

export function LoadSheddingCard({ t, origin, isAdmin }: { t: Translate; origin: string; isAdmin: boolean }) {
  const [state, setState] = useState<LoadShedding | null>(null);
  const [form, setForm] = useState({ limit_w: "5000", restore_w: "3500", hold_s: "30", step_s: "20", loads: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>({ text: "", bad: false });
  const adopt = useCallback((next: LoadShedding) => {
    setState(next);
    setForm({ limit_w: String(next.settings.limit_w ?? 5000), restore_w: String(next.settings.restore_w ?? 3500), hold_s: String(next.settings.hold_s ?? 30), step_s: String(next.settings.step_s ?? 20), loads: (next.settings.loads ?? []).join(", ") });
  }, []);
  useEffect(() => {
    void readLoadShedding(origin).then(adopt, () => setState(null));
    const timer = window.setInterval(() => void readLoadShedding(origin).then(setState, () => undefined), 10_000);
    return () => window.clearInterval(timer);
  }, [origin, adopt]);
  if (!state) return null;
  const save = async () => {
    setBusy(true); setMessage({ text: "", bad: false });
    try { adopt(await saveLoadShedding(origin, { limit_w: whole(form.limit_w), restore_w: whole(form.restore_w), hold_s: whole(form.hold_s), step_s: whole(form.step_s), loads: list(form.loads) })); setMessage({ text: t("scr_saved"), bad: false }); }
    catch (error) { setMessage({ text: tandaError(t, error), bad: true }); } finally { setBusy(false); }
  };
  return <article className="stack-card" data-testid="shedding"><h3>{t("ls_title")}</h3><p className="muted">{t("ls_help")}</p>
    {!state.enabled && <p className="notice" role="note" data-testid="shedding-off">{t("scr_off")}</p>}
    <small>{t("ls_grid")}: {state.grid_w === null ? "-" : `${Math.round(state.grid_w)} W`}</small><br /><small data-testid="shedding-now">{t("ls_now")}: {state.shed.length ? state.shed.join(", ") : "-"}</small>
    {isAdmin && <>
      <label>{t("ls_limit")}<input type="number" min={200} value={form.limit_w} onChange={event => setForm({ ...form, limit_w: event.target.value })} /></label>
      <label>{t("ls_restore")}<input type="number" min={100} value={form.restore_w} onChange={event => setForm({ ...form, restore_w: event.target.value })} /></label>
      <label>{t("ls_hold")}<input type="number" min={5} value={form.hold_s} onChange={event => setForm({ ...form, hold_s: event.target.value })} /></label>
      <label>{t("ls_step")}<input type="number" min={5} value={form.step_s} onChange={event => setForm({ ...form, step_s: event.target.value })} /></label>
      <label>{t("ls_loads")}<input value={form.loads} onChange={event => setForm({ ...form, loads: event.target.value })} /><small className="hint">{t("ls_loads_help")}</small></label>
      <div className="adm-foot"><button disabled={busy} data-testid="shedding-save" onClick={() => void save()}>{t("scr_save")}</button></div></>}
    {message.text && <p className={`notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p>}
    <h4>{t("ls_log")}</h4>
    {state.log.length === 0 ? <p className="muted">{t("ls_none")}</p> : <ul data-testid="shedding-log">{state.log.slice(0, 8).map((entry, index) => <li key={index}><small>{new Date(entry.at).toLocaleTimeString()} - {entry.device}: {t(`ls_act_${entry.action}`)}{entry.grid_w === null ? "" : ` (${Math.round(entry.grid_w)} W)`}</small></li>)}</ul>}
  </article>;
}

const figure = (value: number | null, unit: string): string => (value === null ? "-" : `${value} ${unit}`);

export function EnergyBalanceCard({ t, origin, isAdmin }: { t: Translate; origin: string; isAdmin: boolean }) {
  const [state, setState] = useState<EnergyBalance | null>(null);
  const [off, setOff] = useState(false);
  const [form, setForm] = useState({ allow_export: true, export_alert_w: "300", hold_s: "120", watch: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>({ text: "", bad: false });
  const adopt = useCallback((next: EnergyBalance) => {
    setState(next); setOff(false);
    setForm({ allow_export: next.settings.allow_export ?? true, export_alert_w: String(next.settings.export_alert_w ?? 300), hold_s: String(next.settings.hold_s ?? 120), watch: (next.settings.watch_channels ?? []).join(", ") });
  }, []);
  useEffect(() => {
    const read = (first: boolean) => readEnergyBalance(origin).then(first ? adopt : next => { setState(next); setOff(false); }, error => { if (error instanceof ApiError && error.status === 404) setOff(true); });
    void read(true);
    const timer = window.setInterval(() => void read(false), 10_000);
    return () => window.clearInterval(timer);
  }, [origin, adopt]);
  if (off) return <article className="stack-card" data-testid="balance-off"><h3>{t("eb_title")}</h3><p className="muted">{t("scr_off")}</p></article>;
  if (!state) return null;
  const b = state.balance;
  const save = async () => {
    setBusy(true); setMessage({ text: "", bad: false });
    try { adopt(await saveEnergyBalance(origin, { allow_export: form.allow_export, export_alert_w: whole(form.export_alert_w), hold_s: whole(form.hold_s), watch_channels: list(form.watch) })); setMessage({ text: t("scr_saved"), bad: false }); }
    catch (error) { setMessage({ text: tandaError(t, error), bad: true }); } finally { setBusy(false); }
  };
  return <article className="stack-card" data-testid="balance-on"><h3>{t("eb_title")}</h3><p className="muted">{t("eb_help")}</p>
    <dl className="kv" data-testid="balance-figures">
      <dt>{t("eb_prod")}</dt><dd>{figure(b.production_w, "W")}</dd><dt>{t("eb_cons")}</dt><dd>{figure(b.consumption_w, "W")}</dd>
      <dt>{t("eb_import")}</dt><dd>{figure(b.import_w, "W")}</dd><dt>{t("eb_export")}</dt><dd>{figure(b.export_w, "W")}</dd>
      <dt>{t("eb_self")}</dt><dd>{figure(b.self_consumption_pct, "%")}</dd><dt>{t("eb_autarky")}</dt><dd>{figure(b.autarky_pct, "%")}</dd>
    </dl>
    <h4>{t("eb_findings")}</h4>
    {state.findings.length === 0 ? <p className="muted">{t("eb_none")}</p> : <ul data-testid="balance-findings">{state.findings.map(finding => <li key={finding.key} className="notice bad">{t(`eb_code_${finding.code}`)}{finding.source ? ` (${finding.source})` : ""}</li>)}</ul>}
    {isAdmin && <>
      <label><input type="checkbox" checked={form.allow_export} onChange={event => setForm({ ...form, allow_export: event.target.checked })} /> {t("eb_export_ok")}</label>
      <label>{t("eb_alert_w")}<input type="number" min={10} value={form.export_alert_w} onChange={event => setForm({ ...form, export_alert_w: event.target.value })} /></label>
      <label>{t("eb_hold")}<input type="number" min={10} value={form.hold_s} onChange={event => setForm({ ...form, hold_s: event.target.value })} /></label>
      <label>{t("eb_watch")}<input value={form.watch} placeholder="electrical-1/fridge" onChange={event => setForm({ ...form, watch: event.target.value })} /><small className="hint">{t("eb_watch_help")}</small></label>
      <div className="adm-foot"><button disabled={busy} data-testid="balance-save" onClick={() => void save()}>{t("scr_save")}</button></div></>}
    {message.text && <p className={`notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p>}
  </article>;
}
