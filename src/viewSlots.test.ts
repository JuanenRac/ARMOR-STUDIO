import { describe, expect, it } from "vitest";
import { NAV } from "./domain";
import { KEPT_VIEWS, viewsToDraw } from "./viewSlots";

const ORDER = NAV.map(([key]) => key);

describe("the menus that keep what the person was doing", () => {
  it("draws only the shown menu at first, and keeps a visited menu that holds work", () => {
    const visited = new Set<(typeof ORDER)[number]>();
    expect(viewsToDraw(ORDER, "overview", visited)).toEqual(["overview"]);
    expect(viewsToDraw(ORDER, "configuration", visited)).toEqual(["overview", "configuration"].filter(view => view === "configuration"));   // the overview holds no work: it is drawn again when opened
    expect(viewsToDraw(ORDER, "devices", visited)).toEqual(["devices", "configuration"].sort((a, b) => ORDER.indexOf(a as never) - ORDER.indexOf(b as never)));
    expect(viewsToDraw(ORDER, "cameras", visited)).toEqual(["cameras", "devices", "configuration"].sort((a, b) => ORDER.indexOf(a as never) - ORDER.indexOf(b as never)));
  });

  it("never keeps live video, the 3D plan or the weather map, and every kept menu exists", () => {
    for (const heavy of ["cameras", "siteDesigner", "weather", "radar", "overview"] as const) expect(KEPT_VIEWS.has(heavy), heavy).toBe(false);
    for (const view of KEPT_VIEWS) expect(ORDER.includes(view), view).toBe(true);
  });
});
