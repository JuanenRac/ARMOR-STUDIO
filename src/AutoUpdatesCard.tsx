/**
 * Configuration > Updates > Automatic security updates: the switch, what the machine does when an update needs a reboot (never by itself, or only inside a window of the night and
 * when nothing is armed), the window, what was applied, how the services were after the last run, and which keys the helper trusts for the packages. The work is the maintenance
 * helper's; this card only shows its state and sends the changes.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useState } from "react";
import { changeAutoUpdates, readAutoUpdates, type AutoUpdates, type AutoUpdatesChange } from "./api";
import { explainMaintenance } from "./UpdatesPanel";

type Props = { t: (key: string) => string; origin: string; signatureMode?: string; fingerprints?: string[] };

export function AutoUpdatesCard({ t, origin, signatureMode, fingerprints }: Props) {
  const [state, setState] = useState<AutoUpdates | null>(null);
  const [draft, setDraft] = useState<AutoUpdatesChange>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    readAutoUpdates(origin).then(found => { if (!cancelled) setState(found); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [origin]);
  if (!state) return null;
  const settings = { ...state.settings, ...draft };
  const dirty = Object.keys(draft).length > 0;
  const send = async (change: AutoUpdatesChange) => {
    setBusy(true); setMessage("");
    try { const next = await changeAutoUpdates(origin, change); setState(next); setDraft({}); setMessage(t("mt_au_saved")); }
    catch (error) { setMessage(explainMaintenance(t, error)); }
    finally { setBusy(false); }
  };
  const note = state.reboot_required && state.reboot_note ? t(`mt_au_note_${state.reboot_note}`) : "";
  return <article className="stack-card mt-auto">
    <h3>{t("mt_au_title")}</h3>
    <p className="muted">{t("mt_au_help")}</p>
    {!state.package && <p className="notice">{t("mt_au_nopackage")}</p>}
    <label className="check"><input type="checkbox" checked={settings.enabled} disabled={busy} onChange={event => void send({ enabled: event.target.checked })} /> {t("mt_au_enabled")}</label>
    <fieldset disabled={busy || !settings.enabled}>
      <legend>{t("mt_au_reboot")}</legend>
      <label className="check"><input type="radio" name="au-reboot" checked={settings.reboot === "never"} onChange={() => setDraft({ ...draft, reboot: "never" })} /> {t("mt_au_reboot_never")}</label>
      <label className="check"><input type="radio" name="au-reboot" checked={settings.reboot === "disarmed"} onChange={() => setDraft({ ...draft, reboot: "disarmed" })} /> {t("mt_au_reboot_disarmed")}</label>
      <div className="mt-buttons">
        <span>{t("mt_au_window")}</span>
        <label>{t("mt_au_from")} <input type="time" value={settings.window_start} onChange={event => setDraft({ ...draft, window_start: event.target.value })} /></label>
        <label>{t("mt_au_to")} <input type="time" value={settings.window_end} onChange={event => setDraft({ ...draft, window_end: event.target.value })} /></label>
        <button className="primary" disabled={!dirty || busy} onClick={() => void send(draft)}>{t("mt_au_save")}</button>
      </div>
    </fieldset>
    {message && <p className="muted" role="status">{message}</p>}
    {state.reboot_required && <p className="notice">{t("mt_au_reboot_required")} {note}</p>}
    {state.health.checked !== undefined && (state.health.ok
      ? <p className="muted">{t("mt_au_health_ok")}</p>
      : <p className="notice" role="alert">{t("mt_au_health_down")} {(state.health.down ?? []).join(", ")}</p>)}
    <h4>{t("mt_au_applied")}</h4>
    {state.applied.length === 0 ? <p className="muted">{t("mt_au_none")}</p>
      : <ul className="mt-history">{state.applied.map(run => <li key={run.at} className={run.state === "failed" ? "failed" : "done"}><span>{run.at}</span><span>{run.packages.join(", ")}</span></li>)}</ul>}
    {signatureMode !== undefined && <>
      <h4>{t("mt_sig_title")}</h4>
      <p className="muted">{t(signatureMode === "either" ? "mt_sig_mode_either" : "mt_sig_mode_manifest")}</p>
      {fingerprints && fingerprints.length > 0 && <p className="muted">{t("mt_sig_keys")} <code>{fingerprints.join("  ")}</code></p>}
    </>}
  </article>;
}
