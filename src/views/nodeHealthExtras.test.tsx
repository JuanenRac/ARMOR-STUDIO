import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { locales, text } from "../i18n";
import type { HealthWarning, NodeHealthItem, NodeHealthLevels, NodeHealthReport, SensorHealth } from "../api";
import { bluetoothAlert, bootLines, causeText, configCheckLines, sensorAddress, warningExplanation } from "../nodeHealthModel";
import { NodeCard } from "./NodeHealth";

const levels: NodeHealthLevels = { low_heap_b: 30000, low_heap_clear_b: 40000, restarts_per_day: 3, abnormal_window_min: 60, flap_reconnects: 3, flap_window_min: 15, weak_signal_dbm: -80, weak_signal_reports: 3, silent_after_s: 180 };
const sensors: SensorHealth[] = [
  { sensor_id: 2, model: "ld2412", state: "reporting", firmware_known: true, firmware: "1.26.22", bluetooth: "open", mac: "AA:BB:CC:DD:EE:FF", bluetooth_alert: true, quirk: "ld2412_bad_firmware" },
  { sensor_id: 1, model: "ld2450", state: "no_data", firmware_known: false, bluetooth: "closed" },
];
const base = (extra: Partial<NodeHealthReport> = {}, item: Partial<NodeHealthItem> = {}): NodeHealthItem => ({
  node_id: "north-1", family: "radar", firmware: "0.9.1", received_at: new Date().toISOString(), stale: false, status: "ok", restarts_24h: 0, warnings: [],
  report: { kind: "node_health", node_id: "north-1", timestamp_ms: 1, family: "radar", firmware: "0.9.1", uptime_s: 3_600, reset_reason: "power_on", heap_free: 142_000, heap_min: 98_000, link: "wifi", link_up: true, broker_reconnects: 1, ...extra }, ...item,
});
const card = (node: NodeHealthItem, language: Parameters<typeof text>[0] = "en", isAdmin = true) =>
  renderToStaticMarkup(createElement(NodeCard, { t: (key: string) => text(language, key), node, levels, now: Date.now(), opened: false, toggle: () => undefined, origin: "http://x", isAdmin, forget: () => undefined }));
const dirty = base({
  boot: { cause: "out_of_memory", reset_reason: "panic", uptime_before_s: 7_500, heap_internal_free: 11_000, heap_internal_largest: 4_000, coredump: true, deliberate: false, guard: false },
  memory_gate: { closed: true, transitions: 3, close_free: 24_000, close_block: 8_000, open_free: 40_000, open_block: 16_000 },
  coredump: { present: true, size: 65_536 },
  config_check: { snapshot: "restored", reverted: "reapplied" },
});
const radarNode = base({ sensors, radar: { perimeter_enabled: true, masked: false, wifi_jam: false, bridge_open: false, events_buffered: 4, sensor_bluetooth_off: true } });

