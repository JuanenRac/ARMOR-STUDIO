/**
 * The code of the administrator's authenticator, asked in the page as a promise: `const code = await askTotp(t)` gives the six digits, or null when the person gave up. The maintenance
 * agent asks for it on the changes that can lock the house out or give its way in away (peers of the VPN, putting a previous version back, refreshing the dynamic DNS name).
 * The dialog is drawn by <TotpHost/>, mounted once in the app, and the code is only handed on: it is not kept.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useState } from "react";
import { useDialogFocus } from "./components/useDialogFocus";

type Translate = (key: string) => string;
type Request = { t: Translate; wrong: boolean; resolve: (code: string | null) => void };

let show: ((request: Request | null) => void) | null = null;

/** Asks for the code; `wrong` says that the last one was refused. Null when nobody can ask (no host mounted) or the person cancelled. */
export function askTotp(t: Translate, wrong = false): Promise<string | null> {
  return new Promise<string | null>(resolve => {
    if (show === null) { resolve(null); return; }
    show({ t, wrong, resolve });
  });
}

export function TotpHost() {
  const [request, setRequest] = useState<Request | null>(null);
  useEffect(() => {
    show = setRequest;
    return () => { show = null; };
  }, []);
  if (request === null) return null;
  return <TotpDialog key={request.wrong ? "again" : "first"} request={request} done={code => { request.resolve(code); setRequest(null); }} />;
}

function TotpDialog({ request, done }: { request: Request; done: (code: string | null) => void }) {
  const { t, wrong } = request;
  const [code, setCode] = useState("");
  const dialog = useDialogFocus<HTMLFormElement>();
  const ready = /^\d{6}$/.test(code);
  return <div className="modal-backdrop" role="presentation" onMouseDown={() => done(null)} onKeyDown={event => { if (event.key === "Escape") done(null); }}>
    <form ref={dialog.ref} onKeyDown={dialog.onKeyDown} className="about-dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="totp-title" aria-describedby="totp-text"
      onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); if (ready) done(code); }}>
      <h2 id="totp-title">{t("totp_ask_title")}</h2>
      <p id="totp-text">{t("totp_ask_text")}</p>
      {wrong && <p className="notice bad" role="alert">{t("adm_err_totp_invalid")}</p>}
      <label className="pin-field">{t("totp_ask_label")}<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} autoFocus data-testid="totp-code"
        onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label>
      <div className="confirm-actions">
        <button type="button" onClick={() => done(null)}>{t("cancelAction")}</button>
        <button type="submit" className="primary" disabled={!ready}>{t("totp_ask_confirm")}</button>
      </div>
    </form>
  </div>;
}
