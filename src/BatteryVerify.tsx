/**
 * The "Verify" panel of a high or odd figure of a battery (see solarVerify.ts): first it is read again; only what the maker documents can then be cleared in the battery, through the
 * same guided, confirmed and recorded operation as Configuration > Battery maintenance, with the server's switch that is off by default.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, batteryArm, batteryCancel, batteryCatalog, batteryExecute, batteryOperation, type BatteryCatalog, type BatteryOperation } from "./api";
import type { Translate } from "./components/camera";
import { fill } from "./FirmwarePanel";
import { errorKey, isActive, serialLooksRight } from "./batteryModel";
import { isLfp } from "./solarFaults";
import { counterLines } from "./solarModel";
import { SOLAR_THRESHOLDS, type SolarLevels } from "./solarThresholds";
import { checkLive, clearingFor, parseStatCounter, verdictOf, type LiveCheck, type VerifyTarget } from "./solarVerify";
import type { BatteryView } from "./solarTotals";

type Props = { t: Translate; origin: string; isAdmin: boolean; target: VerifyTarget; stack: BatteryView; levels: SolarLevels; close: () => void };

export function verifySubject(t: Translate, target: VerifyTarget): string {
  const where = `${t("solarModule")} ${target.module}`;
  if (target.kind === "counter") return `${where} · ${counterLines({ [target.counter]: target.value })[0]?.label} = ${target.value}`;
  if (target.kind === "soh") return `${where} · ${t("solarCellWord")} ${target.cell} · ${t("solarSoh")} = ${target.value}`;
  return `${where}${target.cell === undefined ? "" : ` · ${t("solarCellWord")} ${target.cell}`} · ${t(`solx_fault_${target.code}`)}`;
}

/** The new readings of a measured value: one check per reading that arrives after the panel opened. */
function LiveVerify({ t, target, stack, levels }: { t: Translate; target: Extract<VerifyTarget, { kind: "live" }>; stack: BatteryView; levels: SolarLevels }) {
  const seen = useRef(stack.received_at);
  const [checks, setChecks] = useState<LiveCheck[]>([]);
  const [timedOut, setTimedOut] = useState(false);
  const wanted = SOLAR_THRESHOLDS.verifySamples;
  useEffect(() => {
    if (stack.received_at === seen.current) return;
    seen.current = stack.received_at;
    const module = stack.reading.stack.find(item => item.n === target.module);
    const check = checkLive(target, module, levels, module ? isLfp(module, stack.registered?.model) : false);
    if (check) setChecks(current => (current.length >= wanted ? current : [...current, check]));
  }, [stack, target, levels, wanted]);
  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), SOLAR_THRESHOLDS.verifyTimeoutMs);
    return () => window.clearTimeout(timer);
  }, []);
  const verdict = verdictOf(checks, wanted, timedOut);
  return <div>
    <p role="status" aria-live="polite">{verdict === "pending" ? fill(t("solx_verify_reading"), checks.length, wanted) : t(`solx_verdict_${verdict}`)}</p>
    {checks.length > 0 && <ol className="solar-verify-reads">{checks.map((check, index) => <li key={index} className={check.bad ? "bad" : "ok"}>{check.bad ? "✖" : "✓"} {check.value === null ? "" : Number(check.value.toFixed(3))}</li>)}</ol>}
    <p className="muted small">{t("solx_verify_live_note")}</p>
  </div>;
}

