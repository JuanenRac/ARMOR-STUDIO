import { describe, expect, it } from "vitest";
import {
  areaOf, capacityPercent, healthTone, modelName, cellFill, cellStats, cellTone, flowSeconds, flowsOf, formatEnergy, formatPower, humanize, levelTone, nearestSample, niceScale, pathOf, seriesPoints, spreadTone, timeTicks,
  type SolarInverterReading, type SolarSample,
} from "./solarModel";

const inverter = (patch: Partial<SolarInverterReading> = {}): SolarInverterReading => ({
  kind: "inverter", node_id: "solar-1", device: "axpert-1", timestamp_ms: 1, mode: "line", grid_v: 232, grid_hz: 50, out_v: 230, out_hz: 50, out_va: 1600, out_w: 1200, load_percent: 24,
  battery_v: 52, battery_a: 10, battery_percent: 80, pv_v: 120, pv_a: 5, pv_w: 600, heatsink_c: 40, ac_charging: false, pv_charging: true, load_on: true, warnings: [], ...patch,
});

describe("the cells of a module", () => {
  const cells = [3.324, 3.325, 3.323, 3.33, 3.329, 3.326, 3.327, 3.325, 3.324, 3.348, 3.326, 3.325, 3.324, 3.327, 3.326];
  it("finds the extremes, the mean and the spread in millivolts", () => {
    const stats = cellStats(cells)!;
    expect([stats.min, stats.max, stats.minIndex, stats.maxIndex, stats.spreadMv]).toEqual([3.323, 3.348, 2, 9, 25]);
    expect(stats.mean).toBeCloseTo(3.3272, 3);
    expect(cellStats([])).toBeNull();
    expect(cellStats(undefined)).toBeNull();
  });
  it("says how a cell looks next to the mean, and a module by its spread", () => {
    expect([cellTone(3.33, 3.327), cellTone(3.37, 3.327), cellTone(3.45, 3.327)]).toEqual(["ok", "warn", "bad"]);
    expect([spreadTone(10), spreadTone(50), spreadTone(120)]).toEqual(["ok", "warn", "bad"]);
  });
  it("puts a cell voltage on a bar between empty and full", () => {
    expect([cellFill(2.8), cellFill(3.65), cellFill(3.2), cellFill(2), cellFill(4)]).toEqual([0, 1, expect.closeTo(0.4706, 3), 0, 1]);
  });
});

describe("the flows of an inverter", () => {
  it("moves the panels, the load and a charging battery, and the grid only for what is missing", () => {
    const flows = flowsOf(inverter());
    expect([flows.pvToInverter, flows.inverterToLoad, flows.inverterToBattery, flows.batteryToInverter]).toEqual([true, true, true, false]);
    expect(flows.batteryW).toBe(520);
    expect(flows.gridW).toBe(1120);                                  // 1200 W of load and 520 W into the battery, minus 600 W of sun
    expect(flows.gridToInverter).toBe(true);
  });
  it("uses no grid when the sun and the battery are enough, or when there is none", () => {
    expect(flowsOf(inverter({ pv_w: 3000, battery_a: -5, battery_v: 52 })).gridToInverter).toBe(false);
    const island = flowsOf(inverter({ grid_v: 0, mode: "battery", battery_a: -20, pv_w: 0 }));
    expect([island.gridPresent, island.gridToInverter, island.batteryToInverter, island.inverterToBattery]).toEqual([false, false, true, false]);
    expect(island.batteryW).toBe(-1040);
  });
  it("shows the grid charging the battery", () => {
    expect(flowsOf(inverter({ pv_w: 0, out_w: 0, ac_charging: true })).gridToInverter).toBe(true);
    expect(flowsOf(inverter({ pv_w: 0, out_w: 0, battery_a: 0 })).inverterToBattery).toBe(false);
  });
  it("runs the dashes faster for more power", () => {
    expect(flowSeconds(0)).toBe(4);
    expect(flowSeconds(1200)).toBe(3);
    expect(flowSeconds(100000)).toBe(0.7);
  });
});

