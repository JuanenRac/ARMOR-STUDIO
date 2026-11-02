/**
 * How the console's own calls to the server are doing: per route (its first four parts, so no id, camera name or query is ever kept), how many calls, how many were refused (4xx) or failed
 * on the server (5xx) or never got an answer, and how long they took. Kept in memory only, for this tab, and cleared with it; it is read by Configuration > Diagnostics so that somebody
 * helping from afar can say whether the server is slow, refusing or out of reach.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export type CallRecord = { at: number; method: string; route: string; status: number; ms: number };
export type RouteStats = { route: string; method: string; calls: number; clientErrors: number; serverErrors: number; failures: number; avgMs: number; maxMs: number };
export type CallSummary = { lastMinute: number; clientErrors: number; serverErrors: number; failures: number; routes: RouteStats[] };

const KEEP = 500;
let records: CallRecord[] = [];

/** A route reduced to its first four parts with no query or fragment: "/api/v1/cameras/gate/snapshot?x=1" is "/api/v1/cameras/gate/…". */
export function routeShape(url: string): string {
  let path: string;
  try { path = new URL(url, "http://localhost").pathname; } catch { path = url.split(/[?#]/)[0] ?? ""; }
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return "/";
  return `/${parts.slice(0, 4).join("/")}${parts.length > 4 ? "/…" : ""}`;
}

/** `status` 0 is a call that never got an answer (offline, timed out, refused by the browser). */
export function recordCall(method: string, url: string, status: number, ms: number, at = Date.now()): void {
  records.push({ at, method: method.toUpperCase().slice(0, 8), route: routeShape(url), status, ms: Math.max(0, Math.round(ms)) });
  if (records.length > KEEP) records = records.slice(records.length - KEEP);
}

export function clearCalls(): void { records = []; }

/** The summary of what was kept, the busiest routes first (at most `limit`). */
export function summarizeCalls(now = Date.now(), limit = 12): CallSummary {
  const byRoute = new Map<string, RouteStats & { total: number }>();
  const summary: CallSummary = { lastMinute: 0, clientErrors: 0, serverErrors: 0, failures: 0, routes: [] };
  for (const record of records) {
    const key = `${record.method} ${record.route}`;
    const stats = byRoute.get(key) ?? { route: record.route, method: record.method, calls: 0, clientErrors: 0, serverErrors: 0, failures: 0, avgMs: 0, maxMs: 0, total: 0 };
    stats.calls += 1; stats.total += record.ms; stats.maxMs = Math.max(stats.maxMs, record.ms);
    if (record.status === 0) { stats.failures += 1; summary.failures += 1; }
    else if (record.status >= 500) { stats.serverErrors += 1; summary.serverErrors += 1; }
    else if (record.status >= 400) { stats.clientErrors += 1; summary.clientErrors += 1; }
    if (now - record.at <= 60_000) summary.lastMinute += 1;
    byRoute.set(key, stats);
  }
  summary.routes = [...byRoute.values()].map(({ total, ...stats }) => ({ ...stats, avgMs: Math.round(total / stats.calls) })).sort((a, b) => b.calls - a.calls || b.maxMs - a.maxMs).slice(0, limit);
  return summary;
}

/** The text a person can copy for support: one line per route, no address of the server in it. */
export function callReport(summary: CallSummary): string {
  const lines = [`calls in the last minute: ${summary.lastMinute}; refused (4xx): ${summary.clientErrors}; server errors (5xx): ${summary.serverErrors}; no answer: ${summary.failures}`];
  for (const item of summary.routes) lines.push(`${item.method} ${item.route}: ${item.calls} calls, ${item.clientErrors} refused, ${item.serverErrors} errors, ${item.failures} no answer, avg ${item.avgMs} ms, max ${item.maxMs} ms`);
  return lines.join("\n");
}
