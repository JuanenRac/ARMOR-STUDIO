/**
 * Configuration > Security: the second factor of the account (set up, recovery codes, turn off), the open sessions of the person (and ending the ones they do not know), how the server sees
 * a request (to check an outside-the-house set-up from a phone on mobile data) and, for an administrator, the settings of that access in the form of a few choices instead of a file.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { PasswordInput } from "./components/PasswordInput";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminFile, adminSaveFile, adminStatus, endMySession, endOtherSessions, listMySessions, listTrustedPhones, removeTrustedPhone, remoteCheck, totpDisable, totpEnable, totpSetup, totpState,
  type RemoteCheck, type SessionRow, type TotpState, type TrustedPhone } from "./api";
import { askConfirm } from "./askConfirm";
import { AlarmSounds } from "./AlarmSounds";
import { PanicPhraseCard } from "./PanicPhraseCard";
import { RemoteAccessSetup } from "./RemoteAccessSetup";
import "./security.css";
import { errorText } from "./apiErrorText";
import { changeSecurityOptions, readSecurityOptions, type SecurityOptionsState } from "./api/security";
import type { SecurityOptions } from "./capabilities";
import { useCapabilities } from "./sessionContext";

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
      <label>{t("sec_2fa_password")}<PasswordInput t={t} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
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
      <label>{t("sec_2fa_password")}<PasswordInput t={t} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
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

/** How long the session of a trusted phone lasts, in hours: the range the server holds it to. */
export const TRUSTED_HOURS = { min: 1, max: 720 } as const;
export const trustedHoursValue = (text: string): number | undefined => {
  const trimmed = text.trim();
  if (!/^\d{1,4}$/.test(trimmed)) return undefined;
  const value = Number(trimmed);
  return value >= TRUSTED_HOURS.min && value <= TRUSTED_HOURS.max ? value : undefined;
};

/** The phones the person (or, for an administrator, everybody) registered as trusted, with the way to end each one. */
function TrustedPhones({ t, origin, isAdmin }: { t: (key: string) => string; origin: string; isAdmin: boolean }) {
  const [rows, setRows] = useState<TrustedPhone[] | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState({ text: "", bad: false });
  const load = useCallback(() => listTrustedPhones(origin, isAdmin).then(list => { setEnabled(list.enabled); setRows(list.devices); }).catch(() => undefined), [origin, isAdmin]);
  useEffect(() => { void load(); }, [load]);
  const end = async (row: TrustedPhone) => {
    if (!(await askConfirm(`${t("sec_tp_end")}: ${row.name}?`, t))) return;
    try { await removeTrustedPhone(origin, row.id); setMessage({ text: t("sec_tp_ended"), bad: false }); await load(); } catch (error) { setMessage({ text: explain(t, error), bad: true }); }
  };
  if (!rows || (!enabled && rows.length === 0)) return null;
  return <article className="stack-card sec-card" data-testid="security-trusted-phones">
    <h3>{t("sec_tp_title")}</h3>
    <p className="muted">{t(enabled ? "sec_tp_help" : "sec_tp_off")}</p>
    {rows.length === 0 && <p className="muted">{t("sec_tp_none")}</p>}
    <ul className="plain-list">{rows.map(row => <li key={row.id}>
      <b>{row.name}</b>{isAdmin && row.username ? ` (${row.username})` : ""} · {t("sec_tp_added")} {new Date(row.created_at).toLocaleDateString()} · {t("sec_tp_used")} {row.last_used_at ? new Date(row.last_used_at).toLocaleString() : "-"}
      {" "}<button onClick={() => void end(row)}>{t("sec_tp_end")}</button>
    </li>)}</ul>
    <Message message={message} />
  </article>;
}

