import type { SystemState } from "../types";
import { ApiError, endpoint, localSession, timedFetch, userCall } from "./transport";
export async function readStatus(origin: string): Promise<SystemState> {
  const response = await timedFetch(`${origin.replace(/\/$/, "")}/api/v1/status`, { headers: { Accept: "application/json" }, ...localSession, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`Server returned ${response.status}`);
  return response.json() as Promise<SystemState>;
}
export type ServerInfo = { service: string; version: string; uptime_s: number; mode?: "armed" | "disarmed"; live_video?: boolean; mqtt?: boolean };
export async function readInfo(origin: string): Promise<ServerInfo> {
  const response = await timedFetch(endpoint(origin, "/api/v1/info"), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`Info returned ${response.status}`);
  return response.json() as Promise<ServerInfo>;
}
/** Arm or disarm the system (an operator, from Studio). Disarming carries the PIN of the signed-in user when there is one to type. Answers with the new state of the perimeter. */
export async function setSystemMode(origin: string, mode: "armed" | "disarmed", pin?: string): Promise<SystemState> {
  const response = await timedFetch(endpoint(origin, "/api/v1/mode"), { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...localSession, body: JSON.stringify(mode === "disarmed" && pin ? { mode, pin } : { mode }) });
  if (!response.ok) {
    const parsed = await response.json().catch(() => ({})) as { code?: string };
    // The PIN refusals have a code of their own (wrong_pin, pin_locked, pin_not_set); the rest keep the short names of before.
    const code = parsed.code && /^pin_|^wrong_pin$/.test(parsed.code) ? parsed.code : response.status === 401 ? "session_ended" : response.status === 403 ? "forbidden" : "generic";
    throw new ApiError(response.status, code);
  }
  return response.json() as Promise<SystemState>;
}
export type PreflightIssue = { kind: "node" | "panel" | "zone" | "camera" | "device" | "alarm"; level: "block" | "warn"; code: "node_offline" | "panel_silent" | "zone_open" | "camera_down" | "opening_open" | "device_offline" | "alarm_unseen"; id: string; detail?: string };
export type Preflight = { ready: boolean; checked_at: string; blocking: number; warnings: number; issues: PreflightIssue[] };
export async function readPreflight(origin: string): Promise<Preflight> {
  const response = await timedFetch(endpoint(origin, "/api/v1/preflight"), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`preflight ${response.status}`);
  return response.json() as Promise<Preflight>;
}
export type SystemSummary = {
  service: string; version: string; node: string; uptime_s: number; mode: "armed" | "disarmed"; revision: number; mqtt: boolean; live_video: boolean; webhook: boolean; cameras_check_s: number;
  counts: { nodes: number; nodes_online: number; cameras: number; devices: number; devices_online: number; alarms_active: number; automations: number; users: number; events: number };
  storage: { media_files: number; media_bytes: number; media_limit_bytes: number; disk: { free_bytes: number; total_bytes: number } | null };
};
export type AuditEntry = { at: string; action: string; outcome: "allowed" | "denied" | "failed"; actor?: string; target?: string; detail?: string };
export const readSystem = (origin: string) => userCall<SystemSummary>(origin, "GET", "/api/v1/system");
/** What the nodes sent that the server took, refused or partly ignored, per topic. */
export type IngestTopic = { topic: string; accepted: number; rejected: number; ignored_fields: string[]; last_ok_at: string | null; last_error: string | null; last_error_at: string | null; last_payload: string | null };
export const readIngest = (origin: string) => userCall<{ topics: IngestTopic[] }>(origin, "GET", "/api/v1/system/ingest");
export const readAudit = (origin: string, limit = 100) => userCall<{ entries: AuditEntry[] }>(origin, "GET", `/api/v1/audit?limit=${limit}`);
/** Name a device, note something, mark it as known (an administrator's decision) or give it a kind of the operator's own; an empty text removes what was there. */
/** How the machine the server runs on is doing (see ARMOR-SERVER's system_metrics.ts). */
export type MachineMetrics = {
  at_ms: number;
  cpu: { percent: number | null; cores: number; load: [number, number, number]; mhz?: number };
  memory: { total: number; used: number; available: number; swap_total: number; swap_used: number };
  temperatures: Array<{ name: string; celsius: number }>;
  disks: Array<{ mount: string; device: string; kind: "sd" | "usb" | "nvme" | "other"; fs: string; total: number; used: number }>;
  network: Array<{ name: string; up: boolean; rx_bps: number | null; tx_bps: number | null; rx_bytes: number; tx_bytes: number }>;
  uptime_s: number;
  history: Array<{ t: number; cpu: number | null; memory: number; swap: number; temperature: number | null; rx_bps: number; tx_bps: number }>;
};
/** The services of the system, running or not: the programs of the machine (from systemd) and the field nodes. */
export type ServiceState = "running" | "paused" | "stopped" | "failed" | "starting" | "not_installed" | "online" | "offline" | "unknown";
export type ServiceInfo = {
  id: string; name: string; family: string; description: string; kind: "systemd" | "field-node"; state: ServiceState; sub_state?: string; unit?: string; enabled?: boolean | null;
  pid?: number | null; since_ms?: number | null; memory_bytes?: number | null; restarts?: number | null; port?: number | null;
  /** The version of the program, or the firmware of a field node; absent when the server could not tell. */
  version?: string | null;
};
export type ServicesOverview = { time_ms: number; systemd: boolean; services: ServiceInfo[] };
export const readServices = (origin: string) => userCall<ServicesOverview>(origin, "GET", "/api/v1/system/services");
export const readMetrics = (origin: string) => userCall<MachineMetrics>(origin, "GET", "/api/v1/system/metrics");
/** Where the server listens and where Studio is served (see ARMOR-SERVER's connection.ts). */
export type ConnectionSettings = { host?: string; port?: number; studio_port?: number };
/** Whether the server's link to the MQTT broker is encrypted (mqtts) and, when the installation's own authority is pinned, which one (never a path or a key). */
export type MqttTlsView = { configured: boolean; tls: boolean; pinned_ca: boolean; ca?: { fingerprint256: string; subject: string; valid_to: string } };
export type ConnectionState = { active: { host: string; port: number; tls: boolean; studio_origins: string[] }; mqtt_tls?: MqttTlsView; saved: ConnectionSettings; restart_required: boolean };
export const readConnection = (origin: string) => userCall<ConnectionState>(origin, "GET", "/api/v1/system/connection");
export const saveConnection = (origin: string, settings: ConnectionSettings) => userCall<ConnectionState>(origin, "PUT", "/api/v1/system/connection", settings);
