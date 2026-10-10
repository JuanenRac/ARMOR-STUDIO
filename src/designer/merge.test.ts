import { describe, expect, it } from "vitest";
import type { Building, Opening } from "../domain";
import { INITIAL_TERRAIN } from "../domain";
import { edgeOf } from "./geometry";
import { keepsSharedWall, mergeBuildings, mergeCandidates, partnersOf, separateBuildings, sharedSegments, wallPlan } from "./merge";
import { deleteBuilding, isRectangle, moveEdge, moveSide, type SiteModel } from "./ops";

const box = (id: string, x0: number, y0: number, x1: number, y1: number, floors = [2.8]): Building => ({
  id, name: id, points: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], base: 0, floors, roof: { style: "flat", slope: 0, overhang: 0, ridge: 0 }, thickness: 0.25,
});
const door = (id: string, buildingId: string, edge: number, offset: number): Opening => ({ id, buildingId, edge, floor: 0, kind: "door", offset, width: 0.9, height: 2.1, sill: 0 });
const model = (buildings: Building[], openings: Opening[] = []): SiteModel => ({
  terrain: structuredClone(INITIAL_TERRAIN), buildings, openings, roofItems: [], wallLamps: [], features: [], cameras: [], sensors: [], placements: [],
});
const get = (m: SiteModel, id: string) => m.buildings.find(item => item.id === id)!;

describe("moving one wall", () => {
  const rect = box("a", 0, 0, 4, 3).points;
  it("pushes a wall of a rectangle out and in, and the rectangle keeps its right angles and its opposite wall", () => {
    const out = moveEdge(rect, 1, 1);
    expect(out).toEqual([{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 3 }, { x: 0, y: 3 }]);
    expect(isRectangle(out)).toBe(true);
    const south = moveEdge(rect, 0, 1);                                     // the south wall pushed out, below the plan
    expect(south).toEqual([{ x: 0, y: -1 }, { x: 4, y: -1 }, { x: 4, y: 3 }, { x: 0, y: 3 }]);
    expect(moveEdge(rect, 0, -1)).toEqual([{ x: 0, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 3 }, { x: 0, y: 3 }]);
  });
  it("works on a rectangle turned any way", () => {
    const angle = 30 * Math.PI / 180, turn = (p: { x: number; y: number }) => ({ x: p.x * Math.cos(angle) - p.y * Math.sin(angle), y: p.x * Math.sin(angle) + p.y * Math.cos(angle) });
    const points = rect.map(turn);
    const out = moveEdge(points, 2, 0.7);
    for (let i = 0; i < 4; i += 1) { const e = edgeOf(out, i), f = edgeOf(out, (i + 1) % 4); expect(Math.abs(e.ux * f.ux + e.uy * f.uy)).toBeLessThan(0.01); }   // still right angles (to the centimetre the plan is kept in)
    expect(edgeOf(out, 1).length).toBeCloseTo(3.7, 1);
    expect(edgeOf(out, 0).length).toBeCloseTo(4, 1);
  });
  it("refuses a wall that would collapse or turn the outline inside out", () => {
    expect(moveEdge(rect, 0, -3)).toEqual(rect);        // all the way to the opposite wall
    expect(moveEdge(rect, 0, -4)).toEqual(rect);
    expect(moveEdge(rect, 1, Number.NaN)).toEqual(rect);
    expect(moveEdge(rect, 9, 1)).toEqual(rect);
  });
  it("lets the walls beside a slanted one pivot instead of breaking", () => {
    const trapezium = [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }];
    const out = moveEdge(trapezium, 0, 1);
    expect(out[0].y).toBeCloseTo(-1, 1);
    expect(out[1].y).toBeCloseTo(-1, 1);
    expect(out[2]).toEqual(trapezium[2]);
    expect(out[3]).toEqual(trapezium[3]);
  });
  it("keeps a door where it stood in the world when the wall beside it moves", () => {
    const m = model([box("a", 0, 0, 4, 3)], [door("d", "a", 2, 1)]);   // on the north wall, running west: world x = 4 - 1 = 3
    const moved = moveSide(m, "a", 1, 1);                              // the east wall goes out by a metre: the north wall now starts at x = 5
    expect(moved.openings[0].offset).toBe(2);                         // so the door is 2 m from its start, still at x = 3
    expect(get(moved, "a").points[1].x).toBe(5);
  });
  it("leaves the model alone when nothing can move", () => {
    const m = model([box("a", 0, 0, 4, 3)]);
    expect(moveSide(m, "a", 0, 0)).toBe(m);
    expect(moveSide(m, "nothing", 0, 1)).toBe(m);
    expect(moveSide(m, "a", 0, -3)).toBe(m);
  });
});

