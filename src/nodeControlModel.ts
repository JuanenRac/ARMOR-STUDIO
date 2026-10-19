/**
 * Giving orders to the nodes from the health card: which orders a node offers in the state it is in, the word that must be typed to confirm, the length of a pause or a maintenance window,
 * the warnings that go with an order, the way the server's errors and the nodes' refusals are told, and the steps an order goes through on each node (sent, acknowledged, offline, back).
 * Pure functions of what the server sends, so they are tested without a screen. Standby is the node's work switched off while it stays connected; nothing here powers a node off or erases it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { ControlMode, ControlOperationName, ControlStage, ControlState, HealthFamily, NodeControlAllRequest, NodeControlLine, NodeControlOperation, NodeControlRequest, NodeHealthItem } from "./api";

type Translate = (key: string) => string;

export const CONTROL_OPERATIONS: readonly ControlOperationName[] = ["restart", "pause", "resume", "standby", "identify", "diagnostics", "maintenance_on", "maintenance_off"];
/** The orders for every node at once (the others need a node to look at). */
export const GROUP_OPERATIONS: readonly ControlOperationName[] = ["restart", "pause", "standby", "resume"];

/** The orders that stop the node's work or take it away for a while: they need the name (or the word) typed. */
export const NEEDS_CONFIRM: readonly ControlOperationName[] = ["restart", "pause", "standby"];
export const needsConfirm = (operation: ControlOperationName): boolean => NEEDS_CONFIRM.includes(operation);

/** The word typed to confirm an order for all the nodes (the server insists on exactly these). */
export const confirmWord = (operation: ControlOperationName): string | null => (operation === "restart" ? "RESTART" : operation === "pause" ? "PAUSE" : operation === "standby" ? "STANDBY" : null);

/** What the person has to type: the name of the node for one node, the word for all of them, nothing for the orders that need none. */
export function confirmTarget(operation: ControlOperationName, scope: "node" | "all", nodeId: string): string | null {
  if (!needsConfirm(operation)) return null;
  return scope === "all" ? confirmWord(operation) : nodeId;
}
/** True when what was typed is exactly what is asked (case and all; the server compares the same way). */
export const confirmMatches = (target: string | null, typed: string): boolean => target === null || typed === target;

export type DurationRule = { min: number; max: number; default: number };
/** The length of a pause (60 s to an hour, an hour when nothing is said), of a maintenance window (a minute to eight hours) and of an identification (5 to 300 s). */
export const DURATION_RULES: Partial<Record<ControlOperationName, DurationRule>> = {
  pause: { min: 60, max: 3600, default: 3600 },
  maintenance_on: { min: 60, max: 28800, default: 3600 },
  identify: { min: 5, max: 300, default: 30 },
};
export const durationRule = (operation: ControlOperationName): DurationRule | null => DURATION_RULES[operation] ?? null;
/** Whether the order takes its length in minutes on the screen (pause and maintenance) or in seconds (identify). */
export const durationInMinutes = (operation: ControlOperationName): boolean => operation === "pause" || operation === "maintenance_on";
/** The number the person types (minutes or seconds, as the screen asks) turned into the seconds of the order; null when it is not a whole number inside the range. */
export function durationSeconds(operation: ControlOperationName, typed: string): number | null {
  const rule = durationRule(operation);
  if (!rule) return null;
  const value = Number(typed.trim());
  if (typed.trim() === "" || !Number.isInteger(value)) return null;
  const seconds = durationInMinutes(operation) ? value * 60 : value;
  return seconds >= rule.min && seconds <= rule.max ? seconds : null;
}
/** The default length, in the unit of the screen. */
export const defaultDuration = (operation: ControlOperationName): string => {
  const rule = durationRule(operation);
  return rule ? String(durationInMinutes(operation) ? rule.default / 60 : rule.default) : "";
};
/** The range in the unit of the screen: [lowest, highest]. */
export const durationRange = (operation: ControlOperationName): [number, number] | null => {
  const rule = durationRule(operation);
  if (!rule) return null;
  return durationInMinutes(operation) ? [Math.ceil(rule.min / 60), Math.floor(rule.max / 60)] : [rule.min, rule.max];
};

