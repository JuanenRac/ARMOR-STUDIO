import { endpoint, localSession, timedFetch, userCall } from "./transport";
export type DiscoveredCamera = { host: string; ports: number[] };
export type CameraConnection = { id: string; name: string; host: string; snapshotUrl: string; rtspPath: string; previewPath?: string; username: string; password: string; onvifPort: number; rtspPort: number };
export type PublicCameraConnection = Omit<CameraConnection, "password"> & { hasCredentials: boolean; liveVideoAvailable: boolean };
export type CameraView = Omit<PublicCameraConnection, "username">;
export type MediaItem = { id: string; cameraId: string; kind: "snapshot" | "recording"; file: string; createdAt: string; bytes: number; protected?: boolean };
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
  const response = await timedFetch(origin.replace(/\/$/, "") + "/api/v1/camera-views", { headers: { Accept: "application/json" }, ...localSession });
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
/** Keeps a piece of evidence out of the automatic pruning (30 days or 20 GB), or lets it go back in. */
export async function setMediaProtected(origin: string, item: MediaItem, protect: boolean): Promise<void> {
  const kind = item.kind === "snapshot" ? "snapshots" : "recordings";
  const response = await timedFetch(endpoint(origin, `/api/v1/media/${encodeURIComponent(item.cameraId)}/${kind}/${encodeURIComponent(item.file)}/protected`), { method: "PUT", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...localSession, body: JSON.stringify({ protected: protect }) });
  if (!response.ok) throw new Error("Media protection returned " + response.status);
}
/** The signed proof of custody of one piece of evidence (its digest now and the audit lines about it), as the text of a JSON file to hand over with it. */
export async function readMediaProof(origin: string, item: MediaItem): Promise<string> {
  const kind = item.kind === "snapshot" ? "snapshots" : "recordings";
  const response = await timedFetch(endpoint(origin, `/api/v1/media/${encodeURIComponent(item.cameraId)}/${kind}/${encodeURIComponent(item.file)}/proof`), { headers: { Accept: "application/json" }, credentials: "include" });
  if (!response.ok) throw new Error("Media proof returned " + response.status);
  return JSON.stringify(await response.json(), null, 2);
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
/** What the server takes by itself when a camera sees something while the perimeter is armed. */
export type CaptureSettings = { enabled: boolean; photo: boolean; photo_count: number; photo_interval_s: number; video: boolean; video_seconds: number; cooldown_s: number };
export type CaptureRecord = { camera_id: string; at: string; photos: number; video: boolean };
/** A part of a camera's picture that the observation service does not look at: a rectangle in fractions of the picture, from the top left. */
export type IgnoreZone = { x: number; y: number; w: number; h: number };
export const readIgnoreZones = (origin: string, id: string) => userCall<{ camera_id: string; zones: IgnoreZone[] }>(origin, "GET", `/api/v1/cameras/${encodeURIComponent(id)}/ignore-zones`);
export const saveIgnoreZones = (origin: string, id: string, zones: IgnoreZone[]) => userCall<{ camera_id: string; zones: IgnoreZone[] }>(origin, "PUT", `/api/v1/cameras/${encodeURIComponent(id)}/ignore-zones`, { zones });
export const readCaptureSettings = (origin: string) => userCall<{ settings: CaptureSettings; recent: CaptureRecord[] }>(origin, "GET", "/api/v1/capture-settings");
export const saveCaptureSettings = (origin: string, settings: CaptureSettings) => userCall<{ settings: CaptureSettings }>(origin, "PUT", "/api/v1/capture-settings", settings);
