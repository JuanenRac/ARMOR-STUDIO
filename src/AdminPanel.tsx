/**
 * Configuration > Services, MQTT broker and Files: what an administrator can do from Studio instead of looking for files on the machine - see the A.R.M.O.R.
 * services and start, stop or restart them, edit their settings files, and make or remove the accounts of the MQTT broker (one for every node, of any kind).
 * The privileged work is done by the admin agent behind the server; when it is not installed these screens say so and change nothing.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  adminAccounts, adminAddAccount, adminFile, adminFiles, adminRemoveAccount, adminSaveFile, adminServiceAction, adminServices, adminStatus,
  ApiError, type AdminFile, type AdminFileInfo, type AdminService, type BrokerAccount,
} from "./api";
import { ConfirmDialog } from "./components/chrome";
import { ActionIcon, actionsFor, type ServiceAction } from "./views/ServicesView";
import type { ServiceState } from "./api";

type Translate = (key: string) => string;
type Props = { t: Translate; origin: string; isAdmin: boolean };

const explain = (t: Translate, error: unknown): string => {
  const full = error instanceof ApiError ? error.code : "generic";
  const [code, detail] = full.split(":");
  const text = t(`adm_err_${code}`);
  return (text === `adm_err_${code}` ? t("adm_err_generic") : text) + (detail ? ` (${detail})` : "");
};

/** Gate for the three screens: only an administrator, and only when the agent is there. */
function useAgent(origin: string, isAdmin: boolean): "checking" | "ready" | "missing" | "denied" {
  const [state, setState] = useState<"checking" | "ready" | "missing" | "denied">("checking");
  useEffect(() => {
    if (!isAdmin) { setState("denied"); return; }
    let live = true;
    adminStatus(origin).then(status => { if (live) setState(status.available ? "ready" : "missing"); }).catch(() => { if (live) setState("missing"); });
    return () => { live = false; };
  }, [origin, isAdmin]);
  return state;
}

function Gate({ t, state }: { t: Translate; state: "checking" | "missing" | "denied" }) {
  return <article className="stack-card"><h3>{t("adm_title")}</h3>
    <p className="muted">{state === "denied" ? t("cs_admin_only") : state === "checking" ? t("loading") : t("adm_missing")}</p>
    {state === "missing" && <p className="hint mono">scripts/install_cm5.sh --with-admin</p>}
  </article>;
}

// ---- services ----------------------------------------------------------------------------------------------------------------------------------

export function ServiceRow({ t, service, busy, ask }: { t: Translate; service: AdminService; busy: boolean; ask: (action: ServiceAction) => void }) {
  const on = service.active === "active";
  const state: ServiceState = on ? (service.paused ? "paused" : "running") : service.active === "failed" ? "failed" : service.active === "activating" ? "starting" : "stopped";
  return <li className={`adm-service ${on ? (service.paused ? "bad" : "on") : service.active === "failed" ? "bad" : "off"}`}>
    <span className="state-dot" aria-hidden />
    <div className="adm-service-main"><strong>{service.description}</strong><small className="mono">{service.unit}{service.pid ? ` · pid ${service.pid}` : ""}</small></div>
    <span className={`pill ${on && !service.paused ? "ok" : "off"}`}>{service.installed ? service.paused ? t("svcState_paused") : t(`adm_state_${service.active}`) === `adm_state_${service.active}` ? service.active : t(`adm_state_${service.active}`) : t("adm_not_installed")}</span>
    {service.installed && <div className="adm-actions svc-actions">
      {actionsFor(state, service.id).map(action => <button key={action} disabled={busy} className={`svc-act ${action}`} title={t(`svcBtn_${action}`)} aria-label={`${t(`svcBtn_${action}`)} ${service.description}`} onClick={() => ask(action)}><ActionIcon action={action} /></button>)}
    </div>}
  </li>;
}

