import type { SolarCatalog, SolarDeviceView, SolarKind, SolarRegistration, SolarSample, SolarTotals } from "../solarModel";
import { endpoint, localSession, timedFetch, userCall } from "./transport";
// ---- solar (inverters and batteries read by the gateway nodes) ---------------------------------------------------------------------------
export type SolarOverview = { devices: SolarDeviceView[]; waiting: SolarRegistration[]; totals: SolarTotals; catalog: SolarCatalog };
export async function listSolar(origin: string): Promise<SolarOverview> {
  const response = await timedFetch(endpoint(origin, "/api/v1/solar"), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`Solar returned ${response.status}`);
  return response.json() as Promise<SolarOverview>;
}
export const saveSolarDevice = (origin: string, device: { kind: SolarKind; name: string; node_id: string; device?: string; model: string; connection: string; notes: string }) => userCall<SolarRegistration>(origin, "POST", "/api/v1/solar/devices", device);
export const deleteSolarDevice = (origin: string, node: string, device: string) => userCall<void>(origin, "DELETE", `/api/v1/solar/devices/${encodeURIComponent(node)}/${encodeURIComponent(device)}`);
export const solarExample = (origin: string, node: string, device: string) => userCall<{ accepted: boolean }>(origin, "POST", `/api/v1/solar/devices/${encodeURIComponent(node)}/${encodeURIComponent(device)}/example`);
/** Takes away the example reading of one declared device (it waits for its first real reading); a device that reports for real is never touched. */
export const removeSolarExample = (origin: string, node: string, device: string) => userCall<void>(origin, "DELETE", `/api/v1/solar/devices/${encodeURIComponent(node)}/${encodeURIComponent(device)}/example`);
/** Takes away every example reading; says how many went. */
export const removeSolarExamples = (origin: string, ) => userCall<{ removed: number }>(origin, "DELETE", "/api/v1/solar/examples");
/** The energy of each day, in kilowatt-hours (see the server's /solar/energy). */
export type SolarEnergyDay = { date: string; pv_kwh: number; load_kwh: number; battery_in_kwh: number; battery_out_kwh: number };
export const solarEnergy = (origin: string, days: number) => userCall<{ days: SolarEnergyDay[] }>(origin, "GET", `/api/v1/solar/energy?days=${days}`);
/** The levels at which batteries and inverters raise alarms, and their defaults. */
export type EnergyAlarmSettings = { soc_low: number; soc_ok: number; cell_spread_mv: number; cell_spread_minutes: number; battery_temp_high_c: number; battery_temp_low_c: number; heatsink_high_c: number; health_low_percent: number };
export const readEnergyAlarms = (origin: string) => userCall<{ settings: EnergyAlarmSettings; defaults: EnergyAlarmSettings }>(origin, "GET", "/api/v1/solar/alarms");
export const saveEnergyAlarms = (origin: string, settings: Partial<EnergyAlarmSettings>) => userCall<{ settings: EnergyAlarmSettings; defaults: EnergyAlarmSettings }>(origin, "PUT", "/api/v1/solar/alarms", settings);
/** The history of one battery module and its cells, as the server recorded it. A server from before it did ignores `module` and answers the stack, without saying which module. */
export type BatteryHistoryAnswer = { node_id: string; device: string; minutes: number; module?: number; every_s?: number; retention_days?: number; samples: SolarSample[] };
export async function batteryHistory(origin: string, node: string, device: string, module: number, minutes: number): Promise<BatteryHistoryAnswer> {
  const query = new URLSearchParams({ node, device, minutes: String(minutes), module: String(module) });
  const response = await timedFetch(endpoint(origin, `/api/v1/solar/history?${query}`), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`Solar history returned ${response.status}`);
  return response.json() as Promise<BatteryHistoryAnswer>;
}
export async function solarHistory(origin: string, node: string, device: string, minutes: number): Promise<{ samples: SolarSample[] }> {
  const query = new URLSearchParams({ node, device, minutes: String(minutes) });
  const response = await timedFetch(endpoint(origin, `/api/v1/solar/history?${query}`), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`Solar history returned ${response.status}`);
  return response.json() as Promise<{ samples: SolarSample[] }>;
}

/** How battery alarms call for attention and which batteries are silenced (kept by the server). */
export type NoticesState = { settings: { mode?: "once" | "classic"; forget_after_h?: number; cell_min_plausible_v?: number; cell_max_plausible_v?: number }; silenced: Array<{ id: string; since: string; by: string }> };
export const readBatteryNotices = (origin: string) => userCall<NoticesState>(origin, "GET", "/api/v1/solar/battery-notices");
export const saveBatteryNotices = (origin: string, settings: NoticesState["settings"]) => userCall<NoticesState>(origin, "PUT", "/api/v1/solar/battery-notices", settings);
export const silenceBattery = (origin: string, id: string, silenced: boolean) => userCall<NoticesState>(origin, "POST", "/api/v1/solar/battery-notices/silence", { id, silenced });
export const resetDayCells = (origin: string, node: string, device: string) => userCall<{ reset: boolean }>(origin, "POST", `/api/v1/solar/devices/${encodeURIComponent(node)}/${encodeURIComponent(device)}/day-cells/reset`);
