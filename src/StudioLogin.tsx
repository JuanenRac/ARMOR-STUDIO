import { useState, type FormEvent } from "react";
import { openStudioSession } from "./api";

type Props = { origin: string; onAuthenticated: (origin: string) => void };

/** The Studio session also authorises the operator's camera workspace. */
export function StudioLogin({ origin: initialOrigin, onAuthenticated }: Props) {
  const [origin, setOrigin] = useState(initialOrigin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const normalized = new URL(origin).origin;
      await openStudioSession(normalized, username.trim(), password);
      // The password is never put in browser storage. The server returned an
      // HttpOnly cookie which the application cannot read.
      window.localStorage.setItem("armor-studio-origin", normalized);
      setPassword(""); onAuthenticated(normalized);
    } catch { setNotice("No se pudo iniciar sesión. Revisa servidor, usuario y contraseña."); }
    finally { setBusy(false); }
  };
  return <main className="studio-login-shell"><form className="studio-login-card" onSubmit={event => void submit(event)}>
    <div className="login-orbit"><span>A</span></div><p className="eyebrow">AUTONOMOUS RADAR & MULTIMODAL OBSERVATION RANGE</p>
    <h1>A.R.M.O.R. Studio</h1><p>Acceso de operador local</p>
    <label>Servidor<input value={origin} onChange={event => setOrigin(event.target.value)} inputMode="url" autoComplete="url" required /></label>
    <label>Usuario<input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required /></label>
    <label>Contraseña<input value={password} onChange={event => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></label>
    <button className="primary" disabled={busy}>{busy ? "Verificando…" : "Entrar a Studio"}</button>
    {notice && <p className="login-notice" role="alert">{notice}</p>}
    <small>La contraseña sólo se envía al servidor para crear una sesión HttpOnly temporal. Las funciones de cámara se habilitan durante esta sesión; no se solicita ni almacena un token adicional.</small>
  </form></main>;
}