/** The hours a trusted phone's session lasts (only where the server announces the option). */
function TrustedHours({ t, state, apply, busy }: { t: (key: string) => string; state: SecurityOptionsState; apply: (change: Partial<SecurityOptions>, raising: boolean) => Promise<boolean>; busy: boolean }) {
  const current = state.settings["client.trusted_session_h"];
  const [typed, setTyped] = useState<string | null>(null);
  const shown = typed ?? String(current ?? "");
  const value = trustedHoursValue(shown);
  const locked = state.locked.includes("client.trusted_session_h");
  return <fieldset className="sec-option" data-testid="security-trusted-hours" disabled={busy || locked}>
    <legend>{t("sec_tp_hours")}</legend>
    <p className="muted">{t("sec_tp_hours_help")}</p>
    <form onSubmit={event => { event.preventDefault(); if (value !== undefined && value !== current) void apply({ "client.trusted_session_h": value }, false).then(done => { if (done) setTyped(null); }); }}>
      <input inputMode="numeric" value={shown} aria-invalid={value === undefined} data-testid="security-trusted-hours-input" onChange={event => setTyped(event.target.value.replace(/\D/g, ""))} />
      <span className="muted">{fill(t("sec_rep_range"), { min: TRUSTED_HOURS.min, max: TRUSTED_HOURS.max })}</span>
      {value === undefined && <p className="notice bad" role="alert">{t("sec_rep_invalid")}</p>}
      <button className="primary" disabled={busy || value === undefined}>{t("sec_rep_save")}</button>
    </form>
  </fieldset>;
}

