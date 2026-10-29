/**
 * Orders for the nodes, on the health card (administrators only): the menu of actions of a node, the orders for all the nodes at once, the dialog that explains an order, warns about what it
 * leaves unwatched and asks for the name (or the word) to be typed, and the view that follows an order node by node (sent, acknowledged, offline, back). Nothing here powers a node off or
 * erases it: standby is the node's work switched off while it stays connected. The server asks for a fresh proof of identity when it needs one (the usual re-authentication of the console).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState, type FormEvent } from "react";
import {
  ApiError, controlAllNodes, controlNode, type ControlMode, type ControlOperationName, type DiagnosticsSnapshot, type NodeControlLine, type NodeControlOperation, type NodeHealthItem,
} from "../api";
import type { Translate } from "../components/camera";
import { useDialogFocus } from "../components/useDialogFocus";
import {
  actionsFor, buildAllRequest, buildNodeRequest, confirmTarget, confirmMatches, defaultDuration, durationRange, durationRule, durationSeconds, errorKey, GROUP_OPERATIONS, isFailed,
  operationFinished, reachableNodes, refusalKey, tally, timeline, warningKeys, type NodeAction,
} from "../nodeControlModel";
import { fillAll, formatBytes, formatUptime, resetText } from "../nodeHealthModel";
import "./node-control.css";
import { DialogLogo } from "../menuLogos";

export type DialogRequest = { operation: ControlOperationName; scope: "node" | "all"; node?: NodeHealthItem; label: string; count?: number };

/** The "Actions" menu of a node: what it offers depends on the state it is in. */
export function ActionMenu({ t, node, choose, startOpen = false }: { t: Translate; node: NodeHealthItem; choose: (action: NodeAction) => void; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return <div className="nc-menu">
    <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={fillAll(t("nc_actions_for"), node.node_id)} onClick={() => setOpen(!open)}>{t("nc_actions")}</button>
    {open && <ul role="menu" className="nc-menu-list" data-testid={`nc-menu-${node.node_id}`}>
      {actionsFor(node).map(action => <li key={action.operation} role="none">
        <button type="button" role="menuitem" title={t(`nc_d_${action.operation}`)} onClick={() => { setOpen(false); choose(action); }}>{t(action.label)}</button>
      </li>)}
    </ul>}
  </div>;
}

/** The orders for every node, in the header of the card. */
export function GroupActions({ t, nodes, choose }: { t: Translate; nodes: readonly NodeHealthItem[]; choose: (operation: ControlOperationName) => void }) {
  const reach = reachableNodes(nodes).length;
  return <div className="nc-group" data-tour="sys-health-control" role="group" aria-label={t("nc_group_title")}>
    <div className="nc-group-buttons">
      {GROUP_OPERATIONS.map(operation => <button key={operation} type="button" disabled={reach === 0} className={operation === "resume" ? "" : "danger"} onClick={() => choose(operation)}>{t(`nc_all_${operation}`)}</button>)}
    </div>
    <p className="muted small">{t("nc_group_help")}</p>
  </div>;
}

/** The dialog of one order: what it does, what it leaves unwatched, how long, and the name (or the word) typed to confirm. */
export function ControlDialog({ t, origin, request, close, started }: { t: Translate; origin: string; request: DialogRequest; close: () => void; started: (operation: NodeControlOperation) => void }) {
  const { operation, scope, node } = request;
  const dialog = useDialogFocus<HTMLFormElement>();
  const [typed, setTyped] = useState("");
  const [duration, setDuration] = useState(defaultDuration(operation));
  const [mode, setMode] = useState<ControlMode>("rolling");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const target = confirmTarget(operation, scope, node?.node_id ?? "");
  const rule = durationRule(operation), range = durationRange(operation);
  const durationBad = rule !== null && durationSeconds(operation, duration) === null;
  const ready = confirmMatches(target, typed) && !durationBad;
  const warnings = warningKeys(operation, scope, node?.family ?? null, mode);
  const durationLabel = operation === "pause" ? "nc_duration_pause" : operation === "identify" ? "nc_duration_identify" : "nc_duration_maint";
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;
    const body = scope === "all" ? buildAllRequest(operation, mode, typed, duration) : buildNodeRequest(operation, node?.node_id ?? "", typed, duration);
    if (!body) return;
    setBusy(true); setProblem("");
    try {
      const answer = scope === "all" ? await controlAllNodes(origin, body as Parameters<typeof controlAllNodes>[1]) : await controlNode(origin, node?.node_id ?? "", body as Parameters<typeof controlNode>[2]);
      started(answer);
    } catch (error) {
      setProblem(t(error instanceof ApiError ? errorKey(error.code, error.status) : "nc_err_generic"));
      setBusy(false);
    }
  };
  const title = scope === "all" ? fillAll(t("nc_title_all"), t(`nc_op_${operation}`)) : fillAll(t("nc_title_node"), node?.node_id ?? "", t(request.label));
  return <div className="modal-backdrop" role="presentation" onMouseDown={close} onKeyDown={event => { if (event.key === "Escape") close(); }}>
    <form ref={dialog.ref} onKeyDown={dialog.onKeyDown} className="about-dialog confirm-dialog nc-dialog" role="dialog" aria-modal="true" aria-labelledby="nc-title" onMouseDown={event => event.stopPropagation()} onSubmit={event => void submit(event)}>
      <h2 id="nc-title"><DialogLogo kind="devices" />{title}</h2>
      <p>{t(`nc_d_${operation}`)}</p>
      {scope === "all" && <p className="muted small">{fillAll(t("nc_reach"), String(request.count ?? 0))}</p>}
      {warnings.map(key => <p key={key} className="login-notice" role="note">{t(key)}</p>)}
      {scope === "all" && operation === "restart" && <fieldset className="nc-modes">
        <legend>{t("nc_mode")}</legend>
        {(["rolling", "now"] as const).map(item => <label key={item} className="nc-mode">
          <input type="radio" name="nc-mode" value={item} checked={mode === item} onChange={() => setMode(item)} />
          <span><strong>{t(item === "rolling" ? "nc_mode_rolling" : "nc_mode_now")}</strong><br /><small className="muted">{t(item === "rolling" ? "nc_mode_rolling_d" : "nc_mode_now_d")}</small></span>
        </label>)}
      </fieldset>}
      {rule && range && <label className="nc-field">{t(durationLabel)}
        <input type="number" inputMode="numeric" min={range[0]} max={range[1]} step={1} value={duration} onChange={event => setDuration(event.target.value)} aria-invalid={durationBad} />
        <small className="muted">{t(operation === "pause" ? "nc_duration_pause_help" : operation === "identify" ? "nc_duration_identify_help" : "nc_duration_maint_help")}</small>
        {durationBad && <small className="bad">{fillAll(t("nc_duration_bad"), String(range[0]), String(range[1]))}</small>}
      </label>}
      {target !== null && <label className="nc-field">{fillAll(t(scope === "all" ? "nc_confirm_word" : "nc_confirm_name"), target)}
        <input className="mono" value={typed} onChange={event => setTyped(event.target.value)} autoComplete="off" spellCheck={false} autoCapitalize="off" aria-invalid={typed !== "" && !ready} />
        {typed !== "" && typed !== target && <small className="muted">{t("nc_confirm_wrong")}</small>}
      </label>}
      {problem && <p className="login-notice" role="alert">{problem}</p>}
      <div className="confirm-actions">
        <button type="button" onClick={close}>{t("cancelAction")}</button>
        <button type="submit" className={operation === "resume" || operation === "diagnostics" || operation === "identify" ? "primary" : "danger"} disabled={!ready || busy}>{busy ? t("nc_sending") : t("nc_send")}</button>
      </div>
    </form>
  </div>;
}

