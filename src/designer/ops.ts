/**
 * Site designer operations: every edit the designer makes, as a pure function from one model to the next.
 * The editor only decides which one to call; keeping them here makes them testable and the undo history simple.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Building, Camera, DevicePlacement, Dimensions, Opening, Point, Roof, RoofItem, RoofItemKind, Sensor, SiteFeature, SiteFeatureKind, Terrain, WallLamp, MastPart } from "../domain";
import { area, bounds, centroid, signedArea, edgeOf, ensureCounterClockwise, nearestOnOutline, floorBottom, isSimplePolygon, pointInPolygon, rectangle, roofFrame, roofHeight, totalHeight } from "./geometry";
import { toMetres, toPercent, type Selection } from "./model";

export type SiteModel = {
  terrain: Terrain; buildings: Building[]; openings: Opening[]; roofItems: RoofItem[]; wallLamps: WallLamp[]; features: SiteFeature[];
  cameras: Camera[]; sensors: Sensor[]; placements: DevicePlacement[];
};

export const round2 = (value: number): number => Number(value.toFixed(2));
export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
export const DEFAULT_ROOF: Roof = { style: "gable", slope: 30, overhang: 0.4, ridge: 0 };
export const FLOOR_HEIGHT_M = 2.8;
const EDGE_MARGIN = 0.1;

/** The first free id of the form `prefix-01`, `prefix-02`, ... */
export function nextId(prefix: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  for (let index = 1; index < 100000; index += 1) { const id = `${prefix}-${String(index).padStart(2, "0")}`; if (!used.has(id)) return id; }
  return `${prefix}-${Date.now()}`;
}

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

// ---- doors, windows, lamps ------------------------------------------------------------------------------------------------

const OPENING_DEFAULTS = { door: { width: 0.9, height: 2.1, sill: 0 }, window: { width: 1.2, height: 1.2, sill: 0.9 }, garage: { width: 2.6, height: 2.2, sill: 0 }, opening: { width: 1.4, height: 2.3, sill: 0 } } as const;

/** A door or window on a wall of one floor, centred at `along` metres from the start of the wall; it is kept inside the wall. */
export function addOpening(model: SiteModel, buildingId: string, edge: number, floor: number, kind: Opening["kind"], along?: number, extra: Pick<Opening, "arch" | "balcony"> = {}): { model: SiteModel; id: string } | null {
  const building = model.buildings.find(item => item.id === buildingId);
  if (!building || edge < 0 || edge >= building.points.length || floor < 0 || floor >= building.floors.length) return null;
  const { length } = edgeOf(building.points, edge), defaults = OPENING_DEFAULTS[kind];
  const width = Math.min(defaults.width, Math.max(0.3, length - 2 * EDGE_MARGIN)), height = Math.min(defaults.height, Math.max(0.3, building.floors[floor] - defaults.sill - 0.1));
  const centre = along ?? length / 2, offset = clamp(centre - width / 2, EDGE_MARGIN, Math.max(EDGE_MARGIN, length - width - EDGE_MARGIN));
  const id = nextId(kind, model.openings.map(item => item.id));
  return { model: { ...model, openings: [...model.openings, { id, buildingId, edge, floor, kind, offset: round2(offset), width: round2(width), height: round2(height), sill: defaults.sill, ...extra }] }, id };
}

export function addWallLamp(model: SiteModel, buildingId: string, edge: number, along: number, z?: number): { model: SiteModel; id: string } | null {
  const building = model.buildings.find(item => item.id === buildingId);
  if (!building || edge < 0 || edge >= building.points.length) return null;
  const { length } = edgeOf(building.points, edge), id = nextId("wall-lamp", model.wallLamps.map(item => item.id));
  return { model: { ...model, wallLamps: [...model.wallLamps, { id, buildingId, edge, offset: round2(clamp(along, 0, length)), z: round2(z ?? Math.min(2.4, totalHeight(building.floors) - 0.3)), reach: 0.4 }] }, id };
}

// ---- roof items --------------------------------------------------------------------------------------------------------------

const ROOF_ITEM_DEFAULTS: Record<RoofItemKind, { width: number; depth: number; height: number }> = {
  chimney: { width: 0.6, depth: 0.6, height: 1.2 }, solar: { width: 1.7, depth: 1, height: 0.06 }, antenna: { width: 0.1, depth: 0.1, height: 3 }, vent: { width: 0.4, depth: 0.4, height: 0.4 },
  gutter: { width: 4, depth: 0.14, height: 0.1 }, downpipe: { width: 0.09, depth: 0.09, height: 3 },
};

