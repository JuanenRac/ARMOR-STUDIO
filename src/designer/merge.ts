/**
 * Merging buildings: two buildings whose walls touch become one built mass. Where their walls lie on the same line the wall is made once (the taller building keeps it, the other leaves
 * a gap there), and a door, a window or any opening in that wall - whichever of the two buildings it was drawn on - is cut through it and seen from both faces.
 * Kept apart from the drawing so it is tested on its own.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Building, Opening, Point } from "../domain";
import { edgeOf, floorBottom, totalHeight } from "./geometry";
import { moveSide, updateBuilding, type SiteModel } from "./ops";

const round2 = (value: number): number => Number(value.toFixed(2));

/** A stretch of wall two buildings have in common: the wall `edgeA` of one and the wall `edgeB` of the other, and where along each of them it lies. */
export type SharedSegment = {
  edgeA: number; edgeB: number;
  /** The stretch along A's wall, in metres from its start. */
  fromA: number; toA: number;
  /** Where B's wall starts, measured along A's wall (B's wall runs the other way, so a place `s` along B's wall is `bStart - s` along A's). */
  bStart: number;
  /** How far apart the two wall lines are, in metres (0 when they are the same line). */
  gap: number;
};

const MIN_SHARED_M = 0.3;

/** The wall of `a` and the wall of `b` that lie along each other: parallel, no further apart than the walls are thick (or drawn on the same line), and overlapping by at least 30 cm. */
export function sharedSegments(a: Building, b: Building): SharedSegment[] {
  const out: SharedSegment[] = [];
  const reach = (a.thickness + b.thickness) / 2 + 0.06;
  for (let i = 0; i < a.points.length; i += 1) {
    const ea = edgeOf(a.points, i);
    if (ea.length < MIN_SHARED_M) continue;
    for (let j = 0; j < b.points.length; j += 1) {
      const eb = edgeOf(b.points, j);
      if (eb.length < MIN_SHARED_M || Math.abs(ea.ux * eb.ux + ea.uy * eb.uy) < 0.9995) continue;
      const across = (p: Point) => (p.x - ea.a.x) * ea.nx + (p.y - ea.a.y) * ea.ny;
      const along = (p: Point) => (p.x - ea.a.x) * ea.ux + (p.y - ea.a.y) * ea.uy;
      const gap = Math.max(Math.abs(across(eb.a)), Math.abs(across(eb.b)));
      if (gap > reach) continue;
      const s0 = along(eb.a), s1 = along(eb.b);
      const from = Math.max(0, Math.min(s0, s1)), to = Math.min(ea.length, Math.max(s0, s1));
      if (to - from < MIN_SHARED_M) continue;
      out.push({ edgeA: i, edgeB: j, fromA: round2(from), toA: round2(to), bStart: s0, gap: round2(gap) });
    }
  }
  return out;
}

/** The buildings a building is merged with that still exist. */
export function partnersOf(model: SiteModel, building: Building): Building[] {
  return (building.mergedWith ?? []).map(id => model.buildings.find(item => item.id === id)).filter((item): item is Building => item !== undefined && item.id !== building.id);
}

/** The buildings that touch a building along a wall and are not merged with it yet: what the inspector offers to merge. */
export function mergeCandidates(model: SiteModel, building: Building): Building[] {
  const merged = new Set(building.mergedWith ?? []);
  return model.buildings.filter(other => other.id !== building.id && !merged.has(other.id) && sharedSegments(building, other).length > 0);
}

const topOf = (building: Building): number => building.base + totalHeight(building.floors);
/** Of two merged buildings the one that keeps the shared wall: the taller; the one whose id sorts first when they are as tall. */
export function keepsSharedWall(building: Building, other: Building): boolean {
  const mine = topOf(building), theirs = topOf(other);
  return mine > theirs + 1e-6 || (Math.abs(mine - theirs) <= 1e-6 && building.id < other.id);
}

/**
 * Merge two buildings. The walls that run along each other are brought onto one line (the second building's wall moves to the first one's, its other walls following at right angles),
 * and both remember they are merged. Null when they touch nowhere.
 */
