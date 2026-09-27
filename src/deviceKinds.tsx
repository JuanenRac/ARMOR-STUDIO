/**
 * What Studio knows about each kind of device: how it looks (an icon and a colour), what it reports, what it can be told, and the
 * presets that fill in how it talks (its own MQTT topics, Zigbee2MQTT, Tasmota, Shelly, plain HTTP). The server owns what is allowed;
 * this is the friendly face of it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { ReactNode } from "react";
import type { DeviceCommandsInput, DeviceKind, DeviceProtocol, DeviceSource, DeviceState, StudioDevice } from "./api";

export const SENSOR_KINDS: readonly DeviceKind[] = ["smoke", "co", "gas", "water_leak", "panic_button", "door", "window", "motion", "glass_break", "vibration", "climate", "temperature", "humidity", "light_level"];
export const ACTUATOR_KINDS: readonly DeviceKind[] = ["smart_plug", "smart_light", "smart_switch", "siren", "lock", "valve"];
export const ALL_KINDS: readonly DeviceKind[] = [...SENSOR_KINDS, ...ACTUATOR_KINDS];
export const PROTOCOLS: readonly DeviceProtocol[] = ["wifi", "zigbee", "bluetooth", "zwave", "thread", "lora", "rf433", "wired", "other"];

/** The main state field of a kind: what the card shows and what an automation waits for. */
export const MAIN_FIELD: Record<DeviceKind, string | null> = {
  smoke: "triggered", co: "triggered", gas: "triggered", water_leak: "triggered", panic_button: "triggered", door: "open", window: "open", motion: "triggered", glass_break: "triggered", vibration: "triggered",
  climate: null, temperature: null, humidity: null, light_level: null, smart_plug: "on", smart_light: "on", smart_switch: "on", siren: "on", lock: "locked", valve: "open",
};
/** The kinds that raise an alarm, and when: at any time (fire, gas, flood, panic) or while armed (intrusion). */
export const ALARM_KIND: Partial<Record<DeviceKind, "always" | "armed">> = { smoke: "always", co: "always", gas: "always", water_leak: "always", panic_button: "always", door: "armed", window: "armed", motion: "armed", glass_break: "armed", vibration: "armed" };

/** The colour a kind wears (the same in the list, the plan and the overview). */
export const KIND_COLOUR: Record<DeviceKind, string> = {
  smoke: "#ff7a45", co: "#ff9b45", gas: "#ffb020", water_leak: "#38bdf8", panic_button: "#ff4d5e", door: "#f5c04a", window: "#7dd3fc", motion: "#a78bfa", glass_break: "#f472b6", vibration: "#c4b5fd",
  climate: "#2dd4bf", temperature: "#fb923c", humidity: "#22d3ee", light_level: "#fde047", smart_plug: "#34d399", smart_light: "#facc15", smart_switch: "#4ade80", siren: "#fb7185", lock: "#60a5fa", valve: "#5eead4",
};

