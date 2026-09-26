/**
 * Site designer geometry: polygons (terrain and building footprints) and roofs. Pure functions, in metres,
 * x to the east and y to the north; the 2D plan and the 3D viewport are both drawn from these.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Point, Roof } from "../domain";

export type Vertex = Point & { z: number };

// ---- polygons ---------------------------------------------------------------------------------------------------------

/** The signed area: positive when the points run anticlockwise (with y to the north). */
export function signedArea(points: readonly Point[]): number {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index], b = points[(index + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}
export const area = (points: readonly Point[]): number => Math.abs(signedArea(points));
export const ensureCounterClockwise = (points: readonly Point[]): Point[] => signedArea(points) < 0 ? [...points].reverse() : [...points];

export function centroid(points: readonly Point[]): Point {
  const twice = signedArea(points) * 2;
  if (Math.abs(twice) < 1e-9) {
    const sum = points.reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y }), { x: 0, y: 0 });
    return { x: sum.x / Math.max(1, points.length), y: sum.y / Math.max(1, points.length) };
  }
  let cx = 0, cy = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index], b = points[(index + 1) % points.length], cross = a.x * b.y - b.x * a.y;
    cx += (a.x + b.x) * cross; cy += (a.y + b.y) * cross;
  }
  return { x: cx / (3 * twice), y: cy / (3 * twice) };
}

export function bounds(points: readonly Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const point of points) { box.minX = Math.min(box.minX, point.x); box.minY = Math.min(box.minY, point.y); box.maxX = Math.max(box.maxX, point.x); box.maxY = Math.max(box.maxY, point.y); }
  return box;
}

export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const a = polygon[index], b = polygon[previous];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** One side of a polygon: from point `index` to the next, with its length, unit direction and outward normal (for an anticlockwise polygon). */
export function edgeOf(points: readonly Point[], index: number): { a: Point; b: Point; length: number; ux: number; uy: number; nx: number; ny: number } {
  const a = points[index], b = points[(index + 1) % points.length];
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1e-9, ux = (b.x - a.x) / length, uy = (b.y - a.y) / length;
  return { a, b, length, ux, uy, nx: uy, ny: -ux };
}

/** The point on a polygon's outline nearest to `p`: which edge, how far along it, and how far away. */
export function nearestOnOutline(points: readonly Point[], p: Point): { edge: number; along: number; distance: number; point: Point } {
  let best = { edge: 0, along: 0, distance: Infinity, point: points[0] };
  for (let index = 0; index < points.length; index += 1) {
    const { a, length, ux, uy } = edgeOf(points, index);
    const along = Math.min(length, Math.max(0, (p.x - a.x) * ux + (p.y - a.y) * uy));
    const candidate = { x: a.x + ux * along, y: a.y + uy * along }, distance = Math.hypot(p.x - candidate.x, p.y - candidate.y);
    if (distance < best.distance) best = { edge: index, along, distance, point: candidate };
  }
  return best;
}

/** Grow (positive) or shrink (negative) a polygon by moving every side outward; corners are mitred. Works for anticlockwise polygons. */
export function offsetPolygon(points: readonly Point[], distance: number): Point[] {
  if (Math.abs(distance) < 1e-9 || points.length < 3) return [...points];
  const count = points.length;
  return points.map((point, index) => {
    const previous = edgeOf(points, (index - 1 + count) % count), next = edgeOf(points, index);
    // The corner moves along the bisector so that both adjoining sides move by `distance`.
    const bx = previous.nx + next.nx, by = previous.ny + next.ny, dot = Math.max(0.2, 1 + previous.nx * next.nx + previous.ny * next.ny);
    const factor = distance / dot;
    return { x: point.x + bx * factor, y: point.y + by * factor };
  });
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const orient = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
  return o1 * o2 < -1e-12 && o3 * o4 < -1e-12;
}

/** A polygon is usable when it has at least three points, a real area and does not cross itself. */
export function isSimplePolygon(points: readonly Point[], minimumArea = 0.5): boolean {
  if (points.length < 3 || area(points) < minimumArea) return false;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === points.length - 1)) continue;
      if (segmentsCross(points[i], points[(i + 1) % points.length], points[j], points[(j + 1) % points.length])) return false;
    }
  }
  return true;
}

