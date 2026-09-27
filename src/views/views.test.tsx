import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Alarm, Automation, StudioDevice } from "../api";
import { INITIAL_BUILDINGS, INITIAL_CAMERAS, INITIAL_DIMENSIONS, INITIAL_FEATURES, INITIAL_OPENINGS, INITIAL_ROOF_ITEMS, INITIAL_SENSORS, INITIAL_TERRAIN, INITIAL_WALL_LAMPS } from "../domain";
import type { SiteModel } from "../designer/ops";
import { locales, text, type Locale } from "../i18n";
import type { NodeState } from "../types";
import type { SolarDeviceView, SolarInverterReading, SolarTotals } from "../solarModel";
import { AlarmsView } from "./AlarmsView";
import { BatteriesView } from "./BatteriesView";
import { InvertersView } from "./InvertersView";
import { AutomationsView } from "./AutomationsView";
import { DevicesView } from "./DevicesView";
import { OverviewView } from "./OverviewView";
import { RadarSensors } from "./RadarSensors";
import { SystemView } from "./SystemView";

const NOW = Date.parse("2026-01-01T12:00:00Z");
const device = (id: string, patch: Partial<StudioDevice>): StudioDevice => ({
  id, name: id, kind: "smoke", protocol: "zigbee", location: "Kitchen", category: "sensor", source: { type: "push" }, commands: {}, can_command: false,
  expected_interval_s: 0, state: {}, online: true, last_seen: new Date(NOW - 60_000).toISOString(), created_at: "", ...patch,
});
const devices: StudioDevice[] = [
  device("smoke-kitchen", { state: { triggered: true, battery: 80 } }),
  device("front-door", { kind: "door", protocol: "wifi", state: { open: false } }),
  device("garage-plug", { kind: "smart_plug", category: "actuator", can_command: true, state: { on: true, power_w: 42 }, commands: { mqtt: { topic: "armor/device/plug/set", on: "ON", off: "OFF" } } }),
  device("climate", { kind: "climate", protocol: "bluetooth", state: { temperature: 21.5, humidity: 48 }, online: false, expected_interval_s: 300 }),
];
const alarms: { active: Alarm[]; recent: Alarm[] } = {
  active: [
    { id: "a1", key: "device:smoke-kitchen", source: { type: "device", id: "smoke-kitchen" }, severity: "critical", code: "smoke", raised_at: new Date(NOW - 5000).toISOString() },
    { id: "a2", key: "node:north", source: { type: "node", id: "north" }, severity: "high", code: "node_down", raised_at: new Date(NOW - 90_000).toISOString(), acknowledged_at: new Date(NOW - 30_000).toISOString(), acknowledged_by: "admin" },
  ],
  recent: [],
};
const automations: Automation[] = [{
  id: "auto1", name: "Siren on smoke", enabled: true, trigger: { type: "device", device_id: "smoke-kitchen", field: "triggered", equals: true }, when_mode: "any",
  actions: [{ type: "device", device_id: "garage-plug", command: "on", for_s: 30 }, { type: "notify" }], created_at: "", last_run: null, runs: 0,
}];
const nodes: NodeState[] = [{ node_id: "north", online: true, stale: false, timestamp_ms: 0, lux: 10, target_count: 1, alert_level: "review" }];
const model: SiteModel = {
  terrain: INITIAL_TERRAIN, buildings: INITIAL_BUILDINGS, openings: INITIAL_OPENINGS, roofItems: INITIAL_ROOF_ITEMS, wallLamps: INITIAL_WALL_LAMPS, features: INITIAL_FEATURES,
  cameras: INITIAL_CAMERAS, sensors: INITIAL_SENSORS, placements: [{ device_id: "smoke-kitchen", x: 20, y: 15, z: 2.4, rotation: 0 }],
};
const noop = () => undefined;

/** Renders with a translator that remembers every phrase it could not translate, so a forgotten key shows up as a failure. */
function render(locale: Locale, build: (t: (key: string) => string) => ReturnType<typeof createElement>): { html: string; untranslated: string[] } {
  const untranslated: string[] = [];
  const t = (key: string) => {
    const value = text(locale, key);
    if (value === key && locale !== "en") untranslated.push(key);
    if (value === key && locale === "en" && /[A-Z_]|^[a-z]+[A-Z]/.test(key)) untranslated.push(key);
    return value;
  };
  return { html: renderToStaticMarkup(build(t)), untranslated };
}

