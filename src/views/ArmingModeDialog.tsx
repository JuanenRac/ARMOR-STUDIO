/**
 * The dialog that arms the system in a mode (Away, Home or Night), switches between them, or disarms. It only exists while the server has the arming modes on. A mode that defends nothing
 * asks to be confirmed (the server answers `no_zones_assigned`), and a change to a mode that defends less than the one in force asks for the PIN, like a disarm (the server answers with a
 * PIN error and the dialog asks; it never guesses which change lowers the defence). Disarming has its own PIN dialog and keeps its way.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState, type ReactNode } from "react";
import "./arming-modes.css";
import { ApiError, setArmingMode, type ArmedMode, type ArmingModesState } from "../api";
import type { SystemState } from "../types";
import { useDialogFocus } from "../components/useDialogFocus";
import { PasswordInput } from "../components/PasswordInput";
import type { Translate } from "../components/camera";
import { ARMED_MODES, defendedCount, modeName } from "../armingModesModel";

type Props = {
  t: Translate; origin: string; modes: ArmingModesState; armed: boolean;
  /** The server accepted the change: the new state of the perimeter and the mode. */
  onDone: (state: SystemState, mode: ArmedMode) => void;
  /** The person chose to disarm: the caller asks for the PIN the way it always did. */
  onDisarm: () => void; cancel: () => void;
  /** The check before arming from disarmed (the same one a plain arm shows); given the callbacks to continue or stop. */
  preflight?: (confirm: () => void, cancel: () => void) => ReactNode;
};
type Stage = { kind: "pick" } | { kind: "preflight"; mode: ArmedMode } | { kind: "confirm"; mode: ArmedMode } | { kind: "pin"; mode: ArmedMode; wrong?: string };

export function ArmingModeDialog({ t, origin, modes, armed, onDone, onDisarm, cancel, preflight }: Props) {
  const dialog = useDialogFocus<HTMLDivElement>(cancel);
  const [stage, setStage] = useState<Stage>({ kind: "pick" });
  const [pin, setPin] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = modes.current;
  const empty = (mode: ArmedMode) => mode !== "away" && modes.unassigned.includes(mode);

  const attempt = async (mode: ArmedMode, options: { pin?: string; confirmUnassigned?: boolean }) => {
    setBusy(true); setError("");
    try { onDone(await setArmingMode(origin, mode, options), mode); }
    catch (failure) {
      const code = failure instanceof ApiError ? failure.code : "";
      if (code === "no_zones_assigned") { setConfirmed(false); setStage({ kind: "confirm", mode }); }
      else if (code === "wrong_pin" || code === "pin_not_set" || code === "pin_locked") {
        if (options.pin === undefined && code === "wrong_pin") setStage({ kind: "pin", mode });
        else { setStage({ kind: "pin", mode, wrong: `mode_${code}` }); setPin(""); }
      } else if (code === "modes_disabled") setError(t("am_err_modes_disabled"));
      else setError(t("am_err_generic"));
    } finally { setBusy(false); }
  };
  const choose = (mode: ArmedMode) => {
    if (mode === current) return;
    if (!armed && preflight) setStage({ kind: "preflight", mode });
    else void attempt(mode, {});
  };
  if (stage.kind === "preflight") return <>{preflight?.(() => void attempt(stage.mode, {}), cancel)}</>;

  const target = "mode" in stage ? stage.mode : undefined;
  return <div className="modal-backdrop" role="presentation" onMouseDown={cancel}>
    <div ref={dialog.ref} onKeyDown={dialog.onKeyDown} className="about-dialog confirm-dialog am-dialog" role="alertdialog" aria-modal="true" aria-labelledby="am-title" onMouseDown={event => event.stopPropagation()} data-testid="arming-mode-dialog">
      {stage.kind === "pick" && <>
        <h2 id="am-title">{t("am_dialog_title")}</h2>
        <p className="muted">{t("am_dialog_now").replace("{0}", modeName(current, t))}</p>
        <p>{t("am_dialog_help")}</p>
        <div className="am-choices">
          {ARMED_MODES.filter(mode => modes.available.includes(mode)).map(mode => {
            const count = defendedCount(modes.modes, mode);
            const here = mode === current;
            return <button key={mode} type="button" className={`am-choice ${here ? "on" : ""}`} disabled={busy || here} aria-current={here ? "true" : undefined} data-testid={`arming-mode-${mode}`} onClick={() => choose(mode)}>
              <b>{here ? modeName(mode, t) : armed ? t("am_switch_to").replace("{0}", modeName(mode, t)) : t("am_arm_in").replace("{0}", modeName(mode, t))}</b>
              <small>{here ? t("am_current_mark") : count === "all" ? t("am_defends_all") : empty(mode) ? t("am_defends_none") : t("am_defends_n").replace("{0}", String(count))}</small>
            </button>;
          })}
        </div>
        {error && <p className="notice bad" role="alert">{error}</p>}
        <div className="confirm-actions">
          <button type="button" onClick={cancel}>{t("cancelAction")}</button>
          {armed && <button type="button" className="danger" disabled={busy} data-testid="arming-mode-disarm" onClick={onDisarm}>{t("am_disarm_button")}</button>}
        </div>
      </>}
      {stage.kind === "confirm" && target && <>
        <h2 id="am-title">{t("am_confirm_title").replace("{0}", modeName(target, t))}</h2>
        <p>{t("am_confirm_text").replace("{0}", modeName(target, t))}</p>
        <label className="am-check"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> {t("am_confirm_anyway")}</label>
        <div className="confirm-actions">
          <button type="button" onClick={cancel}>{t("cancelAction")}</button>
          <button type="button" className="danger" disabled={busy || !confirmed} data-testid="arming-mode-confirm" onClick={() => void attempt(target, { confirmUnassigned: true, ...(pin ? { pin } : {}) })}>{t("am_confirm_anyway")}</button>
        </div>
      </>}
      {stage.kind === "pin" && target && <form onSubmit={event => { event.preventDefault(); void attempt(target, { pin, ...(modes.unassigned.includes(target as "home" | "night") ? { confirmUnassigned: true } : {}) }); }}>
        <h2 id="am-title">{t("am_pin_title")}</h2>
        <p>{t("am_pin_text").replace("{0}", modeName(target, t))}</p>
        <label className="pin-field">{t("pinLabel")}<PasswordInput t={t} inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={pin} autoFocus placeholder={t("pinPlaceholder")} onChange={event => setPin(event.target.value.replace(/[^0-9]/g, ""))} /></label>
        {stage.wrong && <p className="notice bad" role="alert">{t(stage.wrong)}</p>}
        <div className="confirm-actions">
          <button type="button" onClick={cancel}>{t("cancelAction")}</button>
          <button type="submit" className="danger" disabled={busy || !pin} data-testid="arming-mode-pin-go">{t("am_arm_in").replace("{0}", modeName(target, t))}</button>
        </div>
      </form>}
    </div>
  </div>;
}