const time = (iso: string | undefined): string => (iso && Number.isFinite(Date.parse(iso)) ? new Date(iso).toLocaleTimeString() : "");

function Diagnostics({ t, data }: { t: Translate; data: DiagnosticsSnapshot }) {
  const yesNo = (value: boolean) => t(value ? "nc_yes" : "nc_no");
  const rows: Array<[string, string]> = [];
  if (data.firmware !== undefined) rows.push([t("nh_firmware"), data.firmware]);
  if (data.uptime_s !== undefined) rows.push([t("nh_uptime"), formatUptime(data.uptime_s, t)]);
  if (data.reset_reason !== undefined) rows.push([t("nh_reset"), resetText(data.reset_reason, t)]);
  if (data.heap_free !== undefined) rows.push([t("nh_heap"), formatBytes(data.heap_free)]);
  if (data.heap_min !== undefined) rows.push([t("nc_diag_heap_min"), formatBytes(data.heap_min)]);
  if (data.psram_free !== undefined) rows.push([t("nc_diag_psram"), formatBytes(data.psram_free)]);
  if (data.stack_min_free !== undefined) rows.push([t("nc_diag_stack"), formatBytes(data.stack_min_free)]);
  if (data.rssi !== undefined) rows.push([t("nh_signal"), `${data.rssi} dBm`]);
  if (data.mqtt_connected !== undefined) rows.push([t("nc_diag_mqtt"), yesNo(data.mqtt_connected)]);
  if (data.state !== undefined) rows.push([t("nc_diag_state"), t(`nc_applied_${data.state}`) === `nc_applied_${data.state}` ? data.state : t(`nc_applied_${data.state}`)]);
  if (data.maintenance !== undefined) rows.push([t("nc_diag_maintenance"), yesNo(data.maintenance)]);
  return <div className="nc-diag" data-testid="nc-diagnostics">
    <h5>{t("nc_diag_title")}</h5>
    <dl className="nh-facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </div>;
}

