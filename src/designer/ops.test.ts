import { describe, expect, it } from "vitest";
import { INITIAL_BUILDINGS, INITIAL_CAMERAS, INITIAL_DIMENSIONS, INITIAL_FEATURES, INITIAL_OPENINGS, INITIAL_ROOF_ITEMS, INITIAL_SENSORS, INITIAL_TERRAIN, INITIAL_WALL_LAMPS } from "../domain";
import { area, bounds, centroid, edgeOf, pointInPolygon, signedArea, totalHeight } from "./geometry";
import { toMetres } from "./model";
import {
  addFeature, addFence, addSidewalkRing, addFloor, canTurnAbout, turnSelected, addOpening, addRoofItem, addWallLamp, buildingAt, createBuilding, deleteBuilding, duplicateBuilding, fitDimensions, insertBuildingVertex, isRectangle, moveBuilding, moveVertex, rectangularTerrain,
  removeBuildingVertex, removeFloor, removeSelected, rescaleDevices, resizeRectangle, rotateBuilding, roofSurfaceZ, setFootprint, setSideLength, type SiteModel,
} from "./ops";

const sample = (): SiteModel => ({
  terrain: structuredClone(INITIAL_TERRAIN), buildings: structuredClone(INITIAL_BUILDINGS), openings: structuredClone(INITIAL_OPENINGS), roofItems: structuredClone(INITIAL_ROOF_ITEMS),
  wallLamps: structuredClone(INITIAL_WALL_LAMPS), features: structuredClone(INITIAL_FEATURES), cameras: structuredClone(INITIAL_CAMERAS), sensors: structuredClone(INITIAL_SENSORS), placements: [],
});
const house = (model: SiteModel) => model.buildings[0];

describe("outlines", () => {
  it("moves a corner, but never into a shape that crosses itself", () => {
    const points = house(sample()).points;
    expect(moveVertex(points, 2, { x: 30, y: 21 })[2]).toEqual({ x: 30, y: 21 });
    expect(moveVertex(points, 2, { x: 22, y: 5 })).toEqual(points);   // a bow-tie is refused
  });
  it("adds a corner in the middle of a side, and removes one", () => {
    const model = sample();
    const inserted = insertBuildingVertex(model, "building-01", 0, { x: 22, y: 12 });
    expect(house(inserted.model).points).toHaveLength(5);
    expect(inserted.index).toBe(1);
    const back = removeBuildingVertex(inserted.model, "building-01", 1);
    expect(house(back).points).toHaveLength(4);
    const triangle = removeBuildingVertex(model, "building-02", 0);
    expect(triangle.buildings[1].points).toHaveLength(3);                                            // a rectangle loses a corner and becomes a triangle
    expect(removeBuildingVertex(triangle, "building-02", 0).buildings[1].points).toHaveLength(3);   // never fewer than three
  });
  it("keeps doors and windows on the half of the wall they were on when the wall is cut", () => {
    const model = sample();
    // wall 0 of the house is 12 m; window-01 sits at 6 m and door-01 at 2 m
    const cut = insertBuildingVertex(model, "building-01", 0, { x: 22, y: 12 }).model;    // 6 m from the start
    const door = cut.openings.find(item => item.id === "door-01")!, window = cut.openings.find(item => item.id === "window-03")!;
    expect(door.edge).toBe(0);
    expect(window.edge).toBe(1);
    expect(window.offset).toBeCloseTo(1, 1);
    expect(cut.openings.find(item => item.id === "window-04")!.edge).toBe(2);   // walls after the cut shift by one
  });
  it("resizes a rectangle without leaving it, and one side of any outline", () => {
    const points = house(sample()).points;
    expect(isRectangle(points)).toBe(true);
    const grown = resizeRectangle(points, 14, 9);
    expect(isRectangle(grown)).toBe(true);
    expect(edgeOf(grown, 0).length).toBeCloseTo(14);
    expect(edgeOf(grown, 1).length).toBeCloseTo(9);
    expect(grown[0]).toEqual(points[0]);
    const longer = setSideLength(points, 0, 15);
    expect(edgeOf(longer, 0).length).toBeCloseTo(15);
    expect(isRectangle(longer)).toBe(false);
  });
  it("makes a rectangular terrain", () => {
    const terrain = rectangularTerrain(5, 4, 30, 20);
    expect(area(terrain.points)).toBe(600);
    expect(bounds(terrain.points)).toEqual({ minX: 5, minY: 4, maxX: 35, maxY: 24 });
  });
});