export const rectangle = (x: number, y: number, width: number, depth: number, rotation = 0): Point[] => {
  const cos = Math.cos(rotation * Math.PI / 180), sin = Math.sin(rotation * Math.PI / 180), cx = x + width / 2, cy = y + depth / 2;
  return [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]].map(([px, py]) => ({ x: cx + px * cos - py * sin, y: cy + px * sin + py * cos }));
};

/** Ear-clipping triangulation of a simple polygon: triples of indexes into `points`. */
export function triangulate(points: readonly Point[]): Array<[number, number, number]> {
  const count = points.length;
  if (count < 3) return [];
  const order = Array.from({ length: count }, (_, index) => index);
  if (signedArea(points) < 0) order.reverse();
  const triangles: Array<[number, number, number]> = [];
  const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const inside = (p: Point, a: Point, b: Point, c: Point) => cross(a, b, p) >= -1e-12 && cross(b, c, p) >= -1e-12 && cross(c, a, p) >= -1e-12;
  let guard = count * count;
  while (order.length > 3 && guard-- > 0) {
    let clipped = false;
    for (let position = 0; position < order.length; position += 1) {
      const ia = order[(position + order.length - 1) % order.length], ib = order[position], ic = order[(position + 1) % order.length];
      const a = points[ia], b = points[ib], c = points[ic];
      if (cross(a, b, c) <= 1e-12) continue;                                   // a reflex corner is not an ear
      if (order.some(other => other !== ia && other !== ib && other !== ic && inside(points[other], a, b, c))) continue;
      triangles.push([ia, ib, ic]);
      order.splice(position, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;                                                       // a degenerate polygon: stop rather than loop
  }
  if (order.length === 3) triangles.push([order[0], order[1], order[2]]);
  return triangles;
}

/** Split a convex polygon by the line where `f` is zero. Each piece keeps the points where `f` is positive, respectively negative. */
export function splitPolygon(polygon: readonly Point[], f: (point: Point) => number): { positive: Point[]; negative: Point[] } {
  const positive: Point[] = [], negative: Point[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index], b = polygon[(index + 1) % polygon.length], fa = f(a), fb = f(b);
    if (fa >= 0) positive.push(a);
    if (fa <= 0) negative.push(a);
    if ((fa > 0 && fb < 0) || (fa < 0 && fb > 0)) {
      const t = fa / (fa - fb), crossing = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      positive.push(crossing); negative.push(crossing);
    }
  }
  return { positive: positive.length >= 3 ? positive : [], negative: negative.length >= 3 ? negative : [] };
}

// ---- roofs ------------------------------------------------------------------------------------------------------------------

/**
 * The frame a roof is laid out in: the smallest rectangle around the footprint (found by trying the direction of
 * every side), its centre, the direction of its long side, and its half sizes. The ridge runs along the long side
 * unless the roof's `ridge` turns it.
 */
export type RoofFrame = { cx: number; cy: number; angle: number; halfWidth: number; halfLength: number };

export function roofFrame(points: readonly Point[], roof: Pick<Roof, "ridge">): RoofFrame {
  let best: RoofFrame | null = null, bestArea = Infinity;
  for (let index = 0; index < points.length; index += 1) {
    const { ux, uy } = edgeOf(points, index);
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const point of points) {
      const u = point.x * ux + point.y * uy, v = -point.x * uy + point.y * ux;
      minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v);
    }
    const spanArea = (maxU - minU) * (maxV - minV);
    if (spanArea < bestArea - 1e-9) {
      bestArea = spanArea;
      const midU = (minU + maxU) / 2, midV = (minV + maxV) / 2;
      const alongU = (maxU - minU) >= (maxV - minV);
      best = {
        cx: midU * ux - midV * uy, cy: midU * uy + midV * ux, angle: Math.atan2(uy, ux) + (alongU ? 0 : Math.PI / 2),
        halfLength: Math.max(maxU - minU, maxV - minV) / 2, halfWidth: Math.min(maxU - minU, maxV - minV) / 2,
      };
    }
  }
  const angle = (best?.angle ?? 0) + roof.ridge * Math.PI / 180;
  // Measure the footprint along the final ridge direction, so that turning the ridge keeps the roof over the whole building.
  const cos = Math.cos(angle), sin = Math.sin(angle);
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const point of points) {
    const v = point.x * cos + point.y * sin, u = -point.x * sin + point.y * cos;
    minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v);
  }
  const midU = (minU + maxU) / 2, midV = (minV + maxV) / 2;
  return { cx: midV * cos - midU * sin, cy: midV * sin + midU * cos, angle, halfWidth: Math.max(0.05, (maxU - minU) / 2), halfLength: Math.max(0.05, (maxV - minV) / 2) };
}

