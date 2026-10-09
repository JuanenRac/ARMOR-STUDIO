import type { SolarCatalog, SolarDeviceView, SolarKind, SolarRegistration, SolarSample, SolarTotals } from "./solarModel";
import type { SystemState } from "./types";
import type { DeviceNote, NetworkOverview, NetworkPort, NetworkSample } from "./networkModel";
export type DiscoveredCamera = { host: string; ports: number[] };
export type CameraConnection = { id: string; name: string; host: string; snapshotUrl: string; rtspPath: string; previewPath?: string; username: string; password: string; onvifPort: number; rtspPort: number };
export type PublicCameraConnection = Omit<CameraConnection, "password"> & { hasCredentials: boolean; liveVideoAvailable: boolean };
export type CameraView = Omit<PublicCameraConnection, "username">;
export type MediaItem = { id: string; cameraId: string; kind: "snapshot" | "recording"; file: string; createdAt: string; bytes: number };
const endpoint = (origin: string, suffix: string) => origin.replace(/\/$/, "") + suffix;
const localSession = { credentials: "include" as const };
/**
 * Every call of the console to the server gives up after a while. A browser keeps only a few connections open to one address, and a call that is never
 * answered would wait for ever behind them - the buttons would seem dead until the page is reloaded.
 */
const CALL_TIMEOUT_MS = 30_000;
const timedFetch = (url: string, init: RequestInit = {}): Promise<Response> => fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(CALL_TIMEOUT_MS) });
/**
 * Whether the Studio session is still valid. Only the server saying so ends it: a slow answer, a rate limit or a network
 * hiccup is "unknown" and must never throw the operator back to the sign-in page.
 */
