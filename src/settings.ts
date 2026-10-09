/**
 * Browser-local Studio settings: strict parsing of what is stored, so a
 * damaged or hand-edited value can never break Studio or inject a bad shape.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { readColour } from "./designer/colors";
import { parseServerOrigin } from "./config";
import { FEATURE_STYLES, MAST_PART_KINDS, type DevicePlacement, type MastPart, LANGUAGES, THEMES, type Building, type Camera, type Dimensions, type LanguageCode, type Opening, type Point, type Roof, type RoofItem, type RoofStyle, type Sensor, type SiteFeature, type Terrain, type Theme, type WallLamp, BUILDING_USES, BUILDING_MATERIALS, OPENING_STYLES, LAMP_KINDS } from "./domain";
import { isSimplePolygon } from "./designer/geometry";

export const SETTINGS_KEY = "armor-studio-settings-v1";
const LIMITS = { placements: 400, cameras: 64, sensors: 128, buildings: 100, openings: 2000, roofItems: 1000, wallLamps: 500, features: 1000, points: 200, floors: 30 } as const;

export type StudioSettings = {
  origin: string; theme: Theme; language: LanguageCode; sidebarOpen: boolean; dimensions: Dimensions;
  cameras: Camera[]; sensors: Sensor[]; terrain: Terrain; buildings: Building[]; openings: Opening[]; roofItems: RoofItem[]; wallLamps: WallLamp[]; features: SiteFeature[]; placements: DevicePlacement[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const id = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9._-]{1,80}$/.test(value);
const label = (value: unknown, max = 120): string | null => typeof value === "string" ? value.slice(0, max) : null;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const list = <T>(value: unknown, limit: number, read: (item: unknown) => T | null): T[] | undefined =>
  Array.isArray(value) ? value.slice(0, limit).map(read).filter((item): item is T => item !== null) : undefined;

function readCamera(raw: unknown): Camera | null {
  if (!isRecord(raw) || !id(raw.id)) return null;
  const name = label(raw.name, 80), host = label(raw.host, 253), snapshotUrl = label(raw.snapshotUrl, 500);
  if (name === null || host === null || snapshotUrl === null) return null;
  const camera: Camera = {
    id: raw.id, name, host, snapshotUrl, enabled: raw.enabled !== false,
    x: finite(raw.x) ? clamp(raw.x, 0, 100) : 50, y: finite(raw.y) ? clamp(raw.y, 0, 100) : 50,
  };
  // Server-owned fields are re-read from the server; only the harmless ones are kept for display before it answers.
  if (typeof raw.rtspPath === "string") camera.rtspPath = raw.rtspPath.slice(0, 500);
  if (typeof raw.hasCredentials === "boolean") camera.hasCredentials = raw.hasCredentials;
  if (typeof raw.liveVideoAvailable === "boolean") camera.liveVideoAvailable = raw.liveVideoAvailable;
  if (typeof raw.username === "string") camera.username = raw.username.slice(0, 128);
  if (finite(raw.onvifPort)) camera.onvifPort = raw.onvifPort;
  if (finite(raw.rtspPort)) camera.rtspPort = raw.rtspPort;
  if (finite(raw.heading)) camera.heading = ((raw.heading % 360) + 360) % 360;
  if (finite(raw.tilt)) camera.tilt = clamp(raw.tilt, -90, 90);
  if (finite(raw.z)) camera.z = clamp(raw.z, 0, 100);
  if (finite(raw.fov)) camera.fov = clamp(raw.fov, 20, 180);
  if (finite(raw.range)) camera.range = clamp(raw.range, 2, 60);
  if (raw.kind === "ptz") camera.kind = "ptz";
  if (finite(raw.pan)) camera.pan = clamp(raw.pan, 90, 360);
  if (finite(raw.tiltSweep)) camera.tiltSweep = clamp(raw.tiltSweep, 30, 180);
  if (raw.mount === "wall" || raw.mount === "ceiling" || raw.mount === "pole" || raw.mount === "ground") camera.mount = raw.mount;
  if (finite(raw.nightRange)) camera.nightRange = clamp(raw.nightRange, 1, 100);
  return camera;
}

function readSensor(raw: unknown): Sensor | null {
  if (!isRecord(raw) || !id(raw.id)) return null;
  const name = label(raw.name, 80);
  if (name === null || (raw.kind !== "LD2450" && raw.kind !== "LD2461")) return null;
  const sensor: Sensor = { id: raw.id, name, kind: raw.kind, x: finite(raw.x) ? clamp(raw.x, 0, 100) : 50, y: finite(raw.y) ? clamp(raw.y, 0, 100) : 50 };
  if (finite(raw.heading)) sensor.heading = ((raw.heading % 360) + 360) % 360;
  if (finite(raw.tilt)) sensor.tilt = clamp(raw.tilt, -90, 90);
  if (finite(raw.z)) sensor.z = clamp(raw.z, 0, 100);
  if (typeof raw.node === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(raw.node)) sensor.node = raw.node;
  if (finite(raw.channel) && Number.isInteger(raw.channel) && raw.channel >= 0 && raw.channel <= 255) sensor.channel = raw.channel;
  if (raw.mirror === true) sensor.mirror = true;
  return sensor;
}

const COORDINATE_LIMIT = 5000;
const ROOF_STYLES: readonly RoofStyle[] = ["flat", "shed", "gable", "hip", "pyramid"];
const FEATURE_KINDS = ["pillar", "lamp", "mast", "solar", "canopy", "entrance", "path", "road", "tree", "kennel", "fence", "fountain", "coop", "gate", "sidewalk", "pool", "planter", "terrace", "bench", "table", "barbecue", "pergola", "shed", "hedge", "mailbox", "bins", "tank", "ac-unit", "electrical-box", "car"] as const;
const ROOF_ITEM_KINDS = ["chimney", "solar", "antenna", "vent", "gutter", "downpipe"] as const;
const num = (raw: Record<string, unknown>, key: string, fallback: number, low: number, high: number) => finite(raw[key]) ? clamp(raw[key] as number, low, high) : fallback;
const integer = (raw: Record<string, unknown>, key: string, high: number): number | null => finite(raw[key]) && Number.isInteger(raw[key]) && (raw[key] as number) >= 0 && (raw[key] as number) <= high ? (raw[key] as number) : null;

function readPoints(raw: unknown): Point[] | null {
  if (!Array.isArray(raw) || raw.length < 3 || raw.length > LIMITS.points) return null;
  const points: Point[] = [];
  for (const item of raw) {
    if (!isRecord(item) || !finite(item.x) || !finite(item.y) || Math.abs(item.x) > COORDINATE_LIMIT || Math.abs(item.y) > COORDINATE_LIMIT) return null;
    points.push({ x: item.x, y: item.y });
  }
  return isSimplePolygon(points) ? points : null;
}

function readTerrain(raw: unknown): Terrain | undefined {
  if (!isRecord(raw)) return undefined;
  const points = readPoints(raw.points), color = readColour(raw.color);
  return points ? { points, ...(color ? { color } : {}) } : undefined;
}

function readRoof(raw: unknown): Roof {
  const roof = isRecord(raw) ? raw : {};
  return {
    style: ROOF_STYLES.includes(roof.style as RoofStyle) ? roof.style as RoofStyle : "gable",
    slope: num(roof, "slope", 30, 0, 80), overhang: num(roof, "overhang", 0.3, 0, 3), ridge: finite(roof.ridge) ? ((roof.ridge % 360) + 360) % 360 : 0,
  };
}

const oneOf = <T extends string>(list: readonly T[], value: unknown): T | undefined => (typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : undefined);

function readBuilding(raw: unknown): Building | null {
  if (!isRecord(raw) || !id(raw.id)) return null;
  const name = label(raw.name, 80), points = readPoints(raw.points);
  if (name === null || !points) return null;
  const floors = Array.isArray(raw.floors) ? raw.floors.slice(0, LIMITS.floors).filter(finite).map(height => clamp(height, 0.5, 20)) : [];
  return { id: raw.id, name, points, base: num(raw, "base", 0, -50, 500), floors: floors.length ? floors : [3], roof: readRoof(raw.roof), thickness: num(raw, "thickness", 0.2, 0.05, 1), ...(readColour(raw.color) ? { color: readColour(raw.color) } : {}), ...(readColour(raw.roofColor) ? { roofColor: readColour(raw.roofColor) } : {}), ...(raw.roofHidden === true ? { roofHidden: true } : {}) , ...(oneOf(BUILDING_USES, raw.use) ? { use: oneOf(BUILDING_USES, raw.use) } : {}), ...(oneOf(BUILDING_MATERIALS, raw.material) ? { material: oneOf(BUILDING_MATERIALS, raw.material) } : {}) };
}

function readOpening(raw: unknown): Opening | null {
  if (!isRecord(raw) || !id(raw.id) || !id(raw.buildingId) || (raw.kind !== "door" && raw.kind !== "window" && raw.kind !== "garage" && raw.kind !== "opening")) return null;
  const edge = integer(raw, "edge", LIMITS.points), floor = integer(raw, "floor", LIMITS.floors);
  if (edge === null || floor === null) return null;
  return {
    id: raw.id, buildingId: raw.buildingId, edge, floor, kind: raw.kind, offset: num(raw, "offset", 0, 0, 1000),
    width: num(raw, "width", 0.9, 0.2, 20), height: num(raw, "height", 2.1, 0.2, 20), sill: num(raw, "sill", 0, 0, 50), ...(raw.arch === true ? { arch: true } : {}), ...(raw.balcony === true ? { balcony: true } : {}), ...(readColour(raw.color) ? { color: readColour(raw.color) } : {}),
    ...(typeof raw.style === "string" && OPENING_STYLES[raw.kind]?.includes(raw.style) ? { style: raw.style } : {}),
    ...(raw.swing === "out" && (raw.kind === "door" || raw.kind === "garage") ? { swing: "out" as const } : {}), ...(raw.hinge === "right" && raw.kind === "door" ? { hinge: "right" as const } : {}),
    ...(raw.shutter === true ? { shutter: true } : {}), ...(raw.contact === true ? { contact: true } : {}),
  };
}

function readRoofItem(raw: unknown): RoofItem | null {
  if (!isRecord(raw) || !id(raw.id) || !id(raw.buildingId) || !ROOF_ITEM_KINDS.includes(raw.kind as (typeof ROOF_ITEM_KINDS)[number]) || !finite(raw.x) || !finite(raw.y)) return null;
  return {
    id: raw.id, buildingId: raw.buildingId, kind: raw.kind as RoofItem["kind"], x: raw.x, y: raw.y,
    width: num(raw, "width", 0.5, 0.02, 20), depth: num(raw, "depth", 0.5, 0.02, 20), height: num(raw, "height", 1, 0.01, 50), rotation: num(raw, "rotation", 0, -360, 360), tilt: num(raw, "tilt", 0, 0, 80), ...(readColour(raw.color) ? { color: readColour(raw.color) } : {}),
    ...(raw.kind === "solar" && finite(raw.watts) ? { watts: clamp(Math.round(raw.watts), 10, 2000) } : {}), ...(raw.kind === "solar" && finite(raw.count) ? { count: clamp(Math.round(raw.count), 1, 500) } : {}),
  };
}

function readWallLamp(raw: unknown): WallLamp | null {
  if (!isRecord(raw) || !id(raw.id) || !id(raw.buildingId)) return null;
  const edge = integer(raw, "edge", LIMITS.points);
  return edge === null ? null : { id: raw.id, buildingId: raw.buildingId, edge, offset: num(raw, "offset", 0, 0, 1000), z: num(raw, "z", 2.4, 0, 100), reach: num(raw, "reach", 0.4, 0, 3), ...(readColour(raw.color) ? { color: readColour(raw.color) } : {}), ...(oneOf(LAMP_KINDS, raw.lampKind) ? { lampKind: oneOf(LAMP_KINDS, raw.lampKind) } : {}), ...(finite(raw.watts) ? { watts: clamp(Math.round(raw.watts), 1, 2000) } : {}), ...(raw.motion === true ? { motion: true } : {}) };
}

function readPlacement(raw: unknown): DevicePlacement | null {
  if (!isRecord(raw) || !id(raw.device_id) || !finite(raw.x) || !finite(raw.y)) return null;
  return { device_id: raw.device_id, x: clamp(raw.x, -COORDINATE_LIMIT, COORDINATE_LIMIT), y: clamp(raw.y, -COORDINATE_LIMIT, COORDINATE_LIMIT), z: num(raw, "z", 1.2, -50, 200), rotation: num(raw, "rotation", 0, -360, 360),
    ...(finite(raw.pitch) && raw.pitch !== 0 ? { pitch: clamp(raw.pitch, -180, 180) } : {}), ...(finite(raw.roll) && raw.roll !== 0 ? { roll: clamp(raw.roll, -180, 180) } : {}) };
}

function readMastParts(raw: unknown): MastPart[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const parts = raw.slice(0, 12).flatMap(item => isRecord(item) && MAST_PART_KINDS.includes(item.kind as MastPart["kind"]) && finite(item.z)
    ? [{ kind: item.kind as MastPart["kind"], z: clamp(item.z, 0, 100), rotation: finite(item.rotation) ? clamp(item.rotation, -360, 360) : 0, size: finite(item.size) ? clamp(item.size, 0.1, 5) : 0.6 }] : []);
  return parts.length ? parts : undefined;
}

function readFeature(raw: unknown): SiteFeature | null {
  if (!isRecord(raw) || !id(raw.id) || !FEATURE_KINDS.includes(raw.kind as (typeof FEATURE_KINDS)[number]) || !finite(raw.x) || !finite(raw.y)) return null;
  return {
    id: raw.id, kind: raw.kind as SiteFeature["kind"], x: raw.x, y: raw.y, z: num(raw, "z", 0, -50, 500), width: num(raw, "width", 1, 0.02, 500),
    depth: num(raw, "depth", 1, 0.02, 500), height: num(raw, "height", 1, 0.01, 100), rotation: num(raw, "rotation", 0, -360, 360), slope: num(raw, "slope", 0, 0, 80),
    ...(finite(raw.pitch) && raw.pitch !== 0 ? { pitch: clamp(raw.pitch, -180, 180) } : {}), ...(finite(raw.roll) && raw.roll !== 0 ? { roll: clamp(raw.roll, -180, 180) } : {}),
    ...(typeof raw.group === "string" && /^[A-Za-z0-9._-]{1,40}$/.test(raw.group) ? { group: raw.group } : {}),
    ...(readColour(raw.color) ? { color: readColour(raw.color) } : {}),
    ...(typeof raw.label === "string" && raw.label.trim() ? { label: raw.label.trim().slice(0, 40) } : {}),
    ...(typeof raw.style === "string" && FEATURE_STYLES[raw.kind as SiteFeature["kind"]]?.includes(raw.style) ? { style: raw.style } : {}),
    ...(readMastParts(raw.parts) ? { parts: readMastParts(raw.parts) } : {}),
    ...(raw.kind === "lamp" && finite(raw.watts) ? { watts: clamp(Math.round(raw.watts), 1, 2000) } : {}), ...(raw.kind === "lamp" && raw.motion === true ? { motion: true } : {}), ...(raw.kind === "gate" && raw.automatic === true ? { automatic: true } : {}),
  };
}

/**
 * Earlier releases stored free-standing walls. A closed loop of them becomes one building (one floor, with its doors and
 * windows); anything else cannot be turned into a footprint and is dropped.
 */
