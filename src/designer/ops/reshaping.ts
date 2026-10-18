import type { Building, Dimensions, Point } from "../../domain";
import { area, centroid, edgeOf, isSimplePolygon, signedArea } from "../geometry";
import { toMetres, toPercent } from "../model";
import { setFootprint, updateBuilding } from "./buildings";
import { round2 } from "./shared";
import type { SiteModel } from "./shared";
import { moveVertex, rotatePoints, translatePoints } from "./vertices";
export const buildingArea = (building: Building): number => round2(area(building.points));
export const buildingCentre = (building: Building): Point => centroid(building.points);
// ---- shape edits from the inspector ---------------------------------------------------------------------------------------------

/** Whether a footprint is a rectangle (four corners at right angles), turned any way. */
export function isRectangle(points: readonly Point[]): boolean {
  if (points.length !== 4) return false;
  return [0, 1, 2, 3].every(index => { const a = edgeOf(points, index), b = edgeOf(points, (index + 1) % 4); return Math.abs(a.ux * b.ux + a.uy * b.uy) < 1e-3; });
}
/** Give a rectangle new side lengths, keeping its first corner and its direction (the sides stay at right angles). */
export function resizeRectangle(points: readonly Point[], along: number, across: number): Point[] {
  if (!isRectangle(points)) return [...points];
  const first = edgeOf(points, 0), second = edgeOf(points, 1), a = Math.max(0.3, along), b = Math.max(0.3, across), p0 = points[0];
  const p1 = { x: p0.x + first.ux * a, y: p0.y + first.uy * a }, p2 = { x: p1.x + second.ux * b, y: p1.y + second.uy * b }, p3 = { x: p0.x + second.ux * b, y: p0.y + second.uy * b };
  return [p0, p1, p2, p3].map(point => ({ x: round2(point.x), y: round2(point.y) }));
}
/** Change the length of one side of an outline by moving its far corner along the side; refused if the outline would cross itself. */
export function setSideLength(points: readonly Point[], edge: number, length: number): Point[] {
  const { a, ux, uy } = edgeOf(points, edge), next = (edge + 1) % points.length;
  return moveVertex(points, next, { x: a.x + ux * Math.max(0.1, length), y: a.y + uy * Math.max(0.1, length) });
}
/**
 * Move one side of an outline outward (positive) or inward (negative) by `distance`, as a wall is pushed: both its corners slide along the neighbouring sides, so a rectangle stays a
 * rectangle with its right angles and the opposite wall does not move. Refused (the outline is kept) if the outline would cross itself or the side would vanish.
 */
export function moveEdge(points: readonly Point[], edge: number, distance: number): Point[] {
  if (points.length < 3 || edge < 0 || edge >= points.length || !Number.isFinite(distance) || Math.abs(distance) < 1e-9) return [...points];
  const n = points.length, i = edge, j = (edge + 1) % n, side = edgeOf(points, edge), prev = edgeOf(points, (i + n - 1) % n), next = edgeOf(points, j);
  // where the pushed wall's line meets the line of each neighbouring side: the corner slides along that side (a rectangle's neighbours are perpendicular, so it slides straight)
  const line = { x: side.a.x + side.nx * distance, y: side.a.y + side.ny * distance };
  const meet = (neighbour: ReturnType<typeof edgeOf>, from: Point): Point | null => {
    const denominator = neighbour.ux * side.uy - neighbour.uy * side.ux;
    if (Math.abs(denominator) < 1e-6) return { x: from.x + side.nx * distance, y: from.y + side.ny * distance };   // parallel neighbour: the corner just moves with the wall
    const t = ((line.x - from.x) * side.uy - (line.y - from.y) * side.ux) / denominator;
    return { x: from.x + neighbour.ux * t, y: from.y + neighbour.uy * t };
  };
  const a = meet(prev, prev.a), b = meet(next, next.a);
  if (!a || !b) return [...points];
  const moved = points.map((point, index) => index === i ? { x: round2(a.x), y: round2(a.y) } : index === j ? { x: round2(b.x), y: round2(b.y) } : point);
  if (!isSimplePolygon(moved) || signedArea(moved) * signedArea(points) <= 0) return [...points];   // crossing itself, or turned inside out by a wall pushed past the opposite one
  // the wall must not turn round or collapse
  const after = edgeOf(moved, edge);
  return after.length < 0.1 || after.ux * side.ux + after.uy * side.uy < 0.5 ? [...points] : moved;
}
/** Keep every door, window and lamp where it stood in the world when the corners of a building have moved (not where its old offset would now put it). */
function keepAttachmentsInPlace(model: SiteModel, buildingId: string, before: readonly Point[], after: readonly Point[]): SiteModel {
  const place = (edge: number, offset: number): number => {
    if (edge >= before.length || edge >= after.length) return offset;
    const old = edgeOf(before, edge), now = edgeOf(after, edge);
    const x = old.a.x + old.ux * offset, y = old.a.y + old.uy * offset;
    return round2((x - now.a.x) * now.ux + (y - now.a.y) * now.uy);
  };
  return {
    ...model,
    openings: model.openings.map(opening => opening.buildingId === buildingId ? { ...opening, offset: place(opening.edge, opening.offset) } : opening),
    wallLamps: model.wallLamps.map(lamp => lamp.buildingId === buildingId ? { ...lamp, offset: place(lamp.edge, lamp.offset) } : lamp),
  };
}
/** Push one wall of a building outward (positive) or inward (negative): see `moveEdge`. What is on the walls stays where it was. */
export function moveSide(model: SiteModel, buildingId: string, edge: number, distance: number): SiteModel {
  const building = model.buildings.find(item => item.id === buildingId);
  if (!building) return model;
  const points = moveEdge(building.points, edge, distance);
  if (points.every((point, index) => point.x === building.points[index].x && point.y === building.points[index].y)) return model;
  return setFootprint(keepAttachmentsInPlace(model, buildingId, building.points, points), buildingId, points);
}
/** The sides of an object that has a width and a depth: its own east and west (along its width) and north and south (along its depth), before it is turned. */
export type FeatureSide = "east" | "west" | "north" | "south";
export const MIN_FEATURE_SIDE_M = 0.1;
/**
 * Pull one side of a rectangular object (a pool, a terrace, a shed...) to `point` (in the site's metres) while the opposite side stays where it is: the width or the depth changes and the
 * centre moves half of that. The object may be turned: the point is read in its own axes. The side never goes past the opposite one.
 */