/** The height above the ground of the roof surface at a point of a building. */
export function roofSurfaceZ(building: Building, x: number, y: number): number {
  return building.base + totalHeight(building.floors) + roofHeight(roofFrame(building.points, building.roof), building.roof, x, y);
}

/** Put something on a roof: `x`,`y` is where; nothing is placed outside the roof (the footprint grown by the overhang). */
export function addRoofItem(model: SiteModel, buildingId: string, kind: RoofItemKind, x: number, y: number): { model: SiteModel; id: string } | null {
  const building = model.buildings.find(item => item.id === buildingId);
  if (!building || !pointInPolygon({ x, y }, building.points)) return null;
  const id = nextId(kind, model.roofItems.map(item => item.id));
  let item: RoofItem = { id, buildingId, kind, x: round2(x), y: round2(y), ...ROOF_ITEM_DEFAULTS[kind], rotation: 0, tilt: 0 };
  if (kind === "gutter" || kind === "downpipe") {
    // A gutter and a downpipe belong to the eaves: they go to the nearest edge of the roof, the gutter lying along it and the downpipe running down the wall from it.
    const near = nearestOnOutline(building.points, { x, y }), edge = edgeOf(building.points, near.edge);
    const width = kind === "gutter" ? Math.min(ROOF_ITEM_DEFAULTS.gutter.width, edge.length) : ROOF_ITEM_DEFAULTS.downpipe.width;
    // The normal of an edge points out of the house: a gutter sits at the edge of the roof (beyond the wall by half its thickness and the overhang), a downpipe against the wall.
    const along = Math.min(edge.length - width / 2, Math.max(width / 2, near.along));
    const out = kind === "gutter" ? building.thickness / 2 + Math.max(0.1, building.roof.overhang) - 0.04 : building.thickness / 2 + width / 2 + 0.02;
    item = {
      ...item, x: round2(edge.a.x + edge.ux * along + edge.nx * out), y: round2(edge.a.y + edge.uy * along + edge.ny * out), width,
      ...(kind === "gutter" ? { rotation: round2(((Math.atan2(edge.uy, edge.ux) * 180 / Math.PI) % 180 + 180) % 180) } : { height: Math.max(1, round2(totalHeight(building.floors))) }),
    };
  }
  return { model: { ...model, roofItems: [...model.roofItems, item] }, id };
}

/** The building whose footprint contains a point (the tallest wins when they overlap). */
export function buildingAt(model: SiteModel, point: Point): Building | undefined {
  return model.buildings.filter(building => pointInPolygon(point, building.points)).sort((a, b) => totalHeight(b.floors) - totalHeight(a.floors))[0];
}

// ---- ground objects ------------------------------------------------------------------------------------------------------------