type OptionKey = Exclude<keyof SecurityOptions, "capture.on_alarm_per_min" | "voice.panic_cooldown_s" | "voice.turn_max_bytes" | "voice.reply_audio_max_bytes" | "vision.service_url" | "vision.service_token_set" | "summary.log_days" | "summary.reading_every_s" | "summary.power_every_s" | "summary.false_alarm_s" | "reports.timeout_s" | "reports.queue_max" | "reports.requests_per_minute" | "client.trusted_session_h" | "media.retention_snapshot_days" | "media.retention_recording_days" | "vision.timeline_days" | "vision.semantic_search" | "vision.plates" | "vision.faces" | "vision.semantic_search_ack" | "vision.plates_ack" | "vision.faces_ack">;
/** How each option is offered: its words (`sec_opt_<id>`), its values from the safest to the least safe (the last is the one that gets the warning), and the environment variable that can fix it. */
const OPTIONS: Array<{ key: OptionKey; id: string; values: Array<string | boolean>; fixedBy?: string; node?: boolean; calm?: boolean; optional?: boolean }> = [
  { key: "alarm.disarm_pin", id: "pin", values: ["always", "if_set", "never"], fixedBy: "ARMOR_DISARM_PIN", node: true },
  { key: "voice.silence_confirmation", id: "voice", values: ["challenge", "double_turn", "pin", "off"] },
  { key: "alarm.arming_modes", id: "modes", values: [false, true], calm: true, optional: true },
  { key: "alarm.mode_downgrade_pin", id: "modepin", values: ["required", "not_required"], optional: true },
  { key: "alarm.mode_schedule", id: "modesched", values: [false, true], calm: true, optional: true },
  { key: "alarm.mode_schedule_lowers", id: "modelower", values: [false, true], optional: true },
  { key: "alarm.mode_panel_sync", id: "panelsync", values: [false, true], calm: true, optional: true },
  { key: "alarm.config_hash", id: "hash", values: [true, false], node: true },
  { key: "alarm.siren_fault_notice", id: "sirenfault", values: [true, false] },
  { key: "server.zone_feed", id: "feed", values: [true, false], node: true },
  { key: "server.zone_feed_signature", id: "sign", values: [true, false], node: true },
  { key: "media.rtsp_proxy", id: "rtsp", values: [true, false] },
  { key: "network.login_secure_only", id: "netlogin", values: [true, false] },
  { key: "session.rotate_id", id: "rotateid", values: [true, false], calm: true, optional: true },   // off by default; hardening, so only turning it off asks first
  { key: "capture.on_alarm", id: "captalarm", values: [false, true], optional: true },   // off by default; on makes the cameras record by themselves at every alarm, so it asks first
  { key: "live.events", id: "livenotices", values: [true, false], calm: true, optional: true },   // on by default; turning it off only makes the consoles ask more often
  { key: "vacation.mode", id: "vacation", values: [false, true], calm: true, optional: true },   // off by default; on lets lights switch by themselves on a schedule while the house is armed away
  { key: "commands.require_sig", id: "cmdsig", values: [true, false], calm: true, optional: true },   // off by default; hardening, so only turning it off from on asks first
  { key: "admin.backup", id: "backup", values: [false, true], optional: true },   // off by default; on lets an administrator write a copy of the server data anywhere, so it asks first
  { key: "admin.firmware_rollout", id: "fwrollout", values: [false, true], calm: true, optional: true },   // off by default; it only makes an update gentler
  { key: "panel.preflight", id: "panelpreflight", values: [false, true], optional: true },   // off by default; on lets the account of a wall panel read the check before arming, so it asks first
  { key: "panel.camera_view", id: "panelcamera", values: [false, true], optional: true },   // off by default; on lets the account of a wall panel look at a camera, so it asks first
  { key: "electrical.load_shedding", id: "loadshed", values: [false, true], calm: true, optional: true },   // off by default; on lets the server switch off the listed devices, so it asks first
  { key: "electrical.balance", id: "balance", values: [false, true], calm: true, optional: true },   // off by default; it only reads and informs
  { key: "network.lan_ca", id: "lanca", values: [false, true], optional: true },   // off by default; on lets an administrator download the public certificate of the local CA, so it asks first
  { key: "vision.timeline", id: "vtimeline", values: [false, true], optional: true },   // off by default; on keeps a record of what the cameras saw, so it asks first
  { key: "network.public_access", id: "publicaccess", values: [false, true], optional: true },   // off by default; on lets the server take requests from outside the house, so it asks first
  { key: "login.country_alert", id: "country", values: [true, false] },
  { key: "electrical.set_aside_old_readings", id: "oldread", values: [true, false] },
  { key: "voice.mobile_turn", id: "mobilevoice", values: [false, true], optional: true },   // off by default; turning it on lets a phone listen with its microphone, so it asks first
  { key: "voice.wake_word", id: "wakeword", values: [false, true], optional: true },   // off by default; turning it on lets the wall panel listen for its word all the time, so it asks first
  { key: "voice.multipart_turn", id: "voiceturn", values: [false, true] },
  { key: "client.panic_gesture", id: "panicgesture", values: [false, true], calm: true, optional: true },   // off by default; on lets anybody holding a signed-in phone raise the silent alarm, so it asks first
  { key: "voice.panic_phrase", id: "panic", values: [true, false], calm: true, optional: true },   // off by default; turning it off lowers the safety, so it asks first
  { key: "admin.field_http", id: "fieldhttp", values: [false, true], optional: true },   // off by default; turning it on lets Studio ask the admin agent to open the server's port to the field network, so it asks first
  { key: "admin.acl_relays", id: "aclrelays", values: [false, true], optional: true },   // off by default; turning it on lets Studio ask the admin agent for two switches of the broker rules, so it asks first
  { key: "admin.require_masked_agent", id: "maskedagent", values: [true, false], calm: true, optional: true },   // off by default (an older helper keeps working); turning it off from on lowers the protection, so it asks first
  { key: "panel.live_events", id: "panellive", values: [false, true] },
  { key: "alarm_audio.spoken", id: "alspoken", values: [false, true], calm: true },
  { key: "alarm_audio.custom_sounds", id: "alsounds", values: [false, true], calm: true },
  { key: "metrics.prometheus", id: "metrics", values: [false, true], optional: true },
  { key: "heartbeat.enabled", id: "heartbeat", values: [false, true], optional: true },
  { key: "ingest.recording", id: "recording", values: [false, true], optional: true },   // off by default; on keeps a copy of the node traffic on the server, so it asks first
  { key: "summary.daily", id: "dailysummary", values: [false, true], optional: true },
  { key: "vision.heatmap", id: "heatmap", values: [false, true], optional: true },
  { key: "vision.activity_events", id: "actevents", values: [true, false], optional: true },   // on by default; turning it off stops the alarms of the alert zones, so it asks first
  { key: "vision.service_remote", id: "visionremote", values: [false, true], optional: true },
  { key: "client.device_lock", id: "lock", values: ["always", "sensitive", "user"], calm: true },
  { key: "client.trusted_devices", id: "trusted", values: [false, true], optional: true },   // off by default; on gives a registered phone a longer session, so it asks first
  { key: "nodes.nvs_encryption", id: "nvs", values: ["secrets", "off"], node: true, calm: true },
];
const valueName = (t: (key: string) => string, id: string, value: string | boolean) => typeof value === "boolean" ? t(value ? "sec_opt_on" : "sec_opt_off") : t(`sec_opt_${id}_${value}`);
/** The options an administrator turns on and off: only where the server announced them. Lowering one asks first; the one the environment fixes cannot be moved from here. */
export const isLowering = (values: Array<string | boolean>, from: string | boolean | undefined, to: string | boolean): boolean => values.indexOf(to) > values.indexOf(from ?? values[0]!);

