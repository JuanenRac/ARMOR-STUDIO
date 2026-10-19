import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BatteryCatalog, BatteryOperation } from "./api/battery";
import { BatteryMaintenance, dynamicKeys, limitLabel } from "./BatteryMaintenance";
import { GROUP_ORDER, batteryNodes, buildParams, emptyForm, errorKey, isActive, operationGroups, percentOf, readLimit, scaleOf, serialLooksRight, showLimit } from "./batteryModel";
import { locales, text } from "./i18n";

// The table the server hands out. When ARMOR-COMMON is next to this repository the real one is used, so the screen can never drift from it.
const shared = path.resolve(import.meta.dirname, "..", "..", "ARMOR-COMMON", "src", "armor_common", "battery_ops.json");
const fixture: BatteryCatalog = fs.existsSync(shared) ? JSON.parse(fs.readFileSync(shared, "utf8")) as BatteryCatalog : {
  version: 1,
  ops: [
    { id: "set_clock", risk: "low", needs_idle: false, alarm_ok: false, atomic: false, group: "clock", params: {} },
    { id: "clear_data", risk: "high", needs_idle: false, alarm_ok: false, atomic: false, group: "maintenance", params: { which: { type: "enum", values: ["event", "history"], required: true } } },
    { id: "limits_set", risk: "high", needs_idle: true, alarm_ok: false, atomic: false, group: "limits", params: { group: { type: "enum", values: ["module_voltage", "cell_voltage", "temperature"], required: true }, values: { type: "limits", required: true } } },
    { id: "protections_set", risk: "high", needs_idle: true, alarm_ok: false, atomic: false, group: "limits", params: { items: { type: "protections", required: true }, accept_risk: { type: "boolean" } } },
    { id: "output_set", risk: "medium", needs_idle: true, alarm_ok: false, atomic: false, group: "outputs", params: { output: { type: "enum", values: ["cfet", "dfet", "buzz", "heat"], required: true }, state: { type: "enum", values: ["on", "off"], required: true } } },
    { id: "write_barcode", risk: "irreversible", needs_idle: true, alarm_ok: false, atomic: true, group: "eeprom", params: { serial: { type: "serial", required: true } } },
    { id: "firmware_update", risk: "irreversible", needs_idle: true, alarm_ok: false, atomic: true, group: "firmware", params: { image_size: { type: "integer", required: true }, image_crc32: { type: "integer", required: true }, image_version: { type: "string", required: true }, clear_eeprom: { type: "boolean" } } },
    { id: "expert_command", risk: "high", needs_idle: false, alarm_ok: false, atomic: false, group: "expert", params: { line: { type: "string", maxLength: 48, required: true } } },
  ],
  models: [],
  limit_groups: [{ name: "module_voltage", lowest: 20000, highest: 65000, unit: "mV", keys: [["pov", "pov"], ["povr", "povr"], ["phv", "phv"], ["phvr", "phvr"], ["plv", "plv"], ["plvr", "plvr"], ["puv", "puv"], ["puvr", "puvr"], ["pslp", "pslp"]],
    orders: [["povr", "pov"], ["phv", "pov"], ["phvr", "phv"], ["plv", "phv"], ["puv", "plv"], ["plv", "plvr"], ["puv", "puvr"], ["pslp", "puv"]] }],
  protections: ["bov", "bhv", "coc"], expert_blocked: [], limits: { idle_current_ma: 1000, arm_window_s: 120, cooldown_s: 30, image_min_bytes: 65536, image_max_bytes: 524288, chunk_bytes: 256, max_chunks: 2048, serial_pattern: "^[A-Za-z0-9_-]{10,24}$", no_serial: "NOSERIAL" },
  refusals: [],
};
const group = fixture.limit_groups[0];

describe("every sentence of the battery maintenance screen", () => {
  it("exists in the eight languages, including the ones whose name is built from the table", () => {
    const missing: string[] = [];
    for (const locale of locales) for (const key of dynamicKeys(fixture)) if (text(locale, key) === key) missing.push(`${locale}:${key}`);
    expect(missing).toEqual([]);
  });
  it("covers every code the server and the node can answer with", () => {
    const codes = ["generic", "forbidden", "battery_write_disabled", "invalid_request", "invalid_params", "unknown_node", "busy", "image_missing", "mqtt_unavailable", "serial_mismatch", "not_armed", "expired", "unknown_operation", "not_restorable",
      "not_cancellable", "rate_limited", "image_size", "image_header", "send_the_bin_as_octet_stream"];
    const refusals = fixture.refusals.length ? fixture.refusals.filter(item => item !== "none") : ["disabled"];
    for (const locale of locales) {
      const known = (key: string) => text(locale, key) !== key;
      for (const code of [...codes, ...refusals]) {
        const key = errorKey(code.startsWith("stage_") ? "stage" : code, known);
        expect(key, `${locale} ${code}`).not.toBe(key === "bm_err_generic" && code !== "generic" ? "bm_err_generic" : "never");
        expect(known(key), `${locale} ${code}`).toBe(true);
      }
    }
    // a code nobody wrote a sentence for falls back to the general one
    expect(errorKey("something_new", key => text("en", key) !== key)).toBe("bm_err_generic");
  });
});