export const FEATURE_DEFAULTS: Record<SiteFeatureKind, Omit<SiteFeature, "id" | "kind" | "x" | "y" | "z">> = {
  pillar: { width: 0.4, depth: 0.4, height: 2.4, rotation: 0, slope: 0 },
  lamp: { width: 0.12, depth: 0.12, height: 5, rotation: 0, slope: 0 },
  mast: { width: 0.25, depth: 0.25, height: 9, rotation: 0, slope: 0 },
  solar: { width: 1.8, depth: 1.1, height: 0.12, rotation: 0, slope: 25 },
  canopy: { width: 3, depth: 2, height: 2.4, rotation: 0, slope: 8 },
  entrance: { width: 2.2, depth: 1.4, height: 0.45, rotation: 0, slope: 0 },
  path: { width: 1.6, depth: 6, height: 0.04, rotation: 0, slope: 0 },
  road: { width: 4, depth: 10, height: 0.03, rotation: 0, slope: 0 },
  tree: { width: 3, depth: 3, height: 5, rotation: 0, slope: 0, style: "oak" },
  kennel: { width: 1, depth: 1.2, height: 0.95, rotation: 0, slope: 0 },
  fence: { width: 4, depth: 0.08, height: 1.2, rotation: 0, slope: 0, style: "mesh" },
  fountain: { width: 2.4, depth: 2.4, height: 1.6, rotation: 0, slope: 0 },
  coop: { width: 1.8, depth: 1.2, height: 1.4, rotation: 0, slope: 0 },
  gate: { width: 4.2, depth: 0.6, height: 2.4, rotation: 0, slope: 0, style: "iron" },
  sidewalk: { width: 4, depth: 1.2, height: 0.08, rotation: 0, slope: 0, style: "concrete" },
  pool: { width: 6, depth: 3, height: 0.3, rotation: 0, slope: 0, style: "rectangle" },
  planter: { width: 1.2, depth: 0.5, height: 0.6, rotation: 0, slope: 0, style: "box" },
  terrace: { width: 3, depth: 2.5, height: 0.2, rotation: 0, slope: 0, style: "railed" },
  bench: { width: 1.6, depth: 0.5, height: 0.85, rotation: 0, slope: 0 },
  table: { width: 2.2, depth: 1.6, height: 0.9, rotation: 0, slope: 0 },
  barbecue: { width: 1.2, depth: 0.6, height: 1.0, rotation: 0, slope: 0 },
  pergola: { width: 3.5, depth: 3, height: 2.6, rotation: 0, slope: 0 },
  shed: { width: 2.4, depth: 1.8, height: 2.2, rotation: 0, slope: 0 },
  hedge: { width: 4, depth: 0.7, height: 1.3, rotation: 0, slope: 0 },
  mailbox: { width: 0.4, depth: 0.35, height: 1.3, rotation: 0, slope: 0 },
  bins: { width: 1.5, depth: 0.7, height: 1.1, rotation: 0, slope: 0 },
  tank: { width: 1.4, depth: 1.4, height: 1.9, rotation: 0, slope: 0 },
  "ac-unit": { width: 0.9, depth: 0.4, height: 0.7, rotation: 0, slope: 0 },
  "electrical-box": { width: 0.7, depth: 0.3, height: 1.0, rotation: 0, slope: 0 },
  car: { width: 4.4, depth: 1.9, height: 1.5, rotation: 0, slope: 0 },
  floor: { width: 4, depth: 3, height: 0.03, rotation: 0, slope: 0, style: "flParquet" },
  wall: { width: 3, depth: 0.12, height: 2.6, rotation: 0, slope: 0, style: "wSolid" },
  fireplace: { width: 1.2, depth: 0.6, height: 2.6, rotation: 0, slope: 0, style: "fWall" },
  stairs: { width: 1, depth: 3, height: 2.8, rotation: 0, slope: 0 },
  kitchen: { width: 3, depth: 0.65, height: 0.9, rotation: 0, slope: 0, style: "kStraight" },
  bathroom: { width: 1.7, depth: 0.75, height: 0.6, rotation: 0, slope: 0, style: "baBath" },
  bed: { width: 1.6, depth: 2, height: 0.55, rotation: 0, slope: 0, style: "bDouble" },
  wardrobe: { width: 1.8, depth: 0.6, height: 2.2, rotation: 0, slope: 0 },
  sofa: { width: 2.1, depth: 0.9, height: 0.85, rotation: 0, slope: 0, style: "sStraight" },
  armchair: { width: 0.9, depth: 0.9, height: 0.85, rotation: 0, slope: 0 },
  dining: { width: 1.8, depth: 0.9, height: 0.75, rotation: 0, slope: 0 },
  tv: { width: 1.2, depth: 0.4, height: 0.7, rotation: 0, slope: 0, style: "tWall" },
};

export function addFeature(model: SiteModel, kind: SiteFeatureKind, x: number, y: number, z = 0): { model: SiteModel; id: string } {
  const id = nextId(kind, model.features.map(item => item.id));
  return { model: { ...model, features: [...model.features, { id, kind, x: round2(x), y: round2(y), z, ...FEATURE_DEFAULTS[kind] }] }, id };
}

/** A strip (a fence, a sidewalk) between two points: a feature as long as the gap, lying along it. */
export function addStrip(model: SiteModel, kind: "fence" | "sidewalk", from: Point, to: Point): { model: SiteModel; id: string } | null {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length < 0.3) return null;
  const id = nextId(kind, model.features.map(item => item.id));
  const feature: SiteFeature = { id, kind, x: round2((from.x + to.x) / 2), y: round2((from.y + to.y) / 2), z: 0, ...FEATURE_DEFAULTS[kind], width: round2(length), rotation: round2(Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI) };
  return { model: { ...model, features: [...model.features, feature] }, id };
}
export const addFence = (model: SiteModel, from: Point, to: Point) => addStrip(model, "fence", from, to);

