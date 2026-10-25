// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RadarSensors } from "./RadarSensors";
import { INITIAL_DIMENSIONS, INITIAL_SENSORS } from "../domain";
import { text } from "../i18n";

let root: Root | null = null;
let host: HTMLElement | null = null;

describe("the radars of the design", () => {
  beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
  afterEach(async () => { await act(async () => { root?.unmount(); }); host?.remove(); root = null; host = null; });

  it("starts with every radar folded, and a click unfolds only that one", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const t = (key: string) => text("en", key);
    await act(async () => {
      root!.render(createElement(RadarSensors, { t, sensors: [INITIAL_SENSORS[0], INITIAL_SENSORS[1]], dimensions: INITIAL_DIMENSIONS, nodes: [], rules: null, targetsBySensor: {}, setSensors: () => undefined, openZones: () => undefined, openDesigner: () => undefined }));
    });
    const summaries = [...host.querySelectorAll<HTMLElement>(".rs-summary")];
    expect(summaries.length).toBe(2);
    expect(summaries.map(item => item.getAttribute("aria-expanded"))).toEqual(["false", "false"]);
    await act(async () => { summaries[1].click(); });
    expect([...host.querySelectorAll(".rs-summary")].map(item => item.getAttribute("aria-expanded"))).toEqual(["false", "true"]);
  });
});
