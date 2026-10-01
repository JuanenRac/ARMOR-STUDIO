import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { text } from "../i18n";
import type { ElectricalReadings } from "../api";
import { EMPTY_DESIGN, type Design } from "../electrical/model";
import { drawnNodeIds, ElectricalView } from "./ElectricalView";

const design: Design = { ...EMPTY_DESIGN, elements: [{ id: "e1", kind: "node", x: 0, y: 0, name: "N", props: { node_id: "Panel-1", channels: 4 } }] };
const readings: ElectricalReadings = {
  nodes: [{ node_id: "panel-1", received_at: new Date().toISOString(), stale: false, reading: { kind: "electrical", node_id: "panel-1", timestamp_ms: 1, channels: [{ id: "c1", domain: "ac", voltage_v: 230.4, power_w: 1200, state: "closed" }], switches: [{ id: "s1", kind: "transfer", a_closed: true, b_closed: false, selected: "a", wanted: "a", closing: false, armed: false, fault: "none" }] } }],
  totals: { nodes: 1, channels: 1, stale: 0, grid_w: 1200, grid_kwh: 12.5, alarms: 0 },
};

describe("the Electrical menu", () => {
  it("knows which nodes the diagram draws", () => {
    expect([...drawnNodeIds(design)]).toEqual(["panel-1"]);
  });
  it("shows the nodes, their channels and whether they are in the diagram, in every language", () => {
    for (const language of ["en", "es", "de", "fr", "it", "ja", "zh"] as const) {
      const html = renderToStaticMarkup(createElement(ElectricalView, { t: (key: string) => text(language, key), origin: "http://x", readings, unreachable: false, design, openDesigner: () => undefined, now: Date.now() }));
      expect(html).toContain("panel-1");
      expect(html).toContain("230.4");
      expect(html).not.toContain("elLive");
    }
  });
});