/**
 * A sidewalk all the way round a building: one strip along each wall, `width` wide, set just outside the wall. A strip runs on past a
 * convex corner by its own width so the corners are filled; the strips share a group, so they move and go together.
 */
export function addSidewalkRing(model: SiteModel, buildingId: string, width = 1.2, gap = 0.1): { model: SiteModel; ids: string[] } | null {
  const building = model.buildings.find(item => item.id === buildingId);
  if (!building) return null;
  const points = building.points, count = points.length, group = nextId("walk", model.features.map(item => item.group ?? ""));
  const near = building.thickness / 2 + gap, ids: string[] = [], taken = model.features.map(item => item.id), features: SiteFeature[] = [];
  const convex = (index: number): boolean => {
    const before = edgeOf(points, (index - 1 + count) % count), after = edgeOf(points, index);
    return before.ux * after.uy - before.uy * after.ux > 0;
  };
  for (let index = 0; index < count; index += 1) {
    const { a, length, ux, uy, nx, ny } = edgeOf(points, index);
    const start = convex(index) ? width + near : 0, end = convex((index + 1) % count) ? width + near : 0;
    const total = length + start + end, along = (end - start) / 2 + length / 2, across = near + width / 2;
    const id = nextId("sidewalk", [...taken, ...ids]);
    ids.push(id);
    features.push({ id, kind: "sidewalk", x: round2(a.x + ux * along + nx * across), y: round2(a.y + uy * along + ny * across), z: building.base, ...FEATURE_DEFAULTS.sidewalk, width: round2(total), depth: width, rotation: round2(Math.atan2(uy, ux) * 180 / Math.PI), group });
  }
  return { model: { ...model, features: [...model.features, ...features] }, ids };
}

/** Turn what is selected about one axis by `degrees`: `yaw` (vertical), `pitch` (east-west axis) or `roll` (north-south axis). */
export function turnSelected(model: SiteModel, selection: Selection, axis: "yaw" | "pitch" | "roll", degrees: number): SiteModel {
  const wrap = (value: number) => round2(((value + 540) % 360) - 180);
  switch (selection.kind) {
    case "feature": return { ...model, features: model.features.map(item => item.id !== selection.id ? item : axis === "yaw" ? { ...item, rotation: wrap(item.rotation + degrees) } : axis === "pitch" ? { ...item, pitch: wrap((item.pitch ?? 0) + degrees) } : { ...item, roll: wrap((item.roll ?? 0) + degrees) }) };
    case "device": return { ...model, placements: model.placements.map(item => item.device_id !== selection.id ? item : axis === "yaw" ? { ...item, rotation: wrap(item.rotation + degrees) } : axis === "pitch" ? { ...item, pitch: wrap((item.pitch ?? 0) + degrees) } : { ...item, roll: wrap((item.roll ?? 0) + degrees) }) };
    case "roofItem": return axis === "yaw" ? { ...model, roofItems: model.roofItems.map(item => item.id === selection.id ? { ...item, rotation: wrap(item.rotation + degrees) } : item) } : model;
    case "building": return axis === "yaw" ? rotateBuilding(model, selection.id, degrees) : model;
    case "camera": return axis === "yaw" ? { ...model, cameras: model.cameras.map(item => item.id === selection.id ? { ...item, heading: (((item.heading ?? 0) + degrees) % 360 + 360) % 360 } : item) } : axis === "pitch" ? { ...model, cameras: model.cameras.map(item => item.id === selection.id ? { ...item, tilt: clamp((item.tilt ?? 0) - degrees, -90, 90) } : item) } : model;
    case "sensor": return axis === "yaw" ? { ...model, sensors: model.sensors.map(item => item.id === selection.id ? { ...item, heading: (((item.heading ?? 0) + degrees) % 360 + 360) % 360 } : item) } : axis === "pitch" ? { ...model, sensors: model.sensors.map(item => item.id === selection.id ? { ...item, tilt: clamp((item.tilt ?? 0) - degrees, -90, 90) } : item) } : model;
    default: return model;
  }
}

/** Whether the selection can be turned about that axis. */
export function canTurnAbout(selection: Selection, axis: "yaw" | "pitch" | "roll"): boolean {
  switch (selection.kind) {
    case "feature": case "device": return true;
    case "camera": case "sensor": return axis !== "roll";
    case "roofItem": case "building": return axis === "yaw";
    default: return false;
  }
}