const svg = (children: ReactNode, size: number) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>;
const GLYPHS: Record<DeviceKind, ReactNode> = {
  smoke: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.2" /><path d="M12 4v2M12 18v2M4 12h2M18 12h2" strokeWidth="1.3" /></>,
  co: <><path d="M7 17a4 4 0 0 1-.5-7.9A5.5 5.5 0 0 1 17 8.5a4 4 0 0 1 0 8.5z" /><path d="M9 20h6" /></>,
  gas: <><path d="M12 3c1 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1 1 1.6 1.7 1.6C11 8 10.5 5 12 3z" /><path d="M9 21h6" /></>,
  water_leak: <><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z" /><path d="M9 15a3 3 0 0 0 3 3" strokeWidth="1.3" /></>,
  panic_button: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity=".3" /></>,
  door: <><path d="M6 21V4h12v17" /><path d="M4 21h16" /><circle cx="15" cy="13" r="1" fill="currentColor" /></>,
  window: <><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M12 4v16M4 12h16" /></>,
  motion: <><circle cx="8" cy="7" r="2" /><path d="M8 10v5l-2 5M8 15l3 5M8 11l4 2" /><path d="M16 6a5 5 0 0 1 0 8M19 4a8 8 0 0 1 0 12" strokeWidth="1.3" /></>,
  glass_break: <><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M12 12L6 6M12 12l7-3M12 12l2 8M12 12l-6 5" strokeWidth="1.3" /></>,
  vibration: <><path d="M3 12h3l2-6 4 12 3-9 2 3h4" /></>,
  climate: <><path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z" /><path d="M18 8a3 3 0 0 1 0 5" strokeWidth="1.3" /></>,
  temperature: <><path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z" /><path d="M12 9v6" /></>,
  humidity: <><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z" /><path d="M9 14h6" /></>,
  light_level: <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.500 5.500L7 7M17 17l1.500 1.500M18.500 5.500L17 7M7 17l-1.500 1.500" strokeWidth="1.3" /></>,
  smart_plug: <><path d="M8 3v5M16 3v5" /><path d="M6 8h12v4a6 6 0 0 1-12 0z" /><path d="M12 18v3" /></>,
  smart_light: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.500 10.900c.6.500 1 1.200 1 2.100h5c0-.9.400-1.600 1-2.100A6 6 0 0 0 12 3z" /></>,
  smart_switch: <><rect x="5" y="3" width="14" height="18" rx="2" /><rect x="10" y="7" width="4" height="7" rx="1" fill="currentColor" fillOpacity=".3" /></>,
  siren: <><path d="M7 20v-6a5 5 0 0 1 10 0v6" /><path d="M5 20h14" /><path d="M12 4V2M4.500 7L3 5.500M19.500 7L21 5.500" strokeWidth="1.3" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /><circle cx="12" cy="16" r="1.200" fill="currentColor" /></>,
  valve: <><path d="M3 12h5M16 12h5" /><path d="M8 8l8 8V8l-8 8z" /><path d="M12 8V4M9 4h6" /></>,
};
/** The bare drawing of a kind (24 x 24), to place inside another SVG. */
export const kindGlyph = (kind: DeviceKind): ReactNode => GLYPHS[kind];
export function KindIcon({ kind, size = 20 }: { kind: DeviceKind; size?: number }) { return svg(GLYPHS[kind], size); }

// ---- what a device says, in a few words ----------------------------------------------------------------------------------------

/** The state as short pieces of text, using the console's own words (`t`). */
export function describeState(kind: DeviceKind, state: DeviceState, t: (key: string) => string): string[] {
  const parts: string[] = [];
  const flag = (value: boolean | number | undefined) => value === true;
  const main = MAIN_FIELD[kind];
  if (main && state[main] !== undefined) {
    const value = flag(state[main]);
    if (main === "triggered") parts.push(t(value ? `state_triggered_${kind}` : "state_clear"));
    else if (main === "open") parts.push(t(value ? "state_open" : "state_closed"));
    else if (main === "locked") parts.push(t(value ? "state_locked" : "state_unlocked"));
    else parts.push(t(value ? "state_on" : "state_off"));
  }
  if (typeof state.temperature === "number") parts.push(`${state.temperature.toFixed(1)} °C`);
  if (typeof state.humidity === "number") parts.push(`${Math.round(state.humidity)} %`);
  if (typeof state.lux === "number") parts.push(`${Math.round(state.lux)} lx`);
  if (typeof state.brightness === "number") parts.push(`${Math.round(state.brightness)} %`);
  if (typeof state.power_w === "number") parts.push(`${state.power_w.toFixed(1)} W`);
  if (typeof state.co_ppm === "number") parts.push(`${Math.round(state.co_ppm)} ppm`);
  if (state.tamper === true) parts.push(t("state_tamper"));
  return parts;
}

/** A device is "in trouble" when it is triggered, tampered with, low on battery or has stopped answering. */
export function deviceProblem(device: StudioDevice): "triggered" | "tamper" | "battery" | "offline" | null {
  const main = MAIN_FIELD[device.kind];
  if (ALARM_KIND[device.kind] && main && device.state[main] === true) return "triggered";
  if (device.state.tamper === true) return "tamper";
  if (typeof device.state.battery === "number" && device.state.battery < 15) return "battery";
  if (!device.online && device.expected_interval_s > 0) return "offline";
  return null;
}

// ---- presets: how a device talks -----------------------------------------------------------------------------------------------------

export type PresetId = "native" | "zigbee2mqtt" | "tasmota" | "shelly" | "push" | "http";
export const PRESETS: readonly PresetId[] = ["native", "zigbee2mqtt", "tasmota", "shelly", "push", "http"];
/** Every device of the presets below lives under this prefix of the A.R.M.O.R. broker, which is where its access list lets the server listen. */
export const DEVICE_PREFIX = "armor/device";

