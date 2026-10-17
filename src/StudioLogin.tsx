import { useState, type FormEvent } from "react";
import { openStudioSession } from "./api";
import { LANGUAGES, type LanguageCode } from "./domain";
import { text } from "./i18n";
import { parseStudioSettings, SETTINGS_KEY } from "./settings";

type Props = { origin: string; onAuthenticated: (origin: string) => void };

/**
 * The language of the screens that show before anybody is signed in: the one this browser remembers from the last session, else the one the browser itself asks for, else English.
 * (They used to be in Spanish whatever the language of the person was.)
 */
export function loginLanguage(): LanguageCode {
  try {
    const saved = parseStudioSettings(window.localStorage.getItem(SETTINGS_KEY)).language;
    if (saved) return saved;
  } catch { /* Storage may be blocked. */ }
  const asked = typeof navigator === "undefined" ? [] : [...(navigator.languages ?? []), navigator.language];
  for (const tag of asked) {
    const code = String(tag ?? "").toLowerCase().split("-")[0];
    const match = LANGUAGES.find(language => language.code === code);
    if (match) return match.code;
  }
  return "en";
}

/** The Studio session also authorises the operator's camera workspace. */
export function StudioLogin({ origin: initialOrigin, onAuthenticated }: Props) {
  const [origin, setOrigin] = useState(initialOrigin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const t = (key: string) => text(loginLanguage(), key);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const normalized = new URL(origin).origin;
      await openStudioSession(normalized, username.trim(), password);
      // The password is never put in browser storage. The server returned an
      // HttpOnly cookie which the application cannot read.
      try { window.localStorage.setItem("armor-studio-origin", normalized); } catch { /* Storage may be blocked: the session is open all the same. */ }
      setPassword(""); onAuthenticated(normalized);
    } catch { setNotice(t("login_failed")); }
    finally { setBusy(false); }
  };
  return <main className="studio-login-shell"><form className="studio-login-card" onSubmit={event => void submit(event)}>
    <div className="login-orbit"><span>A</span></div><p className="eyebrow">AUTONOMOUS RADAR & MULTIMODAL OBSERVATION RANGE</p>
    <h1>A.R.M.O.R. Studio</h1><p>{t("login_title")}</p>
    <label>{t("login_server")}<input value={origin} onChange={event => setOrigin(event.target.value)} inputMode="url" autoComplete="url" required /></label>
    <label>{t("login_user")}<input data-testid="login-user" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required /></label>
    <label>{t("login_password")}<input data-testid="login-password" value={password} onChange={event => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></label>
    <button className="primary" data-testid="login-submit" disabled={busy}>{busy ? t("login_busy") : t("login_enter")}</button>
    {notice && <p className="login-notice" role="alert">{notice}</p>}
    <small>{t("login_note")}</small>
  </form></main>;
}
