import type { Building, Dimensions, Point, Terrain } from "../../domain";
import { bounds, edgeOf, ensureCounterClockwise, floorBottom, isSimplePolygon, rectangle } from "../geometry";
import { DEFAULT_ROOF, EDGE_MARGIN, FLOOR_HEIGHT_M, clamp, nextId, round2 } from "./shared";
import type { SiteModel } from "./shared";
import { insertVertex, translatePoints } from "./vertices";
// ---- terrain ---------------------------------------------------------------------------------------------------------------

export const rectangularTerrain = (x: number, y: number, width: number, depth: number): Terrain => ({ points: rectangle(x, y, Math.max(1, width), Math.max(1, depth)).map(p => ({ x: round2(p.x), y: round2(p.y) })) });
/** The work area has to hold the terrain and every building with a margin; it only ever grows, so nothing already placed moves. */
export function fitDimensions(dimensions: Dimensions, model: Pick<SiteModel, "terrain" | "buildings">, margin = 4): Dimensions {
  const all = [...model.terrain.points, ...model.buildings.flatMap(building => building.points)];
  if (!all.length) return dimensions;
  const box = bounds(all);
  return { ...dimensions, width: Math.max(dimensions.width, Math.ceil(box.maxX + margin)), depth: Math.max(dimensions.depth, Math.ceil(box.maxY + margin)) };
}
// ---- buildings -------------------------------------------------------------------------------------------------------------

export function createBuilding(model: SiteModel, points: readonly Point[], name?: string): { model: SiteModel; id: string } {
  const id = nextId("building", model.buildings.map(building => building.id));
  const footprint = ensureCounterClockwise(points).map(point => ({ x: round2(point.x), y: round2(point.y) }));
  const building: Building = { id, name: name ?? `Building ${model.buildings.length + 1}`, points: footprint, base: 0, floors: [FLOOR_HEIGHT_M], roof: { ...DEFAULT_ROOF }, thickness: 0.25 };
  return { model: { ...model, buildings: [...model.buildings, building] }, id };
}
export function updateBuilding(model: SiteModel, id: string, update: Partial<Building>): SiteModel {
  return { ...model, buildings: model.buildings.map(building => building.id === id ? { ...building, ...update } : building) };
}
/** Keep every door, window and lamp on its wall after the wall has changed length. */
export function fitAttachments(model: SiteModel, buildingId: string): SiteModel {
  const building = model.buildings.find(item => item.id === buildingId);
  if (!building) return model;
  const length = (edge: number) => edge < building.points.length ? edgeOf(building.points, edge).length : 0;
  return {
    ...model,
    openings: model.openings.map(opening => {
      if (opening.buildingId !== buildingId) return opening;
      const room = Math.max(0.2, length(opening.edge) - 2 * EDGE_MARGIN), width = Math.min(opening.width, room);
      return { ...opening, width: round2(width), offset: round2(clamp(opening.offset, EDGE_MARGIN, Math.max(EDGE_MARGIN, length(opening.edge) - width - EDGE_MARGIN))) };
    }),
    wallLamps: model.wallLamps.map(lamp => lamp.buildingId === buildingId ? { ...lamp, offset: round2(clamp(lamp.offset, 0, length(lamp.edge))) } : lamp),
  };
}
/** Change a building's outline (moving, adding or removing corners); openings and lamps follow their walls. */
export function setFootprint(model: SiteModel, buildingId: string, points: readonly Point[]): SiteModel {
  return fitAttachments(updateBuilding(model, buildingId, { points: [...points] }), buildingId);
}
/** Add a corner on a wall of a building: the wall is cut in two and each door, window or lamp stays on the half it was on. */
export function insertBuildingVertex(model: SiteModel, buildingId: string, edge: number, at?: Point): { model: SiteModel; index: number } {
  const building = model.buildings.find(item => item.id === buildingId);
  if (!building) return { model, index: 0 };
  const { length: firstLength } = edgeOf(building.points, edge);
  const inserted = insertVertex(building.points, edge, at);
  const cut = at ? Math.hypot(at.x - building.points[edge].x, at.y - building.points[edge].y) : firstLength / 2;
  const move = <T extends { buildingId: string; edge: number; offset: number }>(item: T, width = 0): T => {
    if (item.buildingId !== buildingId || item.edge < edge) return item;
    if (item.edge > edge) return { ...item, edge: item.edge + 1 };
    return item.offset + width / 2 <= cut ? item : { ...item, edge: edge + 1, offset: round2(item.offset - cut) };
  };
  const next: SiteModel = { ...model, openings: model.openings.map(item => move(item, item.width)), wallLamps: model.wallLamps.map(item => move(item)) };
  return { model: fitAttachments(updateBuilding(next, buildingId, { points: inserted.points }), buildingId), index: inserted.index };
}
/** Remove a corner (a building keeps at least three); the two walls that met there become one. */
export function removeBuildingVertex(model: SiteModel, buildingId: string, index: number): SiteModel {
  const building = model.buildings.find(item => item.id === buildingId);
  if (!building || building.points.length <= 3) return model;
  const count = building.points.length, before = (index - 1 + count) % count, beforeLength = edgeOf(building.points, before).length;
  const points = building.points.filter((_, position) => position !== index);
  if (!isSimplePolygon(points)) return model;
  const remap = <T extends { buildingId: string; edge: number; offset: number }>(item: T): T => {
    if (item.buildingId !== buildingId) return item;
    if (item.edge === index) return { ...item, edge: before < index ? before : before - 1, offset: round2(item.offset + beforeLength) };
    return item.edge > index ? { ...item, edge: item.edge - 1 } : item;
  };
  const next: SiteModel = { ...model, openings: model.openings.map(remap), wallLamps: model.wallLamps.map(remap) };
  return setFootprint(next, buildingId, points);
}
export function deleteBuilding(model: SiteModel, id: string): SiteModel {
  return {
    ...model, buildings: model.buildings.filter(building => building.id !== id).map(building => building.mergedWith?.includes(id) ? { ...building, mergedWith: building.mergedWith.filter(other => other !== id).length ? building.mergedWith.filter(other => other !== id) : undefined } : building), openings: model.openings.filter(item => item.buildingId !== id),
    roofItems: model.roofItems.filter(item => item.buildingId !== id), wallLamps: model.wallLamps.filter(item => item.buildingId !== id),
  };
}
/** A copy of a building shifted aside, with its own doors, windows, roof items and lamps. */
export function duplicateBuilding(model: SiteModel, id: string, dx = 3, dy = 3): { model: SiteModel; id: string } | null {
  const source = model.buildings.find(building => building.id === id);
  if (!source) return null;
  const newId = nextId("building", model.buildings.map(building => building.id));
  const copy: Building = { ...source, mergedWith: undefined, id: newId, name: `${source.name} copy`, points: translatePoints(source.points, dx, dy), floors: [...source.floors], roof: { ...source.roof }, ...(source.floorMaterials ? { floorMaterials: [...source.floorMaterials] } : {}), ...(source.floorColors ? { floorColors: [...source.floorColors] } : {}) };
  const taken = new Set([...model.openings.map(item => item.id), ...model.roofItems.map(item => item.id), ...model.wallLamps.map(item => item.id)]);
  const fresh = (prefix: string) => { const created = nextId(prefix, taken); taken.add(created); return created; };
  const openings = model.openings.filter(item => item.buildingId === id).map(item => ({ ...item, id: fresh(item.kind), buildingId: newId }));
  const roofItems = model.roofItems.filter(item => item.buildingId === id).map(item => ({ ...item, id: fresh(item.kind), buildingId: newId, x: round2(item.x + dx), y: round2(item.y + dy) }));
  const wallLamps = model.wallLamps.filter(item => item.buildingId === id).map(item => ({ ...item, id: fresh("wall-lamp"), buildingId: newId }));
  return { model: { ...model, buildings: [...model.buildings, copy], openings: [...model.openings, ...openings], roofItems: [...model.roofItems, ...roofItems], wallLamps: [...model.wallLamps, ...wallLamps] }, id: newId };
}
// ---- floors -----------------------------------------------------------------------------------------------------------------

