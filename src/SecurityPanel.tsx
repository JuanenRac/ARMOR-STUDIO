/**
 * Configuration > Security: the second factor of the account (set up, recovery codes, turn off), the open sessions of the person (and ending the ones they do not know), how the server sees
 * a request (to check an outside-the-house set-up from a phone on mobile data) and, for an administrator, the settings of that access in the form of a few choices instead of a file.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminFile, adminSaveFile, adminStatus, endMySession, endOtherSessions, listMySessions, remoteCheck, totpDisable, totpEnable, totpSetup, totpState,
  type RemoteCheck, type SessionRow, type TotpState } from "./api";
import { askConfirm } from "./askConfirm";
import { RemoteAccessSetup } from "./RemoteAccessSetup";
import "./security.css";
import { errorText } from "./apiErrorText";

type Props = { t: (key: string) => string; origin: string; isAdmin: boolean };
type Say = (text: string, bad?: boolean) => void;

const explain = (t: (key: string) => string, error: unknown): string => errorText(t, error, "sec_err_");

function Message({ message }: { message: { text: string; bad: boolean } }) {
  return message.text ? <p className={`notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p> : null;
}

function SecondFactor({ t, origin }: { t: (key: string) => string; origin: string }) {
  const [state, setState] = useState<TotpState | null>(null);
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [message, setMessage] = useState({ text: "", bad: false });
  const say: Say = (text, bad = false) => setMessage({ text, bad });
  const load = useCallback(() => totpState(origin).then(setState).catch(() => undefined), [origin]);
  useEffect(() => { void load(); }, [load]);

  const start = async (event: FormEvent) => {
    event.preventDefault(); say("");
    try { setSetup(await totpSetup(origin, password)); setPassword(""); } catch (error) { say(explain(t, error), true); }
  };
  const enable = async (event: FormEvent) => {
    event.preventDefault(); say("");
    try { const done = await totpEnable(origin, code); setCodes(done.recovery_codes); setSetup(null); setCode(""); say(t("sec_2fa_on_done")); await load(); } catch (error) { say(explain(t, error), true); }
  };
  const disable = async (event: FormEvent) => {
    event.preventDefault(); say("");
    try { await totpDisable(origin, password); setPassword(""); setCodes(null); say(t("sec_2fa_off_done")); await load(); } catch (error) { say(explain(t, error), true); }
  };
  return <article className="stack-card sec-card" data-testid="security-2fa">
    <h3>{t("sec_2fa_title")}</h3>
    <p className="muted">{t("sec_2fa_help")}</p>
    {state && <p className="notice"><b>{state.enabled ? t("sec_2fa_state_on") : t("sec_2fa_state_off")}</b>{state.enabled && <> {state.recovery_left} {t("sec_2fa_left")}</>}</p>}
    {state && !state.enabled && !setup && <form onSubmit={event => void start(event)}>
      <label>{t("sec_2fa_password")}<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
      <button className="primary" disabled={password === ""}>{t("sec_2fa_start")}</button>
    </form>}
    {setup && <form onSubmit={event => void enable(event)}>
      <p>{t("sec_2fa_scan")}</p>
      <p><b>{t("sec_2fa_key")}:</b> <code className="mono" data-testid="totp-secret">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</code></p>
      <p><a href={setup.uri}>{t("sec_2fa_open")}</a></p>
      <label>{t("sec_2fa_code")}<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} /></label>
      <button className="primary" disabled={code.length !== 6}>{t("sec_2fa_enable")}</button>
    </form>}
    {codes && <div className="notice" role="status" data-testid="recovery-codes"><strong>{t("sec_2fa_codes_title")}</strong><p>{t("sec_2fa_codes_help")}</p><pre className="mono">{codes.join("\n")}</pre></div>}
    {state?.enabled && <form onSubmit={event => void disable(event)}>
      <label>{t("sec_2fa_password")}<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
      <button disabled={password === ""}>{t("sec_2fa_disable")}</button>
    </form>}
    <Message message={message} />
  </article>;
}

const when = (ms: number): string => (ms > 0 ? new Date(ms).toLocaleString() : "-");

function Sessions({ t, origin }: { t: (key: string) => string; origin: string }) {
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [message, setMessage] = useState({ text: "", bad: false });
  const load = useCallback(() => listMySessions(origin).then(list => setRows(list.sessions)).catch(() => undefined), [origin]);
  useEffect(() => { void load(); }, [load]);
  const end = async (row: SessionRow) => {
    if (!(await askConfirm(t("sec_ses_end") + "?", t))) return;
    try { await endMySession(origin, row.id); setMessage({ text: t("sec_ses_ended"), bad: false }); await load(); } catch (error) { setMessage({ text: explain(t, error), bad: true }); }
  };
  const endOthers = async () => {
    if (!(await askConfirm(t("sec_ses_end_others") + "?", t))) return;
    try { await endOtherSessions(origin); setMessage({ text: t("sec_ses_ended"), bad: false }); await load(); } catch (error) { setMessage({ text: explain(t, error), bad: true }); }
  };
  return <article className="stack-card sec-card" data-testid="security-sessions">
    <h3>{t("sec_ses_title")}</h3>
    <p className="muted">{t("sec_ses_help")}</p>
    {rows && rows.length === 0 && <p className="muted">{t("sec_ses_none")}</p>}
    <ul className="plain-list">{(rows ?? []).map(row => <li key={row.id}>
      <b>{row.current ? t("sec_ses_here") : row.agent || "-"}</b> · {row.origin === "remote" ? t("sec_ses_remote") : t("sec_ses_local")} · {row.ip || "-"} · {t("sec_ses_last")} {when(row.last_seen)}
      {!row.current && <> <button onClick={() => void end(row)}>{t("sec_ses_end")}</button></>}
    </li>)}</ul>
    {(rows?.length ?? 0) > 1 && <button onClick={() => void endOthers()}>{t("sec_ses_end_others")}</button>}
    <Message message={message} />
  </article>;
}

function RemoteCheckCard({ t, origin }: { t: (key: string) => string; origin: string }) {
  const [result, setResult] = useState<RemoteCheck | null>(null);
  const [message, setMessage] = useState({ text: "", bad: false });
  const check = async () => { try { setResult(await remoteCheck(origin)); setMessage({ text: "", bad: false }); } catch (error) { setMessage({ text: explain(t, error), bad: true }); } };
  const yes = (value: boolean) => (value ? t("sec_rem_yes") : t("sec_rem_no"));
  return <article className="stack-card sec-card" data-testid="security-remote">
    <h3>{t("sec_rem_title")}</h3>
    <p className="muted">{t("sec_rem_help")}</p>
    <button onClick={() => void check()}>{t("sec_rem_check")}</button>
    {result && <dl className="facts">
      <dt>{t("sec_rem_ip")}</dt><dd>{result.ip}</dd>
      <dt>{t("sec_rem_origin")}</dt><dd>{result.origin === "remote" ? t("sec_ses_remote") : t("sec_ses_local")}</dd>
      <dt>{t("sec_rem_secure")}</dt><dd>{yes(result.cookie_secure)}</dd>
      <dt>{t("sec_rem_proxy")}</dt><dd>{result.trust_proxy === false ? t("sec_rem_no") : String(result.trust_proxy)}</dd>
      <dt>{t("sec_rem_policy")}</dt><dd>{result.totp_policy}</dd>
    </dl>}
    {result?.origin === "local" && <p className="notice">{t("sec_rem_warn_local")}</p>}
    <Message message={message} />
  </article>;
}

/** The lines `KEY=value` of an environment file, changed in place: a key that is empty is taken out, one that is not there yet is added, everything else stays as it was. */
export function setEnvLines(content: string, values: Record<string, string>): string {
  const lines = content.split("\n");
  for (const [key, value] of Object.entries(values)) {
    const index = lines.findIndex(line => line.startsWith(`${key}=`));
    if (value === "") { if (index >= 0) lines.splice(index, 1); continue; }
    if (index >= 0) lines[index] = `${key}=${value}`;
    else { while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop(); lines.push(`${key}=${value}`, ""); }
  }
  return lines.join("\n");
}
export const envValue = (content: string, key: string): string => content.split("\n").find(line => line.startsWith(`${key}=`))?.slice(key.length + 1).trim() ?? "";

