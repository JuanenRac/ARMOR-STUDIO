/**
 * A block of flats from a rectangular building: the floors, a corridor down the middle of each of them with the flats on both sides, the core of stairs and lift at one end, a window
 * for every flat, and the equipment of a block - the video intercom at the street door and a monitor (the "telefonillo") in every flat, the alarm panel and its keypad in the hall, the lights of
 * the stairs and the mailboxes. The pieces are ordinary objects of the design (walls, stairs, lift...), made together in a group, so they can be moved, changed or deleted one by one,
 * and making the block again replaces the pieces it made before.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Building, SiteFeature, SiteFeatureKind } from "../domain";
import { bounds, edgeOf, floorBottom } from "./geometry";
import { FEATURE_DEFAULTS, addOpening, nextId, updateBuilding, type SiteModel } from "./ops";
import { round2 } from "./model";

export type BlockOptions = { floors: number; flats: number };
export const BLOCK_LIMITS = { floors: [2, 20], flats: [2, 12] } as const;
const CORRIDOR = 1.6, CORE = 3.6, WALL = 0.12, GROUND_HEIGHT = 3.2, UPPER_HEIGHT = 2.8;

export const blockGroup = (buildingId: string): string => `block-${buildingId}`;

/** Whether a building can become a block: its footprint must be a rectangle with the sides along the axes, big enough for a corridor and two rows of flats. */
export function blockFits(building: Building, options: BlockOptions): boolean {
  const box = bounds(building.points);
  const width = box.maxX - box.minX, depth = box.maxY - box.minY, long = Math.max(width, depth), short = Math.min(width, depth);
  const rows = Math.ceil(options.flats / 2);
  return building.points.length === 4 && short >= CORRIDOR + 2 * 3 && long >= CORE + rows * 3.2 + 0.5;
}