describe("walls that touch", () => {
  const a = box("a", 0, 0, 4, 3), b = box("b", 4, 0, 8, 3);
  it("finds the stretch two walls have in common, and where it lies along each", () => {
    const shared = sharedSegments(a, b);
    expect(shared).toHaveLength(1);
    expect(shared[0]).toMatchObject({ edgeA: 1, edgeB: 3, fromA: 0, toA: 3, gap: 0 });
    expect(shared[0].bStart).toBeCloseTo(3, 5);
  });
  it("finds a half overlap, a wall drawn beside the other, and nothing for buildings that are apart or only touch at a corner", () => {
    expect(sharedSegments(a, box("c", 4, 1, 8, 5))[0]).toMatchObject({ fromA: 1, toA: 3 });
    expect(sharedSegments(a, box("d", 4.2, 0, 8, 3))[0].gap).toBe(0.2);
    expect(sharedSegments(a, box("e", 5, 0, 8, 3))).toEqual([]);
    expect(sharedSegments(a, box("f", 4, 3, 8, 6))).toEqual([]);        // a corner
  });
  it("offers to merge the buildings that touch, and only those", () => {
    const m = model([a, b, box("far", 20, 20, 24, 24)]);
    expect(mergeCandidates(m, a).map(item => item.id)).toEqual(["b"]);
  });
});

describe("merging", () => {
  it("brings a wall drawn beside the other onto one line and remembers the two are merged", () => {
    const m = model([box("a", 0, 0, 4, 3), box("b", 4.25, 0, 8, 3)]);
    const merged = mergeBuildings(m, "a", "b")!;
    expect(get(merged, "b").points[0]).toEqual({ x: 4, y: 0 });
    expect(get(merged, "b").points[3]).toEqual({ x: 4, y: 3 });
    expect(get(merged, "a").points).toEqual(m.buildings[0].points);       // the first building does not move
    expect(isRectangle(get(merged, "b").points)).toBe(true);
    expect(get(merged, "a").mergedWith).toEqual(["b"]);
    expect(get(merged, "b").mergedWith).toEqual(["a"]);
    expect(partnersOf(merged, get(merged, "a")).map(item => item.id)).toEqual(["b"]);
    expect(mergeCandidates(merged, get(merged, "a"))).toEqual([]);
  });
  it("merges nothing that does not touch", () => {
    expect(mergeBuildings(model([box("a", 0, 0, 4, 3), box("b", 9, 0, 12, 3)]), "a", "b")).toBeNull();
    expect(mergeBuildings(model([box("a", 0, 0, 4, 3)]), "a", "a")).toBeNull();
  });
  it("separates two merged buildings and forgets a building that is deleted", () => {
    const merged = mergeBuildings(model([box("a", 0, 0, 4, 3), box("b", 4, 0, 8, 3), box("c", 0, 3, 4, 6)]), "a", "b")!;
    const apart = separateBuildings(merged, "a", "b");
    expect(get(apart, "a").mergedWith).toBeUndefined();
    expect(get(apart, "b").mergedWith).toBeUndefined();
    expect(get(deleteBuilding(merged, "b"), "a").mergedWith).toBeUndefined();
  });
});

describe("the walls two merged buildings share", () => {
  const two = (floorsB: number[]) => mergeBuildings(model([box("a", 0, 0, 4, 3, [2.8]), box("b", 4, 0, 8, 3, floorsB)], [door("d1", "a", 1, 1), door("d2", "b", 3, 0.2)]), "a", "b")!;
  it("keeps the wall on the taller building and leaves a gap in the other", () => {
    const m = two([2.8, 2.8]);
    expect(keepsSharedWall(get(m, "b"), get(m, "a"))).toBe(true);
    expect(wallPlan(m, get(m, "a")).cuts).toEqual([{ edge: 1, from: 0, to: 3 }]);
    expect(wallPlan(m, get(m, "b")).cuts).toEqual([]);
  });
  it("breaks a tie by the name, so exactly one of the two builds the wall", () => {
    const m = two([2.8]);
    expect(keepsSharedWall(get(m, "a"), get(m, "b"))).toBe(true);
    expect(keepsSharedWall(get(m, "b"), get(m, "a"))).toBe(false);
  });
  it("cuts the openings of both buildings through the one wall, once", () => {
    const m = two([2.8, 2.8]);
    const host = wallPlan(m, get(m, "b")), other = wallPlan(m, get(m, "a"));
    expect([...other.handedOver]).toEqual(["d1"]);                       // the door drawn on the lower building is drawn on the wall that stays
    expect(host.borrowed).toHaveLength(1);
    expect(host.borrowed[0]).toMatchObject({ id: "d1", buildingId: "b", edge: 3, floor: 0 });
    expect(host.borrowed[0].offset).toBeCloseTo(3 - 1.9, 5);            // measured along the wall that stays, which runs the other way
    expect(host.handedOver.size).toBe(0);                               // its own door stays where it is
    expect(host.twoFaced.has(3)).toBe(true);
    expect(other.twoFaced.has(1)).toBe(true);
  });
  it("puts a door of a raised building at its real height on the wall that stays", () => {
    const raised = { ...box("a", 0, 0, 4, 3), base: 0.5 };
    const m = mergeBuildings(model([raised, box("b", 4, 0, 8, 3, [2.8, 2.8])], [{ ...door("d1", "a", 1, 1), sill: 0.1 }]), "a", "b")!;
    expect(wallPlan(m, get(m, "b")).borrowed[0].sill).toBeCloseTo(0.6, 5);
  });
  it("does nothing to buildings that are not merged", () => {
    const m = model([box("a", 0, 0, 4, 3), box("b", 4, 0, 8, 3)], [door("d1", "a", 1, 1)]);
    const plan = wallPlan(m, get(m, "a"));
    expect(plan.cuts).toEqual([]);
    expect(plan.borrowed).toEqual([]);
  });
});