/** Clearing the statistics of a battery: the operation is prepared (the node reads the battery, nothing is written), its answer shown, and only a confirmed person writes. */
function ClearCounters({ t, origin, target }: { t: Translate; origin: string; target: Extract<VerifyTarget, { kind: "counter" }> }) {
  const [info, setInfo] = useState<{ enabled: boolean; catalog: BatteryCatalog } | null>(null);
  const [port, setPort] = useState("1");
  const [serial, setSerial] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [operation, setOperation] = useState<BatteryOperation | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const known = useCallback((key: string) => t(key) !== key, [t]);
  const explain = useCallback((error: unknown) => { const code = error instanceof ApiError ? error.code : "generic"; return t(errorKey(code.startsWith("stage_") ? "stage" : code, known)); }, [t, known]);
  useEffect(() => { batteryCatalog(origin).then(answer => { if (alive.current) setInfo(answer); }).catch(error => { if (alive.current) setMessage(explain(error)); }); }, [origin, explain]);
  useEffect(() => {
    if (!operation || !isActive(operation) || operation.stage === "armed") return;
    const timer = window.setInterval(() => { batteryOperation(origin, operation.id).then(next => { if (alive.current) setOperation(next); }).catch(() => undefined); }, 1500);
    return () => window.clearInterval(timer);
  }, [operation, origin]);
  const run = async (work: () => Promise<BatteryOperation>) => {
    setBusy(true); setMessage("");
    try { const next = await work(); if (alive.current) setOperation(next); } catch (error) { if (alive.current) setMessage(explain(error)); } finally { if (alive.current) setBusy(false); }
  };
  const read = () => {
    const number = Number(port);
    if (!info || !Number.isInteger(number) || number < 1 || number > 10) { setMessage(t("bm_prob_choose")); return; }
    if (!serialLooksRight(info.catalog, serial.trim())) { setMessage(t("bm_prob_serial")); return; }
    void run(() => batteryArm(origin, { node: target.node, port: number, op: "clear_stats", serial: serial.trim() }));
  };
  const fresh = operation?.stage === "armed" ? parseStatCounter(operation.snapshot_before, target.counter) : null;
  if (info && !info.enabled) return <div><p className="login-notice" role="note">{t("bm_off")}</p><button type="button" className="danger-button" disabled>{t("solx_clear_button")}</button></div>;
  return <div>
    <p className="muted small">{t("solx_clear_help")}</p>
    {message && <p className="login-notice" role="alert">{message}</p>}
    {!operation && <div className="form-grid">
      <label>{t("bm_port")}<input type="number" min={1} max={10} value={port} onChange={event => setPort(event.target.value)} /></label>
      <label>{t("bm_serial")}<input className="mono" value={serial} autoComplete="off" spellCheck={false} onChange={event => setSerial(event.target.value)} /></label>
      <div className="confirm-actions"><button type="button" className="primary" disabled={busy || !info || !serial.trim()} onClick={read}>{t("solx_read_battery")}</button></div>
    </div>}
    {operation && <>
      <p><strong>{t(`bm_stage_${operation.stage}`)}</strong></p>
      {operation.stage === "armed" && <>
        <p role="status">{fresh === null ? t("solx_fresh_unknown") : fill(t(fresh > 0 ? "solx_fresh_real" : "solx_fresh_gone"), fresh)}</p>
        {operation.snapshot_before && <details><summary>{t("bm_read_title")}</summary><pre className="mono solar-verify-text">{operation.snapshot_before}</pre></details>}
        <label><input type="checkbox" checked={understood} onChange={event => setUnderstood(event.target.checked)} /> {t("solx_clear_confirm")}</label>
        <div className="confirm-actions">
          <button type="button" className="danger-button" disabled={busy || !understood} onClick={() => void run(() => batteryExecute(origin, operation.id, serial.trim()))}>{t("solx_clear_button")}</button>
          <button type="button" disabled={busy} onClick={() => void run(() => batteryCancel(origin, operation.id))}>{t("bm_withdraw")}</button>
        </div>
      </>}
      {operation.stage === "rejected" && operation.refusal && <p className="login-notice" role="alert">{t(errorKey(operation.refusal.startsWith("stage_") ? "stage" : operation.refusal, known))}</p>}
      {operation.stage === "done" && operation.outcome && <>
        <p role="status">{t(`bm_result_${operation.outcome}`)}</p>
        {operation.after && <details><summary>{t("bm_after")}</summary><pre className="mono solar-verify-text">{operation.after}</pre></details>}
      </>}
    </>}
    <p className="muted small">{t("solx_clear_audit")}</p>
  </div>;
}

export function BatteryVerify({ t, origin, isAdmin, target, stack, levels, close }: Props) {
  const clearing = clearingFor(target, isAdmin);
  return <section className="solar-card solar-verify" data-testid="battery-verify" aria-label={t("solx_verify")}>
    <div className="solar-card-head"><h3>{t("solx_verify")} <small>{verifySubject(t, target)}</small></h3><button type="button" onClick={close}>{t("solx_close")}</button></div>
    {target.kind === "live" ? <LiveVerify t={t} target={target} stack={stack} levels={levels} /> : <p className="muted">{t(target.kind === "counter" ? "solx_verify_kept_note" : "solx_verify_soh_note")}</p>}
    {"op" in clearing && target.kind === "counter"
      ? <ClearCounters t={t} origin={origin} target={target} />
      : "reason" in clearing && <div><button type="button" className="danger-button" disabled>{t("solx_clear_button")}</button><p className="muted small">{t(clearing.reason)}</p></div>}
  </section>;
}
