/**
 * Which floor of the buildings a radar or a camera is on, for the coverage check that looks at the floors one by one. A floor set by hand wins; otherwise the floor follows from the mounting
 * height inside the building under it; with neither, the ground floor is assumed (and the check says so when the building has more than one floor).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { SiteModel } from "../designer/ops";
import { floorBottom } from "../designer/geometry";
import { floorAt } from "../designer/floors";
import { toMetres } from "../designer/model";
import type { Dimensions } from "../domain";
import { insidePolygon } from "./geometry";

export type Level = { floor: number; /** Mounting height above the site level, in metres. */ z: number; /** The floor was not given and the height does not say: the ground floor was taken. */ assumed: boolean };

export function levelOf(model: SiteModel, item: { x: number; y: number; z?: number; floor?: number }, dimensions: Dimensions, defaultHeightM: number): Level {
  const at = toMetres(item, dimensions);
  const under = model.buildings.find(building => insidePolygon(at, building.points));
  if (typeof item.floor === "number" && Number.isInteger(item.floor) && item.floor >= 0) {
    const z = item.z ?? (under ? under.base + floorBottom(under.floors, item.floor) + defaultHeightM : defaultHeightM);
    return { floor: item.floor, z, assumed: false };
  }
  if (typeof item.z === "number" && Number.isFinite(item.z)) return { floor: floorAt(model.buildings, at, item.z)?.floor ?? 0, z: item.z, assumed: false };
  return { floor: 0, z: defaultHeightM, assumed: (under?.floors.length ?? 0) > 1 };
}
