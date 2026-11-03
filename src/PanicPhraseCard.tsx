/**
 * Configuration > Security: your own silent panic phrase. It raises the silent duress alarm when it is said or typed to the voice assistant (like the duress PIN) once an administrator
 * turns the option on. The password is asked to set or remove it; the phrase is sent once and is never shown again nor kept here: the field is emptied the moment the server answers.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useId, useState, type FormEvent } from "react";
import { PasswordInput } from "./components/PasswordInput";
import { setMyPanicPhrase } from "./api/users";
import { errorText } from "./apiErrorText";
import { askConfirm } from "./askConfirm";
import { panicPhraseProblem, panicPhraseReady } from "./panicPhrase";

export function PanicPhraseCard({ t, origin }: { t: (key: string) => string; origin: string }) {
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ text: "", bad: false });
  const [known, setKnown] = useState<boolean | null>(null);   // only what this visit did: the server never tells a client which phrase it holds
  const noteId = useId();
  const problem = panicPhraseProblem(phrase);
  const run = async (change: { phrase?: string; clear?: boolean }, done: string) => {
    setBusy(true); setMessage({ text: "", bad: false });
    try { await setMyPanicPhrase(origin, { currentPassword: password, ...change }); setKnown(!change.clear); setMessage({ text: t(done), bad: false }); }
    catch (error) { setMessage({ text: errorText(t, error, "pp_err_"), bad: true }); }
    finally { setBusy(false); setPhrase(""); setPassword(""); }   // the phrase and the password never stay in the screen
  };
  const save = (event: FormEvent) => { event.preventDefault(); if (panicPhraseReady(phrase) && password !== "" && !busy) void run({ phrase }, "pp_saved"); };
  const clear = async () => { if (password !== "" && !busy && await askConfirm(t("pp_clear_confirm"), t)) await run({ clear: true }, "pp_cleared"); };
  return <article className="stack-card sec-card" data-testid="security-panic-phrase">
    <h3>{t("pp_title")}</h3>
    <p className="muted">{t("pp_help")}</p>
    <p className="muted">{t("pp_rules")}</p>
    {known !== null && <p className="notice" role="status" data-testid="panic-phrase-state"><b>{t(known ? "pp_state_set" : "pp_state_none")}</b></p>}
    <form onSubmit={save}>
      <label>{t("pp_password")}<PasswordInput t={t} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
      <label>{t("pp_phrase")}<PasswordInput t={t} autoComplete="off" spellCheck={false} maxLength={240} value={phrase} aria-invalid={problem !== undefined} aria-describedby={problem ? noteId : undefined} data-testid="panic-phrase-input" onChange={event => setPhrase(event.target.value)} /></label>
      {problem && <p id={noteId} className="notice bad" role="alert" data-testid="panic-phrase-problem">{t(`pp_err_${problem}`)}</p>}
      <div className="users-actions">
        <button className="primary" disabled={busy || password === "" || !panicPhraseReady(phrase)}>{t("pp_save")}</button>
        <button type="button" disabled={busy || password === ""} onClick={() => void clear()}>{t("pp_clear")}</button>
      </div>
    </form>
    {message.text && <p className={`notice ${message.bad ? "bad" : ""}`} role="status" data-testid="panic-phrase-message">{message.text}</p>}
  </article>;
}
