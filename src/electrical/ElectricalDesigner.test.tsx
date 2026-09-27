import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ElectricalDesigner } from "../ElectricalDesigner";
import { locales, text, type Locale } from "../i18n";
import type { ElectricalNodeReading } from "../api";
import type { SolarDeviceView } from "../solarModel";
import { addElement, setBinding } from "./ops";
import { emptyDesign, housePreset } from "./presets";

const render = (language: Locale, design = housePreset(key => text(language, key)), solarDevices: SolarDeviceView[] = [], electricalNodes: ElectricalNodeReading[] = []): string =>
  renderToStaticMarkup(createElement(ElectricalDesigner, { t: (key: string) => text(language, key), design, setDesign: () => undefined, status: "saved", nodeIds: ["electrical-1"], solarDevices, solarWaiting: [], electricalNodes }));

describe("the Electrical Designer", () => {
  it("shows the palette in groups, the drawing and its totals", () => {
    const html = render("en");
    for (const word of ["Sources", "Storage", "Conversion", "Protections", "Loads", "Grid supply", "Hybrid inverter", "Main distribution board", "Solar system 2", "MPP Solar 5 kW", "Axpert 11 kW", "Totals"]) expect(html, word).toContain(word);
    expect(html).toContain("0 errors · 0 warnings");
    expect(html).toContain("Saved on the server");
  });
  it("is worded in every language, with no phrase left as its raw key", () => {
    for (const language of locales) {
      const html = render(language);
      expect(html, language).not.toMatch(/\bel[a-z]*_[A-Za-z0-9-]+\b|\belc_|\belp_|\beli_|\belerr_|\belx_/);
      expect(html, language).not.toContain("electricalDesignerTitle");
    }
    expect(render("es")).toContain("Diseñador eléctrico");
    expect(render("ja")).toContain("電気設計");
  });
  it("tells an empty drawing from a full one and shows what the checks found", () => {
    expect(render("en", emptyDesign())).toContain("Click on the drawing to place it");
    const bare = addElement(addElement(emptyDesign(), "grid", 0, 0)!.design, "socket", 300, 0)!.design;
    const html = render("en", bare);
    expect(html).toContain("Grid supply");
    expect(html).toContain("Elements");
  });
  it("shows the live readings of the solar device an inverter is tied to", () => {
    let design = addElement(emptyDesign(), "inverter", 0, 0)!.design;
    design = setBinding(design, design.elements[0].id, { solar: "casa/axpert-1" });
    const live: SolarDeviceView = { node_id: "casa", device: "axpert-1", kind: "inverter", received_at: "2026-01-01T10:00:00.000Z", stale: false,
      reading: { kind: "inverter", node_id: "casa", device: "axpert-1", timestamp_ms: 1, mode: "line", grid_v: 231, grid_hz: 50, out_v: 230, out_hz: 50, out_va: 1000, out_w: 900, load_percent: 20, battery_v: 52, battery_a: 5, battery_percent: 80, pv_v: 120, pv_a: 5, pv_w: 1960, heatsink_c: 40, ac_charging: false, pv_charging: true, load_on: true, warnings: [] } };
    expect(render("en", design, [live])).toContain("line · 1960 W");
    expect(render("en", design, [])).toContain("…");
  });
  it("shows what a node measures on the element tied to one of its channels, and draws a switch it sees open as open", () => {
    let design = addElement(emptyDesign(), "e-breaker", 0, 0)!.design;
    design = setBinding(design, design.elements[0].id, { node: "electrical-1", channel: "heater" });
    const node = (state: "closed" | "open", stale = false): ElectricalNodeReading => ({ node_id: "electrical-1", received_at: "2026-01-01T10:00:00.000Z", stale,
      reading: { kind: "electrical", node_id: "electrical-1", timestamp_ms: 1, channels: [{ id: "heater", domain: "ac", power_w: 1512.4, voltage_v: 231.2, state }] } });
    expect(render("en", design, [], [node("closed")])).toContain("1512 W · 231 V");
    expect(render("en", design, [], [node("closed")])).not.toContain("M4 4 L");
    expect(render("en", design, [], [node("open")])).toContain("M4 4 L");           // the cross drawn over an open switch
    expect(render("en", design, [], [])).toContain("…");                              // the node has not reported
  });
});
