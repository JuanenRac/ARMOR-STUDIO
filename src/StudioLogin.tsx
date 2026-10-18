import { useState, type FormEvent } from "react";
import { ApiError, completeStudioSession, openStudioSession } from "./api";
import { LANGUAGES, type LanguageCode } from "./domain";
import { text } from "./i18n";
import { parseStudioSettings, SETTINGS_KEY } from "./settings";

type Props = { origin: string; onAuthenticated: (origin: string) => void };

/**
 * The language of the screens that show before anybody is signed in: the one this browser remembers from the last session, else the one the browser itself asks for, else English.
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

/** Where the "Remember me" tick keeps the user name (never the password) in this browser. */
export const REMEMBER_USER_KEY = "armor-studio-remember-user";

/** The user name this browser was asked to remember, or "" (storage may be blocked or empty). */
export function rememberedUser(): string {
  try { const saved = JSON.parse(window.localStorage.getItem(REMEMBER_USER_KEY) ?? "null") as { user?: unknown } | null; return typeof saved?.user === "string" ? saved.user : ""; }
  catch { return ""; }
}

/** Keeps the user name when `remember` is on, forgets it the moment it is off. The password is never written anywhere by Studio. */
export function storeRememberedUser(remember: boolean, user: string): void {
  try { if (remember && user) window.localStorage.setItem(REMEMBER_USER_KEY, JSON.stringify({ user })); else window.localStorage.removeItem(REMEMBER_USER_KEY); }
  catch { /* Storage may be blocked: the sign-in works all the same. */ }
}

/** The Studio session also authorises the operator's camera workspace. */
export function StudioLogin({ origin: initialOrigin, onAuthenticated }: Props) {
  const [origin, setOrigin] = useState(initialOrigin);
  const [username, setUsername] = useState(rememberedUser);
  const [remember, setRemember] = useState(() => rememberedUser() !== "");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  /** The challenge of the first step, when the account has the second factor on: the form then asks for the code. */
  const [challenge, setChallenge] = useState("");
  const [code, setCode] = useState("");
  const t = (key: string) => text(loginLanguage(), key);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const normalized = new URL(origin).origin;
      if (challenge) await completeStudioSession(normalized, challenge, code.trim());
      else {
        const step = await openStudioSession(normalized, username.trim(), password);
        if (!step.done) { setChallenge(step.challenge); setCode(""); setBusy(false); return; }
      }
      // The password is never put in browser storage. The server returned an
      // HttpOnly cookie which the application cannot read.
      storeRememberedUser(remember, username.trim());
      try { window.localStorage.setItem("armor-studio-origin", normalized); } catch { /* Storage may be blocked: the session is open all the same. */ }
      setPassword(""); setChallenge(""); setCode(""); onAuthenticated(normalized);
    } catch (error) {
      const known = error instanceof ApiError ? `sec_err_${error.code}` : "";
      if (error instanceof ApiError && error.code === "totp_setup_required") setNotice(t("login_totp_setup_required"));
      else if (error instanceof ApiError && error.code === "challenge_expired") { setChallenge(""); setNotice(t("sec_err_challenge_expired")); }
      else if (known && t(known) !== known) setNotice(t(known));
      else setNotice(t("login_failed"));
    }
    finally { setBusy(false); }
  };
  return <main className="studio-login-shell"><form className="studio-login-card" id="studio-login-form" name="studio-login" method="post" action="#" onSubmit={event => void submit(event)}>
    <div className="login-orbit"><span>A</span></div><p className="eyebrow">AUTONOMOUS RADAR & MULTIMODAL OBSERVATION RANGE</p>
    <h1>A.R.M.O.R. Studio</h1><p>{t("login_title")}</p>
    {challenge ? <>
      <h2>{t("login_totp_title")}</h2><p>{t("login_totp_help")}</p>
      <input type="text" name="username" id="studio-login-user-kept" value={username.trim()} autoComplete="username" readOnly hidden />
      <label>{t("login_totp_code")}<input data-testid="login-code" name="otp" id="studio-login-code" value={code} onChange={event => setCode(event.target.value)} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]*" maxLength={12} autoFocus required /></label>
      <button className="primary" data-testid="login-code-submit" disabled={busy}>{busy ? t("login_busy") : t("login_totp_enter")}</button>
      {notice && <p className="login-notice" role="alert">{notice}</p>}
    </> : <>
    <label>{t("login_server")}<input name="server" id="studio-login-server" value={origin} onChange={event => setOrigin(event.target.value)} inputMode="url" autoComplete="url" required /></label>
    <label>{t("login_user")}<input data-testid="login-user" name="username" id="studio-login-user" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required /></label>
    <label>{t("login_password")}<input data-testid="login-password" name="password" id="studio-login-password" value={password} onChange={event => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></label>
    <label className="login-remember"><input type="checkbox" name="remember" id="studio-login-remember" data-testid="login-remember" checked={remember} onChange={event => { setRemember(event.target.checked); if (!event.target.checked) storeRememberedUser(false, ""); }} />{t("login_remember")}</label>
    <button className="primary" data-testid="login-submit" disabled={busy}>{busy ? t("login_busy") : t("login_enter")}</button>
    {notice && <p className="login-notice" role="alert">{notice}</p>}
    </>}
    <small>{t("login_note")}</small>
    {!challenge && <small data-testid="login-pm-note">{t("login_pm_note")}</small>}
  </form></main>;
}
