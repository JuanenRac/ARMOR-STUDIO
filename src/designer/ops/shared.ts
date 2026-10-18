import type { Building, Camera, DevicePlacement, Opening, Roof, RoofItem, Sensor, SiteFeature, Terrain, WallLamp } from "../../domain";
export type SiteModel = {
  terrain: Terrain; buildings: Building[]; openings: Opening[]; roofItems: RoofItem[]; wallLamps: WallLamp[]; features: SiteFeature[];
  cameras: Camera[]; sensors: Sensor[]; placements: DevicePlacement[];
};
export const round2 = (value: number): number => Number(value.toFixed(2));
export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
export const DEFAULT_ROOF: Roof = { style: "gable", slope: 30, overhang: 0.4, ridge: 0 };
export const FLOOR_HEIGHT_M = 2.8;
export const EDGE_MARGIN = 0.1;
/** The first free id of the form `prefix-01`, `prefix-02`, ... */
export function nextId(prefix: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  for (let index = 1; index < 100000; index += 1) { const id = `${prefix}-${String(index).padStart(2, "0")}`; if (!used.has(id)) return id; }
  return `${prefix}-${Date.now()}`;
}
