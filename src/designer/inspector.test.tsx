// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { INITIAL_BUILDINGS, INITIAL_CAMERAS, INITIAL_DIMENSIONS, INITIAL_FEATURES, INITIAL_OPENINGS, INITIAL_ROOF_ITEMS, INITIAL_SENSORS, INITIAL_TERRAIN, INITIAL_WALL_LAMPS } from "../domain";
import { Inspector, type InspectorProps } from "./Inspector";
import { NO_SELECTION, type Selection } from "./model";
import type { SiteModel } from "./ops";
import { mount } from "../testLive";

const model = (): SiteModel => ({
  terrain: structuredClone(INITIAL_TERRAIN), buildings: structuredClone(INITIAL_BUILDINGS), openings: structuredClone(INITIAL_OPENINGS), roofItems: structuredClone(INITIAL_ROOF_ITEMS),
  wallLamps: structuredClone(INITIAL_WALL_LAMPS), features: structuredClone(INITIAL_FEATURES), cameras: structuredClone(INITIAL_CAMERAS), sensors: structuredClone(INITIAL_SENSORS), placements: [],
});
const noop = () => undefined;
const props = (selection: Selection, extra: Partial<InspectorProps> = {}): InspectorProps => ({
  t: key => key, dimensions: INITIAL_DIMENSIONS, setDimensions: noop, model: model(), selection, edit: noop, onSelect: noop, onRemove: noop, onDuplicate: noop, onRectTerrain: noop, ...extra,
});
afterEach(() => { document.body.innerHTML = ""; });

/** The panel of a selection, opened on its properties tab, the way a person sees it. */
async function properties(selection: Selection, extra: Partial<InspectorProps> = {}) {
  const view = await mount(createElement(Inspector, props(selection, extra)));
  const tab = [...view.host.querySelectorAll<HTMLButtonElement>("[role=tab]")][1];
  await view.click(tab ?? null);
  return view;
}

describe("the properties panel of the site designer", () => {
  it("lists everything on the site first, and draws the work area under the properties tab", async () => {
    const view = await mount(createElement(Inspector, props(NO_SELECTION)));
    expect(view.host.querySelector(".inspector-tabs")).not.toBeNull();
    const first = view.host.innerHTML.length;
    await view.click([...view.host.querySelectorAll("[role=tab]")][1] ?? null);
    expect(view.host.querySelector("[role=tab][aria-selected=true]")?.textContent).toBe("properties");
    expect(view.host.innerHTML.length).not.toBe(first);
    expect(view.host.querySelectorAll("input").length).toBeGreaterThan(0);
    await view.unmount();
  });

  it("draws the panel of the terrain, with or without a corner chosen", async () => {
    for (const selection of [{ kind: "terrain" }, { kind: "terrain", vertex: 0 }] as Selection[]) {
      const view = await properties(selection);
      expect(view.host.querySelectorAll("input").length, JSON.stringify(selection)).toBeGreaterThan(2);
      await view.unmount();
    }
  });

  it("draws the panel of every building of the demo site, and of one of its corners", async () => {
    for (const building of model().buildings) {
      const view = await properties({ kind: "building", id: building.id });
      expect(view.host.querySelectorAll("input").length).toBeGreaterThan(3);
      await view.unmount();
    }
    const corner = await properties({ kind: "building", id: model().buildings[0]!.id, vertex: 0 });
    expect(corner.host.querySelectorAll("input").length).toBeGreaterThan(3);
    await corner.unmount();
  });

  it("draws the panel of each kind of object the site holds", async () => {
    const site = model();
    const picks: Array<[Selection["kind"], string | undefined]> = [
      ["opening", site.openings[0]?.id], ["roofItem", site.roofItems[0]?.id], ["wallLamp", site.wallLamps[0]?.id], ["feature", site.features[0]?.id], ["camera", site.cameras[0]?.id], ["sensor", site.sensors[0]?.id],
    ];
    for (const [kind, id] of picks) {
      if (!id) continue;
      const view = await properties({ kind, id } as Selection, { nodeIds: ["radar-1", "solar-1"] });
      expect(view.host.querySelectorAll("input,select").length, kind).toBeGreaterThan(1);
      await view.unmount();
    }
  });

  it("keeps drawing when the selected object is gone", async () => {
    const view = await properties({ kind: "camera", id: "no-such-camera" });
    expect(view.host.querySelector("aside")).not.toBeNull();
    await view.unmount();
  });
});