/** The two sizes of a spoken turn: the ranges the server holds them to (its own ceilings). */
export const VOICE_LIMITS = {
  "voice.turn_max_bytes": { min: 3_200, max: 1_920_000, id: "turn" },
  "voice.reply_audio_max_bytes": { min: 3_200, max: 1_000_000, id: "reply" },
  "voice.panic_cooldown_s": { min: 10, max: 3_600, id: "panic" },
} as const;
type VoiceLimitKey = keyof typeof VOICE_LIMITS;
/** The whole number a field holds, or undefined when it is not a whole number inside the range of that limit. */
export function voiceLimitValue(key: VoiceLimitKey, text: string): number | undefined {
  const trimmed = text.trim();
  if (!/^\d{1,9}$/.test(trimmed)) return undefined;
  const value = Number(trimmed);
  return value >= VOICE_LIMITS[key].min && value <= VOICE_LIMITS[key].max ? value : undefined;
}
/** The three limits of the summary of a day and the heat map: the ranges the server holds them to. They tune how much work the reports may cause; they protect nothing, so raising one asks nothing. */
export const REPORT_LIMITS = {
  "reports.timeout_s": { min: 5, max: 120, id: "timeout" },
  "reports.queue_max": { min: 1, max: 10, id: "queue" },
  "reports.requests_per_minute": { min: 1, max: 300, id: "rate" },
  "summary.log_days": { min: 1, max: 90, id: "logdays" },
  "summary.reading_every_s": { min: 10, max: 3600, id: "readingevery" },
  "summary.power_every_s": { min: 5, max: 3600, id: "powerevery" },
  "summary.false_alarm_s": { min: 0, max: 600, id: "falsealarm" },
} as const;
type ReportLimitKey = keyof typeof REPORT_LIMITS;
/** The whole number a field holds, or undefined when it is not a whole number inside the range of that limit. */
export function reportLimitValue(key: ReportLimitKey, text: string): number | undefined {
  const trimmed = text.trim();
  if (!/^\d{1,4}$/.test(trimmed)) return undefined;
  const value = Number(trimmed);
  return value >= REPORT_LIMITS[key].min && value <= REPORT_LIMITS[key].max ? value : undefined;
}
/** The address of the live vision service as the server accepts it: empty (not set up) or an http or https origin with no sign-in, path or query in it, at most 100 characters. Undefined when it is not. */
export function visionServiceUrlValue(text: string): string | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return "";
  if (trimmed.length > 100 || /\s/.test(trimmed)) return undefined;
  try {
    const url = new URL(trimmed);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "") || !url.hostname || /[?#]$/.test(trimmed)) return undefined;
  } catch { return undefined; }
  return trimmed;
}
/** Whether the token for the vision service would go in clear to another machine: the service may be remote, the server holds a token for it and the address is plain http on a host that is not this one (the server refuses to save it; this says so before). */
export function visionTokenInClear(remote: boolean, tokenHeld: boolean, text: string): boolean {
  if (!remote || !tokenHeld) return false;
  const value = visionServiceUrlValue(text);
  if (!value) return false;
  const url = new URL(value);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  return url.protocol === "http:" && !(host === "localhost" || host === "::1" || /^127(\.\d{1,3}){3}$/.test(host));
}
const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));