export function ServicesPanel({ t, origin, isAdmin }: Props) {
  const gate = useAgent(origin, isAdmin);
  const [services, setServices] = useState<AdminService[]>([]);
  const [message, setMessage] = useState<{ text: string; bad: boolean }>({ text: "", bad: false });
  const [pending, setPending] = useState<{ service: AdminService; action: ServiceAction } | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = useCallback(async () => { try { setServices((await adminServices(origin)).services); } catch (error) { setMessage({ text: explain(t, error), bad: true }); } }, [origin]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (gate === "ready") void reload(); }, [gate, reload]);
  if (gate !== "ready") return <Gate t={t} state={gate} />;
  const run = async (service: AdminService, action: ServiceAction) => {
    setPending(null); setBusy(true); setMessage({ text: t("adm_working"), bad: false });
    try { await adminServiceAction(origin, service.id, action); setMessage({ text: t("adm_done"), bad: false }); }
    // Restarting the server cuts the answer: that is not a failure, the list is read again in a moment.
    catch (error) { setMessage(service.id === "server" && !(error instanceof ApiError) ? { text: t("adm_server_restarting"), bad: false } : { text: explain(t, error), bad: true }); }
    window.setTimeout(() => { void reload(); setBusy(false); }, 2500);
  };
  return <article className="stack-card adm-card"><h3>{t("adm_services")}</h3><p className="muted">{t("adm_services_help")}</p>
    {message.text && <p className={`notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p>}
    <ul className="adm-list">{services.map(service => <ServiceRow key={service.id} t={t} service={service} busy={busy} ask={action => (action === "start" || action === "resume" ? void run(service, action) : setPending({ service, action }))} />)}</ul>
    <div className="adm-foot"><button onClick={() => void reload()}>{t("svcRefresh")}</button></div>
    {pending && <ConfirmDialog t={t} danger={pending.action === "stop"} title={t(`svcBtn_${pending.action}`)} text={`${pending.service.description} - ${pending.action === "pause" ? t("svcAsk_pause") : t(`adm_ask_${pending.action}${pending.service.id === "server" ? "_server" : ""}`)}`}
      confirmLabel={t(`svcBtn_${pending.action}`)} cancel={() => setPending(null)} confirm={() => void run(pending.service, pending.action)} />}
  </article>;
}

// ---- one settings file -------------------------------------------------------------------------------------------------------------------------

export function FileEditor({ t, origin, info, services, onSaved }: { t: Translate; origin: string; info: AdminFileInfo; services?: Record<string, string>; onSaved?: () => void }) {
  const [file, setFile] = useState<AdminFile | null>(null);
  const [text, setText] = useState("");
  const [message, setMessage] = useState<{ text: string; bad: boolean }>({ text: "", bad: false });
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const loaded = await adminFile(origin, info.id); setFile(loaded); setText(loaded.content); setMessage({ text: "", bad: false }); }
    catch (error) { setMessage({ text: explain(t, error), bad: true }); }
  }, [origin, info.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  const changed = file !== null && text !== file.content;
  const save = async (restart: boolean) => {
    if (!file) return;
    setBusy(true);
    try {
      const result = await adminSaveFile(origin, info.id, { content: text, restart, expect_mtime: file.exists ? file.mtime : undefined });
      setMessage({ text: restart ? `${t("adm_saved_restarted")} ${result.restarted.map(id => services?.[id] ?? id).join(", ")}` : t("adm_saved"), bad: false });
      await load(); onSaved?.();
    } catch (error) { setMessage({ text: explain(t, error), bad: true }); } finally { setBusy(false); }
  };
  return <article className="stack-card adm-file">
    <h3>{info.id}</h3>
    <p className="muted">{info.description}</p>
    <p className="hint mono">{info.path}{file && !file.exists ? ` - ${t("adm_file_new")}` : ""}</p>
    <textarea className="adm-editor" spellCheck={false} value={text} onChange={event => setText(event.target.value)} aria-label={info.id} rows={Math.min(22, Math.max(6, text.split("\n").length + 1))} />
    {file?.masked && <p className="hint">{t("adm_masked_help")}</p>}
    {message.text && <p className={`notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p>}
    <div className="adm-foot">
      <button className="primary" disabled={busy || !changed} onClick={() => void save(false)}>{t("adm_save")}</button>
      <button disabled={busy || !changed} onClick={() => void save(true)}>{t("adm_save_restart")}</button>
      <button disabled={busy || !changed} onClick={() => file && setText(file.content)}>{t("adm_revert")}</button>
    </div>
  </article>;
}

export function FilesPanel({ t, origin, isAdmin }: Props) {
  const gate = useAgent(origin, isAdmin);
  const [files, setFiles] = useState<AdminFileInfo[]>([]);
  const [open, setOpen] = useState("");
  useEffect(() => { if (gate === "ready") void adminFiles(origin).then(result => { setFiles(result.files); setOpen(current => current || result.files[0]?.id || ""); }).catch(() => undefined); }, [gate, origin]);
  if (gate !== "ready") return <Gate t={t} state={gate} />;
  const current = files.find(item => item.id === open);
  return <div className="adm-files">
    <article className="stack-card"><h3>{t("adm_files")}</h3><p className="muted">{t("adm_files_help")}</p>
      <ul className="adm-file-list">{files.map(item => <li key={item.id}><button className={item.id === open ? "active" : ""} onClick={() => setOpen(item.id)}><strong>{item.id}</strong><small>{item.description}</small></button></li>)}</ul>
    </article>
    {current && <FileEditor key={current.id} t={t} origin={origin} info={current} />}
  </div>;
}

// ---- the broker --------------------------------------------------------------------------------------------------------------------------------

const ROLES = ["node", "solar-node", "electrical-node", "network-node", "consumer", "device", "bridge"] as const;