export function addFloor(model: SiteModel, buildingId: string, height?: number): SiteModel {
  const building = model.buildings.find(item => item.id === buildingId);
  if (!building || building.floors.length >= 30) return model;
  return updateBuilding(model, buildingId, { floors: [...building.floors, height ?? building.floors[building.floors.length - 1] ?? FLOOR_HEIGHT_M] });
}
/** Remove one floor (a building keeps at least one); its doors and windows go with it and the floors above come down. */
export function removeFloor(model: SiteModel, buildingId: string, floor: number): SiteModel {
  const building = model.buildings.find(item => item.id === buildingId);
  if (!building || building.floors.length <= 1 || floor < 0 || floor >= building.floors.length) return model;
  const openings = model.openings.filter(item => !(item.buildingId === buildingId && item.floor === floor)).map(item => item.buildingId === buildingId && item.floor > floor ? { ...item, floor: item.floor - 1 } : item);
  const wallLamps = model.wallLamps.map(item => { if (item.buildingId !== buildingId) return item; const drop = building.floors[floor]; return item.z > floorBottom(building.floors, floor) ? { ...item, z: round2(Math.max(0, item.z - drop)) } : item; });
  const without = <T,>(list: T[] | undefined): T[] | undefined => (list ? list.filter((_, index) => index !== floor) : undefined);   // the finishes of the floors above come down with them
  return { ...updateBuilding(model, buildingId, { floors: building.floors.filter((_, index) => index !== floor), floorMaterials: without(building.floorMaterials), floorColors: without(building.floorColors) }), openings, wallLamps };
}