export type SessionState = "active" | "ended" | "unknown";
export async function studioSessionState(origin: string): Promise<SessionState> {
  try {
    const response = await timedFetch(endpoint(origin, "/api/v1/studio/session"), { headers: { Accept: "application/json" }, ...localSession });
    if (response.status === 401) return "ended";
    if (!response.ok) return "unknown";
    return (await response.json() as { authenticated?: boolean }).authenticated ? "active" : "ended";
  } catch { return "unknown"; }
}
export async function studioSessionActive(origin: string): Promise<boolean> { return (await studioSessionState(origin)) === "active"; }
export async function openStudioSession(origin: string, username: string, password: string): Promise<void> {
  const response = await timedFetch(endpoint(origin, "/api/v1/studio/session"), {
    method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...localSession,
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error(`Studio login returned ${response.status}`);
}
export async function openOperatorSession(origin: string, token: string): Promise<string> {
  const response = await timedFetch(endpoint(origin, "/api/v1/operator/session"), { method: "POST", headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, ...localSession });
  if (!response.ok) throw new Error(`Operator session returned ${response.status}`);
  const body = await response.json() as { expiresAt?: string };
  return body.expiresAt ?? "";
}
export type WeatherPlace = { name: string; region: string; country: string; lat: number; lon: number };
export type Preferences = { language?: string; theme?: string; weatherPlace?: WeatherPlace | null };
/** Language, theme and the saved weather place, tied to the account: they travel with the person, not the browser or address. */
export async function getPreferences(origin: string): Promise<Preferences> {
  const response = await timedFetch(endpoint(origin, "/api/v1/preferences"), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`Server returned ${response.status}`);
  return response.json() as Promise<Preferences>;
}
export async function savePreferences(origin: string, patch: Preferences): Promise<Preferences> {
  const response = await timedFetch(endpoint(origin, "/api/v1/preferences"), {
    method: "PUT", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...localSession, body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(`Server returned ${response.status}`);
  return response.json() as Promise<Preferences>;
}
export async function readStatus(origin: string): Promise<SystemState> {
  const response = await timedFetch(`${origin.replace(/\/$/, "")}/api/v1/status`, { headers: { Accept: "application/json" }, ...localSession, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`Server returned ${response.status}`);
  return response.json() as Promise<SystemState>;
}
export async function discoverCameras(origin: string): Promise<DiscoveredCamera[]> {
  const response = await timedFetch(`${origin.replace(/\/$/, "")}/api/v1/cameras/discover`, {
    method: "POST", headers: { Accept: "application/json" }, ...localSession,
  });
  if (!response.ok) throw new Error(`Camera discovery returned ${response.status}`);
  const body = await response.json() as { cameras?: DiscoveredCamera[] };
  return Array.isArray(body.cameras) ? body.cameras : [];
}
export async function listConfiguredCameras(origin: string): Promise<PublicCameraConnection[]> {
  const response = await timedFetch(origin.replace(/\/$/, "") + "/api/v1/cameras", { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error("Camera list returned " + response.status);
  const body = await response.json() as { cameras?: PublicCameraConnection[] };
  return Array.isArray(body.cameras) ? body.cameras : [];
}
export async function listCameraViews(origin: string): Promise<CameraView[]> {
  const response = await timedFetch(origin.replace(/\/$/, "") + "/api/v1/camera-views", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Camera view list returned " + response.status);
  const body = await response.json() as { cameras?: CameraView[] };
  return Array.isArray(body.cameras) ? body.cameras : [];
}
export async function configureCamera(origin: string, camera: CameraConnection): Promise<PublicCameraConnection> {
  const response = await timedFetch(origin.replace(/\/$/, "") + "/api/v1/cameras/configure", {
    method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...localSession, body: JSON.stringify(camera),
  });
  if (!response.ok) throw new Error("Camera configuration returned " + response.status);
  return response.json() as Promise<PublicCameraConnection>;
}
export async function deleteCamera(origin: string, id: string): Promise<void> {
  const response = await timedFetch(endpoint(origin, "/api/v1/cameras/" + encodeURIComponent(id)), { method: "DELETE", ...localSession });
  if (!response.ok) throw new Error("Camera delete returned " + response.status);
}
export async function discoverCameraStreams(origin: string, id: string): Promise<{ paths: string[]; camera: PublicCameraConnection }> {
  const response = await timedFetch(origin.replace(/\/$/, "") + "/api/v1/cameras/" + encodeURIComponent(id) + "/discover-rtsp", {
    method: "POST", headers: { Accept: "application/json" }, ...localSession,
  });
  if (!response.ok) throw new Error("RTSP discovery returned " + response.status);
  return response.json() as Promise<{ paths: string[]; camera: PublicCameraConnection }>;
}
export async function createCameraStreamUrl(origin: string, id: string): Promise<string> {
  const response = await timedFetch(endpoint(origin, `/api/v1/cameras/${encodeURIComponent(id)}/stream-ticket`), {
    method: "POST", headers: { Accept: "application/json" }, ...localSession,
  });
  if (!response.ok) throw new Error(`Camera stream ticket returned ${response.status}`);
  const body = await response.json() as { path?: string };
  if (!body.path || !body.path.startsWith("/api/v1/cameras/")) throw new Error("Camera stream ticket response is invalid");
  return endpoint(origin, body.path);
}
export async function sendPtz(origin: string, id: string, command: string): Promise<void> {
  const response = await timedFetch(origin.replace(/\/$/, "") + "/api/v1/cameras/" + encodeURIComponent(id) + "/ptz", {
    method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...localSession, body: JSON.stringify({ command }),
  });
  if (!response.ok) {
    // The server explains why in plain words (login refused, no PTZ hardware, camera silent): show that.
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || "PTZ command returned " + response.status);
  }
}
export async function captureSnapshot(origin: string, id: string): Promise<MediaItem> {
  const response = await timedFetch(endpoint(origin, "/api/v1/cameras/" + encodeURIComponent(id) + "/snapshot"), { method: "POST", headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error("Snapshot returned " + response.status);
  return (await response.json() as { item: MediaItem }).item;
}
export async function startCameraRecording(origin: string, id: string): Promise<void> {
  const response = await timedFetch(endpoint(origin, "/api/v1/cameras/" + encodeURIComponent(id) + "/recordings/start"), { method: "POST", headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error("Recording start returned " + response.status);
}
export async function stopCameraRecording(origin: string, id: string): Promise<MediaItem> {
  const response = await timedFetch(endpoint(origin, "/api/v1/cameras/" + encodeURIComponent(id) + "/recordings/stop"), { method: "POST", headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error("Recording stop returned " + response.status);
  return (await response.json() as { item: MediaItem }).item;
}
export async function listMedia(origin: string): Promise<{ items: MediaItem[]; activeCameraIds: string[] }> {
  const response = await timedFetch(endpoint(origin, "/api/v1/media"), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error("Media list returned " + response.status);
  const body = await response.json() as { items?: MediaItem[]; activeCameraIds?: string[] };
  return { items: Array.isArray(body.items) ? body.items : [], activeCameraIds: Array.isArray(body.activeCameraIds) ? body.activeCameraIds : [] };
}
export async function deleteMedia(origin: string, item: MediaItem): Promise<void> {
  const kind = item.kind === "snapshot" ? "snapshots" : "recordings";
  const response = await timedFetch(endpoint(origin, `/api/v1/media/${encodeURIComponent(item.cameraId)}/${kind}/${encodeURIComponent(item.file)}`), { method: "DELETE", ...localSession });
  if (!response.ok) throw new Error("Media delete returned " + response.status);
}
export async function deleteAllMedia(origin: string, kind: "snapshot" | "recording" | "all"): Promise<number> {
  const response = await timedFetch(endpoint(origin, "/api/v1/media"), { method: "DELETE", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...localSession, body: JSON.stringify({ kind }) });
  if (!response.ok) throw new Error("Media delete returned " + response.status);
  return (await response.json() as { deleted: number }).deleted;
}
export function mediaUrl(origin: string, item: MediaItem): string {
  const kind = item.kind === "snapshot" ? "snapshots" : "recordings";
  return endpoint(origin, `/api/v1/media/${encodeURIComponent(item.cameraId)}/${kind}/${encodeURIComponent(item.file)}`);
}
export function eventSocket(origin: string, token: string, onState: (state: SystemState) => void, onClose: () => void): WebSocket {
  const url = new URL(origin); url.protocol = url.protocol === "https:" ? "wss:" : "ws:"; url.pathname = "/api/v1/events";
  const socket = new WebSocket(url); // Browsers cannot set Authorization headers; a production session exchanges a short-lived WS ticket.
  socket.addEventListener("message", event => { const data = JSON.parse(String(event.data)) as { type?: string; state?: SystemState }; if (data.type === "state" && data.state) onState(data.state); });
  socket.addEventListener("close", onClose);
  void token; // Explicitly avoid storing or placing tokens in a URL.
  return socket;
}

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
  | { type: "alarm"; alarm_id: string; state: "raised" | "acknowledged" | "cleared"; severity: "critical" | "high" | "warning"; source: string; source_type: "node" | "camera" | "device"; code: string });
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
export type ServerInfo = { service: string; version: string; uptime_s: number; mode?: "armed" | "disarmed"; live_video?: boolean; mqtt?: boolean };
export async function readInfo(origin: string): Promise<ServerInfo> {
  const response = await timedFetch(endpoint(origin, "/api/v1/info"), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`Info returned ${response.status}`);
  return response.json() as Promise<ServerInfo>;
}
export async function closeStudioSession(origin: string): Promise<void> {
  await timedFetch(endpoint(origin, "/api/v1/studio/session"), { method: "DELETE", ...localSession }).catch(() => undefined);
}

// ---- Studio users -------------------------------------------------------------------------------------------------------------

export type Role = "admin" | "operator";
export type StudioUser = { id: string; username: string; role: Role };
export type ListedUser = StudioUser & { createdAt: string; updatedAt: string; current: boolean };
/** An answer the server refused, with the stable `code` that says why. */
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) { super(`${status} ${code}`); }
}
async function userCall<T>(origin: string, method: string, route: string, body?: unknown): Promise<T> {
  const response = await timedFetch(endpoint(origin, route), {
    method, headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, ...localSession,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const parsed = await response.json().catch(() => ({})) as { code?: string; error?: string } & T;
  // The administration answers `{ error: "a_code" }` (some of them with a line number, "invalid_line:3"); the users' answers carry a separate `code`.
  const machine = typeof parsed.error === "string" && /^[a-z_]+(:\d+)?$/.test(parsed.error) ? parsed.error : undefined;
  if (!response.ok) throw new ApiError(response.status, parsed.code ?? machine ?? (response.status === 403 || response.status === 401 ? "forbidden" : "generic"));
  return parsed;
}
/** Who is signed in: the user, nobody (the server said so), or unknown (it could not be asked - never to be taken as "not an administrator"). */
export type SessionUserState = { state: "user"; user: StudioUser } | { state: "anonymous" } | { state: "unknown"; reason: string };
export async function sessionUserState(origin: string): Promise<SessionUserState> {
  try {
    const response = await timedFetch(endpoint(origin, "/api/v1/studio/session"), { headers: { Accept: "application/json" }, ...localSession });
    if (response.status === 401) return { state: "anonymous" };
    if (!response.ok) return { state: "unknown", reason: `the server answered ${response.status}` };
    const body = await response.json() as { authenticated?: boolean; user?: StudioUser };
    return body.authenticated && body.user ? { state: "user", user: body.user } : { state: "anonymous" };
  } catch (error) { return { state: "unknown", reason: error instanceof Error && error.name ? `${error.name}: ${error.message}`.slice(0, 120) : "no answer" }; }
}
/** Who is signed in (null when nobody is). */
export async function readSessionUser(origin: string): Promise<StudioUser | null> {
  try { return (await userCall<{ authenticated: boolean; user?: StudioUser }>(origin, "GET", "/api/v1/studio/session")).user ?? null; } catch { return null; }
}
export const listUsers = (origin: string) => userCall<{ users: ListedUser[]; minPasswordLength: number }>(origin, "GET", "/api/v1/users");
export const createUser = (origin: string, user: { username: string; password: string; role: Role }) => userCall<StudioUser>(origin, "POST", "/api/v1/users", user);
export const updateUser = (origin: string, id: string, change: { username?: string; password?: string; role?: Role }) => userCall<StudioUser>(origin, "PATCH", `/api/v1/users/${encodeURIComponent(id)}`, change);
export const deleteUser = (origin: string, id: string) => userCall<void>(origin, "DELETE", `/api/v1/users/${encodeURIComponent(id)}`);
// ---- administration (an administrator): services, settings files, the broker's accounts, adopting a node ----
export type AdminService = { id: string; unit: string; description: string; installed: boolean; active: string; sub: string; enabled: string; pid: number; since: string };
export type AdminFileInfo = { id: string; path: string; format: string; description: string; units: string[]; exists: boolean; mtime: number };
export type AdminFile = AdminFileInfo & { content: string; masked?: boolean };
export type BrokerAccount = { user: string; role: string; name: string; manageable: boolean; topics: string[] };
export type ProvisionResult = { ok: boolean; written: boolean; why: string; broker: { uri: string; username: string; password: string } };
export const adminStatus = (origin: string) => userCall<{ available: boolean; reason?: string; hint?: string }>(origin, "GET", "/api/v1/admin/status");
export const adminServices = (origin: string) => userCall<{ services: AdminService[] }>(origin, "GET", "/api/v1/admin/services");
export const adminServiceAction = (origin: string, id: string, action: "start" | "stop" | "restart" | "reload" | "pause" | "resume") => userCall<{ ok: boolean }>(origin, "POST", `/api/v1/admin/services/${encodeURIComponent(id)}/${action}`);
export const adminFiles = (origin: string) => userCall<{ files: AdminFileInfo[] }>(origin, "GET", "/api/v1/admin/files");
export const adminFile = (origin: string, id: string) => userCall<AdminFile>(origin, "GET", `/api/v1/admin/files/${encodeURIComponent(id)}`);
export const adminSaveFile = (origin: string, id: string, change: { content: string; restart: boolean; expect_mtime?: number }) => userCall<{ ok: boolean; restarted: string[]; mtime: number }>(origin, "PUT", `/api/v1/admin/files/${encodeURIComponent(id)}`, change);
export const adminAccounts = (origin: string) => userCall<{ accounts: BrokerAccount[]; installed?: boolean }>(origin, "GET", "/api/v1/admin/mqtt/accounts");
export const adminAddAccount = (origin: string, role: string, name: string) => userCall<{ ok: boolean; user: string; password: string }>(origin, "POST", "/api/v1/admin/mqtt/accounts", { role, name });
export const adminRemoveAccount = (origin: string, user: string) => userCall<{ ok: boolean }>(origin, "DELETE", `/api/v1/admin/mqtt/accounts/${encodeURIComponent(user)}`);
export const adminProvisionNode = (origin: string, request: { node_id: string; address: string; broker_host: string; broker_port?: number; panel_user?: string; panel_password?: string }) => userCall<ProvisionResult>(origin, "POST", "/api/v1/admin/nodes/provision", request);
// ---- Firmware of the field nodes (the server updates them, one at a time, with the login of their own panel) --------------------------------------------

export type FirmwareKind = "radar" | "solar" | "electrical" | "hmi";
export type FirmwareTargetState = "waiting" | "checking" | "signing_in" | "uploading" | "restarting" | "done" | "failed";
export type FirmwareTarget = { address: string; node_id?: string; state: FirmwareTargetState; version_before?: string; version_after?: string; error?: string; progress?: number; sent?: number; total?: number; waited_s?: number };
export type FirmwareJob = { id: string; kind: FirmwareKind; source: "github" | "upload"; state: "preparing" | "running" | "done" | "failed"; version?: string; bytes?: number; sha256?: string; error?: string; targets: FirmwareTarget[] };
export type FirmwareRelease = { kind: FirmwareKind; repo: string; version: string; bytes: number; checksum: boolean };
export type FirmwareProbe = { address: string; reachable: boolean; node_id?: string; version?: string; board?: string };
export type FirmwareUpload = { id: string; name: string; bytes: number; sha256: string };
export const firmwareRelease = (origin: string, kind: FirmwareKind) => userCall<FirmwareRelease>(origin, "GET", `/api/v1/admin/firmware/releases/${kind}`);
export const firmwareProbe = (origin: string, addresses: string[]) => userCall<{ nodes: FirmwareProbe[] }>(origin, "POST", "/api/v1/admin/firmware/probe", { addresses });
export const firmwareStart = (origin: string, request: { kind: FirmwareKind; source: "github" | "upload"; upload_id?: string; targets: { address: string; node_id?: string }[]; panel_user: string; panel_password: string }) =>
  userCall<{ id: string }>(origin, "POST", "/api/v1/admin/firmware/jobs", request);
export const firmwareJob = (origin: string, id: string) => userCall<FirmwareJob>(origin, "GET", `/api/v1/admin/firmware/jobs/${encodeURIComponent(id)}`);
/** Hands the server an image (the .bin of a node project) to send to the nodes. */
export async function firmwareUpload(origin: string, file: File): Promise<FirmwareUpload> {
  const response = await timedFetch(endpoint(origin, "/api/v1/admin/firmware/uploads"), {
    method: "POST", headers: { Accept: "application/json", "Content-Type": "application/octet-stream", "X-Firmware-Name": file.name }, ...localSession, body: file, signal: AbortSignal.timeout(120_000),
  });
  const parsed = await response.json().catch(() => ({})) as FirmwareUpload & { error?: string };
  if (!response.ok) throw new ApiError(response.status, typeof parsed.error === "string" && /^[a-z_]+$/.test(parsed.error) ? parsed.error : "generic");
  return parsed;
}

// ---- Where the alarms are sent ----------------------------------------------------------------------------------------------------------------------

export type NotificationsStatus = { webhook: boolean; mqtt: boolean; telegram: boolean; homeassistant: boolean; language: string };
export type NotificationTestResult = { channel: string; ok: boolean; detail: string };
export const notificationsStatus = (origin: string) => userCall<NotificationsStatus>(origin, "GET", "/api/v1/admin/notifications");
export const notificationsTest = (origin: string, channel?: string) => userCall<{ results: NotificationTestResult[] }>(origin, "POST", "/api/v1/admin/notifications/test", channel ? { channel } : {});
export const changeAccount = (origin: string, change: { currentPassword: string; username?: string; newPassword?: string }) => userCall<StudioUser>(origin, "PATCH", "/api/v1/account", change);

/** Arm or disarm the system (an operator, from Studio). Answers with the new state of the perimeter. */
export async function setSystemMode(origin: string, mode: "armed" | "disarmed"): Promise<SystemState> {
  const response = await timedFetch(endpoint(origin, "/api/v1/mode"), { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...localSession, body: JSON.stringify({ mode }) });
  if (!response.ok) throw new ApiError(response.status, response.status === 401 ? "session_ended" : response.status === 403 ? "forbidden" : "generic");
  return response.json() as Promise<SystemState>;
}

// ---- Devices, alarms, automations, the system, and the site design kept on the server -------------------------------------------

export type DeviceKind = "smoke" | "co" | "gas" | "water_leak" | "panic_button" | "door" | "window" | "motion" | "glass_break" | "vibration" | "climate" | "temperature" | "humidity" | "light_level" | "smart_plug" | "smart_light" | "smart_switch" | "siren" | "lock" | "valve";
export type DeviceProtocol = "wifi" | "bluetooth" | "zigbee" | "zwave" | "thread" | "lora" | "rf433" | "wired" | "other";
export type DeviceState = Record<string, boolean | number>;
export type MapEntry = { field: string; path: string; invert?: boolean };
export type DeviceSource = { type: "push" } | { type: "mqtt"; topic: string; map?: MapEntry[]; availability_topic?: string };
export type DeviceCommandsView = { mqtt?: { topic: string; on?: string; off?: string; toggle?: string; assume_state?: boolean }; http?: { on?: boolean; off?: boolean; toggle?: boolean } };
export type DeviceCommandsInput = { mqtt?: { topic: string; on?: string; off?: string; toggle?: string; assume_state?: boolean }; http?: { on?: string; off?: string; toggle?: string } };
export type StudioDevice = {
  id: string; name: string; kind: DeviceKind; protocol: DeviceProtocol; location: string; category: "sensor" | "actuator";
  source: DeviceSource; commands: DeviceCommandsView; can_command: boolean; expected_interval_s: number;
  state: DeviceState; online: boolean; last_seen: string | null; created_at: string;
};
export type DeviceInput = { id?: string; name?: string; kind?: DeviceKind; protocol?: DeviceProtocol; location?: string; source?: DeviceSource; commands?: DeviceCommandsInput; expected_interval_s?: number };
export type Severity = "critical" | "high" | "warning";
export type Alarm = {
  id: string; key: string; source: { type: "node" | "camera" | "device" | "solar" | "electrical" | "network"; id: string }; severity: Severity; code: string;
  raised_at: string; acknowledged_at?: string; acknowledged_by?: string; cleared_at?: string;
  /** The facts the server attached (which device, which port, what the numbers were). */
  detail?: Record<string, string | number | boolean>;
};
export type Trigger = { type: "device"; device_id: string; field: string; equals: boolean | number } | { type: "alarm"; severity?: Severity; source_type?: "node" | "camera" | "device"; source_id?: string } | { type: "mode"; mode: "armed" | "disarmed" };
export type AutomationAction = { type: "device"; device_id: string; command: "on" | "off" | "toggle"; for_s?: number } | { type: "notify" };
export type Automation = { id: string; name: string; enabled: boolean; trigger: Trigger; when_mode: "any" | "armed" | "disarmed"; actions: AutomationAction[]; created_at: string; last_run: string | null; runs: number };
export type AutomationInput = { name?: string; enabled?: boolean; trigger?: Trigger; when_mode?: "any" | "armed" | "disarmed"; actions?: AutomationAction[] };
export type SystemSummary = {
  service: string; version: string; node: string; uptime_s: number; mode: "armed" | "disarmed"; revision: number; mqtt: boolean; live_video: boolean; webhook: boolean; cameras_check_s: number;
  counts: { nodes: number; nodes_online: number; cameras: number; devices: number; devices_online: number; alarms_active: number; automations: number; users: number; events: number };
  storage: { media_files: number; media_bytes: number; media_limit_bytes: number; disk: { free_bytes: number; total_bytes: number } | null };
};
export type AuditEntry = { at: string; action: string; outcome: "allowed" | "denied" | "failed"; actor?: string; target?: string; detail?: string };
export type SiteDocument = { revision: number; updated_at: string | null; updated_by: string | null; site: Record<string, unknown> | null };

export const listDevices = (origin: string) => userCall<{ devices: StudioDevice[]; kinds: Array<{ kind: DeviceKind; category: "sensor" | "actuator"; alarm: "always" | "armed" | "none"; severity: Severity; commands: string[] }>; protocols: DeviceProtocol[] }>(origin, "GET", "/api/v1/devices");
export const createDevice = (origin: string, input: DeviceInput) => userCall<StudioDevice>(origin, "POST", "/api/v1/devices", input);
export const updateDevice = (origin: string, id: string, input: DeviceInput) => userCall<StudioDevice>(origin, "PATCH", `/api/v1/devices/${encodeURIComponent(id)}`, input);
export const deleteDevice = (origin: string, id: string) => userCall<void>(origin, "DELETE", `/api/v1/devices/${encodeURIComponent(id)}`);
export const commandDevice = (origin: string, id: string, command: "on" | "off" | "toggle") => userCall<{ ok: boolean; device: StudioDevice }>(origin, "POST", `/api/v1/devices/${encodeURIComponent(id)}/command`, { command });
export const setDeviceState = (origin: string, id: string, state: DeviceState) => userCall<StudioDevice>(origin, "POST", `/api/v1/devices/${encodeURIComponent(id)}/state`, { state });
export const listAlarms = (origin: string) => userCall<{ active: Alarm[]; recent: Alarm[] }>(origin, "GET", "/api/v1/alarms");
export const acknowledgeAlarm = (origin: string, id: string) => userCall<Alarm>(origin, "POST", `/api/v1/alarms/${encodeURIComponent(id)}/acknowledge`);
export const acknowledgeAllAlarms = (origin: string) => userCall<{ acknowledged: number }>(origin, "POST", "/api/v1/alarms/acknowledge");
export const deleteAlarm = (origin: string, id: string) => userCall<Alarm>(origin, "DELETE", `/api/v1/alarms/${encodeURIComponent(id)}`);
export const clearAlarmRecord = (origin: string) => userCall<{ deleted: number }>(origin, "DELETE", "/api/v1/alarms");
export const listAutomations = (origin: string) => userCall<{ automations: Automation[] }>(origin, "GET", "/api/v1/automations");
export const createAutomation = (origin: string, input: AutomationInput) => userCall<Automation>(origin, "POST", "/api/v1/automations", input);
export const updateAutomation = (origin: string, id: string, input: AutomationInput) => userCall<Automation>(origin, "PATCH", `/api/v1/automations/${encodeURIComponent(id)}`, input);
export const deleteAutomation = (origin: string, id: string) => userCall<void>(origin, "DELETE", `/api/v1/automations/${encodeURIComponent(id)}`);
export const runAutomation = (origin: string, id: string) => userCall<{ ok: boolean }>(origin, "POST", `/api/v1/automations/${encodeURIComponent(id)}/run`);
export const readSystem = (origin: string) => userCall<SystemSummary>(origin, "GET", "/api/v1/system");
export const readAudit = (origin: string, limit = 100) => userCall<{ entries: AuditEntry[] }>(origin, "GET", `/api/v1/audit?limit=${limit}`);
export const readSite = (origin: string) => userCall<SiteDocument>(origin, "GET", "/api/v1/site");
/** Save the design. A 409 (someone saved first) comes back as an ApiError whose `current` holds their version. */
export async function saveSite(origin: string, revision: number, site: Record<string, unknown>): Promise<{ revision: number } | { conflict: SiteDocument }> {
  const response = await timedFetch(endpoint(origin, "/api/v1/site"), { method: "PUT", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...localSession, body: JSON.stringify({ revision, site }) });
  if (response.status === 409) return { conflict: (await response.json() as { current: SiteDocument }).current };
  if (!response.ok) throw new ApiError(response.status, "site_save_failed");
  return { revision: (await response.json() as { revision: number }).revision };
}

/** The versions the server keeps of each of the three designs (what it had before the changes), to be taken back from. */
export type DesignKind = "site" | "electrical" | "network";
export type DesignVersion = { id: string; revision: number; saved_at: string; updated_by: string | null; counts: Record<string, number> };
const DESIGN_ROUTE: Record<DesignKind, string> = { site: "/api/v1/site", electrical: "/api/v1/electrical/design", network: "/api/v1/network/design" };
export const listDesignVersions = (origin: string, kind: DesignKind) => userCall<{ versions: DesignVersion[] }>(origin, "GET", `${DESIGN_ROUTE[kind]}/versions`);
export async function readDesignVersion(origin: string, kind: DesignKind, id: string): Promise<Record<string, unknown> | null> {
  const document = await userCall<Record<string, unknown>>(origin, "GET", `${DESIGN_ROUTE[kind]}/versions/${encodeURIComponent(id)}`);
  const design = document[kind];
  return typeof design === "object" && design !== null ? design as Record<string, unknown> : null;
}

export type ElectricalDocument = { revision: number; updated_at: string | null; updated_by: string | null; electrical: Record<string, unknown> | null };
export const readElectrical = (origin: string) => userCall<ElectricalDocument>(origin, "GET", "/api/v1/electrical/design");
/** Save the electrical drawing. A 409 (someone saved first) comes back as `conflict` with their version. */
export async function saveElectrical(origin: string, revision: number, electrical: Record<string, unknown>): Promise<{ revision: number } | { conflict: ElectricalDocument }> {
  const response = await timedFetch(endpoint(origin, "/api/v1/electrical/design"), { method: "PUT", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...localSession, body: JSON.stringify({ revision, electrical }) });
  if (response.status === 409) return { conflict: (await response.json() as { current: ElectricalDocument }).current };
  if (!response.ok) throw new ApiError(response.status, "electrical_save_failed");
  return { revision: (await response.json() as { revision: number }).revision };
}

// ---- what the ARMOR-ELECTRICAL nodes measure -------------------------------------------------------------------------------------------
export type ElectricalChannelReading = {
  id: string; domain: "ac" | "dc"; label?: string; voltage_v?: number; current_a?: number; power_w?: number; energy_kwh?: number; frequency_hz?: number; power_factor?: number;
  state?: "closed" | "open" | "unknown"; alarm?: boolean; alarm_code?: string;
};
/** A switch of a node (a source transfer): what its auxiliary contacts show, never what was asked. Studio only reads it: nothing here sends a command. */
export type ElectricalSwitchReading = {
  id: string; kind: "transfer"; label?: string; source_a?: string; source_b?: string; a_closed: boolean; b_closed: boolean;
  selected: "none" | "a" | "b"; wanted: "none" | "a" | "b"; closing: boolean; armed: boolean; fault: "none" | "did_not_close" | "did_not_open" | "both_closed" | "disabled";
};
export type ElectricalNodeReading = { node_id: string; reading: { kind: "electrical"; node_id: string; timestamp_ms: number; switching_enabled?: boolean; channels: ElectricalChannelReading[]; switches?: ElectricalSwitchReading[] }; received_at: string; stale: boolean };
export type ElectricalReadings = { nodes: ElectricalNodeReading[]; totals: { nodes: number; channels: number; stale: number; grid_w: number | null; grid_kwh: number | null; alarms: number } };
export async function listElectricalReadings(origin: string): Promise<ElectricalReadings> {
  const response = await timedFetch(endpoint(origin, "/api/v1/electrical/readings"), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`Electrical readings returned ${response.status}`);
  return response.json() as Promise<ElectricalReadings>;
}

// ---- the local network, as the ARMOR-NETWORK nodes see it -------------------------------------------------------------------------------
export type NetworkDocument = { revision: number; updated_at: string | null; updated_by: string | null; network: Record<string, unknown> | null };
export const listNetwork = (origin: string, hidden = false) => userCall<NetworkOverview>(origin, "GET", `/api/v1/network${hidden ? "?hidden=1" : ""}`);
export const readNetworkHistory = (origin: string, node: string, minutes: number) => userCall<{ node_id: string; minutes: number; samples: NetworkSample[] }>(origin, "GET", `/api/v1/network/history?node=${encodeURIComponent(node)}&minutes=${minutes}`);
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
};
export type ServicesOverview = { time_ms: number; systemd: boolean; services: ServiceInfo[] };
export const readServices = (origin: string) => userCall<ServicesOverview>(origin, "GET", "/api/v1/system/services");
export const readMetrics = (origin: string) => userCall<MachineMetrics>(origin, "GET", "/api/v1/system/metrics");
/** Where the server listens and where Studio is served (see ARMOR-SERVER's connection.ts). */
export type ConnectionSettings = { host?: string; port?: number; studio_port?: number };
export type ConnectionState = { active: { host: string; port: number; tls: boolean; studio_origins: string[] }; saved: ConnectionSettings; restart_required: boolean };
export const readConnection = (origin: string) => userCall<ConnectionState>(origin, "GET", "/api/v1/system/connection");
export const saveConnection = (origin: string, settings: ConnectionSettings) => userCall<ConnectionState>(origin, "PUT", "/api/v1/system/connection", settings);
export type NetworkOrderType = "scan_now" | "ping" | "traceroute" | "wake" | "ports" | "http" | "inspect";
export type NetworkResultView = { id: string; type: NetworkOrderType; ok: boolean; finished_ms: number; device_id?: string; output?: string; ports?: NetworkPort[]; latency_ms?: number };
export type NetworkOrderView = { id: string; node_id: string; type: NetworkOrderType; device_id?: string; status: "queued" | "sent" | "done" | "expired"; by: string; created_at: string; result?: NetworkResultView };
/** Hand the network node a manual order (a sweep now, a ping, a traceroute, a wake-up, the ports or the web page of one device). */
export const sendNetworkOrder = (origin: string, order: { type: NetworkOrderType; device_id?: string; port?: number; login?: boolean }) => userCall<NetworkOrderView>(origin, "POST", "/api/v1/network/commands", order);
export const readNetworkOrder = (origin: string, id: string) => userCall<NetworkOrderView>(origin, "GET", `/api/v1/network/commands/${encodeURIComponent(id)}`);
export const saveDeviceNote = (origin: string, id: string, note: { name?: string; notes?: string; trusted?: boolean; kind?: string; hidden?: boolean; watch?: boolean }) => userCall<{ id: string; note: DeviceNote }>(origin, "PUT", `/api/v1/network/devices/${encodeURIComponent(id)}`, note);
export const forgetDeviceNote = (origin: string, id: string) => userCall<void>(origin, "DELETE", `/api/v1/network/devices/${encodeURIComponent(id)}`);
/** The login of the web administration of a device: the password goes in and never comes out (the node only sees it inside one `inspect` order). */
export const saveDeviceLogin = (origin: string, id: string, login: { user: string; password: string }) => userCall<{ id: string; login: { user: string } }>(origin, "PUT", `/api/v1/network/devices/${encodeURIComponent(id)}/login`, login);
export const forgetDeviceLogin = (origin: string, id: string) => userCall<void>(origin, "DELETE", `/api/v1/network/devices/${encodeURIComponent(id)}/login`);
export const readNetworkDesign = (origin: string) => userCall<NetworkDocument>(origin, "GET", "/api/v1/network/design");
/** Save the network drawing. A 409 (someone saved first) comes back as `conflict` with their version. */
export async function saveNetworkDesign(origin: string, revision: number, network: Record<string, unknown>): Promise<{ revision: number } | { conflict: NetworkDocument }> {
  const response = await timedFetch(endpoint(origin, "/api/v1/network/design"), { method: "PUT", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...localSession, body: JSON.stringify({ revision, network }) });
  if (response.status === 409) return { conflict: (await response.json() as { current: NetworkDocument }).current };
  if (!response.ok) throw new ApiError(response.status, "network_save_failed");
  return { revision: (await response.json() as { revision: number }).revision };
}

// ---- solar (inverters and batteries read by the gateway nodes) ---------------------------------------------------------------------------
export type SolarOverview = { devices: SolarDeviceView[]; waiting: SolarRegistration[]; totals: SolarTotals; catalog: SolarCatalog };
export async function listSolar(origin: string): Promise<SolarOverview> {
  const response = await timedFetch(endpoint(origin, "/api/v1/solar"), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`Solar returned ${response.status}`);
  return response.json() as Promise<SolarOverview>;
}
export const saveSolarDevice = (origin: string, device: { kind: SolarKind; name: string; node_id: string; device?: string; model: string; connection: string; notes: string }) => userCall<SolarRegistration>(origin, "POST", "/api/v1/solar/devices", device);
export const deleteSolarDevice = (origin: string, node: string, device: string) => userCall<void>(origin, "DELETE", `/api/v1/solar/devices/${encodeURIComponent(node)}/${encodeURIComponent(device)}`);
export const solarExample = (origin: string, node: string, device: string) => userCall<{ accepted: boolean }>(origin, "POST", `/api/v1/solar/devices/${encodeURIComponent(node)}/${encodeURIComponent(device)}/example`);
export async function solarHistory(origin: string, node: string, device: string, minutes: number): Promise<{ samples: SolarSample[] }> {
  const query = new URLSearchParams({ node, device, minutes: String(minutes) });
  const response = await timedFetch(endpoint(origin, `/api/v1/solar/history?${query}`), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`Solar history returned ${response.status}`);
  return response.json() as Promise<{ samples: SolarSample[] }>;
}