/** The state a node is in: what it reports about itself (a node of an older firmware does not say, so it is running). */
export const stateOf = (node: Pick<NodeHealthItem, "report">): ControlState => node.report.control_state ?? "running";
/** Whether an OPERATOR window is on (the one maintenance_off ends): the node's own announcement is not, it ends by itself. */
export const inMaintenance = (node: Pick<NodeHealthItem, "report"> & { control?: NodeHealthItem["control"] }): boolean =>
  node.control?.window ? node.control.window.source !== "node" : node.report.maintenance === true;

export type NodeAction = { operation: ControlOperationName; label: string };
/**
 * The orders a node offers in the state it is in. A running node can be restarted, paused, put in standby, identified, read and put in maintenance; a paused or standby node is resumed
 * (a standby node is "powered on"), restarted, read or identified; a node in standby offers no pause. Maintenance on or off depends on whether it is on. The label key is `nc_op_*`;
 * resuming from standby is told "Power on". Nothing here is a power-off or an erase.
 */
export function actionsFor(node: Pick<NodeHealthItem, "report">): NodeAction[] {
  const state = stateOf(node), maintenance = inMaintenance(node);
  const list: NodeAction[] = [];
  if (state === "running") list.push({ operation: "pause", label: "nc_op_pause" }, { operation: "standby", label: "nc_op_standby" });
  else if (state === "paused") list.push({ operation: "resume", label: "nc_op_resume" }, { operation: "standby", label: "nc_op_standby" });
  else list.push({ operation: "resume", label: "nc_op_poweron" });
  list.push({ operation: "restart", label: "nc_op_restart" }, { operation: "identify", label: "nc_op_identify" }, { operation: "diagnostics", label: "nc_op_diagnostics" });
  list.push(maintenance ? { operation: "maintenance_off", label: "nc_op_maintenance_off" } : { operation: "maintenance_on", label: "nc_op_maintenance_on" });
  return list;
}

/** The nodes an order for all of them would reach: those that reported lately (the server asks the same). */
export const reachableNodes = (nodes: readonly NodeHealthItem[]): NodeHealthItem[] => nodes.filter(node => !node.stale);

/** An alarm panel and a radar are what watches the house: stopping them leaves the house unprotected. */
export const guardsHouse = (family: HealthFamily): boolean => family === "alarm" || family === "radar";
export const stopsWork = (operation: ControlOperationName): boolean => operation === "pause" || operation === "standby";

/** The keys of the warnings that go with an order, most serious first. */
export function warningKeys(operation: ControlOperationName, scope: "node" | "all", family: HealthFamily | null, mode: ControlMode): string[] {
  const keys: string[] = [];
  if (operation === "restart") {
    if (scope === "all") keys.push(mode === "rolling" ? "nc_warn_restart_all_rolling" : "nc_warn_restart_all_now");
    else { keys.push("nc_warn_restart"); if (family && guardsHouse(family)) keys.push(family === "alarm" ? "nc_warn_alarm_restart" : "nc_warn_radar_restart"); }
  } else if (stopsWork(operation)) {
    if (scope === "all") keys.push("nc_warn_all_stop");
    else {
      keys.push("nc_warn_unprotected");
      if (family === "alarm") keys.push("nc_warn_alarm_stop"); else if (family === "radar") keys.push("nc_warn_radar_stop");
    }
    if (operation === "standby") keys.push("nc_standby_note");
  } else if (operation === "maintenance_on") keys.push("nc_warn_maintenance");
  return keys;
}

/** What the order is going to be, ready to send: the request for one node or for all, or null while a length or the confirmation is wrong. */
export function buildNodeRequest(operation: ControlOperationName, nodeId: string, typedConfirm: string, typedDuration: string): NodeControlRequest | null {
  const target = confirmTarget(operation, "node", nodeId);
  if (!confirmMatches(target, typedConfirm)) return null;
  const request: NodeControlRequest = { operation };
  if (target !== null) request.confirm = typedConfirm;
  if (durationRule(operation)) { const seconds = durationSeconds(operation, typedDuration); if (seconds === null) return null; request.duration_s = seconds; }
  return request;
}
export function buildAllRequest(operation: ControlOperationName, mode: ControlMode, typedConfirm: string, typedDuration = ""): NodeControlAllRequest | null {
  const target = confirmTarget(operation, "all", "");
  if (!confirmMatches(target, typedConfirm)) return null;
  const request: NodeControlAllRequest = { operation, mode: operation === "restart" ? mode : "now" };
  if (target !== null) request.confirm = typedConfirm;
  if (durationRule(operation)) { const seconds = durationSeconds(operation, typedDuration); if (seconds === null) return null; request.duration_s = seconds; }
  return request;
}

