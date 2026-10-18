import { ApiError, endpoint, localSession, timedFetch, userCall } from "./transport";
export type SiteDocument = { revision: number; updated_at: string | null; updated_by: string | null; site: Record<string, unknown> | null };
export const readSite = (origin: string) => userCall<SiteDocument>(origin, "GET", "/api/v1/site");
/** Save the design. A 409 (someone saved first) comes back as an ApiError whose `current` holds their version. */
export async function saveSite(origin: string, revision: number, site: Record<string, unknown>): Promise<{ revision: number } | { conflict: SiteDocument }> {
  const response = await timedFetch(endpoint(origin, "/api/v1/site"), { method: "PUT", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...localSession, body: JSON.stringify({ revision, site }) });
  if (response.status === 409) return { conflict: (await response.json() as { current: SiteDocument }).current };
  if (!response.ok) throw new ApiError(response.status, "site_save_failed");
  return { revision: (await response.json() as { revision: number }).revision };
}
/** The versions the server keeps of each of the four designs (site, electrical, network, alarm: what it had before the changes), to be taken back from. */
export type DesignKind = "site" | "electrical" | "network" | "alarm";
export type DesignVersion = { id: string; revision: number; saved_at: string; updated_by: string | null; counts: Record<string, number> };
const DESIGN_ROUTE: Record<DesignKind, string> = { site: "/api/v1/site", electrical: "/api/v1/electrical/design", network: "/api/v1/network/design", alarm: "/api/v1/alarm/design" };
export const listDesignVersions = (origin: string, kind: DesignKind) => userCall<{ versions: DesignVersion[] }>(origin, "GET", `${DESIGN_ROUTE[kind]}/versions`);
/** Forget one kept version, or all of them (the current design is not touched); the second returns how many there were. */
export async function deleteDesignVersion(origin: string, kind: DesignKind, id: string): Promise<void> {
  const response = await timedFetch(endpoint(origin, `${DESIGN_ROUTE[kind]}/versions/${encodeURIComponent(id)}`), { method: "DELETE", ...localSession });
  if (!response.ok) throw new ApiError(response.status, "version_delete_failed");
}
export async function deleteDesignVersions(origin: string, kind: DesignKind): Promise<number> {
  const response = await timedFetch(endpoint(origin, `${DESIGN_ROUTE[kind]}/versions`), { method: "DELETE", ...localSession });
  if (!response.ok) throw new ApiError(response.status, "version_delete_failed");
  return (await response.json() as { removed: number }).removed;
}
export async function readDesignVersion(origin: string, kind: DesignKind, id: string): Promise<Record<string, unknown> | null> {
  const document = await userCall<Record<string, unknown>>(origin, "GET", `${DESIGN_ROUTE[kind]}/versions/${encodeURIComponent(id)}`);
  const design = document[kind === "alarm" ? "alarm_design" : kind];
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
// ---- the local network, as the ARMOR-NETWORK nodes see it -------------------------------------------------------------------------------
export type NetworkDocument = { revision: number; updated_at: string | null; updated_by: string | null; network: Record<string, unknown> | null };
export type AlarmDesignDocument = { revision: number; updated_at: string | null; updated_by: string | null; alarm_design: Record<string, unknown> | null };
export const readAlarmDesign = (origin: string) => userCall<AlarmDesignDocument>(origin, "GET", "/api/v1/alarm/design");
/** Save the alarm drawing. A 409 (someone saved first) comes back as `conflict` with their version. */
export async function saveAlarmDesign(origin: string, revision: number, alarmDesign: Record<string, unknown>): Promise<{ revision: number } | { conflict: AlarmDesignDocument }> {
  const response = await timedFetch(endpoint(origin, "/api/v1/alarm/design"), { method: "PUT", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...localSession, body: JSON.stringify({ revision, alarm_design: alarmDesign }) });
  if (response.status === 409) return { conflict: (await response.json() as { current: AlarmDesignDocument }).current };
  if (!response.ok) throw new ApiError(response.status, "alarm_design_save_failed");
  return { revision: (await response.json() as { revision: number }).revision };
}
export const readNetworkDesign = (origin: string) => userCall<NetworkDocument>(origin, "GET", "/api/v1/network/design");
/** Save the network drawing. A 409 (someone saved first) comes back as `conflict` with their version. */
export async function saveNetworkDesign(origin: string, revision: number, network: Record<string, unknown>): Promise<{ revision: number } | { conflict: NetworkDocument }> {
  const response = await timedFetch(endpoint(origin, "/api/v1/network/design"), { method: "PUT", headers: { Accept: "application/json", "Content-Type": "application/json" }, ...localSession, body: JSON.stringify({ revision, network }) });
  if (response.status === 409) return { conflict: (await response.json() as { current: NetworkDocument }).current };
  if (!response.ok) throw new ApiError(response.status, "network_save_failed");
  return { revision: (await response.json() as { revision: number }).revision };
}