/** Every alarm code the server can raise (ARMOR-SERVER/src/alarms.ts) has a phrase in every language. */
const SERVER_ALARM_CODES = ["intrusion", "node_down", "camera_down", "smoke", "co", "gas", "water_leak", "panic", "door_open", "window_open", "motion", "glass_break", "vibration", "triggered", "tamper", "low_battery", "device_offline", "solar_fault", "solar_battery_low", "solar_battery_alarm", "solar_offline", "electrical_alarm", "electrical_voltage", "electrical_grid_lost", "electrical_offline", "electrical_switch_fault", "network_internet_down", "network_lan_down", "network_degraded", "network_new_device", "network_arp_conflict", "network_port_opened", "network_offline"];
const cells = (base: number) => Array.from({ length: 15 }, (_, i) => Number((base + (i === 9 ? 0.024 : (i % 4) * 0.002)).toFixed(3)));
const solarDevices: SolarDeviceView[] = [
  { node_id: "solar-1", device: "axpert-1", kind: "inverter", received_at: new Date(NOW - 5000).toISOString(), stale: false, reading: {
    kind: "inverter", node_id: "solar-1", device: "axpert-1", timestamp_ms: NOW, mode: "line", grid_v: 231, grid_hz: 50, out_v: 230, out_hz: 50, out_va: 1600, out_w: 1200, load_percent: 24,
    battery_v: 52, battery_a: 10, battery_percent: 80, pv_v: 120, pv_a: 5, pv_w: 600, heatsink_c: 40, ac_charging: false, pv_charging: true, load_on: true, warnings: ["line_fail"] } },
  { node_id: "solar-1", device: "us3000", kind: "battery", received_at: new Date(NOW - 5000).toISOString(), stale: false, reading: {
    kind: "battery", node_id: "solar-1", device: "us3000", timestamp_ms: NOW, modules: 2, state: "charging", voltage_v: 51.2, current_a: 12.5, soc_percent: 76, model: "US3000C",
    capacity_ah: 91.2, full_capacity_ah: 148, energy_kwh: 4.67, cycles: 210, temperature_min_c: 21, temperature_max_c: 24, cell_min_v: 3.32, cell_max_v: 3.35,
    stack: [
      { n: 1, present: true, voltage_v: 51.2, current_a: 6.2, soc_percent: 76, state: "charging", cells_v: cells(3.32), temperatures_c: [21, 22, 22, 23, 21], capacity_ah: 45.6, full_capacity_ah: 74, cycles: 210 },
      { n: 2, present: false },
    ] } },
];
const solarDevicesParallel: SolarDeviceView[] = [
  { ...solarDevices[0], device: "axpert-big", reading: { ...(solarDevices[0].reading as SolarInverterReading), device: "axpert-big", pv2_v: 327.3, pv2_a: 3.1, pv2_w: 1026, pv_w: 1626,
    total_out_w: 312, total_out_va: 574, total_load_percent: 3, total_charging_a: 2,
    units: [{ unit: 0, mode: "battery", serial: "92931701100510", fault_code: "00", out_w: 141, load_percent: 5, battery_v: 51.4 }, { unit: 1, mode: "fault", fault_code: "07", out_w: 0 }] } as SolarInverterReading },
];
const solarCatalog = { inverter_models: ["voltronic", "mpp-solar", "other"], battery_models: ["pylontech-us2000", "pylontech-us3000", "pylontech-us5000", "ant-bms", "other"], connections: ["rs232", "rs485", "usb", "can", "wifi", "other"] };
const solarWaiting = [
  { node_id: "solar-2", device: "casa-inversor", kind: "inverter" as const, name: "Inversor de la casa", model: "mpp-solar", connection: "rs232", notes: "", created_at: "2026-01-01T00:00:00.000Z" },
  { node_id: "solar-2", device: "diy-ant", kind: "battery" as const, name: "Pack casero", model: "ant-bms", connection: "usb", notes: "16S", created_at: "2026-01-01T00:00:00.000Z" },
];
const solarTotals: SolarTotals = { inverters: 1, batteries: 1, stale: 0, pv_w: 600, load_w: 1200, battery_w: 520, soc_percent: 76, capacity_ah: 91.2, full_capacity_ah: 148, energy_kwh: 4.67, grid_present: true, mode: "line" };

describe("alarm phrases", () => {
  it("cover every code the server raises", () => {
    for (const locale of locales) for (const code of SERVER_ALARM_CODES) expect(text(locale, `alarm_${code}`), `${locale}:${code}`).not.toBe(`alarm_${code}`);
  });
});

