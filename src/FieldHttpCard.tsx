/**
 * Configuration > MQTT broker > Field network over HTTP: the one switch of the host firewall that Studio may ask for - whether the field network may also reach the server's port over
 * HTTP, for the nodes that report without the broker (Studio's own port is never opened to it). Off until an administrator turns on the security option "admin.field_http"; every
 * change then takes two confirmations (the question, and the word typed again) and the one-time code of the authenticator, which the admin agent checks. The code is typed here,
 * used for one call and forgotten.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useState } from "react";
import { adminFirewall, adminSetFieldHttp, ApiError, type FirewallState } from "./api";
import { askConfirm } from "./askConfirm";

type Translate = (key: string) => string;

/** The word the administrator must type again to agree. */
export const FIELD_HTTP_WORD = "field-http";
/** The change is ready to send: the code of six digits and the word typed exactly. */
export const fieldHttpReady = (typed: string, code: string): boolean => /^\d{6}$/.test(code) && typed === FIELD_HTTP_WORD;

const explain = (t: Translate, error: unknown): string => {
  const code = error instanceof ApiError ? error.code : "generic";
  const text = t(`adm_err_${code}`);
  return text === `adm_err_${code}` ? t("adm_err_generic") : text;
};

export function FieldHttpCard({ t, origin }: { t: Translate; origin: string }) {
  const [state, setState] = useState<FirewallState | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<"on" | "off" | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad: boolean }>({ text: "", bad: false });
  const reload = useCallback(() => { void adminFirewall(origin).then(setState, error => { setState(null); setMessage({ text: explain(t, error), bad: true }); }); }, [origin]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(reload, [reload]);
  if (!state) return message.text ? <article className="stack-card adm-card"><h3>{t("adm_fhttp")}</h3><p className="notice bad" role="status">{message.text}</p></article> : null;
  if (!state.enabled) return <article className="stack-card adm-card" data-testid="fhttp-off"><h3>{t("adm_fhttp")}</h3><p className="muted">{t("adm_fhttp_off")}</p></article>;

  const begin = async (target: "on" | "off") => {
    if (!(await askConfirm(t("adm_fhttp_ask").replace("{state}", t(target === "on" ? "adm_relays_open" : "adm_relays_close")), t))) return;
    setTyped(""); setMessage({ text: "", bad: false }); setPending(target);
  };
  const send = async () => {
    if (!pending || !fieldHttpReady(typed, code)) return;
    setBusy(true);
    try {
      const done = await adminSetFieldHttp(origin, { state: pending, confirmText: typed }, code);
      setState({ ...state, ...done, enabled: true });
      setMessage({ text: t("adm_fhttp_done"), bad: false });
    } catch (error) { setMessage({ text: explain(t, error), bad: true }); }
    finally { setBusy(false); setPending(null); setTyped(""); setCode(""); }
  };
  const open = state.field_http === true;
  return <article className="stack-card adm-card" data-testid="fhttp-on"><h3>{t("adm_fhttp")}</h3><p className="muted">{t("adm_fhttp_help")}</p>
    {state.installed === false && <p className="notice" role="note">{t("adm_fhttp_missing")}</p>}
    {state.approval === "not_enrolled" && <p className="notice bad" role="note">{t("adm_err_totp_not_enrolled")}</p>}
    <label className="adm-secret-field">{t("adm_totp")}
      <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} />
      <small className="hint">{t("adm_totp_help")}</small></label>
    <div className="adm-service-main"><small>{t(open ? "adm_relays_state_open" : "adm_relays_state_closed")}</small></div>
    <div className="adm-foot">
      <button disabled={busy || state.installed === false || open} onClick={() => void begin("on")}>{t("adm_relays_open")}</button>
      <button disabled={busy || state.installed === false || !open} onClick={() => void begin("off")}>{t("adm_relays_close")}</button>
    </div>
    {message.text && <p className={`notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p>}
    {pending && <div className="notice bad adm-secret" role="alertdialog" aria-label={t("adm_fhttp")} data-testid="fhttp-pending">
      <label>{t("adm_relays_type").replace("{target}", FIELD_HTTP_WORD)}
        <input data-testid="fhttp-typed" value={typed} onChange={event => setTyped(event.target.value)} autoComplete="off" /></label>
      {!/^\d{6}$/.test(code) && <small className="hint">{t("adm_totp_missing")}</small>}
      <div className="adm-foot">
        <button onClick={() => { setPending(null); setTyped(""); }}>{t("cancelAction")}</button>
        <button className="danger" data-testid="fhttp-send" disabled={busy || !fieldHttpReady(typed, code)} onClick={() => void send()}>{t("adm_relays_send")}</button>
      </div></div>}
  </article>;
}
