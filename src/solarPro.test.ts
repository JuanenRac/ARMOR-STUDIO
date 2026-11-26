// The sums, faults, histories and "Verify" of the Batteries menu, with several sockets of Pylontech batteries.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { samplesToCsv, seriesStats, thresholdsInView } from "./solarChartData";
import { bankFaults, blinking, cellFault, isLfp, moduleFaults } from "./solarFaults";
import type { SolarBatteryReading, SolarDeviceView, SolarModuleReading, SolarSample } from "./solarModel";
import { SolarRecorder } from "./solarRecorder";
import { likelyProtocol, protocolsFor, SOLAR_PROTOCOLS } from "./solarProtocols";
import { SOLAR_THRESHOLDS } from "./solarThresholds";
import { bankBucketMs, bankSummary, derivedSamples, mergeBank, stackFigures } from "./solarTotals";
import { checkLive, clearingFor, parseStatCounter, verdictOf, type VerifyTarget } from "./solarVerify";

const levels = SOLAR_THRESHOLDS.levels;
const NOW = Date.parse("2026-01-01T12:00:00Z");
const module = (n: number, soc: number, extra: Partial<SolarModuleReading> = {}): SolarModuleReading => ({
  n, present: true, model: "US2000C", voltage_v: 49.5, current_a: -1, temperature_c: 22, soc_percent: soc, cells_v: Array.from({ length: 15 }, () => 3.3), capacity_ah: 50 * soc / 100, full_capacity_ah: 50, ...extra,
});
const socket = (device: string, stack: SolarModuleReading[], extra: Partial<SolarDeviceView> = {}, reading: Partial<SolarBatteryReading> = {}): SolarDeviceView => {
  const present = stack.filter(item => item.present);
  const said = present.reduce((sum, item) => sum + (item.capacity_ah ?? 0), 0);   // what a node adds up: only the batteries that say it
  return {
    node_id: "solar-1", device, kind: "battery", received_at: new Date(NOW).toISOString(), stale: false, ...extra,
    reading: {
      kind: "battery", node_id: "solar-1", device, timestamp_ms: NOW, modules: present.length, stack, voltage_v: 49.5, current_a: -present.length, soc_percent: present[0]?.soc_percent,
      temperature_min_c: 21, temperature_max_c: 23, capacity_ah: said, full_capacity_ah: 50 * present.length, energy_kwh: said * 49.5 / 1000, ...reading,
    },
  };
};
// three sockets, eight batteries; one battery does not say its remaining charge
const three = (): SolarDeviceView[] => [
  socket("bank-a", [module(1, 100)]),
  socket("bank-b", [module(1, 60), module(2, 60, { capacity_ah: undefined }), module(3, 60), { n: 4, present: false }]),
  socket("bank-c", [module(1, 40), module(2, 40), module(3, 40), module(4, 40)]),
];

describe("the sums of several sockets of batteries", () => {
  it("count the sockets, the batteries and the fifteen cells of each, and add capacity and charge battery by battery", () => {
    const bank = bankSummary(three());
    expect([bank.sockets, bank.live, bank.batteries, bank.slots, bank.cells]).toEqual([3, 3, 8, 9, 120]);
    expect(bank.full_capacity_ah).toBe(400);
    expect(bank.capacity_ah).toBe(220);
    expect(bank.soc_percent).toBe(55);                      // 220 of 400, not the mean of the three sockets
    expect(bank.current_a).toBe(-8);
    expect(bank.power_w).toBeCloseTo(-396, 6);
    expect([bank.estimated, bank.partial]).toEqual([true, false]);
  });

  it("keep the node's figures when no battery says its capacity, and say when a sum is incomplete", () => {
    const silent = socket("old", [module(1, 80, { capacity_ah: undefined, full_capacity_ah: undefined })], {}, { capacity_ah: undefined, full_capacity_ah: 50, energy_kwh: undefined });
    expect(stackFigures(silent.reading as SolarBatteryReading)).toMatchObject({ capacity_ah: null, full_capacity_ah: 50, energy_kwh: null });
    expect(bankSummary([silent]).partial).toBe(true);
    const half = socket("half", [module(1, 80), module(2, 80, { full_capacity_ah: undefined })]);
    expect(stackFigures(half.reading as SolarBatteryReading)).toMatchObject({ capacity_ah: 40, full_capacity_ah: 50, partial: true });
  });

  it("find the lowest and highest cell with their place, and leave out stale sockets and examples", () => {
    const devices = three();
    const cells = Array.from({ length: 15 }, (_, i) => (i === 6 ? 3.21 : i === 11 ? 3.41 : 3.3));
    devices[2] = socket("bank-c", [module(1, 40), module(2, 40, { cells_v: cells })]);
    devices.push(socket("gone", [module(1, 10)], { stale: true }), socket("demo", [module(1, 90)], { example: true }));
    const bank = bankSummary(devices);
    expect(bank.cell_min).toEqual({ value: 3.21, stack: "solar-1/bank-c", module: 2, cell: 7 });
    expect(bank.cell_max).toEqual({ value: 3.41, stack: "solar-1/bank-c", module: 2, cell: 12 });
    expect([bank.delta_mv, bank.sockets, bank.live, bank.stale, bank.batteries]).toEqual([200, 4, 3, 1, 6]);
    expect(bankSummary([socket("demo", [module(1, 90)], { example: true })]).examples).toBe(true);
  });
});

