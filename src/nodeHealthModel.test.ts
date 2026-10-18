import { describe, expect, it } from "vitest";
import type { HealthSample, NodeHealthItem } from "./api";
import { fillAll, formatBytes, formatUptime, heapMeter, heapSeries, isAbnormalReset, resetText, signalLevel, signalSeries, sparkline, statusClass, visibleNodes } from "./nodeHealthModel";
import { locales, text } from "./i18n";

const word = (key: string): string => ({ daysShort: "d", hoursShort: "h", minutesShort: "min" } as Record<string, string>)[key] ?? key;
const item = (id: string, status: "ok" | "warning" | "stale", family: NodeHealthItem["family"] = "alarm"): NodeHealthItem => ({
  node_id: id, family, firmware: "0.3.6", received_at: "2026-01-01T00:00:00.000Z", stale: status === "stale", status, warnings: [], restarts_24h: 0,
  report: { kind: "node_health", node_id: id, timestamp_ms: 1, family, firmware: "0.3.6", uptime_s: 1, reset_reason: "power_on", heap_free: 1, heap_min: 1, link: "ethernet", link_up: true, broker_reconnects: 1 },
});

describe("the health of the nodes, in words", () => {
  it("tells sizes and times the way a person reads them", () => {
    expect([formatBytes(500), formatBytes(142_000), formatBytes(1_500_000), formatBytes(-1), formatBytes(Number.NaN)]).toEqual(["500 B", "139 KB", "1.4 MB", "–", "–"]);
    expect([formatUptime(93_784, word), formatUptime(3_660, word), formatUptime(420, word), formatUptime(5, word), formatUptime(-1, word)]).toEqual(["1 d 2 h", "1 h 1 min", "7 min", "0 min", "–"]);
  });

  it("reads a Wi-Fi signal as good, fair, weak or very weak", () => {
    expect([-30, -60, -61, -70, -71, -80, -81, -100].map(signalLevel)).toEqual(["good", "good", "fair", "fair", "weak", "weak", "bad", "bad"]);
  });

  it("fills the bar of the memory and says when it is low", () => {
    expect(heapMeter(30_000, 30_000)).toEqual({ percent: 17, level: "ok" });
    expect(heapMeter(29_999, 30_000).level).toBe("low");
    expect(heapMeter(1_000_000, 30_000)).toEqual({ percent: 100, level: "ok" });
    expect(heapMeter(0, 30_000)).toEqual({ percent: 0, level: "low" });
  });

  it("knows which restarts nobody asked for", () => {
    for (const reason of ["panic", "int_wdt", "task_wdt", "other_wdt", "brownout", "power_glitch", "cpu_lockup"]) expect(isAbnormalReset(reason), reason).toBe(true);
    for (const reason of ["power_on", "external", "software", "deep_sleep", "usb", "unknown"]) expect(isAbnormalReset(reason), reason).toBe(false);
  });

  it("has a word for every reason a node can give, in the eight languages, and 'unknown' for one it does not know", () => {
    const reasons = ["power_on", "external", "software", "panic", "int_wdt", "task_wdt", "other_wdt", "deep_sleep", "brownout", "sdio", "usb", "jtag", "efuse", "power_glitch", "cpu_lockup", "unknown"];
    for (const language of locales) {
      const t = (key: string) => text(language, key);
      for (const reason of reasons) expect(resetText(reason, t), `${language} ${reason}`).not.toMatch(/^nh_/);
      expect(resetText("cosmic_ray", t)).toBe(t("nh_reset_unknown"));
    }
  });

  it("fills the holes of a phrase", () => {
    expect(fillAll("{0} of {1}, {0} again", 3, "x")).toBe("3 of x, 3 again");
    expect(fillAll("nothing to fill")).toBe("nothing to fill");
  });

  it("colours the pill by status", () => {
    expect([statusClass(item("a", "ok")), statusClass(item("a", "warning")), statusClass(item("a", "stale"))]).toEqual(["good", "warn", "bad"]);
  });
});

describe("the history of a node", () => {
  const sample = (heap: number, rssi?: number): HealthSample => ({ at: 1, heap_free: heap, heap_min: heap, link_up: true, uptime_s: 1, broker_reconnects: 1, ...(rssi !== undefined ? { rssi_dbm: rssi } : {}) });

  it("draws a line between the lowest and the highest value", () => {
    expect(sparkline([10], 100, 20)).toBe("");
    expect(sparkline([], 100, 20)).toBe("");
    expect(sparkline([0, 10, 5], 100, 20, 0)).toBe("M0.0 20.0 L50.0 0.0 L100.0 10.0");
    expect(sparkline([7, 7, 7], 100, 20)).toBe("M2.0 10.0 L50.0 10.0 L98.0 10.0");   // a flat series runs through the middle
  });

  it("takes the memory and the signal out of the samples, skipping the reports without a signal", () => {
    const samples = [sample(100, -60), sample(90), sample(80, -70)];
    expect(heapSeries(samples)).toEqual([100, 90, 80]);
    expect(signalSeries(samples)).toEqual([-60, -70]);
  });
});

describe("the list of nodes", () => {
  it("puts the nodes that need a look first, then the silent ones, then the healthy, by name, and filters by kind", () => {
    const nodes = [item("c", "ok"), item("b", "stale", "solar"), item("a", "ok", "radar"), item("d", "warning", "hmi"), item("e", "warning", "alarm")];
    expect(visibleNodes(nodes, "all").map(node => node.node_id)).toEqual(["d", "e", "b", "a", "c"]);
    expect(visibleNodes(nodes, "alarm").map(node => node.node_id)).toEqual(["e", "c"]);
    expect(visibleNodes([], "all")).toEqual([]);
  });
});
