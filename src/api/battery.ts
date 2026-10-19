import { ApiError, askElevation, endpoint, localSession, timedFetch, userCall } from "./transport";
// ---- writing to a Pylontech battery (the server asks the gateway node; see ARMOR-SERVER src/battery_write.ts) ------------------------------------------------------------

export type BatteryRisk = "low" | "medium" | "high" | "irreversible";
export type BatteryParamRule = { type: "enum" | "boolean" | "integer" | "string" | "serial" | "limits" | "protections"; required?: boolean; values?: string[]; minimum?: number; maximum?: number; maxLength?: number };
export type BatteryOpSpec = { id: string; risk: BatteryRisk; needs_idle: boolean; alarm_ok: boolean; atomic: boolean; group: string; params: Record<string, BatteryParamRule> };
export type BatteryLimitGroup = { name: string; lowest: number; highest: number; unit: string; keys: [string, string][]; orders: [string, string][] };
export type BatteryCatalog = {
  version: number;
  ops: BatteryOpSpec[];
  models: { name: string; official_ah: number; firmware: boolean }[];
  limit_groups: BatteryLimitGroup[];
  protections: string[];
  expert_blocked: string[];
  limits: { idle_current_ma: number; arm_window_s: number; cooldown_s: number; image_min_bytes: number; image_max_bytes: number; chunk_bytes: number; max_chunks: number; serial_pattern: string; no_serial: string };
  refusals: string[];
};
export type BatteryStage = "arming" | "armed" | "starting" | "running" | "done" | "rejected" | "expired" | "lost" | "withdrawn";
export type BatteryOperation = {
  id: string; node: string; port: number; op: string; params: Record<string, unknown>; actor: string; created_at: string; updated_at: string; stage: BatteryStage;
  summary?: string; risk?: BatteryRisk; atomic?: boolean; canonical?: string; battery?: { model: string; serial: string; soft_version: string; board: string; capacity_ah?: number }; refusal?: string;
  snapshot_before?: string; outcome?: "running" | "ok" | "failed" | "partial" | "retry" | "rejected"; code?: string; steps_done?: number; steps_total?: number; packets_sent?: number; packets_total?: number;
  before?: string; after?: string; diff?: { label: string; before: string; after: string }[]; transcript?: string; armed_until?: string; restore?: { op: string; params: Record<string, unknown> } | null;
  staging?: { sent: number; total: number }; image?: { id: string; board: string; version: string; sha256: string; size: number }; cancel_requested?: boolean;
};
export type BatteryImage = { image_id: string; size: number; crc32: number; sha256: string; board: string; version: string };

export const batteryCatalog = (origin: string) => userCall<{ enabled: boolean; catalog: BatteryCatalog }>(origin, "GET", "/api/v1/solar/battery-ops/catalog");
export const batteryOperations = (origin: string) => userCall<{ enabled: boolean; operations: BatteryOperation[] }>(origin, "GET", "/api/v1/solar/battery-ops");
export const batteryOperation = (origin: string, id: string) => userCall<BatteryOperation>(origin, "GET", `/api/v1/solar/battery-ops/${encodeURIComponent(id)}`);
export const batteryArm = (origin: string, request: { node: string; port: number; op: string; params?: Record<string, unknown>; serial: string }) => userCall<BatteryOperation>(origin, "POST", "/api/v1/solar/battery-ops", request);
export const batteryExecute = (origin: string, id: string, serial: string) => userCall<BatteryOperation>(origin, "POST", `/api/v1/solar/battery-ops/${encodeURIComponent(id)}/execute`, { serial });
export const batteryCancel = (origin: string, id: string) => userCall<BatteryOperation>(origin, "POST", `/api/v1/solar/battery-ops/${encodeURIComponent(id)}/cancel`, {});
export const batteryRestore = (origin: string, id: string, serial: string) => userCall<BatteryOperation>(origin, "POST", `/api/v1/solar/battery-ops/${encodeURIComponent(id)}/restore`, { serial });

/** Hands the server a firmware image (the .bin the maker publishes); it is kept in memory for an hour and nothing is sent to a battery. */
export async function batteryImageUpload(origin: string, file: File): Promise<BatteryImage> {
  const send = async (): Promise<Response> => timedFetch(endpoint(origin, "/api/v1/solar/battery-ops/images"), {
    method: "POST", headers: { Accept: "application/json", "Content-Type": "application/octet-stream" }, ...localSession, body: file, signal: AbortSignal.timeout(60_000),
  });
  let response = await send();
  let parsed = await response.json().catch(() => ({})) as BatteryImage & { code?: string; error?: string };
  if (response.status === 403 && parsed.code === "elevation_required" && await askElevation(origin)) {
    response = await send();
    parsed = await response.json().catch(() => ({})) as BatteryImage & { code?: string; error?: string };
  }
  if (!response.ok) throw new ApiError(response.status, typeof parsed.code === "string" ? parsed.code : "generic");
  return parsed;
}