const tanDeg = (degrees: number) => Math.tan(Math.min(80, Math.max(0, degrees)) * Math.PI / 180);

/** Coordinates of a point in the roof frame: `u` across the ridge, `v` along it. */
export function toRoofSpace(frame: RoofFrame, x: number, y: number): { u: number; v: number } {
  const dx = x - frame.cx, dy = y - frame.cy, cos = Math.cos(frame.angle), sin = Math.sin(frame.angle);
  return { u: -dx * sin + dy * cos, v: dx * cos + dy * sin };
}

/** The height of the roof surface above the top of the walls at a point (negative under the eaves, below the wall top). */
export function roofHeight(frame: RoofFrame, roof: Roof, x: number, y: number): number {
  const { u, v } = toRoofSpace(frame, x, y), pitch = tanDeg(roof.slope), hw = frame.halfWidth, hl = frame.halfLength;
  switch (roof.style) {
    case "flat": return 0;
    case "shed": return pitch * (u + hw);
    case "gable": return pitch * (hw - Math.abs(u));
    case "hip": return pitch * Math.min(hw - Math.abs(u), hl - Math.abs(v));
    case "pyramid": { const rise = pitch * hw; return rise * Math.min(1 - Math.abs(u) / hw, 1 - Math.abs(v) / hl); }
  }
}

/** The highest point of the roof above the wall tops. */
export function roofRise(points: readonly Point[], roof: Roof): number {
  const frame = roofFrame(points, roof);
  const pitch = tanDeg(roof.slope);
  switch (roof.style) {
    case "flat": return 0;
    case "shed": return pitch * frame.halfWidth * 2;
    case "gable": case "pyramid": return pitch * frame.halfWidth;
    case "hip": return pitch * Math.min(frame.halfWidth, frame.halfLength);
  }
}

/**
 * The roof surface as flat pieces (polygons with a height at each corner). The footprint, grown by the overhang, is
 * cut into triangles and each triangle is cut again along the roof's creases (the ridge and the hips), so that every
 * piece is exactly planar.
 */
export function roofPieces(points: readonly Point[], roof: Roof): Vertex[][] {
  if (points.length < 3) return [];
  const outline = ensureCounterClockwise(points), grown = offsetPolygon(outline, roof.overhang), frame = roofFrame(outline, roof);
  const height = (p: Point) => roofHeight(frame, roof, p.x, p.y);
  const acrossU = (p: Point) => toRoofSpace(frame, p.x, p.y).u, alongV = (p: Point) => toRoofSpace(frame, p.x, p.y).v;
  const lines: Array<(p: Point) => number> = roof.style === "gable" ? [acrossU] : roof.style === "hip" || roof.style === "pyramid" ? [acrossU, alongV] : [];
  let pieces: Point[][] = triangulate(grown).map(([a, b, c]) => [grown[a], grown[b], grown[c]]);
  for (const line of lines) pieces = pieces.flatMap(piece => { const { positive, negative } = splitPolygon(piece, line); return [positive, negative].filter(part => part.length >= 3); });
  if (roof.style === "hip" || roof.style === "pyramid") {
    // Inside a quadrant the roof is the lower of two planes; they meet along a diagonal crease.
    const hw = frame.halfWidth, hl = frame.halfLength;
    pieces = pieces.flatMap(piece => {
      const middle = piece.reduce((sum, p) => ({ x: sum.x + p.x / piece.length, y: sum.y + p.y / piece.length }), { x: 0, y: 0 });
      const su = Math.sign(acrossU(middle)) || 1, sv = Math.sign(alongV(middle)) || 1;
      const crease = roof.style === "hip"
        ? (p: Point) => (su * acrossU(p) - sv * alongV(p)) - (hw - hl)
        : (p: Point) => (su * acrossU(p) / hw - sv * alongV(p) / hl);
      const { positive, negative } = splitPolygon(piece, crease);
      return [positive, negative].filter(part => part.length >= 3);
    });
  }
  // Cutting leaves repeated corners and slivers with no area; drop them so every piece is a clean polygon.
  const clean = (piece: Point[]): Point[] => piece.filter((p, index) => { const next = piece[(index + 1) % piece.length]; return Math.hypot(p.x - next.x, p.y - next.y) > 1e-7; });
  return pieces.map(clean).filter(piece => piece.length >= 3 && area(piece) > 1e-9).map(piece => piece.map(p => ({ x: p.x, y: p.y, z: height(p) })));
}

