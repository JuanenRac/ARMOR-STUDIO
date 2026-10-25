/**
 * The address of the panel of a node, to be said by hand: the server reaches the panel of a node (to configure it from anywhere, through /api/v1/nodes/<id>/panel/) only at an address an administrator
 * registered, and the link "open the panel" uses it before the one the node told. For a node whose address changed, or that has not told it, this is the way to fix it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState, type FormEvent } from "react";
import { ApiError, saveNodePanel } from "../api";
import type { Translate } from "../components/camera";
import { useDialogFocus } from "../components/useDialogFocus";

/** An IPv4 address of the local network, as the server accepts it. */
export const PRIVATE_IPV4 = /^(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/;
export const validAddress = (text: string): boolean => PRIVATE_IPV4.test(text) && text.split(".").every(part => Number(part) <= 255 && String(Number(part)) === part);
export const validPort = (text: string): boolean => /^\d{1,5}$/.test(text) && Number(text) >= 1 && Number(text) <= 65535;

export function NodeAddressDialog({ t, origin, id, address, port, close, saved }: { t: Translate; origin: string; id: string; address: string; port: number; close: () => void; saved: () => void }) {
  const dialog = useDialogFocus<HTMLFormElement>();
  const [ip, setIp] = useState(address);
  const [portText, setPortText] = useState(String(port));
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const ok = validAddress(ip.trim()) && validPort(portText.trim());
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    setProblem("");
    try {
      await saveNodePanel(origin, { id: id.toLowerCase(), address: ip.trim(), scheme: "http", port: Number(portText.trim()) });
      saved();
    } catch (error) {
      setProblem(error instanceof ApiError && error.status === 403 ? t("rn_address_denied") : t("rn_address_failed"));
    } finally { setBusy(false); }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={close} onKeyDown={event => { if (event.key === "Escape") close(); }}>
    <form ref={dialog.ref} onKeyDown={dialog.onKeyDown} className="about-dialog confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="addr-title" onMouseDown={event => event.stopPropagation()} onSubmit={event => void submit(event)}>
      <h2 id="addr-title">{t("rn_address_title")} · {id}</h2>
      <p className="muted small">{t("rn_address_help")}</p>
      <label>{t("rn_address_ip")}<input value={ip} onChange={event => setIp(event.target.value)} inputMode="decimal" autoComplete="off" placeholder="192.168.0.221" autoFocus aria-invalid={ip !== "" && !validAddress(ip.trim())} /></label>
      <label>{t("rn_address_port")}<input value={portText} onChange={event => setPortText(event.target.value)} inputMode="numeric" autoComplete="off" maxLength={5} aria-invalid={portText !== "" && !validPort(portText.trim())} /></label>
      {ip !== "" && !validAddress(ip.trim()) && <p className="solar-notice bad" role="alert">{t("rn_address_invalid")}</p>}
      {problem && <p className="solar-notice bad" role="alert">{problem}</p>}
      <div className="confirm-actions">
        <button type="button" onClick={close}>{t("cancelAction")}</button>
        <button type="submit" className="primary" disabled={!ok || busy}>{busy ? "…" : t("confirmAction")}</button>
      </div>
    </form>
  </div>;
}