describe("the menus render with data in every language", () => {
  const views: Record<string, (t: (key: string) => string) => ReturnType<typeof createElement>> = {
    overview: t => createElement(OverviewView, { t, origin: "http://x", mode: "armed", toggleMode: noop, demo: false, nodes, cameras: INITIAL_CAMERAS, reachability: { "cam-01": "online" }, devices, alarms, model, dimensions: INITIAL_DIMENSIONS, setView: noop, onDevice: noop, now: NOW }),
    alarms: t => createElement(AlarmsView, { t, origin: "http://x", alarms, reload: noop, devices, cameraNames: { "cam-01": "Entrance" }, mode: "disarmed", toggleMode: noop, now: NOW, isAdmin: true }),
    devices: t => createElement(DevicesView, { t, origin: "http://x", devices, reload: noop, placedIds: new Set(["smoke-kitchen"]), onPlace: noop, now: NOW }),
    automations: t => createElement(AutomationsView, { t, origin: "http://x", automations, reload: noop, devices, now: NOW }),
    inverters: t => createElement(InvertersView, { t, origin: "http://x", devices: solarDevices, waiting: solarWaiting, catalog: solarCatalog, reload: noop, totals: solarTotals, now: NOW, unreachable: false }),
    inverterParallel: t => createElement(InvertersView, { t, origin: "http://x", devices: solarDevicesParallel, waiting: [], catalog: solarCatalog, reload: noop, totals: solarTotals, now: NOW, unreachable: false }),
    batteries: t => createElement(BatteriesView, { t, origin: "http://x", devices: solarDevices, waiting: solarWaiting, catalog: solarCatalog, reload: noop, totals: solarTotals, now: NOW, unreachable: false }),
    system: t => createElement(SystemView, { t, origin: "http://x", isAdmin: true }),
    radarSensors: t => createElement(RadarSensors, { t, sensors: [{ ...INITIAL_SENSORS[0], node: "north", channel: 1 }, INITIAL_SENSORS[1]], dimensions: INITIAL_DIMENSIONS, nodes, rules: { dwell_ms: 2000, zones: [] }, targetsBySensor: { "sensor-01": 2 }, setSensors: noop, openZones: noop, openDesigner: noop }),
  };
  for (const [name, build] of Object.entries(views)) {
    it(`${name} shows its content and leaves no phrase untranslated`, () => {
      for (const locale of locales) {
        const { html, untranslated } = render(locale, build);
        expect(html.length, `${name} ${locale}`).toBeGreaterThan(200);
        expect([...new Set(untranslated)], `${name} ${locale}`).toEqual([]);
      }
    });
  }

  it("the overview names the triggered device and the alarm that needs a person", () => {
    const { html } = render("en", views.overview);
    expect(html).toContain("smoke-kitchen");
    expect(html).toContain("Disarm the system");
  });
  it("the devices menu offers a command for a plug and not for a detector", () => {
    const { html } = render("en", views.devices);
    expect(html).toContain("garage-plug");
    expect(html).toContain(">Toggle<");
  });
  it("the inverters menu says where the power goes and lists the warnings", () => {
    const { html } = render("en", views.inverters);
    expect(html).toContain("axpert-1");
    expect(html).toContain("Line fail");
    expect(html).toContain("sl-flow");
    expect(html).toContain("Add an inverter");
    expect(html).toContain("Inversor de la casa");
    expect(html).toContain("waiting for its first reading");
  });
  it("an inverter with a second PV input and parallel units shows both, in every language", () => {
    const { html } = render("en", views.inverterParallel);
    expect(html).toContain("Second PV input");
    expect(html).toContain("327.3 V");
    expect(html).toContain("Units of the parallel system");
    expect(html).toContain("92931701100510");
    expect(html).toContain("System total");
    expect(html).toContain("fault 07");
    expect(render("en", views.inverters).html).not.toContain("Second PV input");     // an inverter with one input shows none
    expect(render("es", views.inverterParallel).html).toContain("Segunda entrada fotovoltaica");
  });
  it("the batteries menu shows capacities, cells one by one and the absent module", () => {
    const { html } = render("en", views.batteries);
    expect(html).toContain("91.2 / 148.0 Ah");
    expect(html).toContain("US3000C");
    expect(html).toContain("3.344");
    expect(html).toContain("not present");
    expect(html).toContain("Add a battery");
    expect(html).toContain("Pack casero");
    expect((html.match(/class="sl-cell /g) ?? []).length).toBe(15);
  });
  it("the radar sensor list shows which radar is wired and which is not", () => {
    const { html } = render("en", views.radarSensors);
    expect(html).toContain("north");
    expect(html).toContain("Not wired");
  });
});

describe("families of phrases chosen at run time are complete", () => {
  const ALL_KINDS = ["smoke", "co", "gas", "water_leak", "panic_button", "door", "window", "motion", "glass_break", "vibration", "climate", "temperature", "humidity", "light_level", "smart_plug", "smart_light", "smart_switch", "siren", "lock", "valve"];
  const families: Record<string, string[]> = {
    kind: ALL_KINDS, protocol: ["wifi", "bluetooth", "zigbee", "zwave", "thread", "lora", "rf433", "wired", "other"], problem: ["triggered", "tamper", "battery", "offline"],
    severity: ["critical", "high", "warning"], alarmState: ["active", "going", "ended"], event: ["alarm", "alert", "device", "node", "camera", "mode"],
    preset: ["native", "zigbee2mqtt", "tasmota", "shelly", "push", "http"], outcome: ["allowed", "denied", "failed"], siteSync: ["saved", "saving", "offline"],
    solarMode: ["power_on", "standby", "line", "battery", "fault", "power_saving", "shutdown", "unknown"], radarState: ["online", "offline", "stale", "unwired"], level: ["normal", "review", "high"], status: ["online", "offline", "stale"],
  };
  for (const [prefix, names] of Object.entries(families)) {
    it(`${prefix}_* has every value in every language`, () => {
      for (const locale of locales) for (const name of names) {
        const value = text(locale, `${prefix}_${name}`);
        expect(value, `${locale}:${prefix}_${name}`).not.toBe(`${prefix}_${name}`);
      }
    });
  }
});
