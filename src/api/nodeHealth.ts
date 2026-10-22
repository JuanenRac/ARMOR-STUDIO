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
  /** How the node last started, when that was a fault (told only for a few minutes after a dirty start). */
  boot?: BootReport;
  /** The gate that keeps the node from taking work while its memory is short. */
  memory_gate?: MemoryGate;
  coredump?: CoredumpFact;
  config_check?: ConfigCheck;
  /** Radar nodes only: the sensors the node reads and the state of its perimeter engine. */
  sensors?: SensorHealth[];
  radar?: RadarFacts;
};
export type BootCause = "panic" | "task_watchdog" | "interrupt_watchdog" | "other_watchdog" | "brownout" | "power_glitch" | "cpu_lockup" | "out_of_memory" | "guard_missing_task" | "guard_low_memory" | "guard_dead_man" | "guard";
export type BootReport = { cause: BootCause; reset_reason: string; uptime_before_s?: number; heap_internal_free?: number; heap_internal_largest?: number; coredump: boolean; deliberate: boolean; guard: boolean };
export type MemoryGate = { closed: boolean; transitions: number; close_free: number; close_block: number; open_free: number; open_block: number };
export type CoredumpFact = { present: boolean; size?: number };
export type ConfigCheck = { snapshot?: "restored" | "failed"; reverted?: "reapplied" | "failed" };
export type SensorModel = "ld2450" | "ld2461" | "ld2410" | "ld2412" | "ld2410s" | "mr24hpc1";
export type SensorState = "reporting" | "no_data" | "garbled" | "silent" | "bridge";
export type SensorBluetooth = "unknown" | "open" | "closed" | "none";
export type SensorQuirk = "ld2412_bad_firmware" | "ld2412_unknown_firmware";
export type SensorHealth = { sensor_id: number; model: SensorModel; state: SensorState; firmware_known: boolean; firmware?: string; bluetooth: SensorBluetooth; mac?: string; bluetooth_alert?: boolean; quirk?: SensorQuirk };
export type RadarFacts = { perimeter_enabled: boolean; masked: boolean; wifi_jam: boolean; bridge_open: boolean; events_buffered: number; sensor_bluetooth_off: boolean };
export type HealthWarningCode = "node_low_memory" | "node_frequent_resets" | "node_link_flapping" | "node_weak_signal" | "node_sensor_bluetooth_open" | "node_radar_masked" | "node_wifi_jam";
export type HealthWarning = { code: HealthWarningCode; detail: Record<string, string | number | boolean> };
export type HealthRestart = { at: string; reason: string; abnormal: boolean; uptime_before_s?: number; boot?: BootReport };
export type MaintenanceReason = "restart" | "pause" | "standby" | "update" | "upload" | "operator";
/** The planned-maintenance window the server holds for a node: one window, opened by the node's own announcement, by an operator or both. `at_ms` is when this list was read (the time left counts from there). */
export type MaintenanceWindow = { source: "node" | "operator" | "both"; reason: MaintenanceReason; remaining_s: number; requested_by?: string; at_ms?: number };
/** What the server knows of the control state of a node (its own report, or what the orders left it in) and its maintenance window. */
export type NodeControlView = { state: ControlState; maintenance: boolean; since_ms?: number; by?: string; until_s?: number; maintenance_until_s?: number; window?: MaintenanceWindow; source: "node" | "server" };
export type NodeHealthItem = {
  node_id: string; family: HealthFamily; firmware: string; board?: string; report: NodeHealthReport; received_at: string; stale: boolean; status: "ok" | "warning" | "stale";
  warnings: HealthWarning[]; restarts_24h: number; last_restart?: HealthRestart; control?: NodeControlView;
};
export type HealthSample = { at: number; heap_free: number; heap_min: number; heap_internal_free?: number; heap_internal_largest?: number; rssi_dbm?: number; link_up: boolean; uptime_s: number; broker_reconnects: number };
export type NodeHealthDetail = NodeHealthItem & { samples: HealthSample[]; restarts: HealthRestart[] };
export type NodeHealthLevels = { low_heap_b: number; low_heap_clear_b: number; low_internal_b?: number; low_internal_clear_b?: number; low_block_b?: number; restarts_per_day: number; abnormal_window_min: number; flap_reconnects: number; flap_window_min: number; weak_signal_dbm: number; weak_signal_reports: number; silent_after_s: number };
export type NodeHealthList = { nodes: NodeHealthItem[]; waiting: Array<{ node_id: string; family: HealthFamily }>; totals: { nodes: number; stale: number; with_warnings: number }; levels: NodeHealthLevels };
/** The window's time left counts from the moment the list was read, so every window is stamped with it. */
export const stampWindows = (list: NodeHealthList, at: number): NodeHealthList => ({
  ...list, nodes: list.nodes.map(node => (node.control?.window ? { ...node, control: { ...node.control, window: { ...node.control.window, at_ms: at } } } : node)),
});
export const readNodeHealth = (origin: string) => userCall<NodeHealthList>(origin, "GET", "/api/v1/node-health").then(list => stampWindows(list, Date.now()));
export const readNodeHealthDetail = (origin: string, node: string) => userCall<NodeHealthDetail>(origin, "GET", `/api/v1/node-health/${encodeURIComponent(node)}`);
export const forgetNodeHealth = (origin: string, node: string) => userCall<void>(origin, "DELETE", `/api/v1/node-health/${encodeURIComponent(node)}`);

// ---- the events of the perimeter engine of the radar nodes (the zones themselves are edited in the panel of the node) ---------------------------------
export type RadarEventKind = "zone_occupied" | "zone_clear" | "loiter" | "tripwire" | "path_violation" | "masking" | "masking_end" | "sensor_bluetooth_open" | "sensor_bluetooth_closed" | "wifi_jam" | "wifi_jam_end" | "bridge_opened" | "bridge_closed";
export type RadarEvent = {
  kind: "radar_event"; node_id: string; timestamp_ms: number; boot: number; seq: number; event: RadarEventKind; name?: string; sensor_id?: number; track_id?: number;
  movement?: "still" | "walking" | "running"; value?: number; count?: number; direction?: "in" | "out"; from?: string; by?: string; received_at: string;
};
export type RadarEventList = { events: RadarEvent[]; nodes: string[] };
/** The newest events of the perimeter engine, newest first: of one node or of all of them. */
export const readRadarEvents = (origin: string, options: { node?: string; limit?: number } = {}) => {
  const parts: string[] = [];
  if (options.node) parts.push(`node=${encodeURIComponent(options.node)}`);
  if (options.limit) parts.push(`limit=${options.limit}`);
  return userCall<RadarEventList>(origin, "GET", `/api/v1/radar/events${parts.length > 0 ? `?${parts.join("&")}` : ""}`);
};
