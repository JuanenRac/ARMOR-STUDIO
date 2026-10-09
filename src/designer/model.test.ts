import { describe, expect, it } from "vitest";
import {
  BRANCHES, clampPanel, fitTransform, TOOL_GROUPS, toolWorksIn, formatMetres, headingOf, inSector, niceScaleLength, PLAN_TOOL_GROUPS, RADAR, sameSelection, sectorPoints, snapTo, targetToSite, toMetres, toolForKey, toolKeyOf, toolLabelKey, toPercent, VIEW_TOOL_GROUPS,
} from "./model";
import { FEATURE_STYLES, INTERIOR_KINDS } from "../domain";
import { FEATURE_DEFAULTS } from "./ops";
import { wallGap } from "./InteriorFeatures";

const site = { width: 60, depth: 40, height: 3 };

describe("devices", () => {
  it("converts between metres and the percentages a camera stores, and back", () => {
    expect(toMetres({ x: 50, y: 50 }, site)).toEqual({ x: 30, y: 20 });
    expect(toPercent({ x: 30, y: 20 }, site)).toEqual({ x: 50, y: 50 });
    expect(toPercent({ x: -5, y: 99 }, site)).toEqual({ x: 0, y: 0 });
    expect(toPercent({ x: 1, y: 1 }, site).x).toBeCloseTo(1.67, 2);   // finer than a whole percent: 1 m of 60 must not round away
  });
  it("faces the middle of the work area unless told otherwise", () => {
    expect(headingOf({ x: 0, y: 50 }, site)).toBe(0);
    expect(headingOf({ x: 100, y: 50 }, site)).toBe(180);
    expect(headingOf({ x: 50, y: 0 }, site)).toBe(270);
    expect(headingOf({ x: 10, y: 10, heading: -90 }, site)).toBe(270);
  });
  it("draws the radar's rated sector and knows what it covers", () => {
    const apex = { x: 0, y: 0 };
    const points = sectorPoints(apex, 0, RADAR.halfAngleDeg, RADAR.rangeM);
    expect(points[0]).toEqual(apex);
    expect(Math.max(...points.map(point => Math.hypot(point.x, point.y)))).toBeCloseTo(RADAR.rangeM);
    expect(inSector({ x: 5, y: 0 }, apex, 0, RADAR.halfAngleDeg, RADAR.rangeM)).toBe(true);
    expect(inSector({ x: 7, y: 0 }, apex, 0, RADAR.halfAngleDeg, RADAR.rangeM)).toBe(false);
    expect(inSector({ x: 2, y: 4.5 }, apex, 0, RADAR.halfAngleDeg, RADAR.rangeM)).toBe(false);
    expect(inSector({ x: -1, y: 0 }, apex, 0, RADAR.halfAngleDeg, RADAR.rangeM)).toBe(false);
    expect(inSector({ x: 0, y: 5 }, apex, 90, RADAR.halfAngleDeg, RADAR.rangeM)).toBe(true);
  });
  it("places a radar target on the site from the radar's own frame", () => {
    const apex = { x: 10, y: 10 };
    const ahead = targetToSite(apex, 0, { x_mm: 0, y_mm: 3000 });               // facing east, 3 m ahead
    expect(ahead.x).toBeCloseTo(13); expect(ahead.y).toBeCloseTo(10);
    const right = targetToSite(apex, 0, { x_mm: 1000, y_mm: 2000 });            // 1 m to the right of east is south
    expect(right.x).toBeCloseTo(12); expect(right.y).toBeCloseTo(9);
    const mirrored = targetToSite(apex, 0, { x_mm: 1000, y_mm: 2000 }, true);
    expect(mirrored.y).toBeCloseTo(11);
    const north = targetToSite(apex, 90, { x_mm: 0, y_mm: 2000 });              // facing north
    expect(north.x).toBeCloseTo(10); expect(north.y).toBeCloseTo(12);
    const negative = targetToSite(apex, 90, { x_mm: -500, y_mm: 1000 });        // facing north, half a metre to the left is west
    expect(negative.x).toBeCloseTo(9.5); expect(negative.y).toBeCloseTo(11);
  });
});

describe("snapping, scale and view", () => {
  it("snaps to a grid", () => {
    expect(snapTo(1.13, 0.25)).toBe(1.25);
    expect(snapTo(1.13, 0)).toBe(1.13);
  });
  it("picks a readable scale bar and formats lengths", () => {
    expect(niceScaleLength(40, 110)).toBe(2);
    expect(niceScaleLength(10, 110)).toBe(10);
    expect(niceScaleLength(200, 110)).toBe(0.5);
    expect(formatMetres(0.45)).toBe("45 cm");
    expect(formatMetres(3.256)).toBe("3.26 m");
  });
  it("fits a rectangle of the site into a viewport, with y up", () => {
    const box = { minX: 10, minY: 5, maxX: 22, maxY: 14 };
    const fit = fitTransform(box, { width: 900, height: 600 }, 60);
    expect(fit.scale).toBeCloseTo(Math.min(780 / 12, 480 / 9));
    expect(fit.x + 16 * fit.scale).toBeCloseTo(450);        // the middle of the box is the middle of the view
    expect(fit.y - 9.5 * fit.scale).toBeCloseTo(300);
  });
});

