/**
 * The settings of one node that are kept in the node itself and that Studio sets from a screen: today, how many wrong passwords per minute the node lets through before it locks sign-in
 * (system.login_limit_per_minute: 30 by default, 0 for no limit, at most 120). The server reads and writes it through the node's own panel with the login given here, which is used once and
 * never kept; the value takes effect in the node at once, without a restart. Administrators only.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState, type FormEvent } from "react";
import { adminNodeSettings, ApiError } from "../api";
import type { Translate } from "../components/camera";
import { PasswordInput } from "../components/PasswordInput";
import { useDialogFocus } from "../components/useDialogFocus";
import { DialogLogo } from "../menuLogos";
import { fillAll } from "../nodeHealthModel";

export const LOGIN_LIMIT_MAX = 120;

/** The number typed for the limit (whole, 0 to 120), or null when it is not one. */
export function parseLoginLimit(text: string): number | null {
  const clean = text.trim();
  if (!/^\d{1,3}$/.test(clean)) return null;
  const value = Number(clean);
  return value <= LOGIN_LIMIT_MAX ? value : null;
}

/** The key of the text for a reason the node's panel gave, or the generic one. */
export const whyKey = (why: string): string => (["panel_login_refused", "panel_login_failed", "panel_not_reachable", "panel_config_refused", "setting_unknown"].includes(why) ? `ns_why_${why}` : "ns_err_generic");

export function NodeSettingsDialog({ t, origin, id, address, close }: { t: Translate; origin: string; id: string; address: string; close: () => void }) {
  const dialog = useDialogFocus<HTMLFormElement>();
  const [user, setUser] = useState("admin");
  const [password, setPassword] = useState("");
  const [limitText, setLimitText] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [done, setDone] = useState("");
  const limit = parseLoginLimit(limitText);
  const haveLogin = user.trim() !== "" && password !== "";
  const run = async (write: boolean) => {
    if (busy || !haveLogin || (write && limit === null)) return;
    setBusy(true); setProblem(""); setDone("");
    try {
      const reply = await adminNodeSettings(origin, { node_id: id.toLowerCase(), address, panel_user: user.trim(), panel_password: password, ...(write && limit !== null ? { login_limit_per_minute: limit } : {}) });
      setPassword("");
      if (!reply.ok) { setProblem(t(whyKey(reply.why))); return; }
      if (reply.login_limit_per_minute !== undefined) {
        setLimitText(String(reply.login_limit_per_minute));
        setDone(write ? fillAll(t("ns_saved"), String(reply.login_limit_per_minute)) : reply.login_limit_per_minute === 0 ? t("ns_current_off") : fillAll(t("ns_current"), String(reply.login_limit_per_minute)));
      }
    } catch (error) {
      setProblem(error instanceof ApiError && error.status === 403 ? t("ns_err_forbidden") : t("ns_err_generic"));
    } finally { setBusy(false); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); void run(true); };
  return <div className="modal-backdrop" role="presentation" onMouseDown={close} onKeyDown={event => { if (event.key === "Escape") close(); }}>
    <form ref={dialog.ref} onKeyDown={dialog.onKeyDown} className="about-dialog confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="ns-title" onMouseDown={event => event.stopPropagation()} onSubmit={submit}>
      <h2 id="ns-title"><DialogLogo kind="network" />{t("ns_title")} · {id}</h2>
      <p className="muted small">{t("ns_help")}</p>
      <label>{t("ns_user")}<input value={user} onChange={event => setUser(event.target.value)} autoComplete="off" autoFocus /></label>
      <label>{t("ns_password")}<PasswordInput t={t} value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" /></label>
      <label>{t("ns_limit")}<input value={limitText} onChange={event => setLimitText(event.target.value)} inputMode="numeric" maxLength={3} autoComplete="off" placeholder="30" aria-invalid={limitText !== "" && limit === null} /></label>
      <p className="muted small">{t("ns_limit_help")}</p>
      {problem && <p className="solar-notice bad" role="alert">{problem}</p>}
      {done && <p className="solar-notice" role="status">{done}</p>}
      <div className="confirm-actions">
        <button type="button" onClick={close}>{t("close")}</button>
        <button type="button" disabled={!haveLogin || busy} onClick={() => void run(false)}>{t("ns_read")}</button>
        <button type="submit" className="primary" disabled={!haveLogin || limit === null || busy}>{busy ? "…" : t("ns_save")}</button>
      </div>
    </form>
  </div>;
}