describe("the histories", () => {
  it("add up a step only when every socket said something in it", () => {
    const a: SolarSample[] = [{ t: 0, voltage_v: 50, current_a: 2, cell_min_v: 3.3, cell_max_v: 3.32, soc_percent: 80 }, { t: 60_000, voltage_v: 50, current_a: 2 }];
    const b: SolarSample[] = [{ t: 10_000, voltage_v: 52, current_a: 3, cell_min_v: 3.2, cell_max_v: 3.31, soc_percent: 60 }];
    const merged = mergeBank([a, b, []], 60_000);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ t: 0, current_a: 5, power_w: 256, voltage_v: 51, soc_percent: 70, cell_min_v: 3.2, cell_max_v: 3.32, delta_mv: 120 });
    expect(derivedSamples(a)[0]).toMatchObject({ power_w: 100, delta_mv: 20 });
    expect([bankBucketMs(60), bankBucketMs(43_200)]).toEqual([60_000, 4_320_000]);
  });

  it("keep each battery and cell of what the browser read, once per reading, and start again when a real reading replaces an example", () => {
    const recorder = new SolarRecorder({ everyMs: 1000, keep: 2 });
    const at = (ms: number, example = false) => [socket("bank-a", [module(1, 50)], { received_at: new Date(ms).toISOString(), example })];
    recorder.record(at(NOW, true));
    recorder.record(at(NOW + 5000));
    recorder.record(at(NOW + 5000));
    recorder.record(at(NOW + 5100));
    expect(recorder.samples("solar-1/bank-a", 1)).toHaveLength(1);
    expect(recorder.samples("solar-1/bank-a", 1)[0]).toMatchObject({ cell1: 3.3, cell15: 3.3, power_w: -49.5, delta_mv: 0 });
    recorder.record(at(NOW + 10_000));
    recorder.record(at(NOW + 20_000));
    expect(recorder.samples("solar-1/bank-a", 1).map(sample => sample.t)).toEqual([NOW + 10_000, NOW + 20_000]);
  });

  it("write CSV, measure a series and draw only the levels near the data", () => {
    const samples: SolarSample[] = [{ t: NOW, a: 1.5 }, { t: NOW + 1000 }, { t: NOW + 2000, a: 3 }];
    expect(samplesToCsv(samples, [{ key: "a", label: "=x, y", unit: "V", color: "" }])).toBe(`time,"'=x, y (V)"\r\n2026-01-01T12:00:00.000Z,1.5\r\n2026-01-01T12:00:01.000Z,\r\n2026-01-01T12:00:02.000Z,3\r\n`);
    expect(seriesStats(samples, "a")).toEqual({ min: 1.5, max: 3, last: 3 });
    expect(seriesStats(samples, "b")).toBeNull();
    expect(thresholdsInView([3.3, 3.34], [{ value: 3.65, label: "high", tone: "bad" }, { value: 2.8, label: "low", tone: "bad" }]).map(item => item.label)).toEqual(["high"]);
  });
});

describe("faults", () => {
  it("judge a lithium iron phosphate cell by its window and any cell by what cannot be", () => {
    expect([cellFault(3.7, true), cellFault(2.7, true), cellFault(3.3, true), cellFault(4.1, false), cellFault(6.5, false)]).toEqual(["cell_over", "cell_under", null, null, "cell_implausible"]);
    expect([isLfp({ model: "US3000C" }), isLfp({}, "pylontech-us3000"), isLfp({ model: "US3000C" }, "ant-bms-16s-100a"), isLfp({})]).toEqual([true, true, false, false]);
  });

  it("name the battery and the cell, put faults before warnings and blink only what still reports", () => {
    const hot = module(2, 50, { temperature_c: 61, soh_abnormal: [3], health_percent: 40, cells_v: Array.from({ length: 15 }, (_, i) => (i === 4 ? 3.72 : 3.3)) });
    const devices = [socket("bank-a", [module(1, 50), hot]), socket("quiet", [module(1, 50, { temperature_c: 99 })], { stale: true })];
    const faults = bankFaults(devices, levels);
    expect(moduleFaults(hot, levels, true).map(item => item.code)).toEqual(["cell_over", "cell_soh", "delta_high", "temp_high", "health_low"]);
    expect(faults[faults.length - 1].severity).toBe("warn");
    expect(blinking(faults, "solar-1/bank-a", 2, 5)).toBe(true);
    expect(blinking(faults, "solar-1/bank-a", 1)).toBe(false);
    expect(blinking(faults, "solar-1/quiet")).toBe(false);
    expect(faults.some(fault => fault.stack === "solar-1/quiet" && fault.code === "temp_implausible" && fault.stale)).toBe(true);
    expect(bankFaults([socket("alarmed", [module(1, 50)], {}, { alarm: true })], levels).map(fault => fault.code)).toEqual(["stack_alarm"]);
  });

  it("blinks at one hertz and stands still when less motion is asked for", () => {
    const css = readFileSync(new URL("./views/battery-faults.css", import.meta.url), "utf8");
    const times = [...css.matchAll(/sl-fault-blink\s+([\d.]+)s/g)].map(match => Number(match[1]));
    expect(times.length).toBeGreaterThan(0);
    expect(Math.min(...times)).toBeGreaterThanOrEqual(0.5);      // at most two flashes a second
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{[^}]*animation: none/);
  });
});

