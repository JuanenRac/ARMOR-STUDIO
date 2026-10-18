import type { AlarmSourceType } from "./alarms";
import { endpoint, localSession, timedFetch } from "./transport";
export type EventType = "alert" | "node" | "camera" | "mode" | "device" | "alarm";
export type Reachability = "unknown" | "online" | "offline";
export type AlertLevel = "normal" | "review" | "high";
export type NodeStatus = "online" | "offline" | "stale";
export type ArmorEvent = { id: number; at: string } & (
  | { type: "alert"; node_id: string; from: AlertLevel; to: AlertLevel; targets: number }
  | { type: "node"; node_id: string; from: NodeStatus | null; to: NodeStatus }
  | { type: "camera"; camera_id: string; from: Reachability; to: Reachability }
  | { type: "mode"; mode: "armed" | "disarmed" }
  | { type: "device"; device_id: string; kind: string; field: string; from: boolean | number | null; to: boolean | number }
  | { type: "alarm"; alarm_id: string; state: "raised" | "acknowledged" | "cleared"; severity: "critical" | "high" | "warning"; source: string; source_type: AlarmSourceType; code: string });
export type Zone = {
  id: string; name: string; action: "ignore"; node_id?: string; sensor_id?: number;
  x_min_mm: number; x_max_mm: number; y_min_mm: number; y_max_mm: number;
};
export type Rules = { schema?: 1; dwell_ms: number; zones: Zone[] };
export type HistoryQuery = { type?: EventType; before?: number; limit?: number; q?: string; since?: string; until?: string; level?: AlertLevel; order?: "asc" | "desc" };
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
  const response = await timedFetch(endpoint(origin, `/api/v1/history?${query}`), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`History returned ${response.status}`);
  const body = await response.json() as { events?: ArmorEvent[]; next_before?: number | null };
  return { events: Array.isArray(body.events) ? body.events : [], next_before: body.next_before ?? null };
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