describe("buildings", () => {
  it("creates a building with an anticlockwise footprint, a floor and a roof", () => {
    const { model, id } = createBuilding(sample(), [{ x: 0, y: 0 }, { x: 0, y: 4 }, { x: 5, y: 4 }, { x: 5, y: 0 }], "Shed");
    const made = model.buildings.find(item => item.id === id)!;
    expect(made.name).toBe("Shed");
    expect(made.floors).toHaveLength(1);
    expect(made.roof.style).toBe("gable");
    expect(id).toBe("building-03");
    expect(signedArea(made.points)).toBe(20);      // the clockwise outline that was drawn is turned anticlockwise
    expect(area(made.points)).toBe(20);
  });
  it("moves a building with whatever stands on its roof, and turns it about its centre", () => {
    const model = sample(), chimney = model.roofItems[0], centre = centroid(house(model).points);
    const moved = moveBuilding(model, "building-01", 2, -1);
    expect(house(moved).points[0]).toEqual({ x: 18, y: 11 });
    expect(moved.roofItems[0].x).toBeCloseTo(chimney.x + 2);
    const turned = rotateBuilding(model, "building-01", 90);
    expect(centroid(house(turned).points).x).toBeCloseTo(centre.x, 1);
    expect(centroid(house(turned).points).y).toBeCloseTo(centre.y, 1);
    expect(turned.roofItems[0].rotation).toBe(90);
    expect(pointInPolygon({ x: turned.roofItems[0].x, y: turned.roofItems[0].y }, house(turned).points)).toBe(true);
  });
  it("duplicates a building with its own openings, and deletes it with everything on it", () => {
    const model = sample(), copy = duplicateBuilding(model, "building-01")!;
    expect(copy.model.buildings).toHaveLength(3);
    const ids = copy.model.openings.map(item => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(copy.model.openings.filter(item => item.buildingId === copy.id)).toHaveLength(model.openings.filter(item => item.buildingId === "building-01").length);
    const gone = deleteBuilding(copy.model, copy.id);
    expect(gone.openings).toHaveLength(model.openings.length);
    expect(gone.roofItems).toHaveLength(model.roofItems.length);
    expect(deleteBuilding(model, "building-01").wallLamps).toEqual([]);
  });
});

describe("floors", () => {
  it("adds a floor like the top one, and removes one with its doors and windows", () => {
    const model = sample(), taller = addFloor(model, "building-02");
    expect(house(taller).floors).toHaveLength(2);
    expect(taller.buildings[1].floors).toEqual([2.6, 2.6]);
    const lower = removeFloor(model, "building-01", 0);
    expect(house(lower).floors).toEqual([2.8]);
    expect(lower.openings.some(item => item.id === "door-01")).toBe(false);
    expect(lower.openings.find(item => item.id === "window-03")!.floor).toBe(0);   // the floor above came down
    expect(removeFloor(model, "building-02", 0)).toBe(model);                      // the last floor stays
  });
});

describe("openings, lamps and roof items", () => {
  it("puts a window on a chosen floor and keeps it inside its wall", () => {
    const model = sample(), added = addOpening(model, "building-01", 1, 1, "window", 100)!;
    const window = added.model.openings.find(item => item.id === added.id)!;
    expect(window.floor).toBe(1);
    expect(window.sill).toBe(0.9);
    expect(window.offset + window.width).toBeLessThanOrEqual(edgeOf(house(model).points, 1).length);
    expect(addOpening(model, "building-01", 9, 0, "door")).toBeNull();
    expect(addOpening(model, "building-01", 0, 5, "door")).toBeNull();
    expect(addOpening(model, "building-02", 0, 0, "door", 1)!.model.openings.filter(item => item.buildingId === "building-02")).toHaveLength(2);
  });
  it("mounts a lamp on a wall", () => {
    const added = addWallLamp(sample(), "building-01", 2, 3)!;
    expect(added.model.wallLamps.find(item => item.id === added.id)).toMatchObject({ edge: 2, offset: 3, reach: 0.4 });
  });
  it("puts things on a roof only where there is a roof, at the height of the roof", () => {
    const model = sample();
    expect(addRoofItem(model, "building-01", "antenna", 100, 100)).toBeNull();
    const added = addRoofItem(model, "building-01", "solar", 20, 14)!;
    expect(added.model.roofItems).toHaveLength(model.roofItems.length + 1);
    const b = house(model), eaves = roofSurfaceZ(b, 20, 12.05), ridge = roofSurfaceZ(b, 20, 16);
    expect(eaves).toBeCloseTo(totalHeight(b.floors), 1);
    expect(ridge).toBeGreaterThan(eaves + 2);
    expect(buildingAt(model, { x: 20, y: 15 })?.id).toBe("building-01");
    expect(buildingAt(model, { x: 1, y: 1 })).toBeUndefined();
  });
  it("places ground objects with their own sizes", () => {
    const added = addFeature(sample(), "lamp", 10, 10);
    const lamp = added.model.features.find(item => item.id === added.id)!;
    expect(lamp).toMatchObject({ kind: "lamp", x: 10, y: 10, z: 0, height: 5 });
    expect(new Set(added.model.features.map(item => item.id)).size).toBe(added.model.features.length);
  });
});

describe("the work area", () => {
  it("only grows, to hold the terrain and every building with a margin", () => {
    const model = sample();
    expect(fitDimensions(INITIAL_DIMENSIONS, model)).toEqual(INITIAL_DIMENSIONS);
    const wider = { ...model, terrain: rectangularTerrain(0, 0, 90, 20) };
    expect(fitDimensions(INITIAL_DIMENSIONS, wider).width).toBe(94);
    expect(fitDimensions(INITIAL_DIMENSIONS, wider).depth).toBe(INITIAL_DIMENSIONS.depth);
  });
  it("keeps cameras and radars where they are on the ground when it grows", () => {
    const model = sample(), bigger = { ...INITIAL_DIMENSIONS, width: 120, depth: 80 };
    const before = toMetres(model.cameras[0], INITIAL_DIMENSIONS);
    const after = toMetres(rescaleDevices(model, INITIAL_DIMENSIONS, bigger).cameras[0], bigger);
    expect(after.x).toBeCloseTo(before.x, 1);
    expect(after.y).toBeCloseTo(before.y, 1);
    expect(rescaleDevices(model, INITIAL_DIMENSIONS, INITIAL_DIMENSIONS)).toBe(model);
  });
});

describe("deleting the selection", () => {
  it("removes each kind of thing, a corner instead of the whole shape when one is selected, and never a camera", () => {
    const model = sample();
    expect(removeSelected(model, { kind: "opening", id: "door-01" }).openings.some(item => item.id === "door-01")).toBe(false);
    expect(removeSelected(model, { kind: "roofItem", id: "chimney-01" }).roofItems.some(item => item.id === "chimney-01")).toBe(false);
    expect(removeSelected(model, { kind: "wallLamp", id: "wall-lamp-01" }).wallLamps).toEqual([]);
    expect(removeSelected(model, { kind: "feature", id: "lamp-01" }).features.some(item => item.id === "lamp-01")).toBe(false);
    expect(removeSelected(model, { kind: "sensor", id: "sensor-01" }).sensors).toHaveLength(1);
    expect(removeSelected(model, { kind: "building", id: "building-02" }).buildings).toHaveLength(1);
    expect(removeSelected(model, { kind: "building", id: "building-02", vertex: 0 }).buildings[1].points).toHaveLength(3);
    expect(removeSelected(model, { kind: "terrain", vertex: 0 }).terrain.points).toHaveLength(INITIAL_TERRAIN.points.length - 1);
    expect(removeSelected(model, { kind: "terrain" })).toBe(model);
    expect(removeSelected(model, { kind: "camera", id: "cam-01" })).toBe(model);
    expect(removeSelected(setFootprint(model, "building-01", house(model).points), { kind: "none" }).buildings).toHaveLength(2);
  });
});

describe("garden and farm objects", () => {
  it("draws a fence between two points, as long as the gap and lying along it", () => {
    const added = addFence(sample(), { x: 10, y: 10 }, { x: 10, y: 16 })!;
    const fence = added.model.features.find(item => item.id === added.id)!;
    expect(fence).toMatchObject({ kind: "fence", x: 10, y: 13, width: 6, rotation: 90, style: "mesh" });
    expect(addFence(sample(), { x: 1, y: 1 }, { x: 1.1, y: 1 })).toBeNull();
  });
  it("places the new kinds with their own sizes and styles", () => {
    for (const kind of ["tree", "kennel", "fountain", "coop", "gate"] as const) {
      const added = addFeature(sample(), kind, 5, 5), feature = added.model.features.find(item => item.id === added.id)!;
      expect(feature.kind).toBe(kind);
      expect(feature.height).toBeGreaterThan(0.5);
    }
    expect(addFeature(sample(), "tree", 5, 5).model.features.at(-1)?.style).toBe("oak");
  });
  it("turns a selected object about the vertical axis, and tips it about X and Z", () => {
    const model = sample(), pick = { kind: "feature" as const, id: "pillar-01" };
    const yawed = turnSelected(model, pick, "yaw", 15).features.find(item => item.id === "pillar-01")!;
    expect(yawed.rotation).toBe(15);
    const tipped = turnSelected(turnSelected(model, pick, "pitch", 30), pick, "roll", -45).features.find(item => item.id === "pillar-01")!;
    expect(tipped.pitch).toBe(30);
    expect(tipped.roll).toBe(-45);
    expect(turnSelected(model, pick, "yaw", 350).features.find(item => item.id === "pillar-01")!.rotation).toBe(-10);   // wraps
    const looked = turnSelected(model, { kind: "camera", id: "cam-01" }, "pitch", 20).cameras[0];
    expect(looked.tilt).toBe(-20);                                         // tipping forward looks lower, and the tilt is "downward" positive
    expect(canTurnAbout(pick, "roll")).toBe(true);
    expect(canTurnAbout({ kind: "camera", id: "x" }, "roll")).toBe(false);
    expect(canTurnAbout({ kind: "building", id: "b" }, "pitch")).toBe(false);
    expect(turnSelected(model, { kind: "none" }, "yaw", 15)).toBe(model);
  });
});

describe("sidewalks", () => {
  it("lays a sidewalk all round a building: a strip along every wall, just outside it, sharing a group", () => {
    const model = sample(), ring = addSidewalkRing(model, "building-01")!;
    const strips = ring.model.features.filter(item => ring.ids.includes(item.id));
    expect(strips).toHaveLength(4);
    expect(new Set(strips.map(item => item.group)).size).toBe(1);
    expect(strips.every(item => item.kind === "sidewalk" && item.depth === 1.2)).toBe(true);
    const house = model.buildings[0], box = bounds(house.points);
    // the ring encloses the house: every strip lies outside the footprint, and the outermost reach is a sidewalk's width past the wall
    for (const strip of strips) expect(pointInPolygon({ x: strip.x, y: strip.y }, house.points)).toBe(false);
    const xs = strips.flatMap(item => [item.x - item.width / 2, item.x + item.width / 2]);
    expect(Math.max(...strips.map(item => Math.abs(item.x - (box.minX + box.maxX) / 2)))).toBeGreaterThan((box.maxX - box.minX) / 2);
    expect(xs.length).toBe(8);
    expect(addSidewalkRing(model, "nobody")).toBeNull();
  });
  it("goes and moves as one, and follows an L-shaped outline", () => {
    const model = sample(), ring = addSidewalkRing(model, "building-01")!;
    const removed = removeSelected(ring.model, { kind: "feature", id: ring.ids[1] });
    expect(removed.features.some(item => item.group)).toBe(false);
    expect(removed.features).toHaveLength(model.features.length);
    const l = { ...model, buildings: [{ ...model.buildings[0], points: [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 8 }, { x: 0, y: 8 }] }, ...model.buildings.slice(1)] };
    expect(addSidewalkRing(l, "building-01")!.ids).toHaveLength(6);
  });
});