const Z2M_FIELDS: Partial<Record<DeviceKind, Array<{ field: string; path: string; invert?: boolean }>>> = {
  door: [{ field: "open", path: "contact", invert: true }], window: [{ field: "open", path: "contact", invert: true }],
  smoke: [{ field: "triggered", path: "smoke" }], co: [{ field: "triggered", path: "carbon_monoxide" }], gas: [{ field: "triggered", path: "gas" }], water_leak: [{ field: "triggered", path: "water_leak" }],
  motion: [{ field: "triggered", path: "occupancy" }], vibration: [{ field: "triggered", path: "vibration" }], panic_button: [{ field: "triggered", path: "action" }],
  climate: [{ field: "temperature", path: "temperature" }, { field: "humidity", path: "humidity" }], temperature: [{ field: "temperature", path: "temperature" }], humidity: [{ field: "humidity", path: "humidity" }],
  light_level: [{ field: "lux", path: "illuminance_lux" }], smart_plug: [{ field: "on", path: "state" }, { field: "power_w", path: "power" }], smart_light: [{ field: "on", path: "state" }], smart_switch: [{ field: "on", path: "state" }],
  lock: [{ field: "locked", path: "state" }],
};

export type PresetResult = { source: DeviceSource; commands: DeviceCommandsInput; protocol?: DeviceProtocol };
/**
 * The connection a preset describes. `name` is the device's name on its own network (Zigbee2MQTT's friendly name, Tasmota's topic, Shelly's id),
 * `host` the address of a device that is commanded over HTTP.
 */
export function applyPreset(preset: PresetId, kind: DeviceKind, name: string, host: string): PresetResult {
  const base = `${DEVICE_PREFIX}/${name || "device"}`, actuator = ACTUATOR_KINDS.includes(kind);
  const battery = { field: "battery", path: "battery" };
  switch (preset) {
    case "zigbee2mqtt": {
      const map = [...(Z2M_FIELDS[kind] ?? []), ...(actuator ? [] : [battery])];
      return { protocol: "zigbee", source: { type: "mqtt", topic: base, availability_topic: `${base}/availability`, ...(map.length ? { map } : {}) }, commands: actuator ? { mqtt: { topic: `${base}/set`, on: '{"state":"ON"}', off: '{"state":"OFF"}', toggle: '{"state":"TOGGLE"}' } } : {} };
    }
    case "tasmota":
      return { protocol: "wifi", source: { type: "mqtt", topic: `${base}/tele/STATE`, availability_topic: `${base}/tele/LWT`, map: [{ field: "on", path: "POWER" }] }, commands: { mqtt: { topic: `${base}/cmnd/POWER`, on: "ON", off: "OFF", toggle: "TOGGLE" } } };
    case "shelly":
      return { protocol: "wifi", source: { type: "mqtt", topic: `${base}/relay/0`, availability_topic: `${base}/online`, map: [{ field: "on", path: "$" }] }, commands: { mqtt: { topic: `${base}/relay/0/command`, on: "on", off: "off", toggle: "toggle" } } };
    case "http": {
      const root = `http://${host || "192.168.0.50"}`;
      return { protocol: "wifi", source: { type: "push" }, commands: { http: { on: `${root}/relay/0?turn=on`, off: `${root}/relay/0?turn=off`, toggle: `${root}/relay/0?turn=toggle` } } };
    }
    case "push":
      return { source: { type: "push" }, commands: {} };
    default:
      return { source: { type: "mqtt", topic: `${base}/state`, availability_topic: `${base}/availability` }, commands: actuator ? { mqtt: { topic: `${base}/set`, on: "ON", off: "OFF", toggle: "TOGGLE" } } : {} };
  }
}

// ---- the mapping as text, one entry per line: field=path (a trailing ! inverts it) --------------------------------------------------
export function mapToText(map: Array<{ field: string; path: string; invert?: boolean }> | undefined): string {
  return (map ?? []).map(entry => `${entry.field}=${entry.path}${entry.invert ? "!" : ""}`).join("\n");
}
export function textToMap(text: string): Array<{ field: string; path: string; invert?: boolean }> {
  return text.split("\n").map(line => line.trim()).filter(Boolean).flatMap(line => {
    const at = line.indexOf("=");
    if (at < 1) return [];
    const path = line.slice(at + 1).trim(), invert = path.endsWith("!");
    return [{ field: line.slice(0, at).trim(), path: invert ? path.slice(0, -1) : path, ...(invert ? { invert: true } : {}) }];
  });
}
/** A device's name on its own network, from what the operator typed: lowercase, no spaces. */
export const slug = (name: string): string => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

/** "3 min ago", "2 h ago": how long since a device last reported. */
export function ago(iso: string | null, now: number, t: (key: string) => string): string {
  if (!iso) return t("neverSeen");
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h`;
  return `${Math.round(seconds / 86400)} d`;
}