// ---- how a node says what it is doing ----------------------------------------------------------------------------------------------------------

const clock = (ms: number): string => new Date(ms).toLocaleString();
/** Seconds as "45 s", "12 min" or "2 h 05 min". */
export function leftText(seconds: number, t: Translate): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 90) return `${total} s`;
  if (total < 5400) return `${Math.round(total / 60)} ${t("minutesShort")}`;
  return `${Math.floor(total / 3600)} ${t("hoursShort")} ${String(Math.round((total % 3600) / 60)).padStart(2, "0")} ${t("minutesShort")}`;
}
/** What is left of a window the node reported `until` seconds for when it reported, `now` being later. */
export const secondsLeft = (until: number, receivedAt: string, now: number): number => Math.max(0, Math.round(until - (now - Date.parse(receivedAt)) / 1000));

export type StateChip = { id: "paused" | "standby" | "maintenance"; text: string };
/** The chips on a node's card: Paused with the time left, Standby since when and by whom, Maintenance until when. A running node outside maintenance has none. */
export function stateChips(node: Pick<NodeHealthItem, "report" | "received_at"> & { control?: NodeHealthItem["control"] }, now: number, t: Translate): StateChip[] {
  const report = node.report, chips: StateChip[] = [];
  const fill = (text: string, ...values: string[]) => values.reduce((out, value, index) => out.split(`{${index}}`).join(value), text);
  if (report.control_state === "paused") {
    const left = report.control_until_s !== undefined ? secondsLeft(report.control_until_s, node.received_at, now) : null;
    chips.push({ id: "paused", text: left === null ? t("nc_state_paused") : fill(t("nc_state_paused_left"), leftText(left, t)) });
  } else if (report.control_state === "standby") {
    const since = report.control_since_ms && report.control_since_ms > 0 ? fill(t("nc_state_standby_since"), clock(report.control_since_ms)) : t("nc_state_standby");
    chips.push({ id: "standby", text: report.control_by ? `${since} · ${fill(t("nc_by"), report.control_by)}` : since });
  }
  const window = node.control?.window;
  if (window) {
    // One window, from the node's announcement, the operator or both: the reason, who opened it and the time left, counted from the moment the server was asked.
    const left = Math.max(0, Math.round(window.remaining_s - (window.at_ms === undefined ? 0 : (now - window.at_ms) / 1000)));
    const text = fill(t("nc_state_maint_window"), t(`mw_reason_${window.reason}`), t(`mw_source_${window.source}`), leftText(left, t));
    chips.push({ id: "maintenance", text: window.requested_by ? `${text} · ${fill(t("nc_by"), window.requested_by)}` : text });
  } else if (report.maintenance) {
    const until = report.maintenance_until_s !== undefined ? secondsLeft(report.maintenance_until_s, node.received_at, now) : null;
    chips.push({ id: "maintenance", text: until === null ? t("nc_state_maint") : fill(t("nc_state_maint_until"), clock(now + until * 1000)) });
  }
  return chips;
}

// ---- the errors of the server and the refusals of the nodes -----------------------------------------------------------------------------------

export const REFUSAL_CODES: readonly string[] = ["not_armed", "invalid_token", "token_expired", "rate_limited", "already_restarting", "already_in_state", "busy_update", "busy_upload", "busy_slot_copy", "busy_battery", "unavailable"];
/** The key that tells a node's refusal in words (a code nobody knows is "refused for a reason this version does not know"). */
export const refusalKey = (code: string | undefined): string => (code && REFUSAL_CODES.includes(code) ? `nc_refusal_${code}` : "nc_refusal_unknown");

export const ERROR_CODES: readonly string[] = ["invalid_request", "forbidden", "elevation_required", "unknown_node", "busy", "node_unavailable", "no_nodes", "already_in_state", "rate_limited", "mqtt_unavailable"];
/** The key that tells an error of the server (the code, or the status when the server gave none) in words. */
export function errorKey(code: string, status: number): string {
  if (ERROR_CODES.includes(code)) return `nc_err_${code}`;
  if (status === 429) return "nc_err_rate_limited";
  if (status === 503) return "nc_err_mqtt_unavailable";
  return "nc_err_generic";
}

