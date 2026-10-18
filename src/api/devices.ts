import type { AlarmSourceType, Severity } from "./alarms";
import { userCall } from "./transport";
// ---- Devices, alarms, automations, the system, and the site design kept on the server -------------------------------------------

export type DeviceKind = "smoke" | "co" | "gas" | "water_leak" | "panic_button" | "door" | "window" | "motion" | "glass_break" | "vibration" | "climate" | "temperature" | "humidity" | "light_level" | "smart_plug" | "smart_light" | "smart_switch" | "smart_breaker" | "energy_meter" | "siren" | "lock" | "valve" | "shutter" | "gate_motor" | "garage_motor" | "water_heater";
export type DeviceProtocol = "wifi" | "bluetooth" | "zigbee" | "zwave" | "thread" | "lora" | "rf433" | "wired" | "other";
export type DeviceState = Record<string, boolean | number>;
export type MapEntry = { field: string; path: string; invert?: boolean };
export type DeviceSource = { type: "push" } | { type: "mqtt"; topic: string; map?: MapEntry[]; availability_topic?: string };
export type DeviceCommandsView = { mqtt?: { topic: string; on?: string; off?: string; toggle?: string; assume_state?: boolean }; http?: { on?: boolean; off?: boolean; toggle?: boolean } };
export type DeviceCommandsInput = { mqtt?: { topic: string; on?: string; off?: string; toggle?: string; assume_state?: boolean }; http?: { on?: string; off?: string; toggle?: string } };
export type StudioDevice = {
  id: string; name: string; kind: DeviceKind; protocol: DeviceProtocol; location: string; category: "sensor" | "actuator";
  source: DeviceSource; commands: DeviceCommandsView; can_command: boolean; expected_interval_s: number;
  /** How much it matters to switch it from afar: a circuit of the board asks for a confirmation, a critical one an administrator too. */
  risk: DeviceRisk;
  state: DeviceState; online: boolean; last_seen: string | null; created_at: string;
};
export type DeviceRisk = "low" | "circuit" | "critical";
export type DeviceInput = { risk?: DeviceRisk; id?: string; name?: string; kind?: DeviceKind; protocol?: DeviceProtocol; location?: string; source?: DeviceSource; commands?: DeviceCommandsInput; expected_interval_s?: number };
export type Trigger = { type: "device"; device_id: string; field: string; equals: boolean | number; /** For a number: wait for it to go above (gt) or below (lt) `equals`; absent or eq waits for the value. */ op?: "eq" | "gt" | "lt" } | { type: "alarm"; severity?: Severity; source_type?: AlarmSourceType; source_id?: string } | { type: "mode"; mode: "armed" | "disarmed" };
export type AutomationAction = { type: "device"; device_id: string; command: "on" | "off" | "toggle"; for_s?: number } | { type: "notify" };
export type Automation = { id: string; name: string; enabled: boolean; trigger: Trigger; when_mode: "any" | "armed" | "disarmed"; actions: AutomationAction[]; created_at: string; last_run: string | null; runs: number };
export type AutomationInput = { name?: string; enabled?: boolean; trigger?: Trigger; when_mode?: "any" | "armed" | "disarmed"; actions?: AutomationAction[] };
export const listDevices = (origin: string) => userCall<{ devices: StudioDevice[]; kinds: Array<{ kind: DeviceKind; category: "sensor" | "actuator"; alarm: "always" | "armed" | "none"; severity: Severity; commands: string[] }>; protocols: DeviceProtocol[] }>(origin, "GET", "/api/v1/devices");
export const createDevice = (origin: string, input: DeviceInput) => userCall<StudioDevice>(origin, "POST", "/api/v1/devices", input);
export const updateDevice = (origin: string, id: string, input: DeviceInput) => userCall<StudioDevice>(origin, "PATCH", `/api/v1/devices/${encodeURIComponent(id)}`, input);
export const deleteDevice = (origin: string, id: string) => userCall<void>(origin, "DELETE", `/api/v1/devices/${encodeURIComponent(id)}`);
export const commandDevice = (origin: string, id: string, command: "on" | "off" | "toggle", confirm = false) => userCall<{ ok: boolean; device: StudioDevice }>(origin, "POST", `/api/v1/devices/${encodeURIComponent(id)}/command`, { command, ...(confirm ? { confirm: true } : {}) });
export const setDeviceState = (origin: string, id: string, state: DeviceState) => userCall<StudioDevice>(origin, "POST", `/api/v1/devices/${encodeURIComponent(id)}/state`, { state });
export const listAutomations = (origin: string) => userCall<{ automations: Automation[] }>(origin, "GET", "/api/v1/automations");
export const createAutomation = (origin: string, input: AutomationInput) => userCall<Automation>(origin, "POST", "/api/v1/automations", input);
export const updateAutomation = (origin: string, id: string, input: AutomationInput) => userCall<Automation>(origin, "PATCH", `/api/v1/automations/${encodeURIComponent(id)}`, input);
export const deleteAutomation = (origin: string, id: string) => userCall<void>(origin, "DELETE", `/api/v1/automations/${encodeURIComponent(id)}`);
export const runAutomation = (origin: string, id: string) => userCall<{ ok: boolean }>(origin, "POST", `/api/v1/automations/${encodeURIComponent(id)}/run`);