/** How high, in metres, each kind of device is usually fixed: a smoke detector on the ceiling, a plug near the floor, a door contact on the frame. */
export const DEVICE_HEIGHT: Record<string, number> = {
  smoke: 2.6, co: 1.6, gas: 0.3, water_leak: 0.05, panic_button: 1.2, door: 1.0, window: 1.3, motion: 2.2, glass_break: 2.0, vibration: 1.0, climate: 1.4, temperature: 1.4, humidity: 1.4, light_level: 2.0,
  smart_plug: 0.35, smart_light: 2.4, smart_switch: 1.2, siren: 2.5, lock: 1.05, valve: 0.6,
};

/** Put a device (or move it) in the design. */
export function placeDevice(model: SiteModel, deviceId: string, at: Point, z: number): SiteModel {
  const placement: DevicePlacement = { device_id: deviceId, x: round2(at.x), y: round2(at.y), z: round2(z), rotation: 0 };
  const exists = model.placements.some(item => item.device_id === deviceId);
  return { ...model, placements: exists ? model.placements.map(item => item.device_id === deviceId ? { ...item, x: placement.x, y: placement.y, z: placement.z } : item) : [...model.placements, placement] };
}

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

/** Remove what is selected. Cameras belong to the server's configuration and are not removed here. */
export function removeSelected(model: SiteModel, selection: Selection): SiteModel {
  switch (selection.kind) {
    case "building":
      if (selection.vertex !== undefined) return removeBuildingVertex(model, selection.id, selection.vertex);
      return deleteBuilding(model, selection.id);
    case "terrain": {
      if (selection.vertex === undefined || model.terrain.points.length <= 3) return model;
      const points = model.terrain.points.filter((_, index) => index !== selection.vertex);
      return isSimplePolygon(points) ? { ...model, terrain: { points } } : model;
    }
    case "opening": return { ...model, openings: model.openings.filter(item => item.id !== selection.id) };
    case "roofItem": return { ...model, roofItems: model.roofItems.filter(item => item.id !== selection.id) };
    case "wallLamp": return { ...model, wallLamps: model.wallLamps.filter(item => item.id !== selection.id) };
    case "feature": {
      const chosen = model.features.find(item => item.id === selection.id);
      // The strips of one sidewalk go together.
      return { ...model, features: model.features.filter(item => chosen?.group ? item.group !== chosen.group : item.id !== selection.id) };
    }
    case "sensor": return { ...model, sensors: model.sensors.filter(item => item.id !== selection.id) };
    case "device": return { ...model, placements: model.placements.filter(item => item.device_id !== selection.id) };
    default: return model;
  }
}

// ---- what a mast carries -------------------------------------------------------------------------------------------------------------

export const MAST_PART_DEFAULTS: Record<MastPart["kind"], Omit<MastPart, "kind">> = {
  tv: { z: 0.9, rotation: 0, size: 1.0 }, satellite: { z: 0.7, rotation: 0, size: 0.8 }, wifi: { z: 0.5, rotation: 0, size: 0.4 },
};
const MAX_MAST_PARTS = 12;

/** A television antenna, a satellite dish or a Wi-Fi dish on a mast, near its top and a bit below the one put on before it. */
export function addMastPart(model: SiteModel, mastId: string, kind: MastPart["kind"]): SiteModel {
  return { ...model, features: model.features.map(item => {
    if (item.id !== mastId || item.kind !== "mast") return item;
    const parts = item.parts ?? [];
    if (parts.length >= MAX_MAST_PARTS) return item;
    const lowest = parts.length ? Math.min(...parts.map(part => part.z)) : item.height + 0.3;
    const z = round2(clamp(lowest - 0.9, 0.5, item.height));
    return { ...item, parts: [...parts, { kind, ...MAST_PART_DEFAULTS[kind], z, rotation: parts.length * 60 % 360 }] };
  }) };
}
export function updateMastPart(model: SiteModel, mastId: string, index: number, patch: Partial<MastPart>): SiteModel {
  return { ...model, features: model.features.map(item => item.id !== mastId || !item.parts ? item : { ...item, parts: item.parts.map((part, i) => i === index ? { ...part, ...patch } : part) }) };
}
export function removeMastPart(model: SiteModel, mastId: string, index: number): SiteModel {
  return { ...model, features: model.features.map(item => {
    if (item.id !== mastId || !item.parts) return item;
    const parts = item.parts.filter((_, i) => i !== index);
    const { parts: _dropped, ...rest } = item;
    return parts.length ? { ...rest, parts } : rest;
  }) };
}