describe("words for numbers", () => {
  it("writes watts and kilowatts, energy, warning names and charge levels", () => {
    expect([formatPower(850), formatPower(1240), formatPower(-12500), formatPower(0)]).toEqual(["850 W", "1.24 kW", "-12.5 kW", "0 W"]);
    expect([formatEnergy(6.243), formatEnergy(14.6), formatEnergy(120)]).toEqual(["6.24 kWh", "14.6 kWh", "120 kWh"]);
    expect(humanize("battery_under_shutdown")).toBe("Battery under shutdown");
    expect([levelTone(90), levelTone(30), levelTone(5)]).toEqual(["ok", "warn", "bad"]);
    expect([capacityPercent(65, 74), capacityPercent(80, 74), capacityPercent(undefined, 74), capacityPercent(5, 0)]).toEqual([88, 100, null, null]);
  });
});

describe("history charts", () => {
  const samples: SolarSample[] = [0, 1, 2, 3, 4].map(i => ({ t: 1_000 + i * 60_000, pv_w: i * 100, mode: "line" }));
  it("chooses a pleasant axis", () => {
    expect(niceScale([0, 850])).toEqual({ low: 0, high: 1000, step: 200 });
    expect(niceScale([50, 52])).toMatchObject({ low: 50, high: 52 });
    expect(niceScale([])).toEqual({ low: 0, high: 1, step: 0.25 });
    expect(niceScale([5, 5]).high).toBeGreaterThan(5);
  });
  it("maps samples into a box, oldest at the left, the highest value at the top", () => {
    const points = seriesPoints(samples, "pv_w", 1_000, 241_000, { low: 0, high: 400 }, 240, 100);
    expect(points).toHaveLength(5);
    expect(points[0]).toEqual({ x: 0, y: 100 });
    expect(points[4]).toEqual({ x: 240, y: 0 });
    expect(seriesPoints(samples, "mode", 0, 1e9, { low: 0, high: 1 }, 10, 10)).toEqual([]);          // text is not a number
    expect(seriesPoints(samples, "pv_w", 121_000, 241_000, { low: 0, high: 400 }, 240, 100)).toHaveLength(3);   // only the window
  });
  it("draws paths and areas", () => {
    const points = [{ x: 0, y: 10 }, { x: 5, y: 4 }];
    expect(pathOf(points)).toBe("M0.0 10.0 L5.0 4.0");
    expect(areaOf(points, 20)).toBe("M0.0 10.0 L5.0 4.0 L5.0 20 L0.0 20 Z");
    expect(areaOf([], 20)).toBe("");
  });
  it("finds the sample nearest to a time and the clock ticks of a window", () => {
    expect(nearestSample(samples, 130_000)?.pv_w).toBe(200);
    expect(nearestSample([], 5)).toBeUndefined();
    const hour = 3_600_000;
    expect(timeTicks(0, hour)).toEqual([0, 600_000, 1_200_000, 1_800_000, 2_400_000, 3_000_000, 3_600_000]);
    expect(timeTicks(hour * 0.5, hour * 6.5)).toEqual([1, 2, 3, 4, 5, 6].map(h => h * hour));
    // longer windows: a day, a week, a month still have a handful of ticks, never dozens
    for (const days of [1, 3, 7, 30]) {
      const ticks = timeTicks(0, days * 24 * hour);
      expect(ticks.length, `${days} d`).toBeGreaterThan(2);
      expect(ticks.length, `${days} d`).toBeLessThanOrEqual(13);
    }
    expect(timeTicks(0, hour * 24)).toHaveLength(7);
  });
});

describe("the names of the models", () => {
  it("uses the server's name, then the built-in one, then reads an ANT-BMS combination", () => {
    const catalog = { inverter_models: [], battery_models: [], connections: [], labels: { "axpert-king": "Voltronic Axpert King" } };
    expect(modelName("axpert-king", catalog)).toBe("Voltronic Axpert King");
    expect(modelName("pylontech-us3000")).toBe("Pylontech US3000");
    expect(modelName("ant-bms-24s-200a")).toBe("ANT-BMS 24S · 200 A");
    expect([modelName("other"), modelName("nothing-known"), modelName("ant-bms-16s")]).toEqual([undefined, undefined, undefined]);
  });
});

describe("battery health", () => {
  it("is fine from 80, a warning from 60 and bad below", () => {
    expect([healthTone(100), healthTone(80), healthTone(79), healthTone(60), healthTone(59), healthTone(0)]).toEqual(["ok", "ok", "warn", "warn", "bad", "bad"]);
  });
});
