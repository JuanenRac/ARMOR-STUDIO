import type { AlarmSourceType } from "./alarms";
import { endpoint, localSession, timedFetch } from "./transport";
export type EventType = "alert" | "node" | "camera" | "mode" | "device" | "alarm" | "connection" | "system";
export type ClientKind = "studio" | "android" | "node" | "voice" | "other";
export type ConnectionAction = "first_seen" | "login" | "login_failed" | "second_factor_failed" | "logout" | "session_ended" | "session_expired" | "panel_opened";
export type SystemCategory = "node" | "broker" | "settings" | "service" | "update" | "alarm" | "backup";
export type SystemAction = "appeared" | "returned" | "disappeared" | "firmware_changed" | "connected" | "disconnected" | "created" | "changed" | "removed" | "started" | "stopped" | "restarted" | "checked" | "installed" | "rolled_back"
  | "armed" | "disarmed" | "silenced" | "acknowledged" | "arm_requested" | "disarm_requested" | "silence_requested" | "backup_made" | "backup_restored";
export type Reachability = "unknown" | "online" | "offline";
export type AlertLevel = "normal" | "review" | "high";
export type NodeStatus = "online" | "offline" | "stale";
export type ArmorEvent = { id: number; at: string } & (
  | { type: "alert"; node_id: string; from: AlertLevel; to: AlertLevel; targets: number }
  | { type: "node"; node_id: string; from: NodeStatus | null; to: NodeStatus }
  | { type: "camera"; camera_id: string; from: Reachability; to: Reachability }
  | { type: "mode"; mode: "armed" | "disarmed" }
  | { type: "device"; device_id: string; kind: string; field: string; from: boolean | number | null; to: boolean | number }
  | { type: "alarm"; alarm_id: string; state: "raised" | "acknowledged" | "cleared"; severity: "critical" | "high" | "warning"; source: string; source_type: AlarmSourceType; code: string }
  /** A client that connects to the server. The address and the user agent come only to an administrator. */
  | { type: "connection"; action: ConnectionAction; client_kind: ClientKind; client_id: string; user?: string; origin?: "local" | "remote"; two_factor?: boolean; app_version?: string; subject?: string; ip?: string; agent?: string }
  /** The system itself: a node, the broker, a setting (who and what, never the value), a service, an update, the alarm. */
  | { type: "system"; category: SystemCategory; action: SystemAction; subject?: string; by?: string; version?: string; previous_version?: string; profile?: string; outcome?: "allowed" | "denied" | "failed" });
export type Zone = {
  id: string; name: string; action: "ignore"; node_id?: string; sensor_id?: number;
  x_min_mm: number; x_max_mm: number; y_min_mm: number; y_max_mm: number;
};
export type Rules = { schema?: 1; dwell_ms: number; zones: Zone[] };
export type HistoryQuery = { type?: EventType; before?: number; limit?: number; q?: string; since?: string; until?: string; level?: AlertLevel; order?: "asc" | "desc"; category?: SystemCategory; kind?: ClientKind; client?: string; user?: string; /** Also the connections and the events of the system. */ all?: boolean };
export async function listHistory(origin: string, options: HistoryQuery = {}): Promise<{ events: ArmorEvent[]; next_before: number | null }> {
  const query = new URLSearchParams();
  query.set("limit", String(options.limit ?? 50));
  if (options.type) query.set("type", options.type);
  if (options.before) query.set("before", String(options.before));
  if (options.q) query.set("q", options.q);
  if (options.since) query.set("since", options.since);
  if (options.until) query.set("until", options.until);
  if (options.level) query.set("level", options.level);
  if (options.order) query.set("order", options.order);
  if (options.category) query.set("category", options.category);
  if (options.kind) query.set("kind", options.kind);
  if (options.client) query.set("client", options.client);
  if (options.user) query.set("user", options.user);
  if (options.all) query.set("all", "1");
  const response = await timedFetch(endpoint(origin, `/api/v1/history?${query}`), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`History returned ${response.status}`);
  const body = await response.json() as { events?: ArmorEvent[]; next_before?: number | null };
  return { events: Array.isArray(body.events) ? body.events : [], next_before: body.next_before ?? null };
}
/** One device or application the server has seen. `ip` and `agent` are there only for an administrator. */
export type ConnectionClient = {
  id: string; kind: ClientKind; user?: string; label?: string; app_version?: string; origin?: "local" | "remote"; two_factor?: boolean;
  first_seen: string; last_seen: string; last_failure?: string; active_sessions: number; logins_ok: number; logins_failed: number; ip?: string; agent?: string;
};
export async function listConnections(origin: string, options: { kind?: ClientKind; active?: boolean } = {}): Promise<ConnectionClient[]> {
  const query = new URLSearchParams();
  if (options.kind) query.set("kind", options.kind);
  if (options.active) query.set("active", "1");
  const response = await timedFetch(endpoint(origin, `/api/v1/history/connections?${query}`), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`Connections returned ${response.status}`);
  const body = await response.json() as { clients?: ConnectionClient[] };
  return Array.isArray(body.clients) ? body.clients : [];
}
export async function readRules(origin: string): Promise<Rules> {
  const response = await timedFetch(endpoint(origin, "/api/v1/rules"), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`Rules returned ${response.status}`);
  return response.json() as Promise<Rules>;
}
export async function saveRules(origin: string, rules: Rules): Promise<Rules> {
  const response = await timedFetch(endpoint(origin, "/api/v1/rules"), {
    method: "PUT", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...localSession, body: JSON.stringify(rules),
  });
  if (!response.ok) throw new Error(`Rules save returned ${response.status}`);
  return response.json() as Promise<Rules>;
}
export type CameraHealth = { id: string; status: Reachability; since_ms: number | null; last_checked_ms: number | null; consecutive_failures: number };
export async function listCameraStatus(origin: string): Promise<CameraHealth[]> {
  const response = await timedFetch(endpoint(origin, "/api/v1/camera-status"), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`Camera status returned ${response.status}`);
  const body = await response.json() as { cameras?: CameraHealth[] };
  return Array.isArray(body.cameras) ? body.cameras : [];
}
export async function forgetNode(origin: string, id: string): Promise<void> {
  const response = await timedFetch(endpoint(origin, `/api/v1/nodes/${encodeURIComponent(id)}`), { method: "DELETE", ...localSession });
  if (!response.ok && response.status !== 404) throw new Error(`Forget node returned ${response.status}`);
}
export type HistorySummary = {
  total: number; oldest_at: string | null; newest_at: string | null;
  by_type: Record<EventType, number>;
  last_24h: { events: number; high_alerts: number; node_incidents: number; camera_incidents: number };
};
export async function readHistorySummary(origin: string): Promise<HistorySummary> {
  const response = await timedFetch(endpoint(origin, "/api/v1/history/summary"), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`History summary returned ${response.status}`);
  return response.json() as Promise<HistorySummary>;
}
/** Permanently remove history. The server insists on the explicit confirmation this adds. */
export async function deleteHistory(origin: string, scope: { kind: "all" } | { kind: "older-than"; days: number }, type?: EventType): Promise<{ deleted: number; remaining: number }> {
  const query = new URLSearchParams({ confirm: "delete", scope: scope.kind });
  if (scope.kind === "older-than") query.set("days", String(scope.days));
  if (type) query.set("type", type);
  const response = await timedFetch(endpoint(origin, `/api/v1/history?${query}`), { method: "DELETE", headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`History delete returned ${response.status}`);
  return response.json() as Promise<{ deleted: number; remaining: number }>;
}
