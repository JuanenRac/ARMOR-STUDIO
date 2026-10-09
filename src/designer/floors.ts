/**
 * The floors of the buildings: what a floor can be made of, how big one repeat of its pattern is, the colour each has by default, and which floor of a building a point at a height belongs to.
 * Kept apart from the drawing (floorLooks.tsx) so it is tested on its own.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { FLOOR_STYLES, type Building, type FloorStyle, type Point } from "../domain";
import { floorBottom, pointInPolygon } from "./geometry";

/** How each finish looks: its usual colour and the size in metres of one repeat of its pattern (a plank run, a tile, a slab). */
export const FLOOR_LOOKS: Record<FloorStyle, { colour: string; tile: number }> = {
  flConcrete: { colour: "#aebcc1", tile: 2 }, flMicrocement: { colour: "#9aa0a2", tile: 3 }, flParquet: { colour: "#b08a5a", tile: 1.2 }, flLaminate: { colour: "#c9a77a", tile: 1.4 },
  flCeramic: { colour: "#d9d4c7", tile: 1.2 }, flMarble: { colour: "#e8e6e0", tile: 2.4 }, flStone: { colour: "#8d8a82", tile: 2 }, flTerrazzo: { colour: "#cfc7b8", tile: 1.6 },
  flVinyl: { colour: "#a9b2b8", tile: 1.5 }, flCarpet: { colour: "#7e8aa0", tile: 1.2 },
};
export const isFloorStyle = (value: unknown): value is FloorStyle => typeof value === "string" && (FLOOR_STYLES as readonly string[]).includes(value);

/** The finish and the colour of one floor of a building (the plain concrete slab when nothing was chosen). */
export function floorFinish(building: Pick<Building, "floorMaterials" | "floorColors">, floor: number): { style: FloorStyle; colour: string; chosen: boolean } {
  const style = building.floorMaterials?.[floor];
  const colour = building.floorColors?.[floor];
  const valid = isFloorStyle(style) ? style : "flConcrete";
  return { style: valid, colour: colour && /^#[0-9a-f]{6}$/i.test(colour) ? colour : FLOOR_LOOKS[valid].colour, chosen: isFloorStyle(style) };
}

/** The colour a finish has by default, as `featureColourOf` wants it. */
export const floorColourOf = (style: string | undefined): string => (isFloorStyle(style) ? FLOOR_LOOKS[style].colour : FLOOR_LOOKS.flParquet.colour);

/** A name that is safe in an SVG id for one finish in one colour. */
export const floorPatternId = (style: string, colour: string): string => `fl-${style}-${colour.replace("#", "").toLowerCase()}`;

/** The building that has `point` inside its footprint, and which of its floors the height `z` (above the sea level of the site, like the base of a building) falls in; undefined when it is outside every building. */
export function floorAt(buildings: readonly Building[], point: Point, z: number): { building: Building; floor: number } | undefined {
  for (const building of buildings) {
    if (!pointInPolygon(point, building.points)) continue;
    let floor = 0;
    for (let index = 0; index < building.floors.length; index += 1) if (z >= building.base + floorBottom(building.floors, index) - 0.2) floor = index;
    return { building, floor };
  }
  return undefined;
}