export function mergeBuildings(model: SiteModel, keepId: string, joinId: string): SiteModel | null {
  const keep = model.buildings.find(item => item.id === keepId), join = model.buildings.find(item => item.id === joinId);
  if (!keep || !join || keep.id === join.id) return null;
  const shared = sharedSegments(keep, join);
  if (shared.length === 0) return null;
  let next = model;
  // bring every shared wall of the second building onto the line of the first one's (most overlapped first); a wall already on the line is left alone
  for (const segment of [...shared].sort((p, q) => (q.toA - q.fromA) - (p.toA - p.fromA))) {
    if (segment.gap < 0.02) continue;
    const current = next.buildings.find(item => item.id === joinId)!;
    const mine = edgeOf(keep.points, segment.edgeA), theirs = edgeOf(current.points, segment.edgeB);
    const offset = (theirs.a.x - mine.a.x) * mine.nx + (theirs.a.y - mine.a.y) * mine.ny;   // how far B's wall is from the line of A's, along A's normal
    next = moveSide(next, joinId, segment.edgeB, -offset * (theirs.nx * mine.nx + theirs.ny * mine.ny));
  }
  const link = (building: Building, other: string): Partial<Building> => ({ mergedWith: [...new Set([...(building.mergedWith ?? []), other])] });
  const a = next.buildings.find(item => item.id === keepId)!, b = next.buildings.find(item => item.id === joinId)!;
  return updateBuilding(updateBuilding(next, keepId, link(a, joinId)), joinId, link(b, keepId));
}

/** Take two merged buildings apart again (their walls stay where they are). */
export function separateBuildings(model: SiteModel, idA: string, idB: string): SiteModel {
  const drop = (building: Building, other: string): Partial<Building> => {
    const rest = (building.mergedWith ?? []).filter(id => id !== other);
    return { mergedWith: rest.length ? rest : undefined };
  };
  const a = model.buildings.find(item => item.id === idA), b = model.buildings.find(item => item.id === idB);
  if (!a || !b) return model;
  return updateBuilding(updateBuilding(model, idA, drop(a, idB)), idB, drop(b, idA));
}

/** What the drawing of one building needs to know about the walls it shares. */
export type WallPlan = {
  /** The stretches of this building's walls that are not built here (the other building keeps the wall). */
  cuts: Array<{ edge: number; from: number; to: number }>;
  /** Openings of the other buildings that now cut through this building's wall, placed on it. */
  borrowed: Opening[];
  /** The ids of this building's own openings that are drawn on the other building's wall instead. */
  handedOver: Set<string>;
  /** The walls (edges) that have a building on their other side, so a door or window there is seen from both faces. */
  twoFaced: Set<number>;
};

export const NO_WALL_PLAN: WallPlan = { cuts: [], borrowed: [], handedOver: new Set(), twoFaced: new Set() };

/** Where the walls of `building` are shared with the buildings it is merged with, and what that does to its openings. */
export function wallPlan(model: SiteModel, building: Building): WallPlan {
  const partners = partnersOf(model, building);
  if (partners.length === 0) return NO_WALL_PLAN;
  const plan: WallPlan = { cuts: [], borrowed: [], handedOver: new Set(), twoFaced: new Set() };
  for (const other of partners) {
    const mine = keepsSharedWall(building, other);
    for (const segment of sharedSegments(building, other)) {
      plan.twoFaced.add(segment.edgeA);
      if (!mine) {
        plan.cuts.push({ edge: segment.edgeA, from: segment.fromA, to: segment.toA });
        for (const opening of model.openings) {
          if (opening.buildingId !== building.id || opening.edge !== segment.edgeA) continue;
          const centre = opening.offset + opening.width / 2;
          if (centre >= segment.fromA && centre <= segment.toA) plan.handedOver.add(opening.id);
        }
        continue;
      }
      // this building keeps the wall: the openings of the other one, whichever floor of it, are cut through it here
      for (const opening of model.openings) {
        if (opening.buildingId !== other.id || opening.edge !== segment.edgeB) continue;
        const start = segment.bStart - (opening.offset + opening.width), end = segment.bStart - opening.offset;
        if ((start + end) / 2 < segment.fromA || (start + end) / 2 > segment.toA) continue;
        plan.borrowed.push({
          ...opening, buildingId: building.id, edge: segment.edgeA, floor: 0, offset: round2(start),
          sill: round2(Math.max(0, other.base + floorBottom(other.floors, opening.floor) + opening.sill - building.base)),
        });
      }
    }
  }
  return plan;
}