function migrateLegacyWalls(rawWalls: unknown, rawOpenings: unknown): { building: Building; openings: Opening[] } | null {
  if (!Array.isArray(rawWalls) || rawWalls.length < 3 || rawWalls.length > 60) return null;
  const walls = rawWalls.filter(isRecord).filter(wall => [wall.x1, wall.y1, wall.x2, wall.y2].every(finite) && id(wall.id));
  if (walls.length !== rawWalls.length || Math.abs(Number(walls[0].z ?? 0)) > 0.01) return null;
  const ordered = [walls[0]];
  while (ordered.length < walls.length) {
    const last = ordered[ordered.length - 1];
    const next = walls.find(wall => !ordered.includes(wall) && Math.hypot((wall.x1 as number) - (last.x2 as number), (wall.y1 as number) - (last.y2 as number)) < 0.02);
    if (!next) return null;
    ordered.push(next);
  }
  if (Math.hypot((ordered[0].x1 as number) - (ordered[ordered.length - 1].x2 as number), (ordered[0].y1 as number) - (ordered[ordered.length - 1].y2 as number)) > 0.02) return null;
  const points = ordered.map(wall => ({ x: wall.x1 as number, y: wall.y1 as number }));
  if (!isSimplePolygon(points)) return null;
  const building: Building = { id: "building-01", name: "Building", points, base: 0, floors: [finite(ordered[0].height) ? clamp(ordered[0].height, 0.5, 20) : 3], roof: { style: "flat", slope: 0, overhang: 0, ridge: 0 }, thickness: 0.2 };
  const openings = (Array.isArray(rawOpenings) ? rawOpenings : []).filter(isRecord).flatMap(item => {
    const edge = ordered.findIndex(wall => wall.id === item.wallId);
    return edge < 0 || (item.kind !== "door" && item.kind !== "window") || !id(item.id) ? [] : [{
      id: item.id as string, buildingId: building.id, edge, floor: 0, kind: item.kind as Opening["kind"], offset: num(item, "offset", 0, 0, 1000),
      width: num(item, "width", 0.9, 0.2, 20), height: num(item, "height", 2.1, 0.2, 20), sill: num(item, "sill", 0, 0, 50),
    }];
  });
  return { building, openings };
}