/** The sizes of a spoken turn, as numbers an administrator types; the server refuses what is outside its ceilings and the field says so before it asks. */
function VoiceLimits({ t, state, apply, busy }: { t: (key: string) => string; state: SecurityOptionsState; apply: (change: Partial<SecurityOptions>, raising: boolean) => Promise<boolean>; busy: boolean }) {
  const keys = (Object.keys(VOICE_LIMITS) as VoiceLimitKey[]).filter(key => typeof state.settings[key] === "number");   // an older server announces only the ones it has
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [invalid, setInvalid] = useState(false);
  const shown = (key: VoiceLimitKey) => typed[key] ?? String(state.settings[key] ?? "");
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const change: Record<string, number> = {};
    let raising = false;
    for (const key of keys) {
      const value = voiceLimitValue(key, shown(key));
      if (value === undefined) { setInvalid(true); return; }
      if (value !== state.settings[key]) { change[key] = value; if (value > Number(state.settings[key]) && key !== "voice.panic_cooldown_s") raising = true; }
    }
    setInvalid(false);
    if (!Object.keys(change).length) return;
    if (await apply(change as Partial<SecurityOptions>, raising)) setTyped({});
  };
  const locked = state.locked.some(key => keys.includes(key as VoiceLimitKey));
  return <fieldset className="sec-option" data-testid="security-voice-limits" disabled={busy || locked}>
    <legend>{t("sec_voice_title")}</legend>
    <p className="muted">{t("sec_voice_help")}</p>
    <form onSubmit={event => void save(event)}>
      {keys.map(key => {
        const limit = VOICE_LIMITS[key], value = voiceLimitValue(key, shown(key));
        return <label key={key}>{t(`sec_voice_${limit.id}`)}
          <input inputMode="numeric" value={shown(key)} aria-invalid={value === undefined} data-testid={`security-voice-${limit.id}`} onChange={event => { setInvalid(false); setTyped(current => ({ ...current, [key]: event.target.value.replace(/\D/g, "") })); }} />
          <span className="muted">{fill(t("sec_voice_range"), { min: limit.min, max: limit.max })}{value !== undefined && limit.id === "turn" ? ` - ${fill(t("sec_voice_seconds"), { seconds: Math.round(value / 32_000) })}` : ""}</span>
        </label>;
      })}
      {invalid && <p className="notice bad" role="alert" data-testid="security-voice-invalid">{t("sec_voice_invalid")}</p>}
      <p className="muted">{t("sec_voice_warn")}</p>
      <button className="primary" disabled={busy}>{t("sec_voice_save")}</button>
    </form>
  </fieldset>;
}

/** The limits of the two reports, as numbers an administrator types; the field says so before it asks when one is outside the range. */
function ReportLimits({ t, state, apply, busy }: { t: (key: string) => string; state: SecurityOptionsState; apply: (change: Partial<SecurityOptions>, raising: boolean) => Promise<boolean>; busy: boolean }) {
  const keys = (Object.keys(REPORT_LIMITS) as ReportLimitKey[]).filter(key => typeof state.settings[key] === "number");   // an older server announces only the ones it has
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [invalid, setInvalid] = useState(false);
  const shown = (key: ReportLimitKey) => typed[key] ?? String(state.settings[key] ?? "");
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const change: Record<string, number> = {};
    for (const key of keys) {
      const value = reportLimitValue(key, shown(key));
      if (value === undefined) { setInvalid(true); return; }
      if (value !== state.settings[key]) change[key] = value;
    }
    setInvalid(false);
    if (!Object.keys(change).length) return;
    if (await apply(change as Partial<SecurityOptions>, false)) setTyped({});
  };
  const locked = state.locked.some(key => keys.includes(key as ReportLimitKey));
  return <fieldset className="sec-option" data-testid="security-report-limits" disabled={busy || locked}>
    <legend>{t("sec_rep_title")}</legend>
    <p className="muted">{t("sec_rep_help")}</p>
    <form onSubmit={event => void save(event)}>
      {keys.map(key => {
        const limit = REPORT_LIMITS[key], value = reportLimitValue(key, shown(key));
        return <label key={key}>{t(`sec_rep_${limit.id}`)}
          <input inputMode="numeric" value={shown(key)} aria-invalid={value === undefined} data-testid={`security-report-${limit.id}`} onChange={event => { setInvalid(false); setTyped(current => ({ ...current, [key]: event.target.value.replace(/\D/g, "") })); }} />
          <span className="muted">{fill(t("sec_rep_range"), { min: limit.min, max: limit.max })}</span>
        </label>;
      })}
      {invalid && <p className="notice bad" role="alert" data-testid="security-report-invalid">{t("sec_rep_invalid")}</p>}
      <button className="primary" disabled={busy}>{t("sec_rep_save")}</button>
    </form>
  </fieldset>;
}