describe("the floating tool panels", () => {
  it("stay inside their canvas, whatever it has become", () => {
    const panel = { width: 88, height: 340 };
    expect(clampPanel({ x: -50, y: -50 }, panel, { width: 800, height: 600 })).toEqual({ x: 8, y: 8 });
    expect(clampPanel({ x: 900, y: 900 }, panel, { width: 800, height: 600 })).toEqual({ x: 704, y: 252 });
    expect(clampPanel({ x: 100, y: 100 }, panel, { width: 800, height: 600 })).toEqual({ x: 100, y: 100 });
    expect(clampPanel({ x: 100, y: 100 }, panel, { width: 50, height: 50 })).toEqual({ x: 8, y: 8 });
  });
  it("give every tool one key in its view, and the two views really have different tools", () => {
    for (const groups of [PLAN_TOOL_GROUPS, VIEW_TOOL_GROUPS]) {
      const specs = groups.flat();
      const keyed = specs.filter(spec => spec.key !== "");   // the newer objects have no key of their own
      expect(new Set(keyed.map(spec => spec.key)).size).toBe(keyed.length);
    }
    const plan = PLAN_TOOL_GROUPS.flat().map(spec => spec.tool), view = VIEW_TOOL_GROUPS.flat().map(spec => spec.tool);
    expect(plan).toContain("terrain-poly"); expect(view).not.toContain("terrain-poly");
    expect(view).toContain("elevate"); expect(plan).not.toContain("elevate");
    expect(toolForKey("b", "2d")).toBe("building-rect");
    expect(toolForKey("z", "3d")).toBe("elevate");
    expect(toolForKey("z", "2d")).toBeUndefined();
    expect(toolKeyOf("door")).toBe("D");
    expect(toolLabelKey("terrain-rect")).toBe("toolTerrainRect");
  });
  it("compares selections by what they point at", () => {
    expect(sameSelection({ kind: "building", id: "a" }, { kind: "building", id: "a", vertex: 2 })).toBe(true);
    expect(sameSelection({ kind: "building", id: "a" }, { kind: "building", id: "b" })).toBe(false);
    expect(sameSelection({ kind: "terrain" }, { kind: "terrain", vertex: 1 })).toBe(true);
    expect(sameSelection({ kind: "camera", id: "a" }, { kind: "sensor", id: "a" })).toBe(false);
  });
});

describe("one tool panel for both views", () => {
  it("lists every tool once, with a unique key, and says where each works", () => {
    const specs = TOOL_GROUPS.flat();
    const keyed = specs.filter(spec => spec.key !== "");
    expect(new Set(keyed.map(spec => spec.key)).size).toBe(keyed.length);
    expect(new Set(specs.map(spec => spec.tool)).size).toBe(specs.length);
    expect(toolWorksIn("terrain-poly", "3d")).toBe(false);
    expect(toolWorksIn("elevate", "2d")).toBe(false);
    for (const placed of ["tree", "fence", "gate", "fountain", "kennel", "coop", "door", "window", "wall-lamp", "chimney", "camera"] as const) {
      expect(toolWorksIn(placed, "2d"), placed).toBe(true);
      expect(toolWorksIn(placed, "3d"), placed).toBe(true);
    }
    expect(toolForKey("i", "2d")).toBe("tree");
    expect(toolForKey("3", "3d")).toBe("gate");
  });
  it("puts what picks and moves first and the objects after, each group of things that belong together", () => {
    const groups = TOOL_GROUPS.map(group => group.map(spec => spec.tool));
    expect(groups[0]).toEqual(["select", "move", "elevate"]);
    const groupOf = (tool: string) => groups.findIndex(group => group.includes(tool as never));
    // similar objects sit in the same group, not one at each end of the list
    expect(groupOf("lamp")).toBe(groupOf("wall-lamp")); expect(groupOf("lamp")).toBe(groupOf("solar"));
    expect(groupOf("roof-solar")).toBe(groupOf("antenna")); expect(groupOf("antenna")).toBe(groupOf("mast"));
    expect(groupOf("fence")).toBe(groupOf("gate")); expect(groupOf("door")).toBe(groupOf("garage")); expect(groupOf("door")).toBe(groupOf("window"));
    expect(groupOf("tree")).toBe(groupOf("planter")); expect(groupOf("pool")).toBe(groupOf("terrace")); expect(groupOf("kennel")).toBe(groupOf("coop"));
    expect(groupOf("path")).toBe(groupOf("road")); expect(groupOf("road")).toBe(groupOf("sidewalk"));
    expect(groups.flat().length).toBe(62);   // no tool was lost or repeated
    expect(new Set(groups.flat()).size).toBe(62);
  });
  it("has its own floating panel for the inside of a building, with every piece working in both views", () => {
    const inside = ["floor", "wall", "fireplace", "stairs", "kitchen", "bathroom", "bed", "wardrobe", "sofa", "armchair", "dining", "tv"] as const;
    const branch = BRANCHES.find(item => item.id === "interior");
    expect(branch?.tools).toEqual(inside);
    for (const tool of inside) {
      expect(toolWorksIn(tool, "2d"), tool).toBe(true); expect(toolWorksIn(tool, "3d"), tool).toBe(true);
      expect(INTERIOR_KINDS.has(tool), tool).toBe(true);
      expect(FEATURE_DEFAULTS[tool].width, tool).toBeGreaterThan(0);
    }
    expect(FEATURE_STYLES.wall).toContain("wDoor"); expect(FEATURE_STYLES.fireplace).toEqual(["fWall", "fCorner", "fCentral"]); expect(FEATURE_STYLES.tv).toEqual(["tWall", "tStand"]);
    // a wall with a door has a gap that fits inside it, and a plain wall has none
    expect(wallGap({ style: "wWindow", width: 3, height: 2.6 })).toEqual({ width: 1.2, sill: 0.9, top: 2.1 });
    expect(wallGap({ style: "wDoor", width: 0.8, height: 2.6 })?.width).toBeCloseTo(0.4, 5);
    expect(wallGap({ style: "wSolid", width: 3, height: 2.6 })).toBeUndefined();
  });
});
