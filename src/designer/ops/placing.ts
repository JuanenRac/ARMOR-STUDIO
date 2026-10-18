import type { Building, DevicePlacement, Opening, Point, RoofItem, RoofItemKind, SiteFeature, SiteFeatureKind } from "../../domain";
import { edgeOf, nearestOnOutline, pointInPolygon, rectangle, roofFrame, roofHeight, totalHeight } from "../geometry";
import type { Selection } from "../model";
import { rotateBuilding } from "./reshaping";
import { EDGE_MARGIN, clamp, nextId, round2 } from "./shared";
import type { SiteModel } from "./shared";
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
  gutter: { width: 4, depth: 0.14, height: 0.1 }, downpipe: { width: 0.09, depth: 0.09, height: 3 }, "solar-heater": { width: 2, depth: 1.4, height: 0.5 },
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
  mirror: { width: 0.8, depth: 0.05, height: 1.6, rotation: 0, slope: 0 },
  lift: { width: 1.6, depth: 1.5, height: 2.6, rotation: 0, slope: 0 },
  "stair-light": { width: 0.2, depth: 0.08, height: 0.1, rotation: 0, slope: 0 },
  radiator: { width: 1.0, depth: 0.1, height: 0.6, rotation: 0, slope: 0 },
  washer: { width: 0.6, depth: 0.6, height: 0.85, rotation: 0, slope: 0 },
  fridge: { width: 0.7, depth: 0.7, height: 1.85, rotation: 0, slope: 0 },
  desk: { width: 1.4, depth: 0.7, height: 0.75, rotation: 0, slope: 0 },
  plant: { width: 0.5, depth: 0.5, height: 1.1, rotation: 0, slope: 0 },
  rug: { width: 2.0, depth: 1.4, height: 0.02, rotation: 0, slope: 0 },
  intercom: { width: 0.22, depth: 0.05, height: 0.34, rotation: 0, slope: 0 },
  "intercom-monitor": { width: 0.2, depth: 0.05, height: 0.26, rotation: 0, slope: 0 },
  "alarm-panel": { width: 0.3, depth: 0.08, height: 0.4, rotation: 0, slope: 0 },
  "alarm-keypad": { width: 0.14, depth: 0.04, height: 0.2, rotation: 0, slope: 0 },
  "water-heater": { width: 0.45, depth: 0.45, height: 0.9, rotation: 0, slope: 0 },
  "hot-tank": { width: 0.6, depth: 0.6, height: 1.6, rotation: 0, slope: 0 },
  "solar-tank": { width: 0.8, depth: 0.8, height: 1.8, rotation: 0, slope: 0 },
};
/** How high above the floor a thing that hangs on a wall is put when it is placed (a mirror, the panel of an intercom, an alarm keypad); the rest stand on the floor. */
export const MOUNT_HEIGHT: Partial<Record<SiteFeatureKind, number>> = { mirror: 0.3, intercom: 1.3, "intercom-monitor": 1.4, "alarm-panel": 1.4, "alarm-keypad": 1.3, "water-heater": 1.3 };
export function addFeature(model: SiteModel, kind: SiteFeatureKind, x: number, y: number, z = 0): { model: SiteModel; id: string } {
  const id = nextId(kind, model.features.map(item => item.id));
  return { model: { ...model, features: [...model.features, { id, kind, x: round2(x), y: round2(y), z: round2(z + (MOUNT_HEIGHT[kind] ?? 0)), ...FEATURE_DEFAULTS[kind] }] }, id };
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
  smart_plug: 0.35, smart_light: 2.4, smart_switch: 1.2, siren: 2.5, lock: 1.05, valve: 0.6, shutter: 2.0, gate_motor: 1.0, garage_motor: 2.3, water_heater: 1.6,
};
/** Put a device (or move it) in the design. */
export function placeDevice(model: SiteModel, deviceId: string, at: Point, z: number): SiteModel {
  const placement: DevicePlacement = { device_id: deviceId, x: round2(at.x), y: round2(at.y), z: round2(z), rotation: 0 };
  const exists = model.placements.some(item => item.device_id === deviceId);
  return { ...model, placements: exists ? model.placements.map(item => item.device_id === deviceId ? { ...item, x: placement.x, y: placement.y, z: placement.z } : item) : [...model.placements, placement] };
}