/** Where the heat map is asked: the address of the live vision service. Pointing at a machine that is not this one needs the switch below it, and the server says so when it is not on. */
function VisionService({ t, state, apply, busy }: { t: (key: string) => string; state: SecurityOptionsState; apply: (change: Partial<SecurityOptions>, raising: boolean) => Promise<boolean>; busy: boolean }) {
  const [typed, setTyped] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const shown = typed ?? String(state.settings["vision.service_url"] ?? "");
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const value = visionServiceUrlValue(shown);
    if (value === undefined) { setInvalid(true); return; }
    setInvalid(false);
    if (value === state.settings["vision.service_url"]) return;
    if (visionTokenInClear(state.settings["vision.service_remote"] === true, state.settings["vision.service_token_set"] === true, value)) return;   // the warning is on the screen; the server would refuse it too
    if (await apply({ "vision.service_url": value } as Partial<SecurityOptions>, false)) setTyped(null);
  };
  const locked = state.locked.includes("vision.service_url");
  return <fieldset className="sec-option" data-testid="security-vision-service" disabled={busy || locked}>
    <legend>{t("sec_vis_title")}</legend>
    <p className="muted">{t("sec_vis_help")}</p>
    <form onSubmit={event => void save(event)}>
      <label>{t("sec_vis_url")}
        <input value={shown} placeholder="http://127.0.0.1:8765" maxLength={100} aria-invalid={visionServiceUrlValue(shown) === undefined} data-testid="security-vision-url" onChange={event => { setInvalid(false); setTyped(event.target.value); }} />
      </label>
      {typeof state.settings["vision.service_token_set"] === "boolean" && <p className="muted" data-testid="security-vision-token">{t(state.settings["vision.service_token_set"] ? "sec_vis_token_yes" : "sec_vis_token_no")}</p>}
      {invalid && <p className="notice bad" role="alert" data-testid="security-vision-invalid">{t("sec_vis_invalid")}</p>}
      {visionTokenInClear(state.settings["vision.service_remote"] === true, state.settings["vision.service_token_set"] === true, shown) && <p className="notice bad" role="alert" data-testid="security-vision-https">{t("sec_vis_https")}</p>}
      <button className="primary" disabled={busy}>{t("sec_vis_save")}</button>
    </form>
  </fieldset>;
}

/** The three features of ARMOR-VISION that read personal data: off, each needs the privacy notice read (a tick) before it can be turned on, and turning it off takes the tick back. */
export const VISION_PERSONAL = [
  { feature: "semantic_search", id: "semantic_search" },
  { feature: "plates", id: "plates" },
  { feature: "faces", id: "faces" },
] as const;
function VisionPersonal({ t, state, apply, busy }: { t: (key: string) => string; state: SecurityOptionsState; apply: (change: Partial<SecurityOptions>, raising: boolean, confirmText?: string) => Promise<boolean>; busy: boolean }) {
  const [read, setRead] = useState<Record<string, boolean>>({});
  return <fieldset className="sec-option" data-testid="security-vision-personal" disabled={busy}>
    <legend>{t("sec_vp_title")}</legend>
    <p className="muted">{t("sec_vp_help")}</p>
    {VISION_PERSONAL.map(({ feature, id }) => {
      const on = state.settings[`vision.${feature}`] === true;
      const ticked = on || read[feature] === true;
      return <div key={feature} className="sec-vp" data-testid={`security-vp-${id}`}>
        <h4>{t(`sec_vp_${id}`)} - {t(on ? "sec_vp_state_on" : "sec_vp_state_off")}</h4>
        <p className="muted">{t(`sec_vp_${id}_notice`)}</p>
        {!on && <label><input type="checkbox" checked={ticked} data-testid={`security-vp-${id}-ack`} onChange={event => setRead({ ...read, [feature]: event.target.checked })} /> {t("sec_vp_ack")}</label>}
        {!on && !ticked && <p className="muted">{t("sec_vp_need_ack")}</p>}
        <button className={on ? "" : "primary"} disabled={busy || (!on && !ticked)} data-testid={`security-vp-${id}-toggle`}
          onClick={() => { void apply({ [`vision.${feature}`]: !on, [`vision.${feature}_ack`]: !on } as Partial<SecurityOptions>, !on, `${t("sec_vp_confirm")} ${t(`sec_vp_${id}`)}`).then(() => setRead({ ...read, [feature]: false })); }}>{t(on ? "sec_vp_turn_off" : "sec_vp_turn_on")}</button>
      </div>;
    })}
  </fieldset>;
}

