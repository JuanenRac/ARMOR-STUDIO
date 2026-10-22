/**
 * The rules of the Diagnostics tab, as pure functions: what a token request may hold, the state a token is really in, which tasks to show first in a package, how soon a node may be asked
 * again and which words an error of the server gets. Tested without a screen.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { ApiError, TOKEN_LABEL_MAX, TOKEN_TTL_DEFAULT_S, TOKEN_TTL_MAX_S, TOKEN_TTL_MIN_S, type DiagnosticPackage, type DiagnosticTokenInfo, type DiagnosticTokenRequest, type PackageTask, type TokenStatus } from "./api";

/** The durations offered for a token, in seconds: 5 minutes, 30 minutes, 1 hour, 2 hours (the default), 8 hours and 24 hours. */
export const TTL_CHOICES: readonly number[] = [300, 1800, 3600, 7200, 28_800, 86_400];
export const DEFAULT_TTL_S = TOKEN_TTL_DEFAULT_S;
/** A token may cover at most this many nodes. */
export const MAX_TOKEN_NODES = 16;
/** A node hands over one package every 15 seconds at most: a button asks again no sooner than this. */
export const ASK_GAP_MS = 15_000;

export const ttlKey = (seconds: number): string => `dg_ttl_${seconds}`;

/** The request for a token, or null when it is not one the server would take (no node, too many, a duration outside 5 minutes to 24 hours). The note is trimmed and cut to its limit. */
export function buildTokenRequest(nodes: readonly string[], ttl_s: number, label: string): DiagnosticTokenRequest | null {
  const unique = [...new Set(nodes.filter(node => node.trim() !== ""))];
  if (unique.length === 0 || unique.length > MAX_TOKEN_NODES) return null;
  if (!Number.isInteger(ttl_s) || ttl_s < TOKEN_TTL_MIN_S || ttl_s > TOKEN_TTL_MAX_S) return null;
  const note = Array.from(label.trim()).slice(0, TOKEN_LABEL_MAX).join("");
  return { nodes: unique.sort((a, b) => a.localeCompare(b)), ttl_s, ...(note !== "" ? { label: note } : {}) };
}

/** The state a token is in now: the server's word, but a token whose time has passed is expired even if the list was read a minute ago. */
export function tokenState(token: Pick<DiagnosticTokenInfo, "status" | "expires_at" | "revoked_at">, now: number): TokenStatus {
  if (token.status === "revoked" || token.revoked_at) return "revoked";
  if (token.status === "expired" || Date.parse(token.expires_at) <= now) return "expired";
  return "active";
}

/** Tokens that can still be used come first (the soonest to expire first), then the others, the newest first. */
export function sortTokens(tokens: readonly DiagnosticTokenInfo[], now: number): DiagnosticTokenInfo[] {
  return [...tokens].sort((a, b) => {
    const [sa, sb] = [tokenState(a, now), tokenState(b, now)];
    if ((sa === "active") !== (sb === "active")) return sa === "active" ? -1 : 1;
    if (sa === "active") return Date.parse(a.expires_at) - Date.parse(b.expires_at);
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}

/** The tasks of a package with the least stack left, first: the ones that are about to overflow. */
export function leastStack(tasks: readonly PackageTask[] | undefined, count = 5): PackageTask[] {
  return [...(tasks ?? [])].sort((a, b) => a.stack_free - b.stack_free || a.name.localeCompare(b.name)).slice(0, count);
}

/** Is this the kind of package that carries the whole report (a log alone has only the log)? */
export const isFullPackage = (data: DiagnosticPackage): boolean => data.detail === "package";

/** How many milliseconds are left before a node may be asked again, given when it was last asked. */
export const askWait = (lastAskedAt: number | null, now: number): number => (lastAskedAt === null ? 0 : Math.max(0, lastAskedAt + ASK_GAP_MS - now));

/** The key of the words for an error of the server on this screen. */
export function diagnosticsErrorKey(error: unknown): string {
  const code = error instanceof ApiError ? error.code : "generic";
  if (code === "elevation_required" || code === "invalid_request" || code === "unknown_node" || code === "too_many_tokens" || code === "rate_limited" || code === "forbidden" || code === "no_package" || code === "no_log") return `dg_err_${code}`;
  if (error instanceof ApiError && error.status === 429) return "dg_err_rate_limited";
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return "dg_err_forbidden";
  return "dg_err_generic";
}

/** The keys of the allowed settings of a package in a stable order. */
export const configEntries = (config: Record<string, string> | undefined): Array<[string, string]> => Object.entries(config ?? {}).sort(([a], [b]) => a.localeCompare(b));