export function resizeFeatureSide(model: SiteModel, id: string, side: FeatureSide, point: Point): SiteModel {
  const feature = model.features.find(item => item.id === id);
  if (!feature) return model;
  const angle = feature.rotation * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
  const dx = point.x - feature.x, dy = point.y - feature.y;
  const u = dx * cos + dy * sin, v = -dx * sin + dy * cos;   // the point in the object's own axes
  let width = feature.width, depth = feature.depth, shiftU = 0, shiftV = 0;
  if (side === "east" || side === "west") {
    const fixed = side === "east" ? -feature.width / 2 : feature.width / 2;
    const moved = side === "east" ? Math.max(u, fixed + MIN_FEATURE_SIDE_M) : Math.min(u, fixed - MIN_FEATURE_SIDE_M);
    width = Math.abs(moved - fixed);
    shiftU = (moved + fixed) / 2;
  } else {
    const fixed = side === "north" ? -feature.depth / 2 : feature.depth / 2;
    const moved = side === "north" ? Math.max(v, fixed + MIN_FEATURE_SIDE_M) : Math.min(v, fixed - MIN_FEATURE_SIDE_M);
    depth = Math.abs(moved - fixed);
    shiftV = (moved + fixed) / 2;
  }
  return {
    ...model,
    features: model.features.map(item => item.id === id
      ? { ...item, width: round2(width), depth: round2(depth), x: round2(item.x + shiftU * cos - shiftV * sin), y: round2(item.y + shiftU * sin + shiftV * cos) }
      : item),
  };
}
/** Move a building with everything standing on its roof. */
export function moveBuilding(model: SiteModel, id: string, dx: number, dy: number): SiteModel {
  const building = model.buildings.find(item => item.id === id);
  if (!building) return model;
  return {
    ...updateBuilding(model, id, { points: translatePoints(building.points, dx, dy) }),
    roofItems: model.roofItems.map(item => item.buildingId === id ? { ...item, x: round2(item.x + dx), y: round2(item.y + dy) } : item),
  };
}
/** Turn a building (and what stands on its roof) about its centre. */
export function rotateBuilding(model: SiteModel, id: string, degrees: number): SiteModel {
  const building = model.buildings.find(item => item.id === id);
  if (!building) return model;
  const about = centroid(building.points), cos = Math.cos(degrees * Math.PI / 180), sin = Math.sin(degrees * Math.PI / 180);
  return {
    ...updateBuilding(model, id, { points: rotatePoints(building.points, about, degrees) }),
    roofItems: model.roofItems.map(item => item.buildingId === id
      ? { ...item, x: round2(about.x + (item.x - about.x) * cos - (item.y - about.y) * sin), y: round2(about.y + (item.x - about.x) * sin + (item.y - about.y) * cos), rotation: round2(item.rotation + degrees) }
      : item),
  };
}
/** When the work area changes, cameras and radars keep the place they have on the ground (they are stored as percentages of it). */
export function rescaleDevices(model: SiteModel, from: Dimensions, to: Dimensions): SiteModel {
  if (from.width === to.width && from.depth === to.depth) return model;
  const move = <T extends { x: number; y: number }>(item: T): T => ({ ...item, ...toPercent(toMetres(item, from), to) });
  return { ...model, cameras: model.cameras.map(move), sensors: model.sensors.map(move) };
}