const KEYS = ["ARMOR_TRUST_PROXY", "ARMOR_LOCAL_NETWORKS", "ARMOR_VPN_NETWORKS", "ARMOR_TOTP_REQUIRED", "ARMOR_REMOTE_POLICY", "ARMOR_REMOTE_SESSION_TTL_MS", "ARMOR_REMOTE_IDLE_MS"] as const;

function RemoteSettings({ t, origin }: { t: (key: string) => string; origin: string }) {
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [content, setContent] = useState("");
  const [mtime, setMtime] = useState<number | undefined>(undefined);
  const [form, setForm] = useState({ proxy: "", local: "", vpn: "", totp: "off", policy: "full", hours: "12", idle: "30" });
  const [message, setMessage] = useState({ text: "", bad: false });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        if (!(await adminStatus(origin)).available) { if (live) setState("missing"); return; }
        const file = await adminFile(origin, "network.env");
        if (!live) return;
        setContent(file.content); setMtime(file.exists ? file.mtime : undefined);
        const ms = (key: string, divisor: number, fallback: string) => { const raw = envValue(file.content, key); return raw ? String(Math.round(Number(raw) / divisor)) : fallback; };
        setForm({ proxy: envValue(file.content, "ARMOR_TRUST_PROXY"), local: envValue(file.content, "ARMOR_LOCAL_NETWORKS"), vpn: envValue(file.content, "ARMOR_VPN_NETWORKS"), totp: envValue(file.content, "ARMOR_TOTP_REQUIRED") || "off",
          policy: envValue(file.content, "ARMOR_REMOTE_POLICY") || "full", hours: ms("ARMOR_REMOTE_SESSION_TTL_MS", 3_600_000, "12"), idle: ms("ARMOR_REMOTE_IDLE_MS", 60_000, "30") });
        setState("ready");
      } catch { if (live) setState("missing"); }
    })();
    return () => { live = false; };
  }, [origin]);
  if (state === "loading") return null;
  if (state === "missing") return <article className="stack-card"><h3>{t("sec_cfg_title")}</h3><p className="muted">{t("sec_cfg_unavailable")}</p></article>;
  const save = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    const hours = Number(form.hours), idle = Number(form.idle);
    const values: Record<string, string> = {
      ARMOR_TRUST_PROXY: form.proxy.trim(), ARMOR_LOCAL_NETWORKS: form.local.trim(), ARMOR_VPN_NETWORKS: form.vpn.trim(), ARMOR_TOTP_REQUIRED: form.totp === "off" ? "" : form.totp,
      ARMOR_REMOTE_POLICY: form.policy === "full" ? "" : form.policy,
      ARMOR_REMOTE_SESSION_TTL_MS: Number.isFinite(hours) && hours > 0 && hours !== 12 ? String(Math.round(hours * 3_600_000)) : "", ARMOR_REMOTE_IDLE_MS: Number.isFinite(idle) && idle > 0 && idle !== 30 ? String(Math.round(idle * 60_000)) : "",
    };
    try {
      const next = setEnvLines(content, values);
      const done = await adminSaveFile(origin, "network.env", { content: next, restart: true, expect_mtime: mtime });
      setContent(next); setMtime(done.mtime); setMessage({ text: t("sec_cfg_saved"), bad: false });
    } catch (error) { setMessage({ text: explain(t, error), bad: true }); } finally { setBusy(false); }
  };
  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  return <article className="stack-card sec-card" data-testid="security-settings">
    <h3>{t("sec_cfg_title")}</h3>
    <p className="muted">{t("sec_cfg_help")}</p>
    <form onSubmit={event => void save(event)}>
      <label>{t("sec_cfg_proxy")}<input value={form.proxy} onChange={event => set("proxy", event.target.value)} /></label>
      <label>{t("sec_cfg_local")}<input value={form.local} onChange={event => set("local", event.target.value)} placeholder="192.168.0.0/16, 10.0.0.0/8" /></label>
      <label>{t("sec_cfg_vpn")}<input value={form.vpn} onChange={event => set("vpn", event.target.value)} placeholder="10.66.0.0/24" /></label>
      <label>{t("sec_cfg_totp")}<select value={form.totp} onChange={event => set("totp", event.target.value)}>
        <option value="off">{t("sec_cfg_totp_off")}</option><option value="remote">{t("sec_cfg_totp_remote")}</option><option value="always">{t("sec_cfg_totp_always")}</option></select></label>
      <label>{t("sec_cfg_policy")}<select value={form.policy} onChange={event => set("policy", event.target.value)}>
        <option value="full">{t("sec_cfg_policy_full")}</option><option value="operate">{t("sec_cfg_policy_operate")}</option><option value="view">{t("sec_cfg_policy_view")}</option></select></label>
      <label>{t("sec_cfg_ttl")}<input inputMode="numeric" value={form.hours} onChange={event => set("hours", event.target.value.replace(/[^\d.]/g, ""))} /></label>
      <label>{t("sec_cfg_idle")}<input inputMode="numeric" value={form.idle} onChange={event => set("idle", event.target.value.replace(/\D/g, ""))} /></label>
      <button className="primary" disabled={busy}>{t("sec_cfg_save")}</button>
    </form>
    <Message message={message} />
  </article>;
}

export function SecurityPanel({ t, origin, isAdmin }: Props) {
  return <div className="sec-page" data-testid="security-panel">
    <div className="panel-heading"><h3>{t("sec_title")}</h3><p className="muted">{t("sec_help")}</p></div>
    <section className="sec-section" data-testid="security-group-account">
      <h4 className="sec-section-title">{t("sec_group_account")}</h4>
      <div className="sec-row"><SecondFactor t={t} origin={origin} /><Sessions t={t} origin={origin} /></div>
    </section>
    <section className="sec-section" data-testid="security-group-server">
      <h4 className="sec-section-title">{t("sec_group_server")}</h4>
      <div className="sec-row"><RemoteCheckCard t={t} origin={origin} />{isAdmin && <RemoteSettings t={t} origin={origin} />}</div>
    </section>
    {isAdmin && <RemoteAccessSetup t={t} origin={origin} />}
  </div>;
}

export { KEYS as REMOTE_SETTING_KEYS };