function Line({ t, line, operation, createdAt }: { t: Translate; line: NodeControlLine; operation: ControlOperationName; createdAt: string }) {
  const steps = timeline(line, operation, createdAt);
  const failed = isFailed(line);
  return <li className={`nc-line ${failed ? "failed" : ""}`} data-testid={`nc-line-${line.node_id}`}>
    <header><strong>{line.node_id}</strong> <span className="el-pill">{t(`nh_family_${line.family}`)}</span></header>
    <ol className="nc-steps">
      {steps.map(step => <li key={step.id} className={`nc-step ${step.state}`} aria-current={step.state === "current" ? "step" : undefined}>
        <span>{t(`nc_st_${step.id}`)}</span>{step.at && time(step.at) && <small> {time(step.at)}</small>}
      </li>)}
    </ol>
    {failed && <p className="nc-failure" role="alert"><strong>{t(`nc_st_${line.stage}`)}</strong>{line.stage === "refused" ? ` — ${t(refusalKey(line.refusal))}` : ""}</p>}
    <p className="muted small">
      {line.state && t(`nc_applied_${line.state}`)}
      {line.until_s !== undefined && line.until_s > 0 && ` · ${fillAll(t("nc_until"), `${Math.round(line.until_s / 60) >= 2 ? Math.round(line.until_s / 60) + " " + t("minutesShort") : line.until_s + " s"}`)}`}
      {line.back_after_s !== undefined && ` · ${fillAll(t("nc_back_after"), String(line.back_after_s))}`}
      {line.firmware_before && line.firmware_after && line.firmware_before !== line.firmware_after && ` · ${fillAll(t("nc_firmware_change"), line.firmware_before, line.firmware_after)}`}
    </p>
    {line.diagnostics && <Diagnostics t={t} data={line.diagnostics} />}
  </li>;
}

/** How an order stands, node by node. */
export function OperationView({ t, operation, dismiss }: { t: Translate; operation: NodeControlOperation; dismiss: () => void }) {
  const finished = operationFinished(operation), counts = tally(operation);
  return <section className="nc-progress" data-testid="nc-progress" aria-live="polite" aria-label={t("nc_progress_title")}>
    <header>
      <h4>{t("nc_progress_title")}</h4>
      <button type="button" onClick={dismiss}>{t("nc_dismiss")}</button>
    </header>
    <p><strong>{t(`nc_op_${operation.operation}`)}</strong>{operation.operation === "restart" && operation.scope === "all" ? ` · ${t(operation.mode === "rolling" ? "nc_mode_rolling" : "nc_mode_now")}` : ""}
      {" · "}{fillAll(t("nc_progress_line"), operation.scope === "all" ? t("nc_group_title") : operation.nodes[0]?.node_id ?? "", operation.actor, time(operation.created_at))}</p>
    <p className="muted small">{finished ? fillAll(t("nc_progress_done"), String(counts.done), String(counts.failed)) : t(operation.state === "arming" ? "nc_progress_arming" : "nc_progress_running")}</p>
    <ul className="nc-lines">{operation.nodes.map(line => <Line key={line.node_id} t={t} line={line} operation={operation.operation} createdAt={operation.created_at} />)}</ul>
  </section>;
}