// ---- the steps an order goes through on a node ------------------------------------------------------------------------------------------------

export type StepId = "sent" | "acknowledged" | "offline" | "back" | "applied";
export type StepState = "done" | "current" | "todo" | "failed";
export type TimelineStep = { id: StepId; state: StepState; at?: string };

/** A restart goes sent, acknowledged, offline, back; every other order goes sent, applied. */
export const stepsOf = (operation: ControlOperationName): readonly StepId[] => (operation === "restart" ? ["sent", "acknowledged", "offline", "back"] : ["sent", "applied"]);

const REACHED: Record<ControlStage, number> = { pending: 0, armed: 0, sent: 1, acknowledged: 2, offline: 3, back: 4, applied: 2, refused: 0, no_answer: 0, not_back: 3 };
export const FAILED_STAGES: readonly ControlStage[] = ["refused", "no_answer", "not_back"];
export const isFailed = (line: Pick<NodeControlLine, "stage">): boolean => FAILED_STAGES.includes(line.stage);

/** Whether the node has finished with this order: it did it, or it failed to. */
export function lineFinished(line: Pick<NodeControlLine, "stage">, operation: ControlOperationName): boolean {
  if (isFailed(line)) return true;
  return operation === "restart" ? line.stage === "back" : line.stage === "applied";
}

/** The steps of one node's line, each done, current, still to come or failed, with the time the server noted for it. */
export function timeline(line: NodeControlLine, operation: ControlOperationName, createdAt: string): TimelineStep[] {
  const steps = stepsOf(operation);
  let done = REACHED[line.stage];
  if (operation !== "restart" && line.stage === "applied") done = 2;
  if (operation !== "restart" && !isFailed(line) && line.stage !== "applied") done = Math.min(done, 1);
  if (line.stage === "no_answer") done = 1;   // the order went out; the node never answered
  const failedAt = line.stage === "refused" ? 0 : line.stage === "no_answer" ? 1 : line.stage === "not_back" ? 3 : -1;
  const finished = lineFinished(line, operation);
  const times: Partial<Record<StepId, string>> = { sent: createdAt, acknowledged: line.acknowledged_at, offline: line.offline_at, back: line.back_at, applied: line.applied_at };
  return steps.map((id, index) => {
    const state: StepState = index === failedAt ? "failed" : index < done && (failedAt < 0 || index < failedAt) ? "done" : !finished && index === done ? "current" : "todo";
    return { id, state, at: state === "done" ? times[id] : undefined };
  });
}

/** True when every node of an order has finished (the server says so with `state: done`; this covers a stale answer). */
export const operationFinished = (operation: Pick<NodeControlOperation, "state" | "nodes" | "operation">): boolean =>
  operation.state === "done" || (operation.nodes.length > 0 && operation.nodes.every(line => lineFinished(line, operation.operation)));

/** Counts for the heading of an order: how many nodes did it, are still under way, failed. */
export function tally(operation: Pick<NodeControlOperation, "nodes" | "operation">): { done: number; waiting: number; failed: number } {
  let done = 0, failed = 0;
  for (const line of operation.nodes) { if (isFailed(line)) failed += 1; else if (lineFinished(line, operation.operation)) done += 1; }
  return { done, failed, waiting: operation.nodes.length - done - failed };
}

/** Every key a screen builds by name for the orders, the stages, the refusals and the errors (the tests check each one in every language). */
export function dynamicKeys(): string[] {
  const keys: string[] = [];
  for (const operation of CONTROL_OPERATIONS) keys.push(`nc_op_${operation}`, `nc_d_${operation}`);
  keys.push("nc_op_poweron", "nc_all_restart", "nc_all_pause", "nc_all_standby", "nc_all_resume");
  for (const stage of ["pending", "armed", "sent", "acknowledged", "applied", "offline", "back", "refused", "no_answer", "not_back"]) keys.push(`nc_st_${stage}`);
  for (const code of [...REFUSAL_CODES, "unknown"]) keys.push(`nc_refusal_${code}`);
  for (const code of [...ERROR_CODES, "generic"]) keys.push(`nc_err_${code}`);
  for (const state of ["running", "paused", "standby"]) keys.push(`nc_applied_${state}`);
  return keys;
}
