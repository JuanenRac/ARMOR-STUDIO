import { ApiError, endpoint, localSession, timedFetch } from "./transport";
import type { StudioUser } from "./users";
import { parseCapabilities, type AnnouncedCapabilities } from "../capabilities";
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
/** The first step of the sign-in. When the account has the second factor on, the answer is a challenge (no session yet) and `completeStudioSession` finishes it. */
export type SignInStep = { done: true } | { done: false; challenge: string };
export async function openStudioSession(origin: string, username: string, password: string): Promise<SignInStep> {
  const response = await timedFetch(endpoint(origin, "/api/v1/studio/session"), {
    method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...localSession,
    body: JSON.stringify({ username, password }),
  });
  const body = await response.json().catch(() => ({})) as { totp_required?: boolean; challenge?: string; code?: string };
  if (response.status === 403 && body.code === "totp_setup_required") throw new ApiError(403, "totp_setup_required");
  if (!response.ok) throw new Error(`Studio login returned ${response.status}`);
  if (body.totp_required && typeof body.challenge === "string") return { done: false, challenge: body.challenge };
  return { done: true };
}
/** The second step: the challenge of the first and a code of the app (or a recovery code). */
export async function completeStudioSession(origin: string, challenge: string, code: string): Promise<void> {
  const response = await timedFetch(endpoint(origin, "/api/v1/studio/session/totp"), {
    method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...localSession, body: JSON.stringify({ challenge, code }),
  });
  if (response.ok) return;
  const body = await response.json().catch(() => ({})) as { code?: string };
  throw new ApiError(response.status, body.code ?? "generic");
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
export async function closeStudioSession(origin: string): Promise<void> {
  await timedFetch(endpoint(origin, "/api/v1/studio/session"), { method: "DELETE", ...localSession }).catch(() => undefined);
}
/** Who is signed in: the user, nobody (the server said so), or unknown (it could not be asked - never to be taken as "not an administrator"). */
export type SessionUserState = { state: "user"; user: StudioUser; capabilities: AnnouncedCapabilities | null } | { state: "anonymous" } | { state: "unknown"; reason: string };
export async function sessionUserState(origin: string): Promise<SessionUserState> {
  try {
    const response = await timedFetch(endpoint(origin, "/api/v1/studio/session"), { headers: { Accept: "application/json" }, ...localSession });
    if (response.status === 401) return { state: "anonymous" };
    if (!response.ok) return { state: "unknown", reason: `the server answered ${response.status}` };
    const body = await response.json() as { authenticated?: boolean; user?: StudioUser; capabilities?: unknown };
    return body.authenticated && body.user ? { state: "user", user: body.user, capabilities: parseCapabilities(body.capabilities) } : { state: "anonymous" };
  } catch (error) { return { state: "unknown", reason: error instanceof Error && error.name ? `${error.name}: ${error.message}`.slice(0, 120) : "no answer" }; }
}
