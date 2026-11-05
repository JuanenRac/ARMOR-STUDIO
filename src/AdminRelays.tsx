/**
 * Configuration > MQTT broker > Switches of the broker rules: the two lines of the broker rules that no install turns on - the server writing orders to the batteries of one solar node,
 * and the server publishing again, signed, the state of the alarm panels - opened or closed from here. They are off until an administrator turns on the security option
 * "admin.acl_relays"; every change then takes two confirmations (the question, and the name of what changes typed again) and the one-time code of the authenticator, which the admin
 * agent checks. The code is typed here, used for one call and forgotten.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useState } from "react";
import { adminRelays, adminSetRelay, ApiError, type AdminRelayKind, type RelaysState } from "./api";
import { askConfirm } from "./askConfirm";

type Translate = (key: string) => string;

const NODE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/** What the administrator is about to change, and the name they must type to agree. */
export type RelayChange = { kind: AdminRelayKind; node: string; state: "on" | "off" };
export const confirmTarget = (change: RelayChange): string => (change.kind === "battery-write" ? change.node : "alarm-state-relay");
/** The change is ready to send: a node that is a node (for the batteries), the code of six digits, and the name typed exactly. */
export const relayReady = (change: RelayChange, typed: string, code: string): boolean =>
  (change.kind === "alarm-state-relay" || NODE.test(change.node)) && /^\d{6}$/.test(code) && typed === confirmTarget(change);

const explain = (t: Translate, error: unknown): string => {
  const code = error instanceof ApiError ? error.code : "generic";
  const text = t(`adm_err_${code}`);
  return text === `adm_err_${code}` ? t("adm_err_generic") : text;
};

export function RelaysCard({ t, origin }: { t: Translate; origin: string }) {
  const [state, setState] = useState<RelaysState | null>(null);
  const [node, setNode] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<RelayChange | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad: boolean }>({ text: "", bad: false });
  const reload = useCallback(() => { void adminRelays(origin).then(setState, error => { setState(null); setMessage({ text: explain(t, error), bad: true }); }); }, [origin]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(reload, [reload]);
  if (!state) return message.text ? <article className="stack-card adm-card"><h3>{t("adm_relays")}</h3><p className="notice bad" role="status">{message.text}</p></article> : null;
  if (!state.enabled) return <article className="stack-card adm-card" data-testid="relays-off"><h3>{t("adm_relays")}</h3><p className="muted">{t("adm_relays_off")}</p></article>;

  const begin = async (kind: AdminRelayKind, target: "on" | "off") => {
    const change: RelayChange = { kind, node: kind === "battery-write" ? node : "", state: target };
    if (kind === "battery-write" && !NODE.test(node)) { setMessage({ text: t("adm_err_invalid_node_id"), bad: true }); return; }
    if (!(await askConfirm(t(kind === "battery-write" ? "adm_relays_ask_battery" : "adm_relays_ask_alarm").replace("{node}", node).replace("{state}", t(target === "on" ? "adm_relays_open" : "adm_relays_close")), t))) return;
    setTyped(""); setMessage({ text: "", bad: false }); setPending(change);
  };
  const send = async () => {
    if (!pending || !relayReady(pending, typed, code)) return;
    setBusy(true);
    try {
      const done = await adminSetRelay(origin, pending.kind, { node: pending.node || undefined, state: pending.state, confirmText: typed }, code);
      setState({ ...state, ...done, enabled: true });
      setMessage({ text: t("adm_relays_done"), bad: false });
    } catch (error) { setMessage({ text: explain(t, error), bad: true }); }
    finally { setBusy(false); setPending(null); setTyped(""); setCode(""); }
  };
  const batteryNodes = state.battery_write ?? [];
  return <article className="stack-card adm-card" data-testid="relays-on"><h3>{t("adm_relays")}</h3><p className="muted">{t("adm_relays_help")}</p>
    {state.approval === "not_enrolled" && <p className="notice bad" role="note">{t("adm_err_totp_not_enrolled")}</p>}
    <label className="adm-secret-field">{t("adm_totp")}
      <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} />
      <small className="hint">{t("adm_totp_help")}</small></label>
    <h4>{t("adm_relays_battery")}</h4>
    <p className="muted">{t("adm_relays_battery_help")}</p>
    <ul className="adm-list">{batteryNodes.length === 0 ? <li className="muted">{t("adm_relays_none")}</li> : batteryNodes.map(item => <li key={item} className="adm-account">
      <div className="adm-service-main"><strong className="mono">{item}</strong><small>{t("adm_relays_state_open")}</small></div>
      <button disabled={busy} onClick={() => { setNode(item); void begin("battery-write", "off").catch(() => undefined); }}>{t("adm_relays_close")}</button></li>)}</ul>
    <div className="adm-form">
      <label>{t("adm_relays_node")}<input value={node} onChange={event => setNode(event.target.value.toLowerCase())} placeholder="solar-1" autoComplete="off" /></label>
      <button disabled={busy || !NODE.test(node)} onClick={() => void begin("battery-write", "on")}>{t("adm_relays_open")}</button>
    </div>
    <h4>{t("adm_relays_alarm")}</h4>
    <p className="muted">{t("adm_relays_alarm_help")}</p>
    <div className="adm-service-main"><small>{t(state.alarm_state_relay ? "adm_relays_state_open" : "adm_relays_state_closed")}</small></div>
    <div className="adm-foot">
      <button disabled={busy || state.alarm_state_relay === true} onClick={() => void begin("alarm-state-relay", "on")}>{t("adm_relays_open")}</button>
      <button disabled={busy || state.alarm_state_relay !== true} onClick={() => void begin("alarm-state-relay", "off")}>{t("adm_relays_close")}</button>
    </div>
    {message.text && <p className={`notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p>}
    {pending && <div className="notice bad adm-secret" role="alertdialog" aria-label={t("adm_relays")} data-testid="relays-pending">
      <label>{t("adm_relays_type").replace("{target}", confirmTarget(pending))}
        <input data-testid="relays-typed" value={typed} onChange={event => setTyped(event.target.value)} autoComplete="off" /></label>
      {!/^\d{6}$/.test(code) && <small className="hint">{t("adm_totp_missing")}</small>}
      <div className="adm-foot">
        <button onClick={() => { setPending(null); setTyped(""); }}>{t("cancelAction")}</button>
        <button className="danger" data-testid="relays-send" disabled={busy || !relayReady(pending, typed, code)} onClick={() => void send()}>{t("adm_relays_send")}</button>
      </div></div>}
  </article>;
}