describe("the last dirty start, on the health card", () => {
  it("says what happened: the cause, how long it had been up, the memory it had and that a core dump was kept", () => {
    const html = card(dirty);
    expect(html).toContain("Last start was a fault");
    expect(html).toContain("it ran out of memory");
    expect(html).toContain("2 h 5 min");
    expect(html).toContain("11 KB free, largest block 4 KB");
    expect(html).toContain("A core dump was saved");
    expect(html).toContain("saved (64 KB)");
  });
  it("shows the memory gate closed with the times it closed, and the settings check", () => {
    const html = card(dirty);
    expect(html).toContain("closed: the node holds back new work until memory recovers");
    expect(html).toContain("closed 3 times");
    expect(html).toContain("It closes at 23 KB free");
    expect(html).toContain("A saved copy of the settings was restored");
    expect(html).toContain("the previous settings were applied again");
  });
  it("shows nothing of it for a node that did not tell, and an open gate without a fault", () => {
    const quiet = card(base());
    for (const marker of ["nh-start", "nh-boot", "nh-gate", "nh-config-check", "nh-sensors", "nh-radar"]) expect(quiet).not.toContain(marker);
    const open = card(base({ memory_gate: { closed: false, transitions: 0, close_free: 24_000, close_block: 8_000, open_free: 40_000, open_block: 16_000 }, coredump: { present: false } }));
    expect(open).toContain("open");
    expect(open).not.toContain("closed 0 times");
    expect(open).toContain("none");
    expect(open).not.toContain("nh-boot");
  });
  it("tells a restart that the guard of the node chose and one that was deliberate", () => {
    const guard = bootLines({ cause: "guard_low_memory", reset_reason: "software", coredump: false, deliberate: true, guard: true }, key => text("en", key));
    expect(guard[0]).toBe("Restarted by a fault: the node's guard restarted it because memory stayed too low.");
    expect(guard).toContain("The node's own internal guard restarted it on purpose.");
    const asked = bootLines({ cause: "panic", reset_reason: "software", coredump: false, deliberate: true, guard: false }, key => text("en", key));
    expect(asked).toContain("The restart was deliberate (asked for, not a crash).");
  });
  it("writes an unknown cause as the node gave it", () => {
    expect(causeText("something_new", key => text("en", key))).toBe("something_new");
    expect(causeText("brownout", key => text("en", key))).toBe("the power dipped too low (brownout)");
  });
  it("lists a settings check that failed as a problem", () => {
    const lines = configCheckLines({ snapshot: "failed", reverted: "failed" }, key => text("en", key));
    expect(lines.map(line => line.bad)).toEqual([true, true]);
    expect(configCheckLines(undefined, key => text("en", key))).toEqual([]);
  });
  it("is told in every language with no phrase left untranslated", () => {
    for (const language of locales) {
      const html = card(dirty, language);
      for (const marker of ["nh_", "nc_", "fact_"]) expect(html, `${language}: ${marker}`).not.toContain(marker);
      expect(html, language).toContain(text(language, "nh_boot_title").replace(/'/g, "&#x27;"));
      expect(html, language).toContain(text(language, "nh_gate").replace(/'/g, "&#x27;"));
    }
  });
});

describe("the sensors of a radar node", () => {
  it("lists them in order of number with model, state, firmware and Bluetooth, and an alert chip for an open Bluetooth", () => {
    const html = card(radarNode);
    expect(html.indexOf('data-testid="nh-sensor-1"')).toBeLessThan(html.indexOf('data-testid="nh-sensor-2"'));
    expect(html).toContain("LD2450");
    expect(html).toContain("LD2412");
    expect(html).toContain("no data");
    expect(html).toContain("1.26.22");
    expect(html).toContain("unknown version");
    expect(html.match(/nh-bt-alert/g)).toHaveLength(1);
    expect(html).toContain("Bluetooth open");
  });
  it("says that a LD2412 with a faulty or an unknown firmware is one", () => {
    expect(card(radarNode)).toContain("runs a firmware known to misbehave");
    const unknown = base({ sensors: [{ sensor_id: 1, model: "ld2412", state: "reporting", firmware_known: false, bluetooth: "closed", quirk: "ld2412_unknown_firmware" }], radar: { perimeter_enabled: true, masked: false, wifi_jam: false, bridge_open: false, events_buffered: 0, sensor_bluetooth_off: true } });
    expect(card(unknown)).toContain("not one the node knows");
  });
  it("shows the Bluetooth address of a sensor to an administrator only", () => {
    expect(card(radarNode, "en", true)).toContain("AA:BB:CC:DD:EE:FF");
    expect(card(radarNode, "en", false)).not.toContain("AA:BB:CC:DD:EE:FF");
    expect(card(radarNode, "en", false)).not.toContain("nh-sensor-mac");
    expect(sensorAddress(sensors[0]!, true)).toBe("AA:BB:CC:DD:EE:FF");
    expect(sensorAddress(sensors[0]!, false)).toBeNull();
    expect(sensorAddress({ ...sensors[0]!, bluetooth: "closed" }, true)).toBeNull();
    expect(sensorAddress(sensors[1]!, true)).toBeNull();
  });
  it("counts as an alert a Bluetooth that is open or that the node flags", () => {
    expect(bluetoothAlert(sensors[0]!)).toBe(true);
    expect(bluetoothAlert(sensors[1]!)).toBe(false);
    expect(bluetoothAlert({ ...sensors[1]!, bluetooth: "unknown", bluetooth_alert: true })).toBe(true);
  });
  it("shows the facts of the perimeter engine only for a node that told them", () => {
    const html = card(radarNode);
    expect(html).toContain("Perimeter engine of the node");
    expect(html).toContain("Events waiting in the node");
    expect(html).toContain("keep it closed");
    expect(card(base())).not.toContain("Perimeter engine");
  });
  it("is told in every language with no phrase left untranslated", () => {
    for (const language of locales) {
      const html = card(radarNode, language);
      for (const marker of ["nh_", "nc_"]) expect(html, `${language}: ${marker}`).not.toContain(marker);
      expect(html, language).toContain(text(language, "nh_sensors_title"));
      expect(html, language).toContain(text(language, "nh_radar_title"));
    }
  });
});

describe("the three new warnings", () => {
  const warnings: HealthWarning[] = [
    { code: "node_sensor_bluetooth_open", detail: { sensors: "1,2", models: "ld2450,ld2412" } },
    { code: "node_radar_masked", detail: { events_buffered: 7 } },
    { code: "node_wifi_jam", detail: { rssi_dbm: -88 } },
  ];
  it("have a title and an explanation with what to do, with the details filled in", () => {
    const html = card(base({}, { status: "warning", warnings }));
    expect(html).toContain("A radar sensor has its Bluetooth open");
    expect(html).toContain("sensors: 1,2; models: LD2450, LD2412");
    expect(html).toContain("The radar sensors are covered");
    expect(html).toContain("Events waiting in the node: 7.");
    expect(html).toContain("Wi-Fi jamming suspected");
    expect(html).toContain("signal -88 dBm");
  });
  it("have no explanation for the four warnings that never had one", () => {
    expect(warningExplanation({ code: "node_low_memory", detail: {} }, key => text("en", key))).toBe("");
  });
  it("are told in every language, in the card and in the Alarms", () => {
    for (const language of locales) {
      const html = card(base({}, { status: "warning", warnings }), language);
      for (const marker of ["nh_", "alarm_node", "fact_"]) expect(html, `${language}: ${marker}`).not.toContain(marker);
      for (const code of ["node_sensor_bluetooth_open", "node_radar_masked", "node_wifi_jam"]) {
        for (const key of [`nh_warn_${code}`, `nh_warn_${code}_d`, `alarm_${code}`]) {
          expect(text(language, key), `${language} ${key}`).not.toBe(key);
          if (language !== "en") expect(text(language, key), `${language} ${key}`).not.toBe(text("en", key));
        }
      }
      for (const key of ["fact_sensors", "fact_models", "fact_events_buffered"]) expect(text(language, key), `${language} ${key}`).not.toBe(key);
    }
  });
});
