import type { Point } from "../../domain";
import { edgeOf, isSimplePolygon } from "../geometry";
import { round2 } from "./shared";
// ---- outlines (terrain and building footprints) ------------------------------------------------------------------------

/** Move one corner; the outline is kept as it was if the result would cross itself. */
export function moveVertex(points: readonly Point[], index: number, to: Point): Point[] {
  const next = points.map((point, position) => position === index ? { x: round2(to.x), y: round2(to.y) } : point);
  return isSimplePolygon(next) ? next : [...points];
}
export function translatePoints(points: readonly Point[], dx: number, dy: number): Point[] { return points.map(point => ({ x: round2(point.x + dx), y: round2(point.y + dy) })); }
export function rotatePoints(points: readonly Point[], about: Point, degrees: number): Point[] {
  const cos = Math.cos(degrees * Math.PI / 180), sin = Math.sin(degrees * Math.PI / 180);
  return points.map(point => ({ x: round2(about.x + (point.x - about.x) * cos - (point.y - about.y) * sin), y: round2(about.y + (point.x - about.x) * sin + (point.y - about.y) * cos) }));
}
/** Add a corner in the middle of a side (or wherever on it `at` lies); returns the new outline and the index of the new corner. */
export function insertVertex(points: readonly Point[], edge: number, at?: Point): { points: Point[]; index: number } {
  const { a, b } = edgeOf(points, edge);
  const point = at ?? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const next = [...points.slice(0, edge + 1), { x: round2(point.x), y: round2(point.y) }, ...points.slice(edge + 1)];
  return { points: next, index: edge + 1 };
}
