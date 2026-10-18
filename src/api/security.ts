import { userCall } from "./transport";
// ---- security: the second factor, the sessions of the person, using the server from outside the house ------------------------------------------------
export type SessionRow = { id: string; created: number; last_seen: number; origin: "local" | "remote"; ip: string; agent: string; current: boolean };
export type TotpState = { enabled: boolean; recovery_left: number; policy: "off" | "remote" | "always" };
export type RemoteCheck = { ip: string; origin: "local" | "remote"; session_origin: "local" | "remote" | null; protocol: string; forwarded_for: string | null; cookie_secure: boolean; trust_proxy: unknown; totp_policy: string; totp_enabled: boolean; remote_session_ttl_s: number; remote_idle_s: number; elevation_s: number };
export const listMySessions = (origin: string) => userCall<{ sessions: SessionRow[] }>(origin, "GET", "/api/v1/studio/sessions");
export const endMySession = (origin: string, id: string) => userCall<void>(origin, "DELETE", `/api/v1/studio/sessions/${encodeURIComponent(id)}`);
export const endOtherSessions = (origin: string) => userCall<void>(origin, "POST", "/api/v1/studio/sessions/end-others");
export const totpState = (origin: string) => userCall<TotpState>(origin, "GET", "/api/v1/studio/totp");
export const totpSetup = (origin: string, password: string) => userCall<{ secret: string; uri: string }>(origin, "POST", "/api/v1/studio/totp/setup", { password });
export const totpEnable = (origin: string, code: string) => userCall<{ enabled: true; recovery_codes: string[] }>(origin, "POST", "/api/v1/studio/totp/enable", { code });
export const totpDisable = (origin: string, password: string) => userCall<void>(origin, "DELETE", "/api/v1/studio/totp", { password });
export const elevateSession = (origin: string, proof: { password?: string; code?: string }) => userCall<{ elevated_for_s: number }>(origin, "POST", "/api/v1/studio/elevate", proof);
export const remoteCheck = (origin: string) => userCall<RemoteCheck>(origin, "GET", "/api/v1/remote/check");
