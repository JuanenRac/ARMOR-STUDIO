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
/** The energy of each day, in kilowatt-hours (see the server's /solar/energy). */
export type SolarEnergyDay = { date: string; pv_kwh: number; load_kwh: number; battery_in_kwh: number; battery_out_kwh: number };
export const solarEnergy = (origin: string, days: number) => userCall<{ days: SolarEnergyDay[] }>(origin, "GET", `/api/v1/solar/energy?days=${days}`);
/** The levels at which batteries and inverters raise alarms, and their defaults. */
export type EnergyAlarmSettings = { soc_low: number; soc_ok: number; cell_spread_mv: number; cell_spread_minutes: number; battery_temp_high_c: number; battery_temp_low_c: number; heatsink_high_c: number; health_low_percent: number };
export const readEnergyAlarms = (origin: string) => userCall<{ settings: EnergyAlarmSettings; defaults: EnergyAlarmSettings }>(origin, "GET", "/api/v1/solar/alarms");
export const saveEnergyAlarms = (origin: string, settings: Partial<EnergyAlarmSettings>) => userCall<{ settings: EnergyAlarmSettings; defaults: EnergyAlarmSettings }>(origin, "PUT", "/api/v1/solar/alarms", settings);
export async function solarHistory(origin: string, node: string, device: string, minutes: number): Promise<{ samples: SolarSample[] }> {
  const query = new URLSearchParams({ node, device, minutes: String(minutes) });
  const response = await timedFetch(endpoint(origin, `/api/v1/solar/history?${query}`), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`Solar history returned ${response.status}`);
  return response.json() as Promise<{ samples: SolarSample[] }>;
}