/** The days photos and recordings are kept, each kind on its own: 0 to 3650, 0 meaning the general limit of the server. */
export const RETENTION_LIMITS = {
  "media.retention_snapshot_days": { min: 0, max: 3650, id: "snapshot" },
  "media.retention_recording_days": { min: 0, max: 3650, id: "recording" },
  "vision.timeline_days": { min: 1, max: 3650, id: "timeline" },
} as const;
type RetentionKey = keyof typeof RETENTION_LIMITS;
/** The whole number of days a field holds, or undefined when it is not one inside the range. */
export function retentionValue(key: RetentionKey, text: string): number | undefined {
  const trimmed = text.trim();
  if (!/^\d{1,4}$/.test(trimmed)) return undefined;
  const value = Number(trimmed);
  return value >= RETENTION_LIMITS[key].min && value <= RETENTION_LIMITS[key].max ? value : undefined;
}
function RetentionLimits({ t, state, apply, busy }: { t: (key: string) => string; state: SecurityOptionsState; apply: (change: Partial<SecurityOptions>, raising: boolean) => Promise<boolean>; busy: boolean }) {
  const keys = (Object.keys(RETENTION_LIMITS) as RetentionKey[]).filter(key => typeof state.settings[key] === "number");
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [invalid, setInvalid] = useState(false);
  const shown = (key: RetentionKey) => typed[key] ?? String(state.settings[key] ?? "");
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const change: Record<string, number> = {};
    for (const key of keys) {
      const value = retentionValue(key, shown(key));
      if (value === undefined) { setInvalid(true); return; }
      if (value !== state.settings[key]) change[key] = value;
    }
    setInvalid(false);
    if (!Object.keys(change).length) return;
    if (await apply(change as Partial<SecurityOptions>, false)) setTyped({});
  };
  const locked = state.locked.some(key => keys.includes(key as RetentionKey));
  return <fieldset className="sec-option" data-testid="security-retention" disabled={busy || locked}>
    <legend>{t("sec_ret_title")}</legend>
    <p className="muted">{t("sec_ret_help")}</p>
    <form onSubmit={event => void save(event)}>
      {keys.map(key => {
        const limit = RETENTION_LIMITS[key], value = retentionValue(key, shown(key));
        return <label key={key}>{t(`sec_ret_${limit.id}`)}
          <input inputMode="numeric" value={shown(key)} aria-invalid={value === undefined} data-testid={`security-retention-${limit.id}`} onChange={event => { setInvalid(false); setTyped(current => ({ ...current, [key]: event.target.value.replace(/\D/g, "") })); }} />
          <span className="muted">{fill(t("sec_rep_range"), { min: limit.min, max: limit.max })}</span>
        </label>;
      })}
      {invalid && <p className="notice bad" role="alert">{t("sec_rep_invalid")}</p>}
      <button className="primary" disabled={busy}>{t("sec_rep_save")}</button>
    </form>
  </fieldset>;
}