export function BrokerPanel({ t, origin, isAdmin }: Props) {
  const gate = useAgent(origin, isAdmin);
  const [accounts, setAccounts] = useState<BrokerAccount[]>([]);
  const [service, setService] = useState<AdminService | null>(null);
  const [files, setFiles] = useState<AdminFileInfo[]>([]);
  const [message, setMessage] = useState<{ text: string; bad: boolean }>({ text: "", bad: false });
  const [made, setMade] = useState<{ user: string; password: string } | null>(null);
  const [form, setForm] = useState({ role: "node", name: "" });
  const [removing, setRemoving] = useState<BrokerAccount | null>(null);
  const [opened, setOpened] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const reload = useCallback(async () => {
    try {
      const [list, all, known] = await Promise.all([adminAccounts(origin), adminServices(origin), adminFiles(origin)]);
      setAccounts(list.accounts); setService(all.services.find(item => item.id === "mosquitto") ?? null);
      setFiles(known.files.filter(item => item.id.startsWith("mosquitto")));
    } catch (error) { setMessage({ text: explain(t, error), bad: true }); }
  }, [origin]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (gate === "ready") void reload(); }, [gate, reload]);
  if (gate !== "ready") return <Gate t={t} state={gate} />;

  const act = async (action: ServiceAction) => {
    setBusy(true);
    try { await adminServiceAction(origin, "mosquitto", action); setMessage({ text: t("adm_done"), bad: false }); } catch (error) { setMessage({ text: explain(t, error), bad: true }); }
    window.setTimeout(() => { void reload(); setBusy(false); }, 2000);
  };
  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(form.name)) { setMessage({ text: t("adm_err_invalid_name"), bad: true }); return; }
    setBusy(true);
    try { const result = await adminAddAccount(origin, form.role, form.name); setMade({ user: result.user, password: result.password }); setForm({ ...form, name: "" }); setMessage({ text: "", bad: false }); await reload(); }
    catch (error) { setMessage({ text: explain(t, error), bad: true }); } finally { setBusy(false); }
  };
  const remove = async (account: BrokerAccount) => {
    setRemoving(null); setBusy(true);
    try { await adminRemoveAccount(origin, account.user); setMessage({ text: t("adm_done"), bad: false }); await reload(); } catch (error) { setMessage({ text: explain(t, error), bad: true }); } finally { setBusy(false); }
  };
  const on = service?.active === "active";
  return <div className="adm-broker">
    <article className="stack-card adm-card"><h3>{t("adm_broker")}</h3><p className="muted">{t("adm_broker_help")}</p>
      {service && <ServiceRow t={t} service={service} busy={busy} ask={action => void act(action)} />}
      {!service && <p className="muted">{t("adm_not_installed")}</p>}
      {message.text && <p className={`notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p>}
      <p className="hint">{on ? t("adm_broker_on") : t("adm_broker_off")}</p>
    </article>

    <article className="stack-card adm-card"><h3>{t("adm_accounts")} <small className="user-chip">{accounts.length}</small></h3><p className="muted">{t("adm_accounts_help")}</p>
      <form className="adm-form" onSubmit={event => void add(event)}>
        <label>{t("adm_role")}<select value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}>{ROLES.map(role => <option key={role} value={role}>{t(`adm_role_${role}`)}</option>)}</select></label>
        <label>{t("adm_name")}<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value.toLowerCase() })} placeholder="nodo-radar-2" autoComplete="off" /></label>
        <button className="primary" type="submit" disabled={busy || form.name === ""}>{t("adm_add_account")}</button>
      </form>
      {made && <div className="notice adm-secret" role="status"><strong>{t("adm_account_made")}</strong>
        <dl className="kv"><dt>{t("adm_user")}</dt><dd className="mono">{made.user}</dd><dt>{t("adm_password")}</dt><dd className="mono">{made.password}</dd></dl>
        <p className="hint">{t("adm_password_once")}</p>
        <div className="adm-foot"><button onClick={() => void navigator.clipboard?.writeText(made.password)}>{t("no_copy")}</button><button onClick={() => setMade(null)}>{t("close")}</button></div></div>}
      <ul className="adm-list">{accounts.map(account => <li key={account.user} className="adm-account">
        <div className="adm-service-main"><strong className="mono">{account.user}</strong><small>{account.manageable ? t(`adm_role_${account.role === "field-node" ? "node" : account.role === "alarm" ? "consumer" : account.role}`) : t("adm_role_system")}</small></div>
        <button onClick={() => setOpened(opened === account.user ? "" : account.user)}>{opened === account.user ? t("alarmHideDetails") : t("alarmDetails")}</button>
        {account.manageable && <button className="danger-button" disabled={busy} onClick={() => setRemoving(account)} aria-label={t("adm_remove")}>×</button>}
        {opened === account.user && <pre className="adm-topics">{account.topics.join("\n") || "-"}</pre>}
      </li>)}</ul>
    </article>
    {files.map(info => <FileEditor key={info.id} t={t} origin={origin} info={info} />)}
    {removing && <ConfirmDialog t={t} danger title={t("adm_remove")} text={`${removing.user} - ${t("adm_remove_ask")}`} confirmLabel={t("adm_remove")} cancel={() => setRemoving(null)} confirm={() => void remove(removing)} />}
  </div>;
}
