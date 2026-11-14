import { ApiError, endpoint, localSession, timedFetch, userCall } from "./transport";
// ---- Firmware of the field nodes (the server updates them, one at a time, with the login of their own panel) --------------------------------------------

export type FirmwareKind = "radar" | "solar" | "electrical" | "hmi" | "alarm";
export type FirmwareTargetState = "waiting" | "checking" | "signing_in" | "uploading" | "restarting" | "done" | "failed";
export type FirmwareTarget = { address: string; node_id?: string; state: FirmwareTargetState; version_before?: string; version_after?: string; error?: string; progress?: number; sent?: number; total?: number; waited_s?: number; skipped?: boolean; rolled_back?: boolean; rollback_error?: string };
export type FirmwareRollout = { channel: "stable" | "beta"; percent: number; rollback: boolean; halt_on_failure: boolean };
export type FirmwareRolloutView = { enabled: boolean; settings: FirmwareRollout };
/** What a job did when the staged rollout was on: the channel, the share, the nodes left for a later job and whether a failure stopped the rest. */
export type FirmwareJobRollout = { channel: "stable" | "beta"; percent: number; deferred: { address: string; node_id?: string }[]; halted: boolean };
export type FirmwareJob = { id: string; kind: FirmwareKind; source: "github" | "upload"; state: "preparing" | "running" | "done" | "failed"; version?: string; bytes?: number; sha256?: string; error?: string; targets: FirmwareTarget[]; rollout?: FirmwareJobRollout };
export type FirmwareRelease = { kind: FirmwareKind; repo: string; version: string; bytes: number; checksum: boolean };
export type FirmwareProbe = { address: string; reachable: boolean; node_id?: string; version?: string; board?: string; /** radar, solar, electrical or hmi, from the firmware that says it. */ kind?: string };
export type FirmwareUpload = { id: string; name: string; bytes: number; sha256: string };
export const firmwareRelease = (origin: string, kind: FirmwareKind) => userCall<FirmwareRelease>(origin, "GET", `/api/v1/admin/firmware/releases/${kind}`);
export const firmwareProbe = (origin: string, addresses: string[]) => userCall<{ nodes: FirmwareProbe[] }>(origin, "POST", "/api/v1/admin/firmware/probe", { addresses });
export const firmwareStart = (origin: string, request: { kind: FirmwareKind; source: "github" | "upload"; upload_id?: string; targets: { address: string; node_id?: string }[]; panel_user: string; panel_password: string }) =>
  userCall<{ id: string }>(origin, "POST", "/api/v1/admin/firmware/jobs", request);
export const firmwareRollout = (origin: string) => userCall<FirmwareRolloutView>(origin, "GET", "/api/v1/admin/firmware/rollout");
export const setFirmwareRollout = (origin: string, settings: Partial<FirmwareRollout>) => userCall<FirmwareRolloutView>(origin, "PUT", "/api/v1/admin/firmware/rollout", settings);
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
