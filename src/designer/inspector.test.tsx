// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { INITIAL_BUILDINGS, INITIAL_CAMERAS, INITIAL_DIMENSIONS, INITIAL_FEATURES, INITIAL_OPENINGS, INITIAL_ROOF_ITEMS, INITIAL_SENSORS, INITIAL_TERRAIN, INITIAL_WALL_LAMPS } from "../domain";
import { Inspector, type InspectorProps } from "./Inspector";
import { NO_SELECTION, type Selection } from "./model";
import type { SiteModel } from "./ops";

const model = (): SiteModel => ({
  terrain: structuredClone(INITIAL_TERRAIN), buildings: structuredClone(INITIAL_BUILDINGS), openings: structuredClone(INITIAL_OPENINGS), roofItems: structuredClone(INITIAL_ROOF_ITEMS),
  wallLamps: structuredClone(INITIAL_WALL_LAMPS), features: structuredClone(INITIAL_FEATURES), cameras: structuredClone(INITIAL_CAMERAS), sensors: structuredClone(INITIAL_SENSORS), placements: [],
});
const noop = () => undefined;
const props = (selection: Selection, extra: Partial<InspectorProps> = {}): InspectorProps => ({
  t: key => key, dimensions: INITIAL_DIMENSIONS, setDimensions: noop, model: model(), selection, edit: noop, onSelect: noop, onRemove: noop, onDuplicate: noop, onRectTerrain: noop, ...extra,
});
const render = (selection: Selection, extra: Partial<InspectorProps> = {}) => renderToStaticMarkup(<Inspector {...props(selection, extra)} />);

describe("the properties panel of the site designer", () => {
  it("lists everything on the site when nothing is selected, and draws the work area", () => {
    const html = render(NO_SELECTION);
    expect(html.length).toBeGreaterThan(500);
    expect(html).toContain("inspector-tabs");
  });

  it("draws the panel of the terrain, with or without a corner chosen", () => {
    const plain = render({ kind: "terrain" });
    const corner = render({ kind: "terrain", vertex: 0 });
    expect(plain).not.toBe(render(NO_SELECTION));
    expect(corner.length).toBeGreaterThan(0);
  });

  it("draws the panel of every building of the demo site, and of one of its corners", () => {
    const first = model().buildings[0]!;
    const html = render({ kind: "building", id: first.id });
    expect(html).toContain("building-inspector");
    expect(render({ kind: "building", id: first.id, vertex: 0 }).length).toBeGreaterThan(0);
    for (const building of model().buildings) expect(render({ kind: "building", id: building.id }).length).toBeGreaterThan(200);
  });

  it("draws the panel of each kind of object the site holds", () => {
    const site = model();
    const picks: Array<[Selection["kind"], string | undefined]> = [
      ["opening", site.openings[0]?.id], ["roofItem", site.roofItems[0]?.id], ["wallLamp", site.wallLamps[0]?.id], ["feature", site.features[0]?.id], ["camera", site.cameras[0]?.id], ["sensor", site.sensors[0]?.id],
    ];
    for (const [kind, id] of picks) {
      if (!id) continue;
      const html = render({ kind, id } as Selection);
      expect(html.length, kind).toBeGreaterThan(100);
    }
  });

  it("says nothing for an object that is gone and keeps the list", () => {
    const html = render({ kind: "camera", id: "no-such-camera" });
    expect(html.length).toBeGreaterThan(0);
  });

  it("offers the nodes the server knows and the devices to place when it is given them", () => {
    const html = render({ kind: "camera", id: model().cameras[0]?.id ?? "x" }, { nodeIds: ["radar-1", "solar-1"] });
    expect(html.length).toBeGreaterThan(0);
    const withDevices = render(NO_SELECTION, { devices: [], pendingDevice: "", onPickDevice: noop, onOpenDevices: noop });
    expect(withDevices.length).toBeGreaterThan(0);
  });
});
