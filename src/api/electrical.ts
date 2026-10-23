import type { SolarSample } from "../solarModel";
import type { DeviceKind, DeviceProtocol, DeviceRisk } from "./devices";
import { endpoint, localSession, timedFetch, userCall } from "./transport";
/** A device of the house that measures or switches electricity (a Zigbee plug or breaker, a meter...), as the Electrical menu lists it. */
export type ElectricalElement = { id: string; name: string; kind: DeviceKind; protocol: DeviceProtocol; location: string; online: boolean; last_seen: string | null; risk: DeviceRisk; on?: boolean; power_w?: number; voltage_v?: number; current_a?: number; energy_kwh?: number; switchable: boolean };
export type ElectricalElements = { elements: ElectricalElement[]; totals: { elements: number; online: number; on: number; power_w: number; energy_kwh: number } };
export const electricalElements = (origin: string) => userCall<ElectricalElements>(origin, "GET", "/api/v1/electrical/devices");
// ---- what the ARMOR-ELECTRICAL nodes measure -------------------------------------------------------------------------------------------
export type ElectricalChannelReading = {
  id: string; domain: "ac" | "dc"; label?: string; voltage_v?: number; current_a?: number; power_w?: number; energy_kwh?: number; power_estimated?: boolean; frequency_hz?: number; power_factor?: number;
  /** How old the last reading of the channel was when the node sent it, in milliseconds, and how many reads of it failed since the node started (the node says them when it can). */
  reading_age_ms?: number; errors?: number;
  state?: "closed" | "open" | "unknown"; alarm?: boolean; alarm_code?: string;
};
/** A switch of a node (a source transfer): what its auxiliary contacts show, never what was asked. Studio only reads it: nothing here sends a command. */
export type ElectricalSwitchReading = {
  id: string; kind: "transfer"; label?: string; source_a?: string; source_b?: string; a_closed: boolean; b_closed: boolean;
  selected: "none" | "a" | "b"; wanted: "none" | "a" | "b"; closing: boolean; armed: boolean; fault: "none" | "did_not_close" | "did_not_open" | "both_closed" | "disabled";
};
export type ElectricalNodeReading = { node_id: string; reading: { kind: "electrical"; node_id: string; timestamp_ms: number; switching_enabled?: boolean; channels: ElectricalChannelReading[]; switches?: ElectricalSwitchReading[] }; received_at: string; stale: boolean };
export type ElectricalReadings = { nodes: ElectricalNodeReading[]; totals: { nodes: number; channels: number; stale: number; grid_w: number | null; grid_estimated?: boolean; grid_kwh: number | null; alarms: number } };
export async function listElectricalReadings(origin: string): Promise<ElectricalReadings> {
  const response = await timedFetch(endpoint(origin, "/api/v1/electrical/readings"), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`Electrical readings returned ${response.status}`);
  return response.json() as Promise<ElectricalReadings>;
}
export type ElectricalEnergyDay = { day: string; kwh: number; resets: number };
export type ElectricalEnergy = { channels: Array<{ node: string; channel: string; days: ElectricalEnergyDay[] }> };
export async function listElectricalEnergy(origin: string, days = 7): Promise<ElectricalEnergy> {
  const response = await timedFetch(endpoint(origin, `/api/v1/electrical/energy?days=${days}`), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`Electrical energy returned ${response.status}`);
  return response.json() as Promise<ElectricalEnergy>;
}
/** The samples of one channel of an electrical node, oldest first. */
export async function electricalHistory(origin: string, node: string, channel: string, minutes: number): Promise<{ samples: SolarSample[] }> {
  const query = new URLSearchParams({ node, channel, minutes: String(minutes) });
  const response = await timedFetch(endpoint(origin, `/api/v1/electrical/history?${query}`), { headers: { Accept: "application/json" }, ...localSession });
  if (!response.ok) throw new Error(`Electrical history returned ${response.status}`);
  return response.json() as Promise<{ samples: SolarSample[] }>;
}
