import { describe, expect, it } from "vitest";
import type { Point, Roof } from "../domain";
import {
  area, bounds, centroid, edgeOf, edgeRoofProfile, ensureCounterClockwise, floorBottom, isSimplePolygon, nearestOnOutline, offsetPolygon, pointInPolygon, rectangle, roofFrame, roofHeight, roofPieces, roofRise,
  roofLines, signedArea, splitPolygon, totalHeight, triangulate, type Vertex,
} from "./geometry";

const square: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 6 }, { x: 0, y: 6 }];
const lShape: Point[] = [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 8 }, { x: 0, y: 8 }];
const roof = (extra: Partial<Roof> = {}): Roof => ({ style: "gable", slope: 30, overhang: 0, ridge: 0, ...extra });

describe("polygons", () => {
  it("measures area, orientation and centre", () => {
    expect(area(square)).toBe(60);
    expect(signedArea(square)).toBe(60);
    expect(signedArea([...square].reverse())).toBe(-60);
    expect(signedArea(ensureCounterClockwise([...square].reverse()))).toBe(60);
    expect(centroid(square)).toEqual({ x: 5, y: 3 });
    expect(bounds(lShape)).toEqual({ minX: 0, minY: 0, maxX: 8, maxY: 8 });
    expect(area(lShape)).toBe(24 + 15);
  });
  it("knows what is inside, and what lies on which side", () => {
    expect(pointInPolygon({ x: 5, y: 3 }, square)).toBe(true);
    expect(pointInPolygon({ x: 11, y: 3 }, square)).toBe(false);
    expect(pointInPolygon({ x: 5, y: 5 }, lShape)).toBe(false);
    expect(pointInPolygon({ x: 1, y: 5 }, lShape)).toBe(true);
    expect(edgeOf(square, 0)).toMatchObject({ length: 10, ux: 1, uy: 0, nx: 0, ny: -1 });
  });
  it("finds the nearest point of the outline", () => {
    expect(nearestOnOutline(square, { x: 4, y: -2 })).toMatchObject({ edge: 0, along: 4, distance: 2 });
    expect(nearestOnOutline(square, { x: 12, y: 3 })).toMatchObject({ edge: 1, distance: 2 });
  });
  it("grows and shrinks a polygon", () => {
    const grown = offsetPolygon(square, 1);
    expect(area(grown)).toBeCloseTo(12 * 8);
    expect(bounds(grown)).toEqual({ minX: -1, minY: -1, maxX: 11, maxY: 7 });
    expect(area(offsetPolygon(square, -1))).toBeCloseTo(8 * 4);
  });
  it("accepts simple polygons and refuses the rest", () => {
    expect(isSimplePolygon(square)).toBe(true);
    expect(isSimplePolygon(lShape)).toBe(true);
    expect(isSimplePolygon([{ x: 0, y: 0 }, { x: 4, y: 4 }, { x: 4, y: 0 }, { x: 0, y: 4 }])).toBe(false);
    expect(isSimplePolygon([{ x: 0, y: 0 }, { x: 1, y: 0 }])).toBe(false);
    expect(isSimplePolygon([{ x: 0, y: 0 }, { x: 0.1, y: 0 }, { x: 0.1, y: 0.1 }])).toBe(false);
  });
  it("builds rotated rectangles", () => {
    const turned = rectangle(0, 0, 4, 2, 90);
    expect(area(turned)).toBeCloseTo(8);
    expect(bounds(turned).maxX - bounds(turned).minX).toBeCloseTo(2);
  });
  it("triangulates convex and concave polygons without losing area", () => {
    for (const shape of [square, lShape, [...lShape].reverse()]) {
      const triangles = triangulate(shape);
      expect(triangles).toHaveLength(shape.length - 2);
      expect(triangles.reduce((sum, [a, b, c]) => sum + area([shape[a], shape[b], shape[c]]), 0)).toBeCloseTo(area(shape));
    }
    expect(triangulate([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toEqual([]);
  });
  it("splits a polygon along a line", () => {
    const { positive, negative } = splitPolygon(square, point => point.x - 4);
    expect(area(positive) + area(negative)).toBeCloseTo(60);
    expect(area(positive)).toBeCloseTo(36);
    expect(splitPolygon(square, point => point.x + 5).negative).toEqual([]);
  });
});

describe("roofs", () => {
  it("fits the smallest rectangle around a footprint, whichever way it is turned", () => {
    const frame = roofFrame(rectangle(20, 10, 12, 8, 30), roof());
    expect(frame.halfLength).toBeCloseTo(6);
    expect(frame.halfWidth).toBeCloseTo(4);
    expect(((frame.angle * 180 / Math.PI) % 180 + 180) % 180).toBeCloseTo(30);
    const turned = roofFrame(square, roof({ ridge: 90 }));
    expect(turned.halfLength).toBeCloseTo(3);
    expect(turned.halfWidth).toBeCloseTo(5);
  });
  it("gives each style its height", () => {
    const frame = roofFrame(square, roof());
    const at = (style: Roof["style"], x: number, y: number) => roofHeight(frame, roof({ style }), x, y);
    const rise = Math.tan(30 * Math.PI / 180) * 3;
    expect(at("flat", 5, 3)).toBe(0);
    expect(at("gable", 5, 3)).toBeCloseTo(rise);
    expect(at("gable", 5, 0)).toBeCloseTo(0);
    expect(at("gable", 0, 3)).toBeCloseTo(rise);
    expect(at("shed", 5, 0)).toBeCloseTo(0);
    expect(at("shed", 5, 6)).toBeCloseTo(rise * 2);
    expect(at("hip", 5, 3)).toBeCloseTo(rise);
    expect(at("hip", 0, 3)).toBeCloseTo(0);
    expect(at("pyramid", 5, 3)).toBeCloseTo(rise);
    expect(at("pyramid", 0, 3)).toBeCloseTo(0);
    expect(roofRise(square, roof({ style: "shed" }))).toBeCloseTo(rise * 2);
    expect(roofRise(square, roof({ style: "flat" }))).toBe(0);
    expect(roofRise(square, roof({ slope: 45 }))).toBeCloseTo(3);
  });
  it("covers the whole footprint with planar pieces whose corners lie on the roof surface", () => {
    for (const style of ["flat", "shed", "gable", "hip", "pyramid"] as const) {
      for (const shape of [square, lShape, rectangle(5, 5, 9, 4, 25)]) {
        const definition = roof({ style, slope: 35 }), frame = roofFrame(shape, definition);
        const pieces = roofPieces(shape, definition);
        expect(pieces.length).toBeGreaterThan(0);
        expect(pieces.reduce((sum, piece) => sum + area(piece), 0)).toBeCloseTo(area(shape), 5);
        for (const piece of pieces) for (const vertex of piece) expect(vertex.z).toBeCloseTo(roofHeight(frame, definition, vertex.x, vertex.y), 6);
        for (const piece of pieces as Vertex[][]) {
          if (piece.length < 4) continue;
          const [a, b, c] = piece;
          const nx = (b.y - a.y) * (c.z - a.z) - (b.z - a.z) * (c.y - a.y), ny = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z), nz = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
          const length = Math.hypot(nx, ny, nz) || 1;
          for (const vertex of piece) expect(Math.abs(((vertex.x - a.x) * nx + (vertex.y - a.y) * ny + (vertex.z - a.z) * nz) / length)).toBeLessThan(1e-6);
        }
      }
    }
  });
  it("grows by the overhang and lets the eaves drop below the wall tops", () => {
    const pieces = roofPieces(square, roof({ overhang: 0.5 }));
    expect(pieces.reduce((sum, piece) => sum + area(piece), 0)).toBeCloseTo(11 * 7);
    expect(Math.min(...pieces.flat().map(vertex => vertex.z))).toBeLessThan(0);
  });
  it("gives the height of a wall top edge under a gable", () => {
    const along = edgeRoofProfile(square, roof(), 1, 6);
    const rise = Math.tan(30 * Math.PI / 180) * 3;
    expect(along[0]).toBeCloseTo(0);
    expect(along[3]).toBeCloseTo(rise);
    expect(along[6]).toBeCloseTo(0);
    expect(Math.min(...edgeRoofProfile(square, roof(), 0, 6))).toBeCloseTo(0);
  });
});

describe("floors", () => {
  it("adds up storeys", () => {
    expect(totalHeight([2.8, 2.6, 3])).toBeCloseTo(8.4);
    expect(floorBottom([2.8, 2.6, 3], 0)).toBe(0);
    expect(floorBottom([2.8, 2.6, 3], 2)).toBeCloseTo(5.4);
  });
});

describe("roof plan lines", () => {
  const long = (line: Point[]) => Math.hypot(line[1].x - line[0].x, line[1].y - line[0].y);
  it("draws the ridge of a gable and nothing for a flat roof", () => {
    expect(roofLines(square, roof({ style: "flat" }))).toEqual([]);
    const lines = roofLines(square, roof());
    expect(lines).toHaveLength(1);
    expect(long(lines[0])).toBeGreaterThan(9.8);
    expect(lines[0][0].y).toBeCloseTo(3, 1);                 // along the middle of the 6 m width
  });
  it("draws the ridge and four hips of a hipped roof, and four diagonals for a pyramid", () => {
    expect(roofLines(square, roof({ style: "hip" }))).toHaveLength(5);
    expect(roofLines(square, roof({ style: "pyramid" }))).toHaveLength(4);
    const ridge = roofLines(square, roof({ style: "hip" })).find(line => Math.abs(line[0].y - 3) < 0.1 && Math.abs(line[1].y - 3) < 0.1)!;
    expect(Math.abs(long(ridge) - 4)).toBeLessThan(0.2);                  // 10 m long, 6 m wide: the ridge is 4 m
  });
  it("marks the high edge of a shed roof and stays inside the roof", () => {
    const lines = roofLines(square, roof({ style: "shed" }));
    expect(lines).toHaveLength(1);
    expect(lines[0][0].y).toBeGreaterThan(5.9);
  });
});
