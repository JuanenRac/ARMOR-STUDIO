// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import type { BatteryCatalog } from "./api/battery";
import { BatteryMaintenance } from "./BatteryMaintenance";
import { changesSerial, emptyForm } from "./batteryModel";
import { locales, text } from "./i18n";
import type { SolarDeviceView } from "./solarModel";
import { SERIAL_COLUMNS, chipKey, csvField, serialRows, serialsCsv } from "./solarSerials";
import { byText, fakeServer, mount, typeInto } from "./testLive";

// Every serial number here is invented.
const stack = (device: string, example: boolean): SolarDeviceView => ({
  node_id: "solar-1", device, kind: "battery", received_at: "2030-01-01T00:00:00Z", stale: false, example,
  reading: { kind: "battery", node_id: "solar-1", device, timestamp_ms: 1, modules: 2, stack: [
    { n: 2, present: true, model: "US3000C" },
    { n: 1, present: true, model: "US3000C", serial: "TEST00AE20000001", chip: "newer", board: "NF4.E2", specification: "48V/74AH", cycles: 3 },
    { n: 3, present: false },
  ] },
});
const t = (key: string) => text("en", key);
const O = "http://armor.local:18080/";

describe("the list of batteries by serial number", () => {
  it("has a row for each module that is there, in order, and none for the examples", () => {
    const rows = serialRows([stack("us3000", false), stack("demo", true)]);
    expect(rows.map(row => [row.module, row.data.serial])).toEqual([[1, "TEST00AE20000001"], [2, undefined]]);
  });
  it("is written as CSV with a heading, empty fields for what a battery did not say and the chip in words", () => {
    const lines = serialsCsv(serialRows([stack("us3000", false)]), t).split("\r\n");
    expect(lines[0]!.split(",")).toHaveLength(SERIAL_COLUMNS.length);
    expect(lines[1]).toContain(",US3000C,TEST00AE20000001,new,NF4.E2,48V/74AH,");
    expect(lines[2]).toContain(",US3000C,,,,,");
    expect(lines).toHaveLength(4);
  });
  it("keeps a spreadsheet from taking a field for a formula, and quotes what needs it", () => {
    expect(csvField("=1+1")).toBe("'=1+1");
    expect(csvField("-TEST000001")).toBe("'-TEST000001");
    expect(csvField('a,"b"')).toBe('"a,""b"""');
  });
  it("has its words in the eight languages", () => {
    const keys = [...SERIAL_COLUMNS, chipKey("newer"), chipKey("older"), chipKey(undefined), "solx_serials_title", "solx_serials_note", "bm_show_serial_ops", "bm_serial_warning", "bm_serial_ack", "bm_serial_again", "bm_prob_ack"];
    for (const locale of locales) expect(keys.filter(key => text(locale, key) === key), locale).toEqual([]);
  });
});

const catalog: BatteryCatalog = {
  version: 1,
  ops: [
    { id: "set_clock", risk: "low", needs_idle: false, alarm_ok: false, atomic: false, group: "clock", params: {} },
    { id: "write_barcode", risk: "irreversible", needs_idle: true, alarm_ok: false, atomic: true, group: "eeprom", params: { serial: { type: "serial", required: true } } },
  ],
  models: [], limit_groups: [], protections: [], expert_blocked: [], refusals: [],
  limits: { idle_current_ma: 1000, arm_window_s: 120, cooldown_s: 30, image_min_bytes: 65536, image_max_bytes: 524288, chunk_bytes: 256, max_chunks: 2048, serial_pattern: "^[A-Za-z0-9_-]{10,24}$", no_serial: "NOSERIAL" },
};

describe("writing the serial number is not offered lightly", () => {
  afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ""; });

  it("is told apart from the operations that leave the serial number as it is", () => {
    expect(changesSerial(catalog.ops[1], emptyForm())).toBe(true);
    expect(changesSerial(catalog.ops[0], emptyForm())).toBe(false);
    expect(changesSerial({ params: { restore_barcode: { type: "boolean" } } }, emptyForm())).toBe(false);
    expect(changesSerial({ params: { restore_barcode: { type: "boolean" } } }, { restoreBarcode: false })).toBe(true);
  });

  it("is listed only after ticking the box, and asks for an acknowledgement before going on", async () => {
    const calls = fakeServer({
      "GET /api/v1/solar/battery-ops/catalog": { enabled: true, catalog },
      "GET /api/v1/solar/battery-ops": { operations: [] },
      "GET /api/v1/solar": { devices: [{ node_id: "solar-1", device: "us3000", kind: "battery" }] },
    });
    const view = await mount(createElement(BatteryMaintenance, { t, origin: O, isAdmin: true }));
    await view.settle();
    const offered = () => [...view.host.querySelectorAll("option")].map(option => option.value);
    expect(offered()).toContain("set_clock");
    expect(offered()).not.toContain("write_barcode");
    await view.click(view.host.querySelector('[data-testid="serial-ops"]'));
    expect(offered()).toContain("write_barcode");
    await typeInto([...view.host.querySelectorAll("select")].find(select => [...select.options].some(option => option.value === "write_barcode"))!, "write_barcode");
    await view.click(byText(view.host, t("bm_next")));
    expect(view.host.textContent).toContain(t("bm_serial_warning"));
    await typeInto(view.host.querySelector<HTMLInputElement>('input:not([type="checkbox"])'), "TEST00AE20000001");
    await view.click(byText(view.host, t("bm_next")));
    expect(view.host.textContent).toContain(t("bm_prob_ack"));
    await view.click(view.host.querySelector('[data-testid="serial-ack"]'));
    await view.click(byText(view.host, t("bm_next")));
    expect(view.host.textContent).toContain(t("bm_serial_help"));
    expect(calls.every(call => call.method === "GET")).toBe(true);
    await view.unmount();
  });
});
