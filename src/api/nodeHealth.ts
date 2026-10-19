import { userCall } from "./transport";
// ---- the health of the nodes: the same report for every family ------------------------------------------------------------------------------------
export type ControlState = "running" | "paused" | "standby";
export type HealthFamily = "radar" | "solar" | "electrical" | "alarm" | "hmi";
export type NodeHealthReport = {
  kind: "node_health"; node_id: string; timestamp_ms: number; family: HealthFamily; firmware: string; board?: string; uptime_s: number; reset_reason: string; heap_free: number; heap_min: number;
  /** The internal memory on its own and the external RAM, when the node tells them (a node of an older firmware does not). */
  heap_internal_free?: number; heap_internal_min?: number; heap_internal_largest?: number; psram_free?: number;
  link: "wifi" | "ethernet" | "none"; link_up: boolean; rssi_dbm?: number; broker_reconnects: number; low_stack_tasks?: number; last_error?: string;
  /** What the node says about its own control state (the server's node_health contract): running, paused or in standby, since when and by whom, and the maintenance window. */
  control_state?: ControlState; control_since_ms?: number; control_by?: string; control_until_s?: number; maintenance?: boolean; maintenance_until_s?: number;
};
export type HealthWarningCode = "node_low_memory" | "node_frequent_resets" | "node_link_flapping" | "node_weak_signal";
export type HealthWarning = { code: HealthWarningCode; detail: Record<string, string | number | boolean> };
export type HealthRestart = { at: string; reason: string; abnormal: boolean; uptime_before_s?: number };
export type NodeHealthItem = {
  node_id: string; family: HealthFamily; firmware: string; board?: string; report: NodeHealthReport; received_at: string; stale: boolean; status: "ok" | "warning" | "stale";
  warnings: HealthWarning[]; restarts_24h: number; last_restart?: HealthRestart;
};
export type HealthSample = { at: number; heap_free: number; heap_min: number; heap_internal_free?: number; heap_internal_largest?: number; rssi_dbm?: number; link_up: boolean; uptime_s: number; broker_reconnects: number };
export type NodeHealthDetail = NodeHealthItem & { samples: HealthSample[]; restarts: HealthRestart[] };
export type NodeHealthLevels = { low_heap_b: number; low_heap_clear_b: number; low_internal_b?: number; low_internal_clear_b?: number; low_block_b?: number; restarts_per_day: number; abnormal_window_min: number; flap_reconnects: number; flap_window_min: number; weak_signal_dbm: number; weak_signal_reports: number; silent_after_s: number };
export type NodeHealthList = { nodes: NodeHealthItem[]; waiting: Array<{ node_id: string; family: HealthFamily }>; totals: { nodes: number; stale: number; with_warnings: number }; levels: NodeHealthLevels };
export const readNodeHealth = (origin: string) => userCall<NodeHealthList>(origin, "GET", "/api/v1/node-health");
export const readNodeHealthDetail = (origin: string, node: string) => userCall<NodeHealthDetail>(origin, "GET", `/api/v1/node-health/${encodeURIComponent(node)}`);
export const forgetNodeHealth = (origin: string, node: string) => userCall<void>(origin, "DELETE", `/api/v1/node-health/${encodeURIComponent(node)}`);