export function generateApartmentBlock(model: SiteModel, buildingId: string, options: BlockOptions): SiteModel | null {
  const building = model.buildings.find(item => item.id === buildingId);
  if (!building) return null;
  const floorsCount = Math.round(Math.min(BLOCK_LIMITS.floors[1], Math.max(BLOCK_LIMITS.floors[0], options.floors)));
  const flats = Math.round(Math.min(BLOCK_LIMITS.flats[1], Math.max(BLOCK_LIMITS.flats[0], options.flats)));
  if (!blockFits(building, { floors: floorsCount, flats })) return null;

  const group = blockGroup(buildingId);
  const heights = Array.from({ length: floorsCount }, (_unused, index) => (index === 0 ? GROUND_HEIGHT : UPPER_HEIGHT));
  let next: SiteModel = updateBuilding({
    ...model,
    // making the block again replaces the pieces it made before, and the windows of the floors it rebuilds
    features: model.features.filter(feature => feature.group !== group),
    openings: model.openings.filter(opening => opening.buildingId !== buildingId),
  }, buildingId, { floors: heights, use: "apartments" });
  const made = next.buildings.find(item => item.id === buildingId)!;

  // the frame of the block: u along the long side, v across it; (x, y) of the site from them
  const box = bounds(made.points), width = box.maxX - box.minX, depth = box.maxY - box.minY;
  const alongX = width >= depth, long = alongX ? width : depth, short = alongX ? depth : width;
  const u0 = alongX ? box.minX : box.minY, v0 = alongX ? box.minY : box.minX;
  const at = (u: number, v: number) => (alongX ? { x: box.minX + u, y: box.minY + v } : { x: box.minX + v, y: box.minY + u });
  const turn = alongX ? 0 : 90;   // a wall made along u lies along the long side whichever way it is
  void u0; void v0;

  const ids = new Set(next.features.map(item => item.id));
  const pieces: SiteFeature[] = [];
  const put = (kind: SiteFeatureKind, u: number, v: number, floor: number, patch: Partial<SiteFeature> = {}): SiteFeature => {
    const point = at(u, v);
    const id = nextId(kind, [...ids]);
    ids.add(id);
    const feature: SiteFeature = { id, kind, x: round2(point.x), y: round2(point.y), z: round2(made.base + floorBottom(heights, floor)), ...FEATURE_DEFAULTS[kind], group, ...patch };
    pieces.push(feature);
    return feature;
  };
  const rowFlats = Math.ceil(flats / 2), flatLength = (long - CORE) / rowFlats;
  const midV = short / 2, rowDepth = (short - CORRIDOR) / 2 - WALL;

  for (let floor = 0; floor < floorsCount; floor += 1) {
    const height = heights[floor] - 0.1;
    // the walls of the corridor, with a door for every flat, and the walls between flats
    for (const side of [-1, 1]) {
      const flatsHere = side === -1 ? rowFlats : flats - rowFlats;
      for (let index = 0; index < flatsHere; index += 1) {
        const centre = CORE + flatLength * (index + 0.5);
        put("wall", centre, midV + side * (CORRIDOR / 2), floor, { width: round2(flatLength - WALL), depth: WALL, height, rotation: turn, style: "wDoor" });
        if (index > 0) put("wall", CORE + flatLength * index, midV + side * (CORRIDOR / 2 + rowDepth / 2), floor, { width: round2(rowDepth), depth: WALL, height, rotation: turn + 90 });
        // the monitor of the intercom, by the door of the flat, inside
        put("intercom-monitor", centre + 0.9, midV + side * (CORRIDOR / 2 + 0.2), floor, { rotation: turn + (side === -1 ? 0 : 180) });
      }
    }
    // the wall of the core, the stairs, the lift and their lights
    put("wall", CORE, midV, floor, { width: round2(short - 2 * WALL), depth: WALL, height, rotation: turn + 90, style: "wDoubleDoor" });
    put("stairs", CORE / 2 - 0.9, midV - 0.4, floor, { width: 1.1, depth: 3.0, height: heights[floor], rotation: turn });
    put("lift", CORE / 2 + 0.8, midV + 1.6, floor, { height: heights[floor] - 0.2, rotation: turn });
    put("stair-light", CORE / 2 - 0.9, midV + 1.4, floor, { rotation: turn });
    put("stair-light", CORE + flatLength * rowFlats / 2, midV, floor, { rotation: turn });
  }
  // the ground floor: the alarm in the hall, and the street door with its intercom
  put("alarm-panel", 0.6, midV + 2.0, 0, { rotation: turn });
  put("alarm-keypad", 0.6, midV - 2.0, 0, { rotation: turn });
  const entrance = put("intercom", -0.3, midV + 1.2, 0, { rotation: turn + 180 });
  void entrance;
  // the mailboxes, outside by the street door
  for (let index = 0; index < Math.min(flats, 8); index += 1) put("mailbox", -0.9, midV - 2.4 + index * 0.45, 0, { rotation: turn });

  next = { ...next, features: [...next.features, ...pieces] };

  // the street door on the short side at the core end, and a window for every flat on the long sides
  const edges = made.points.map((_point, index) => ({ index, ...edgeOf(made.points, index) }));
  const isLong = (e: { ux: number; uy: number }) => (alongX ? Math.abs(e.ux) > Math.abs(e.uy) : Math.abs(e.uy) > Math.abs(e.ux));
  const coreEnd = edges.filter(e => !isLong(e)).sort((a, b) => ((alongX ? a.a.x : a.a.y) - (alongX ? b.a.x : b.a.y)))[0];
  if (coreEnd) { const door = addOpening(next, buildingId, coreEnd.index, 0, "door"); if (door) next = door.model; }
  for (const edge of edges.filter(isLong)) {
    const sideIsLow = (alongX ? (edge.a.y + edge.b.y) / 2 : (edge.a.x + edge.b.x) / 2) < (alongX ? box.minY + short / 2 : box.minX + short / 2);
    const count = sideIsLow ? rowFlats : flats - rowFlats;
    for (let floor = 0; floor < floorsCount; floor += 1) {
      for (let index = 0; index < count; index += 1) {
        const uCentre = CORE + flatLength * (index + 0.5);
        const point = at(uCentre, sideIsLow ? 0 : short);
        const along = (point.x - edge.a.x) * edge.ux + (point.y - edge.a.y) * edge.uy;
        const window = addOpening(next, buildingId, edge.index, floor, "window", along, floor > 0 ? { balcony: true } : {});
        if (window) next = window.model;
      }
    }
  }
  return next;
}
