export const endpoint = (origin: string, suffix: string) => origin.replace(/\/$/, "") + suffix;
export const localSession = { credentials: "include" as const };
/**
 * Every call of the console to the server gives up after a while. A browser keeps only a few connections open to one address, and a call that is never
 * answered would wait for ever behind them - the buttons would seem dead until the page is reloaded.
 */
export const CALL_TIMEOUT_MS = 30_000;
export const timedFetch = (url: string, init: RequestInit = {}): Promise<Response> => fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(CALL_TIMEOUT_MS) });
/** An answer the server refused, with the stable `code` that says why. */
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) { super(`${status} ${code}`); }
}
/** Set by the app: asks the person for their password (or a code) again and says whether they proved themselves. Critical actions from outside the house ask for it (see ElevationHost). */
let elevationAsker: ((origin: string) => Promise<boolean>) | null = null;
export const setElevationAsker = (asker: ((origin: string) => Promise<boolean>) | null): void => { elevationAsker = asker; };
export async function userCall<T>(origin: string, method: string, route: string, body?: unknown, retried = false): Promise<T> {
  const response = await timedFetch(endpoint(origin, route), {
    method, headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, ...localSession,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const parsed = await response.json().catch(() => ({})) as { code?: string; error?: string } & T;
  // The administration answers `{ error: "a_code" }` (some of them with a line number, "invalid_line:3"); the users' answers carry a separate `code`.
  const machine = typeof parsed.error === "string" && /^[a-z_]+(:\d+)?$/.test(parsed.error) ? parsed.error : undefined;
  if (!response.ok) {
    if (response.status === 403 && parsed.code === "elevation_required" && !retried && elevationAsker && await elevationAsker(origin)) return userCall<T>(origin, method, route, body, true);
    throw new ApiError(response.status, parsed.code ?? machine ?? (response.status === 403 || response.status === 401 ? "forbidden" : "generic"));
  }
  return parsed;
}
