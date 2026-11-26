import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { locales, text } from "./i18n";
import type { NodeHealthItem, NodeHealthLevels } from "./api";
import { sheetUnanswered, type SolarModuleReading } from "./solarModel";
import { NodeCard } from "./views/NodeHealth";

const levels: NodeHealthLevels = { low_heap_b: 30000, low_heap_clear_b: 40000, restarts_per_day: 3, abnormal_window_min: 60, flap_reconnects: 3, flap_window_min: 15, weak_signal_dbm: -80, weak_signal_reports: 3, silent_after_s: 180 };
const solar: NodeHealthItem = {
  node_id: "solar-1", family: "solar", firmware: "0.7.2", received_at: new Date().toISOString(), stale: false, status: "ok", restarts_24h: 0, warnings: [],
  report: { kind: "node_health", node_id: "solar-1", timestamp_ms: 1, family: "solar", firmware: "0.7.2", uptime_s: 3_600, reset_reason: "power_on", heap_free: 142_000, heap_min: 98_000, link: "wifi", link_up: true, broker_reconnects: 1 },
  port_problems: (["flat", "echo", "noise", "text", "frames"] as const).map((cause, index) => ({ port: index + 1, cause, baud: 115200, rx: 16, tx: 15, inverted: index === 1, bytes_heard: 230, sample: "00 00", said_at: new Date().toISOString() })),
};

describe("a serial port of a solar node that reads nothing", () => {
  it("is explained in every language, with the settings of its line", () => {
    for (const language of locales) {
      const html = renderToStaticMarkup(createElement(NodeCard, { t: (key: string) => text(language, key), node: solar, levels, now: Date.now(), opened: false, toggle: () => undefined, origin: "http://x", isAdmin: false, forget: () => undefined }));
      expect(html, language).toContain("nh-ports");
      expect(html, language).toContain("115200");
      expect(html, language).toContain("230");
      expect(html, language).not.toContain("solx_");
      expect(html, language).not.toMatch(/\{\d\}/);
    }
  });

  it("adds nothing when the server lists none", () => {
    const html = renderToStaticMarkup(createElement(NodeCard, { t: (key: string) => text("en", key), node: { ...solar, port_problems: undefined }, levels, now: Date.now(), opened: false, toggle: () => undefined, origin: "http://x", isAdmin: false, forget: () => undefined }));
    expect(html).not.toContain("nh-ports");
  });
});

describe("a battery that does not answer its data sheet", () => {
  const told: SolarModuleReading = { n: 1, present: true, cells_v: [3.3], model: "US2000", soft_version: "V1.0", full_capacity_ah: 50 };
  const mute: SolarModuleReading = { n: 2, present: true, cells_v: [3.3], capacity_ah: 20 };

  it("is told apart from one that did answer and from a stack where nothing has a sheet", () => {
    expect(sheetUnanswered(mute, [told, mute])).toBe(true);
    expect(sheetUnanswered(told, [told, mute])).toBe(false);
    expect(sheetUnanswered(mute, [mute])).toBe(false);
    expect(sheetUnanswered({ n: 2, present: false }, [told])).toBe(false);
    expect(sheetUnanswered({ ...mute, cells_v: [] }, [told, mute])).toBe(false);
    expect(sheetUnanswered({ ...mute, cycles: 3 }, [told, mute])).toBe(false);
  });
});
