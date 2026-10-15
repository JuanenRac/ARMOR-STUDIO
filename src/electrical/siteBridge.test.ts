import { describe, expect, it } from "vitest";
import { addSiteLoads, siteLoads } from "./siteBridge";
import { emptyDesign } from "./presets";
import { kindDef } from "./model";
import type { Opening, RoofItem, SiteFeature } from "../domain";

const words = { gate: "Gate", garage: "Garage", shutter: "Shutter", waterHeater: "Water heater", solarPump: "Pump", solarHeater: "Solar heater" };
const feature = (extra: Partial<SiteFeature> & Pick<SiteFeature, "id" | "kind">): SiteFeature => ({ x: 0, y: 0, z: 0, width: 1, depth: 1, height: 1, rotation: 0, slope: 0, ...extra });
const opening = (extra: Partial<Opening> & Pick<Opening, "id" | "kind">): Opening => ({ buildingId: "b1", edge: 0, floor: 0, offset: 0, width: 1, height: 1, sill: 0, ...extra });
const heater: RoofItem = { id: "h1", buildingId: "b1", kind: "solar-heater", x: 0, y: 0, width: 2, depth: 1.4, height: 0.5, rotation: 0, tilt: 20 };

const site = {
  features: [feature({ id: "gate-1", kind: "gate", automatic: true, style: "slide" }), feature({ id: "gate-2", kind: "gate" }), feature({ id: "wh-1", kind: "water-heater" }), feature({ id: "st-1", kind: "solar-tank" }), feature({ id: "ht-1", kind: "hot-tank" })],
  openings: [opening({ id: "g1", kind: "garage", motor: true }), opening({ id: "g2", kind: "garage" }), opening({ id: "w1", kind: "window", shutter: true, motor: true }), opening({ id: "w2", kind: "window", motor: true })],
  roofItems: [heater],
};

describe("the site's motors and water equipment in the electrical diagram", () => {
  it("lists only what takes power: motorised gates, garage doors and shutters, the water heater, the solar pump and the roof heater", () => {
    const loads = siteLoads(site, words);
    expect(loads.map(load => load.ref)).toEqual(["feature:gate-1", "feature:wh-1", "feature:st-1", "opening:g1", "opening:w1", "roof:h1"]);
    expect(loads.find(load => load.ref === "feature:gate-1")?.props.power_w).toBe(450);
    for (const load of loads) expect(kindDef(load.kind), load.kind).toBeDefined();
  });
  it("draws them once: asking again adds nothing, and a load drawn by hand is left alone", () => {
    const loads = siteLoads(site, words);
    const first = addSiteLoads(emptyDesign(), loads);
    expect(first.added).toBe(6);
    expect(first.design.elements.every(element => String(element.props.site_ref).length > 0)).toBe(true);
    expect(addSiteLoads(first.design, loads).added).toBe(0);
    const moved = { ...first.design, elements: first.design.elements.map(element => ({ ...element, name: "mine", props: { ...element.props, power_w: 999 } })) };
    expect(addSiteLoads(moved, loads).design).toBe(moved);
  });
});