/** Drop anything that points at a building, a wall or a floor that does not exist. */
function consistent(settings: Partial<StudioSettings>): void {
  const buildings = new Map((settings.buildings ?? []).map(building => [building.id, building]));
  if (settings.openings) settings.openings = settings.openings.filter(item => { const b = buildings.get(item.buildingId); return Boolean(b) && item.edge < b!.points.length && item.floor < b!.floors.length; });
  if (settings.roofItems) settings.roofItems = settings.roofItems.filter(item => buildings.has(item.buildingId));
  if (settings.wallLamps) settings.wallLamps = settings.wallLamps.filter(item => { const b = buildings.get(item.buildingId); return Boolean(b) && item.edge < b!.points.length; });
}

function readDimensions(raw: unknown): Dimensions | undefined {
  if (!isRecord(raw)) return undefined;
  const dimension = (value: unknown) => finite(value) ? clamp(value, 0.25, 1000) : null;
  const width = dimension(raw.width), depth = dimension(raw.depth), height = dimension(raw.height);
  return width !== null && depth !== null && height !== null ? { width, depth, height } : undefined;
}

/** Read the stored JSON. Anything invalid is dropped; a missing or unreadable value gives `{}`. */
export function parseStudioSettings(raw: string | null): Partial<StudioSettings> {
  if (!raw) return {};
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return {}; }
  if (!isRecord(value)) return {};
  const settings: Partial<StudioSettings> = {};
  const origin = typeof value.origin === "string" ? parseServerOrigin(value.origin) : null;
  if (origin) settings.origin = origin;
  if (THEMES.includes(value.theme as Theme)) settings.theme = value.theme as Theme;
  if (LANGUAGES.some(item => item.code === value.language)) settings.language = value.language as LanguageCode;
  if (typeof value.sidebarOpen === "boolean") settings.sidebarOpen = value.sidebarOpen;
  const dimensions = readDimensions(value.dimensions);
  if (dimensions) settings.dimensions = dimensions;
  const cameras = list(value.cameras, LIMITS.cameras, readCamera);
  if (cameras) settings.cameras = cameras;
  const sensors = list(value.sensors, LIMITS.sensors, readSensor);
  if (sensors) settings.sensors = sensors;
  const terrain = readTerrain(value.terrain);
  if (terrain) settings.terrain = terrain;
  const buildings = list(value.buildings, LIMITS.buildings, readBuilding);
  if (buildings) settings.buildings = buildings;
  const openings = list(value.openings, LIMITS.openings, readOpening);
  if (openings) settings.openings = openings;
  const roofItems = list(value.roofItems, LIMITS.roofItems, readRoofItem);
  if (roofItems) settings.roofItems = roofItems;
  const wallLamps = list(value.wallLamps, LIMITS.wallLamps, readWallLamp);
  if (wallLamps) settings.wallLamps = wallLamps;
  const features = list(value.features, LIMITS.features, readFeature);
  if (features) settings.features = features;
  const placements = list(value.placements, LIMITS.placements, readPlacement);
  if (placements) settings.placements = placements.filter((item, index) => placements.findIndex(other => other.device_id === item.device_id) === index);
  if (!buildings && value.walls !== undefined) {
    const legacy = migrateLegacyWalls(value.walls, value.openings);
    if (legacy) { settings.buildings = [legacy.building]; settings.openings = legacy.openings; }
  }
  consistent(settings);
  return settings;
}

/**
 * What is written to the browser. Nothing secret is ever part of a camera here:
 * the server keeps passwords, and Studio never receives them.
 */
export function serializeStudioSettings(settings: StudioSettings): string {
  return JSON.stringify(settings);
}

/** The site-export document (no credentials by construction). */
export function siteExport(settings: Pick<StudioSettings, "origin" | "dimensions" | "cameras" | "sensors" | "terrain" | "buildings" | "openings" | "roofItems" | "wallLamps" | "features" | "placements">): string {
  // Server-owned camera fields (username, credential flags) are left out of an export.
  const cameras = settings.cameras.map(({ username: _username, hasCredentials: _hasCredentials, liveVideoAvailable: _live, ...camera }) => camera);
  return JSON.stringify({ schema: "armor-studio/site-config/4", ...settings, cameras }, null, 2);
}