function ServerOptions({ t, origin }: { t: (key: string) => string; origin: string }) {
  const [state, setState] = useState<SecurityOptionsState | null>(null);
  const [message, setMessage] = useState({ text: "", bad: false });
  const [busy, setBusy] = useState(false);
  useEffect(() => { let live = true; void readSecurityOptions(origin).then(value => { if (live) setState(value); }, error => { if (live) setMessage({ text: explain(t, error), bad: true }); }); return () => { live = false; }; }, [origin, t]);
  const change = async (option: (typeof OPTIONS)[number], value: string | boolean) => {
    if (!state || busy) return;
    if (isLowering(option.values, state.settings[option.key], value) && !(await askConfirm(`${t("sec_opt_confirm")} ${t(`sec_opt_${option.id}`)} - ${valueName(t, option.id, value)}
${t(`sec_opt_${option.id}_warn`)}`, t))) return;
    setBusy(true);
    try { setState(await changeSecurityOptions(origin, { [option.key]: value })); setMessage({ text: t("sec_opt_saved"), bad: false }); }
    catch (error) { setMessage({ text: errorText(t, error, "sec_err_"), bad: true }); }
    finally { setBusy(false); }
  };
  const applyLimits = async (change: Partial<SecurityOptions>, raising: boolean, confirmText?: string): Promise<boolean> => {
    if (busy) return false;
    if (raising && !(await askConfirm(confirmText ?? `${t("sec_voice_confirm")}\n${t("sec_voice_warn")}`, t))) return false;
    setBusy(true);
    try { setState(await changeSecurityOptions(origin, change)); setMessage({ text: t("sec_opt_saved"), bad: false }); return true; }
    catch (error) { setMessage({ text: errorText(t, error, "sec_err_"), bad: true }); return false; }
    finally { setBusy(false); }
  };
  if (!state) return message.text ? <Message message={message} /> : null;
  return <article className="stack-card sec-card" data-testid="security-options">
    <h3>{t("sec_group_options")}</h3>
    <p className="muted">{t("sec_opt_help")}</p>
    <div className="sec-options-grid" data-testid="security-options-grid">
    {OPTIONS.filter(option => !option.optional || state.settings[option.key] !== undefined).map(option => {
      const current = state.settings[option.key];
      const fixed = state.locked.includes(option.key);
      const lowest = option.values[option.values.length - 1];
      return <fieldset key={option.key} className="sec-option" data-testid={`security-option-${option.id}`} disabled={busy || fixed}>
        <legend>{t(`sec_opt_${option.id}`)}</legend>
        <p className="muted" id={`sec-opt-help-${option.id}`}>{t(`sec_opt_${option.id}_help`)}</p>
        <select aria-describedby={`sec-opt-help-${option.id}`} aria-label={t(`sec_opt_${option.id}`)} value={String(current)} onChange={event => { const picked = option.values.find(value => String(value) === event.target.value); if (picked !== undefined) void change(option, picked); }}>
          {option.values.map(value => <option key={String(value)} value={String(value)}>{valueName(t, option.id, value)}</option>)}
        </select>
        {current === lowest && !option.calm && <p className="notice bad" role="alert" data-testid={`security-option-${option.id}-warning`}>{t(`sec_opt_${option.id}_warn`)}</p>}
        {fixed && <p className="muted">{t("sec_opt_fixed").replace("ARMOR_DISARM_PIN", option.fixedBy ?? "ARMOR_DISARM_PIN")}</p>}
      </fieldset>;
    })}
    {typeof state.settings["alarm_audio.custom_sounds"] === "boolean" && <AlarmSounds t={t} origin={origin} spokenOn={state.settings["alarm_audio.spoken"] === true} customOn={state.settings["alarm_audio.custom_sounds"]} />}
    {typeof state.settings["voice.turn_max_bytes"] === "number" && <VoiceLimits t={t} state={state} apply={applyLimits} busy={busy} />}
    {(typeof state.settings["media.retention_snapshot_days"] === "number" || typeof state.settings["vision.timeline_days"] === "number") && <RetentionLimits t={t} state={state} apply={applyLimits} busy={busy} />}
    {typeof state.settings["vision.semantic_search"] === "boolean" && <VisionPersonal t={t} state={state} apply={applyLimits} busy={busy} />}
    {state.settings["network.lan_ca"] === true && <p><a href={`${origin}/api/v1/security/lan-ca`} download="armor-lan-ca.crt" data-testid="security-lanca-download">{t("sec_lanca_download")}</a></p>}
    {typeof state.settings["vision.service_url"] === "string" && <VisionService t={t} state={state} apply={applyLimits} busy={busy} />}
    {state.settings["client.trusted_devices"] === true && typeof state.settings["client.trusted_session_h"] === "number" && <TrustedHours t={t} state={state} apply={applyLimits} busy={busy} />}
    {typeof state.settings["reports.timeout_s"] === "number" && <ReportLimits t={t} state={state} apply={applyLimits} busy={busy} />}
    </div>
    <p className="muted">{t("sec_opt_node_pending")}</p>
    <Message message={message} />
  </article>;
}

export function SecurityPanel({ t, origin, isAdmin }: Props) {
  // Offered only when the server says it has them (an older server has no such route) and the person is allowed.
  const capabilities = useCapabilities();
  const offersOptions = isAdmin && capabilities.can("security_settings") && capabilities.has("security_settings");
  return <div className="sec-page" data-testid="security-panel">
    <div className="panel-heading"><h3>{t("sec_title")}</h3><p className="muted">{t("sec_help")}</p></div>
    <section className="sec-section" data-testid="security-group-account">
      <h4 className="sec-section-title">{t("sec_group_account")}</h4>
      <div className="sec-row"><SecondFactor t={t} origin={origin} /><Sessions t={t} origin={origin} /><TrustedPhones t={t} origin={origin} isAdmin={isAdmin} /><PanicPhraseCard t={t} origin={origin} /></div>
    </section>
    <section className="sec-section" data-testid="security-group-server">
      <h4 className="sec-section-title">{t("sec_group_server")}</h4>
      <div className="sec-row"><RemoteCheckCard t={t} origin={origin} />{isAdmin && <RemoteSettings t={t} origin={origin} />}</div>
    </section>
    {offersOptions && <section className="sec-section" data-testid="security-group-options"><h4 className="sec-section-title">{t("sec_group_options")}</h4><div className="sec-row"><ServerOptions t={t} origin={origin} /></div></section>}
    {isAdmin && <RemoteAccessSetup t={t} origin={origin} />}
  </div>;
}

export { KEYS as REMOTE_SETTING_KEYS };
