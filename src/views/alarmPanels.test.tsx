import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { text } from "../i18n";
import type { AlarmNodes } from "../api";
import { AlarmPanelsView } from "./AlarmPanelsView";

const nodes: AlarmNodes = {
  nodes: [
    { node_id: "alarm-1", received_at: new Date().toISOString(), stale: false, state: {
      kind: "alarm", node_id: "alarm-1", timestamp_ms: 1, phase: "alarm", mode: "away", siren: true, locked_out: false, commands_enabled: true,
      zones: [{ id: "front-door", name: "Front door", kind: "entry", state: "triggered", bypassed: false }, { id: "smoke", kind: "always", state: "tamper", bypassed: true }],
      open_zones: ["front-door"], events: [{ ago_s: 40, kind: "armed" }, { ago_s: 3, kind: "alarm", zone: "front-door" }] } },
    { node_id: "alarm-2", received_at: new Date(Date.now() - 600_000).toISOString(), stale: true, state: {
      kind: "alarm", node_id: "alarm-2", timestamp_ms: 1, phase: "disarmed", mode: "disarmed", siren: false, locked_out: true, commands_enabled: false, zones: [], open_zones: [], events: [] } },
  ],
  totals: { nodes: 2, stale: 1, armed: 0, sounding: 1 },
};

describe("the Alarm panels menu", () => {
  it("shows the panels, their zones and their events in every language, with no phrase left untranslated", () => {
    for (const language of ["en", "es", "de", "fr", "it", "ja", "zh"] as const) {
      const html = renderToStaticMarkup(createElement(AlarmPanelsView, { t: (key: string) => text(language, key), origin: "http://x", nodes, unreachable: false, isAdmin: true, now: Date.now() }));
      expect(html).toContain("alarm-1");
      expect(html).toContain("alarm-2");
      expect(html).toContain("Front door");
      for (const marker of ["apPhase_", "apMode_", "apKind_", "apState_", "apEvent_", "apSiren", "apLockedOut", "apBypassed"]) expect(html, `${language}: ${marker}`).not.toContain(marker);
    }
  });
  it("shows the empty state, and says when the server does not answer", () => {
    const html = renderToStaticMarkup(createElement(AlarmPanelsView, { t: (key: string) => text("en", key), origin: "http://x", nodes: { nodes: [], totals: { nodes: 0, stale: 0, armed: 0, sounding: 0 } }, unreachable: true, isAdmin: false, now: Date.now() }));
    expect(html).toContain("No alarm node has reported yet");
    expect(html).toContain("does not answer the alarm panels");
  });
  it("offers no button to arm or disarm until the server says it may", () => {
    const html = renderToStaticMarkup(createElement(AlarmPanelsView, { t: (key: string) => text("en", key), origin: "http://x", nodes, unreachable: false, isAdmin: true, now: Date.now() }));
    expect(html).not.toContain("Arm: away");
    expect(html).not.toContain("Disarm");
  });
});
