/**
 * The live channel of the status: the server pushes the whole state down a WebSocket whenever something changes (a burst of changes is one message), so the console shows an
 * alarm or a node coming back at once and asks far less often. The pieces that do not need a browser are here, to be tested alone.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { SystemState } from "./types";

/** How often the status is asked when there is no live channel, and the slow safety net while there is one. */
export const POLL_MS = 3_000;
export const LIVE_POLL_MS = 20_000;
const FIRST_RETRY_MS = 2_000, LAST_RETRY_MS = 60_000;

/** The address of the live channel of a server: the same address with ws or wss for http or https. Null when the origin is not an address. */
export function eventsUrl(origin: string, base: string = typeof window === "undefined" ? "http://localhost/" : window.location.href): string | null {
  try {
    const url = new URL(origin.replace(/\/$/, "") + "/api/v1/events", base);
    if (url.protocol === "http:") url.protocol = "ws:";
    else if (url.protocol === "https:") url.protocol = "wss:";
    else return null;
    return url.toString();
  } catch { return null; }
}

/** The state a message of the live channel carries, or null when the message is not one (a client ignores what it does not know). */
export function stateOf(data: unknown): SystemState | null {
  if (typeof data !== "string" || data.length > 4 * 1024 * 1024) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(data); } catch { return null; }
  if (typeof parsed !== "object" || parsed === null) return null;
  const message = parsed as { type?: unknown; state?: unknown };
  if (message.type !== "state" || typeof message.state !== "object" || message.state === null) return null;
  const state = message.state as { mode?: unknown; revision?: unknown };
  return (state.mode === "armed" || state.mode === "disarmed") && typeof state.revision === "number" ? message.state as SystemState : null;
}

/** How long to wait before the next try after `failures` failed ones: two seconds, doubling, one minute at most. */
export function retryDelay(failures: number): number {
  return Math.min(LAST_RETRY_MS, FIRST_RETRY_MS * 2 ** Math.max(0, failures - 1));
}

/** What the hook needs of a socket, so that a test can stand in for the browser's. */
export type LiveSocket = { onopen: (() => void) | null; onmessage: ((event: { data: unknown }) => void) | null; onclose: (() => void) | null; onerror: (() => void) | null; close(): void };
export type SocketFactory = (url: string) => LiveSocket;
export const browserSocket: SocketFactory = url => new WebSocket(url) as unknown as LiveSocket;
