/**
 * The new proof of identity that critical actions ask for when the session came from outside the house: the server answers `elevation_required`, this dialog asks for the password (or a code
 * of the app), `POST /api/v1/studio/elevate` makes the session good for a few minutes, and the action that was refused is tried again by itself. Mounted once in the app.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { PasswordInput } from "./components/PasswordInput";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, elevateSession, setElevationAsker } from "./api";
import { useDialogFocus } from "./components/useDialogFocus";
import { DialogLogo } from "./menuLogos";

type Translate = (key: string) => string;
type Request = { origin: string; resolve: (proved: boolean) => void };

export function ElevationHost({ t }: { t: Translate }) {
  const [request, setRequest] = useState<Request | null>(null);
  useEffect(() => {
    setElevationAsker(origin => new Promise<boolean>(resolve => setRequest(current => { current?.resolve(false); return { origin, resolve }; })));
    return () => setElevationAsker(null);
  }, []);
  if (request === null) return null;
  return <ElevationDialog t={t} origin={request.origin} done={proved => { request.resolve(proved); setRequest(null); }} />;
}

export function ElevationDialog({ t, origin, done }: { t: Translate; origin: string; done: (proved: boolean) => void }) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useDialogFocus<HTMLFormElement>();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      await elevateSession(origin, code.trim() ? { code: code.trim() } : { password });
      done(true);
    } catch (error) {
      const key = `sec_err_${error instanceof ApiError ? error.code : "generic"}`;
      setMessage(t(key) === key ? t("sec_err_generic") : t(key));
      setBusy(false);
    }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={() => done(false)} onKeyDown={event => { if (event.key === "Escape") done(false); }}>
    <form ref={dialog.ref} onKeyDown={dialog.onKeyDown} className="about-dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="elev-title" aria-describedby="elev-text"
      onMouseDown={event => event.stopPropagation()} onSubmit={event => void submit(event)} data-testid="elevation-dialog">
      <h2 id="elev-title"><DialogLogo kind="configuration" />{t("sec_elev_title")}</h2>
      <p id="elev-text">{t("sec_elev_help")}</p>
      <label>{t("sec_elev_password")}<PasswordInput t={t} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} autoFocus /></label>
      <label>{t("sec_elev_code")}<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value)} /></label>
      {message && <p className="login-notice" role="alert">{message}</p>}
      <div className="confirm-actions">
        <button type="button" onClick={() => done(false)}>{t("cancelAction")}</button>
        <button className="primary" disabled={busy || (password === "" && code.trim() === "")}>{t("sec_elev_ok")}</button>
      </div>
    </form>
  </div>;
}
