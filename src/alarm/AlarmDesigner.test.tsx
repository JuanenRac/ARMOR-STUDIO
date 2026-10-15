import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AlarmDesigner } from "../AlarmDesigner";
import type { AlarmNodes } from "../api";
import { locales, text, type Locale } from "../i18n";
import { emptyDesign, housePreset } from "./presets";

const panels: AlarmNodes = {
  nodes: [{
    node_id: "casa", received_at: "x", stale: false,
    state: { kind: "alarm", node_id: "casa", timestamp_ms: 1, phase: "armed", mode: "away", siren: false, locked_out: false, commands_enabled: false, open_zones: [], events: [],
      zones: [{ id: "front", name: "Front door", kind: "entry", state: "triggered", bypassed: false }] },
  }],
  totals: { nodes: 1, stale: 0, armed: 1, sounding: 0 },
};
const render = (language: Locale, design = housePreset(key => text(language, key)), data: AlarmNodes | null = panels): string =>
  renderToStaticMarkup(createElement(AlarmDesigner, { t: (key: string) => text(language, key), design, setDesign: () => undefined, status: "saved", panels: data, openPanels: () => undefined, openVersions: () => undefined }));

describe("the Alarm Designer", () => {
  it("draws the example house with the names of its elements", () => {
    const html = render("en");
    for (const word of ["Alarm Designer", "Alarm panel", "Front door", "Smoke detector", "Indoor siren", "Backup battery", "Panels and expanders", "Sensors"]) expect(html, word).toContain(word);
  });
  it("shows no key that has no text, in any of the seven languages", () => {
    for (const language of locales) {
      const html = render(language);
      expect(html, language).not.toMatch(/\b(?:ad|adk|adc|adp|adv|adi|aderr|adx)_[a-z_]+/);
      expect(html.length, language).toBeGreaterThan(5000);
    }
  });
  it("renders an empty drawing with the invitation to start, and without panels", () => {
    const html = render("es", emptyDesign(), null);
    expect(html).toContain("Diseñador de alarma");
    expect(html).not.toMatch(/\bad_[a-z_]+/);
  });
});