/** The height of the ground-floor walls' top edge along a footprint edge, sampled: where the walls meet the roof (gable ends). */
export function edgeRoofProfile(points: readonly Point[], roof: Roof, edge: number, samples = 24): number[] {
  const frame = roofFrame(points, roof), { a, length, ux, uy } = edgeOf(points, edge);
  return Array.from({ length: samples + 1 }, (_, index) => { const along = length * index / samples; return Math.max(0, roofHeight(frame, roof, a.x + ux * along, a.y + uy * along)); });
}

export const totalHeight = (floors: readonly number[]): number => floors.reduce((sum, height) => sum + height, 0);
/** The elevation of the bottom of a floor. */
export const floorBottom = (floors: readonly number[], floor: number): number => floors.slice(0, floor).reduce((sum, height) => sum + height, 0);

/**
 * The lines where a roof changes pitch (the ridge and the hips), as polylines on the plan, for drawing a roof plan.
 * They are worked out in the roof frame and trimmed to the roof outline, so they never run outside the building.
 */
export function roofLines(points: readonly Point[], roof: Roof): Point[][] {
  if (points.length < 3 || roof.style === "flat") return [];
  const outline = ensureCounterClockwise(points), grown = offsetPolygon(outline, roof.overhang), frame = roofFrame(outline, roof);
  const cos = Math.cos(frame.angle), sin = Math.sin(frame.angle), hw = frame.halfWidth, hl = frame.halfLength;
  const world = (u: number, v: number): Point => ({ x: frame.cx + v * cos - u * sin, y: frame.cy + v * sin + u * cos });
  const segments: Array<[Point, Point]> = [];
  const reach = hl + roof.overhang + 0.01;
  if (roof.style === "gable") segments.push([world(0, -reach), world(0, reach)]);
  else if (roof.style === "shed") segments.push([world(hw + roof.overhang - 0.03, -reach), world(hw + roof.overhang - 0.03, reach)]);
  else if (roof.style === "hip") {
    const ridge = Math.max(0, hl - hw);
    if (ridge > 1e-6) segments.push([world(0, -ridge), world(0, ridge)]);
    for (const su of [-1, 1]) for (const sv of [-1, 1]) segments.push([world(su * hw, sv * hl), world(0, sv * ridge)]);
  } else {
    for (const su of [-1, 1]) for (const sv of [-1, 1]) segments.push([world(su * hw, sv * hl), world(0, 0)]);
  }
  const lines: Point[][] = [];
  for (const [a, b] of segments) {
    const steps = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.05));
    let run: Point[] = [];
    for (let index = 0; index <= steps; index += 1) {
      const point = { x: a.x + (b.x - a.x) * index / steps, y: a.y + (b.y - a.y) * index / steps };
      if (pointInPolygon(point, grown) || pointInPolygon(point, outline)) run.push(point);
      else if (run.length) { lines.push([run[0], run[run.length - 1]]); run = []; }
    }
    if (run.length > 1) lines.push([run[0], run[run.length - 1]]);
  }
  return lines.filter(([a, b]) => Math.hypot(b.x - a.x, b.y - a.y) > 0.05);
}
