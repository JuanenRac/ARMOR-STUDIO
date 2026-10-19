import { userCall } from "./transport";
import type { HealthFamily, ControlState } from "./nodeHealth";
// ---- giving an order to the nodes (the server arms the node, executes with its one-time token and follows what it answers; see the node-control routes of ARMOR-SERVER) ---------------------

export type ControlOperationName = "restart" | "pause" | "resume" | "standby" | "identify" | "diagnostics" | "maintenance_on" | "maintenance_off";
export type ControlMode = "now" | "rolling";
export type ControlStage = "pending" | "armed" | "sent" | "acknowledged" | "applied" | "offline" | "back" | "refused" | "no_answer" | "not_back";
export type DiagnosticsSnapshot = { firmware?: string; uptime_s?: number; reset_reason?: string; heap_free?: number; heap_min?: number; psram_free?: number; stack_min_free?: number; rssi?: number; mqtt_connected?: boolean; state?: string; maintenance?: boolean };
export type NodeControlLine = {
  node_id: string; family: HealthFamily; stage: ControlStage; state?: ControlState; maintenance?: boolean; refusal?: string; slot?: number; restart_in_s?: number; until_s?: number;
  firmware_before?: string; firmware_after?: string; acknowledged_at?: string; applied_at?: string; offline_at?: string; back_at?: string; back_after_s?: number; diagnostics?: DiagnosticsSnapshot;
};
export type NodeControlOperation = {
  id: string; scope: "node" | "all"; operation: ControlOperationName; mode: ControlMode; duration_s?: number; actor: string; origin?: string; created_at: string; updated_at: string;
  state: "arming" | "running" | "done"; nodes: NodeControlLine[];
};
export type NodeControlRequest = { operation: ControlOperationName; confirm?: string; duration_s?: number };
export type NodeControlAllRequest = { operation: ControlOperationName; mode: ControlMode; confirm?: string; duration_s?: number };

/** One order for one node. The call asks the person to prove themselves again when the server says so (the usual re-authentication of the console). */
export const controlNode = (origin: string, node: string, request: NodeControlRequest) => userCall<NodeControlOperation>(origin, "POST", `/api/v1/nodes/${encodeURIComponent(node)}/control`, request);
/** One order for every node that reported lately. */
export const controlAllNodes = (origin: string, request: NodeControlAllRequest) => userCall<NodeControlOperation>(origin, "POST", "/api/v1/nodes/control", request);
export const readNodeControlOperation = (origin: string, id: string) => userCall<NodeControlOperation>(origin, "GET", `/api/v1/nodes/control/operations/${encodeURIComponent(id)}`);
export const readNodeControlOperations = (origin: string) => userCall<{ operations: NodeControlOperation[] }>(origin, "GET", "/api/v1/nodes/control/operations");