describe("the values the person types", () => {
  it("reads volts and degrees as the milli-units the server takes", () => {
    expect(readLimit(group, "58")).toBe(58000);
    expect(readLimit(group, "57,6")).toBe(57600);
    expect(readLimit(group, " 47.125 ")).toBe(47125);
    expect(readLimit(group, "-5")).toBe(-5000);
    for (const bad of ["", "abc", "1e3", "5.", ".5", "1 2"]) expect(readLimit(group, bad)).toBeUndefined();
    expect(showLimit(group, 58000)).toBe("58.000");
    expect(scaleOf(group)).toEqual({ divisor: 1000, decimals: 3, unit: "V" });
    expect(scaleOf({ ...group, unit: "m°C" })).toEqual({ divisor: 1000, decimals: 1, unit: "°C" });
  });

  it("builds the values of each operation, and says what is missing", () => {
    const form = emptyForm();
    expect(buildParams(fixture, "set_clock", form)).toEqual({ ok: true, params: {} });
    expect(buildParams(fixture, "nothing", form)).toEqual({ ok: false, problem: "bm_prob_choose" });
    expect(buildParams(fixture, "clear_data", { ...form, which: "history" })).toEqual({ ok: true, params: { which: "history" } });
    expect(buildParams(fixture, "output_set", { ...form, output: "heat", state: "on" })).toEqual({ ok: true, params: { output: "heat", state: "on" } });
    expect(buildParams(fixture, "write_barcode", { ...form, label: "short" })).toEqual({ ok: false, problem: "bm_prob_label" });
    expect(buildParams(fixture, "write_barcode", { ...form, label: " H221014C32213244 " })).toEqual({ ok: true, params: { serial: "H221014C32213244" } });
    expect(buildParams(fixture, "expert_command", form)).toEqual({ ok: false, problem: "bm_prob_line" });
    expect(buildParams(fixture, "expert_command", { ...form, line: "pwr" })).toEqual({ ok: true, params: { line: "pwr" } });
    expect(buildParams(fixture, "expert_command", { ...form, line: "x".repeat(49) })).toEqual({ ok: false, problem: "bm_prob_line" });
    expect(buildParams(fixture, "firmware_update", form)).toEqual({ ok: false, problem: "bm_prob_image" });
    const image = { image_id: "abcdef0123456789", size: 200000, crc32: 1, sha256: "0".repeat(64), board: "US2000C", version: "2.4" };
    expect(buildParams(fixture, "firmware_update", { ...form, image, clearEeprom: true })).toEqual({ ok: true, params: { clear_eeprom: true, image_id: "abcdef0123456789" } });
  });

  it("sends a group of limits whole, inside the range and in order", () => {
    const typed: Record<string, string> = { "module_voltage.pov": "58", "module_voltage.povr": "55", "module_voltage.phv": "57.6", "module_voltage.phvr": "55.5", "module_voltage.plv": "47", "module_voltage.plvr": "48",
      "module_voltage.puv": "44", "module_voltage.puvr": "45", "module_voltage.pslp": "42" };
    const form = { ...emptyForm(), group: "module_voltage", limits: typed };
    const built = buildParams(fixture, "limits_set", form);
    expect(built.ok && built.params).toEqual({ group: "module_voltage", values: { pov: 58000, povr: 55000, phv: 57600, phvr: 55500, plv: 47000, plvr: 48000, puv: 44000, puvr: 45000, pslp: 42000 } });
    expect(buildParams(fixture, "limits_set", { ...form, limits: { ...typed, "module_voltage.pslp": "" } })).toEqual({ ok: false, problem: "bm_prob_limits" });
    expect(buildParams(fixture, "limits_set", { ...form, limits: { ...typed, "module_voltage.pov": "66" } })).toEqual({ ok: false, problem: "bm_prob_range" });
    expect(buildParams(fixture, "limits_set", { ...form, limits: { ...typed, "module_voltage.pslp": "19" } })).toEqual({ ok: false, problem: "bm_prob_range" });
    expect(buildParams(fixture, "limits_set", { ...form, limits: { ...typed, "module_voltage.pov": "50" } })).toEqual({ ok: false, problem: "bm_prob_order" });
  });

  it("sends protections only as enable or disable, and disabling asks for the risk to be accepted", () => {
    const form = emptyForm();
    expect(buildParams(fixture, "protections_set", form)).toEqual({ ok: false, problem: "bm_prob_protections" });
    expect(buildParams(fixture, "protections_set", { ...form, protections: { bov: "keep", bhv: "en" } })).toEqual({ ok: true, params: { items: { bhv: "en" } } });
    expect(buildParams(fixture, "protections_set", { ...form, protections: { bov: "dis" } })).toEqual({ ok: false, problem: "bm_prob_risk" });
    expect(buildParams(fixture, "protections_set", { ...form, protections: { bov: "dis" }, acceptRisk: true })).toEqual({ ok: true, params: { items: { bov: "dis" }, accept_risk: true } });
  });

  it("accepts a serial number the way the node does, and NOSERIAL", () => {
    expect(serialLooksRight(fixture, "PPTBH02200409223")).toBe(true);
    expect(serialLooksRight(fixture, "NOSERIAL")).toBe(true);
    for (const bad of ["", "short", "has space 12345", "x".repeat(30)]) expect(serialLooksRight(fixture, bad)).toBe(false);
  });
});