describe("verify", () => {
  const live: Extract<VerifyTarget, { kind: "live" }> = { kind: "live", stack: "solar-1/bank-a", node: "solar-1", module: 1, code: "cell_over", cell: 5 };
  const read = (volts: number) => checkLive(live, module(1, 50, { cells_v: Array.from({ length: 15 }, (_, i) => (i === 4 ? volts : 3.3)) }), levels, true)!;

  it("says real, misread or intermittent after the new readings", () => {
    expect(verdictOf([read(3.7)], 3, false)).toBe("pending");
    expect(verdictOf([read(3.7), read(3.71), read(3.72)], 3, false)).toBe("real");
    expect(verdictOf([read(3.3), read(3.31), read(3.3)], 3, false)).toBe("read_error");
    expect(verdictOf([read(3.7), read(3.3), read(3.3)], 3, false)).toBe("intermittent");
    expect(verdictOf([], 3, true)).toBe("no_data");
    expect(checkLive(live, { n: 1, present: true }, levels, true)).toBeNull();
    expect(checkLive({ ...live, code: "temp_high", cell: undefined }, module(1, 50, { temperature_c: 70 }), levels, true)).toEqual({ bad: true, value: 70 });
  });

  it("offers a write only for a counter of the first battery of a stack, to an administrator", () => {
    const counter: VerifyTarget = { kind: "counter", stack: "s/a", node: "s", module: 1, counter: "bat_ov_times", value: 523 };
    expect(clearingFor(counter, true)).toEqual({ op: "clear_stats" });
    expect(clearingFor(counter, false)).toEqual({ reason: "solx_clear_admin" });
    expect(clearingFor({ ...counter, module: 2 }, true)).toEqual({ reason: "solx_clear_master_only" });
    expect(clearingFor(live, true)).toEqual({ reason: "solx_clear_not_stored" });
    expect(clearingFor({ kind: "soh", stack: "s/a", node: "s", module: 1, cell: 2, value: 3 }, true)).toEqual({ reason: "solx_clear_no_command" });
  });

  it("reads a counter again from the text the node kept before writing", () => {
    const snapshot = "## info\nDevice name : US2000C\n## stat\nDevice address 1\nBat OV Times    :      523\nCOC2 Times :  0\nHT@0.5C Cnt     :        4\nCharge Cnt. : 145\n## time\nBat OV Times : 9\n";
    expect(parseStatCounter(snapshot, "bat_ov_times")).toBe(523);
    expect(parseStatCounter(snapshot, "coc2_times")).toBe(0);
    expect(parseStatCounter(snapshot, "ht_half_c_cnt")).toBe(4);
    expect(parseStatCounter(snapshot, "charge_cnt")).toBe(145);
    expect(parseStatCounter(snapshot, "sc_times")).toBeNull();
    expect(parseStatCounter(undefined, "sc_times")).toBeNull();
  });
});

describe("the protocols a node speaks", () => {
  it("lists every protocol of the shared catalogue once, by the message it becomes, and follows the server's table when there is one", () => {
    expect(new Set(SOLAR_PROTOCOLS.map(item => item.id)).size).toBe(15);
    expect(protocolsFor("inverter").map(item => item.id)).toEqual(["pi30", "pi30-revo", "pi18", "pi41", "pi34", "modbus-smg2", "modbus-srne-hybrid", "modbus-srne-mppt", "vedirect-mppt"]);
    expect(protocolsFor("battery").map(item => item.id)).toEqual(["vedirect-monitor", "pylontech-console", "ant-bms", "daly-uart", "jbd", "jk-rs485"]);
    expect(protocolsFor("battery", [{ id: "x", port: "x", dialect: "", baud: 1, message: "battery" }]).map(item => item.id)).toEqual(["x"]);
  });

  it("proposes one only when the model tells", () => {
    expect(likelyProtocol("inverter", "easun-isolar", "pi30", protocolsFor("inverter"))?.id).toBe("pi30");
    expect(likelyProtocol("inverter", "voltronic", "auto", protocolsFor("inverter"))).toBeUndefined();
    expect(likelyProtocol("battery", "pylontech-us3000", undefined, protocolsFor("battery"))?.id).toBe("pylontech-console");
    expect(likelyProtocol("battery", "other", undefined, protocolsFor("battery"))).toBeUndefined();
  });
});

