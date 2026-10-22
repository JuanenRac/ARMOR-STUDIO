import { ApiError, endpoint, localSession, timedFetch, userCall } from "./transport";
import type { BootReport, MemoryGate } from "./nodeHealth";
// ---- diagnostics of the nodes: the packages and logs they hand over, and the read-only tokens an administrator issues so that somebody else can look at some nodes ------------------
// A token is only ever issued, listed and revoked here. Studio never uses one: it is for another person (it opens GET /api/v1/diagnostics/nodes... and nothing else).

export type TokenStatus = "active" | "expired" | "revoked";
export type DiagnosticTokenRequest = { nodes: string[]; ttl_s?: number; label?: string };
/** What issuing a token answers. `token` is the secret and comes this once: the server keeps only a fingerprint of it. */
export type DiagnosticTokenCreated = { id: string; token: string; scope: "read_only"; nodes: string[]; label?: string; created_at: string; expires_at: string; created_by: string };
export type DiagnosticTokenInfo = {
  id: string; scope: "read_only"; nodes: string[]; label?: string; created_at: string; expires_at: string; created_by: string; status: TokenStatus;
  revoked_at?: string; revoked_by?: string; uses: number; last_used_at?: string;
};
export const TOKEN_TTL_MIN_S = 300;
export const TOKEN_TTL_MAX_S = 86_400;
export const TOKEN_TTL_DEFAULT_S = 7_200;
export const TOKEN_LABEL_MAX = 48;

/** Issues a token (an administrator, with a fresh proof of identity: the usual re-authentication dialog is raised by the call itself). */
export const issueDiagnosticToken = (origin: string, request: DiagnosticTokenRequest) => userCall<DiagnosticTokenCreated>(origin, "POST", "/api/v1/diagnostics/tokens", request);
export const listDiagnosticTokens = (origin: string) => userCall<{ tokens: DiagnosticTokenInfo[] }>(origin, "GET", "/api/v1/diagnostics/tokens");
export const revokeDiagnosticToken = (origin: string, id: string) => userCall<void>(origin, "DELETE", `/api/v1/diagnostics/tokens/${encodeURIComponent(id)}`);

export type PackageTask = { name: string; stack_free: number; priority: number; state: string };
export type CoreSummary = { task: string; reason?: string; pc?: string; backtrace?: string[]; app_sha256?: string };
/** What a node hands over when it is asked for its diagnostic package (a log alone has only `detail`, `log` and `truncated`). */
export type DiagnosticPackage = {
  detail: "package" | "log";
  heap?: { internal_free: number; internal_min: number; internal_largest: number; total_free: number; total_min: number; psram_free?: number };
  tasks?: PackageTask[];
  resets?: { reason: string; uptime_s: number; guard_restarts_in_hour: number };
  boot?: BootReport;
  memory_gate?: MemoryGate;
  versions?: { firmware: string; idf: string; board?: string; sensors: Array<{ name: string; version: string }> };
  config?: Record<string, string>;
  coredump?: { present: boolean; size?: number; summary?: CoreSummary };
  log: string;
  truncated: boolean;
};
export type DeliveredDiagnostics = { at: string; requested_by: string; data: DiagnosticPackage };
export type NodeDiagnostics = { node_id: string; package?: DeliveredDiagnostics; log?: DeliveredDiagnostics };
/** The latest package and log a node delivered (an administrator's). */
export const readNodeDiagnostics = (origin: string, node: string) => userCall<NodeDiagnostics>(origin, "GET", `/api/v1/nodes/${encodeURIComponent(node)}/diagnostics`);

export type DiagnosticFile = { filename: string; text: string; mime: string };
/** The package of a node as a JSON file to keep. */
export async function downloadDiagnosticPackage(origin: string, node: string): Promise<DiagnosticFile> {
  const response = await timedFetch(endpoint(origin, `/api/v1/nodes/${encodeURIComponent(node)}/diagnostics/package?download=1`), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new ApiError(response.status, response.status === 404 ? "no_package" : "generic");
  return { filename: `armor-diagnostics-${node}.json`, text: await response.text(), mime: "application/json" };
}
/** The log of a node as a text file to keep. */
export async function downloadDiagnosticLog(origin: string, node: string): Promise<DiagnosticFile> {
  const response = await timedFetch(endpoint(origin, `/api/v1/nodes/${encodeURIComponent(node)}/diagnostics/log?download=1`), { headers: { Accept: "text/plain" }, ...localSession });
  if (!response.ok) throw new ApiError(response.status, response.status === 404 ? "no_log" : "generic");
  return { filename: `armor-log-${node}.txt`, text: await response.text(), mime: "text/plain" };
}