describe("what the screen shows of an operation", () => {
  const operation = (fields: Partial<BatteryOperation>): BatteryOperation => ({ id: "a1b2c3d4e5f60718", node: "solar-1", port: 2, op: "set_clock", params: {}, actor: "ana", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", stage: "running", ...fields });
  it("groups the operations in the order a person looks for them", () => {
    const groups = operationGroups(fixture);
    expect(groups.map(item => item.group)).toEqual(GROUP_ORDER.filter(name => fixture.ops.some(item => item.group === name)));
    expect(fixture.ops.every(item => (GROUP_ORDER as readonly string[]).includes(item.group))).toBe(true);
    expect(groups.flatMap(item => item.ops).length).toBe(fixture.ops.length);
  });
  it("knows when an operation is still going", () => {
    for (const stage of ["arming", "armed", "starting", "running"] as const) expect(isActive(operation({ stage }))).toBe(true);
    for (const stage of ["done", "rejected", "expired", "lost", "withdrawn"] as const) expect(isActive(operation({ stage }))).toBe(false);
    expect(isActive(undefined)).toBe(false);
  });
  it("says how far it is, from the steps, the packets or the pieces of the file sent to the node", () => {
    expect(percentOf(operation({}))).toBe(0);
    expect(percentOf(operation({ steps_done: 3, steps_total: 9 }))).toBe(33);
    expect(percentOf(operation({ steps_done: 3, steps_total: 9, packets_sent: 50, packets_total: 200 }))).toBe(25);
    expect(percentOf(operation({ stage: "arming", staging: { sent: 100, total: 400 } }))).toBe(25);
    expect(percentOf(operation({ stage: "done" }))).toBe(100);
  });
  it("lists the nodes that have a battery, once each", () => {
    expect(batteryNodes([{ node_id: "b", kind: "battery" }, { node_id: "a", kind: "battery" }, { node_id: "a", kind: "battery" }, { node_id: "c", kind: "inverter" }])).toEqual(["a", "b"]);
  });
  it("names a threshold in words and keeps its key beside it", () => {
    const t = (key: string) => text("en", key);
    expect(limitLabel(t, "pov")).toBe("Over-voltage protection (POV)");
    expect(limitLabel(t, "povr")).toBe("Over-voltage protection · release (POVR)");
    expect(limitLabel(t, "pslp")).toBe("Sleep voltage (PSLP)");
    expect(limitLabel(t, "cot")).toBe("Over-temperature protection (COT)");
    expect(limitLabel(t, "cutr")).toBe("Under-temperature protection · release (CUTR)");
  });
});

const plain = (html: string): string => html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

describe("the screen", () => {
  it("is for administrators only", () => {
    const html = renderToStaticMarkup(createElement(BatteryMaintenance, { t: key => text("en", key), origin: "http://x", isAdmin: false }));
    expect(html).toContain(text("en", "bm_admin_only"));
    expect(html).not.toContain(text("en", "bm_prepare"));
  });
  it("starts by asking which battery and which operation, with the warning on top", () => {
    const html = plain(renderToStaticMarkup(createElement(BatteryMaintenance, { t: key => text("en", key), origin: "http://x", isAdmin: true })));
    expect(html).toContain(text("en", "bm_warning"));
    expect(html).toContain(text("en", "bm_step_choose"));
    expect(html).toContain(text("en", "bm_port"));
  });
  it("is written in every language", () => {
    for (const locale of locales) {
      const html = plain(renderToStaticMarkup(createElement(BatteryMaintenance, { t: key => text(locale, key), origin: "http://x", isAdmin: true })));
      expect(html, locale).toContain(text(locale, "bm_title"));
      expect(html, locale).toContain(text(locale, "bm_warning"));
    }
  });
});
