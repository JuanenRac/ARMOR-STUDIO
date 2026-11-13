/**
 * Configuration > MQTT broker > Local authority of the LAN: orders the admin agent to make the local authority and the certificate of the machine's address, to renew the certificate or to
 * replace the authority, and warns when either is near its end. Off until the security option "network.lan_ca" is on; every order takes a confirmation, the word typed again and the
 * one-time code of the authenticator, which the admin agent checks. The code is typed here, used for one call and forgotten; no key is ever shown.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useState } from "react";
import { adminLanCa, adminLanCaOrder, ApiError, type LanCaState } from "./api";
import { askConfirm } from "./askConfirm";

type Translate = (key: string) => string;
export const LAN_CA_WORD = "lan-ca";
/** A private IPv4 address written as four numbers (the agent and the server check it again). */
export const lanCaAddressOk = (text: string): boolean => /^\d{1,3}(\.\d{1,3}){3}$/.test(text) && text.split(".").every(part => Number(part) <= 255);
/** The order is ready to send: the address, the code of six digits and the word typed exactly. */
export const lanCaReady = (ip: string, typed: string, code: string): boolean => lanCaAddressOk(ip) && /^\d{6}$/.test(code) && typed === LAN_CA_WORD;

const explain = (t: Translate, error: unknown): string => {
  const code = error instanceof ApiError ? error.code : "generic";
  const text = t(`adm_err_${code}`);
  return text === `adm_err_${code}` ? t("adm_err_generic") : text;
};
const line = (t: Translate, label: string, part: LanCaState["authority"]) => `${t(label)}: ${part ? t("lanca_days").replace("{days}", String(part.days_left)) : t("lanca_none")}`;

export function LanCaCard({ t, origin }: { t: Translate; origin: string }) {
  const [state, setState] = useState<LanCaState | null>(null);
  const [ip, setIp] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<"setup" | "renew" | "rotate" | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad: boolean }>({ text: "", bad: false });
  const reload = useCallback(() => { void adminLanCa(origin).then(setState, error => { setState(null); setMessage({ text: explain(t, error), bad: true }); }); }, [origin]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(reload, [reload]);
  if (!state) return message.text ? <article className="stack-card adm-card"><h3>{t("lanca_title")}</h3><p className="notice bad" role="status">{message.text}</p></article> : null;
  if (!state.enabled) return <article className="stack-card adm-card" data-testid="lanca-off"><h3>{t("lanca_title")}</h3><p className="muted">{t("lanca_off")}</p></article>;

  const begin = async (target: "setup" | "renew" | "rotate") => {
    if (!lanCaAddressOk(ip)) return;
    const question = t("lanca_ask") + (target === "rotate" ? ` ${t("lanca_rotate_warn")}` : "");
    if (!(await askConfirm(question, t))) return;
    setTyped(""); setMessage({ text: "", bad: false }); setPending(target);
  };
  const send = async () => {
    if (!pending || !lanCaReady(ip, typed, code)) return;
    setBusy(true);
    try {
      const done = await adminLanCaOrder(origin, { action: pending, ip, confirmText: typed }, code);
      setState({ ...state, ...done, enabled: true });
      setMessage({ text: t("lanca_done") + (done.devices_must_reinstall ? ` ${t("lanca_rotate_warn")}` : ""), bad: false });
    } catch (error) { setMessage({ text: explain(t, error), bad: true }); }
    finally { setBusy(false); setPending(null); setTyped(""); setCode(""); }
  };
  return <article className="stack-card adm-card" data-testid="lanca-on"><h3>{t("lanca_title")}</h3><p className="muted">{t("lanca_help")}</p>
    {state.installed === false && <p className="notice" role="note">{t("lanca_missing")}</p>}
    {state.approval === "not_enrolled" && <p className="notice bad" role="note">{t("adm_err_totp_not_enrolled")}</p>}
    <div className="adm-service-main"><small data-testid="lanca-authority">{line(t, "lanca_authority", state.authority)}</small><small data-testid="lanca-certificate">{line(t, "lanca_certificate", state.certificate)}</small></div>
    {(state.expiring?.length ?? 0) > 0 && <p className="notice bad" role="alert" data-testid="lanca-expiring">{t("lanca_expiring")}</p>}
    <label className="adm-secret-field">{t("lanca_ip")}
      <input inputMode="decimal" autoComplete="off" placeholder="192.168.0.180" value={ip} onChange={event => setIp(event.target.value.trim())} /></label>
    <label className="adm-secret-field">{t("adm_totp")}
      <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} />
      <small className="hint">{t("adm_totp_help")}</small></label>
    <div className="adm-foot">
      <button disabled={busy || state.installed === false || !lanCaAddressOk(ip)} onClick={() => void begin("setup")}>{t("lanca_setup")}</button>
      <button disabled={busy || state.installed === false || !lanCaAddressOk(ip)} onClick={() => void begin("renew")}>{t("lanca_renew")}</button>
      <button disabled={busy || state.installed === false || !lanCaAddressOk(ip)} onClick={() => void begin("rotate")}>{t("lanca_rotate")}</button>
    </div>
    {message.text && <p className={`notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p>}
    {pending && <div className="notice bad adm-secret" role="alertdialog" aria-label={t("lanca_title")} data-testid="lanca-pending">
      <label>{t("adm_relays_type").replace("{target}", LAN_CA_WORD)}
        <input data-testid="lanca-typed" value={typed} onChange={event => setTyped(event.target.value)} autoComplete="off" /></label>
      {!/^\d{6}$/.test(code) && <small className="hint">{t("adm_totp_missing")}</small>}
      <div className="adm-foot">
        <button onClick={() => { setPending(null); setTyped(""); }}>{t("cancelAction")}</button>
        <button className="danger" data-testid="lanca-send" disabled={busy || !lanCaReady(ip, typed, code)} onClick={() => void send()}>{t("adm_relays_send")}</button>
      </div></div>}
  </article>;
}
