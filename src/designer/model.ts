/**
 * Site designer definitions shared by the 2D plan and the 3D viewport: the tools, their keys, the radar and camera
 * fields, and small helpers. Sites are measured in metres, x to the east and y to the north; a camera or a radar is
 * stored as a percentage of the work area so that resizing the area keeps them in place.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Camera, Dimensions, Point, Sensor } from "../domain";

export type { Point };
export type Tool =
  | "select" | "move" | "elevate"
  | "terrain-rect" | "terrain-poly" | "building-rect" | "building-poly"
  | "door" | "window" | "wall-lamp"
  | "chimney" | "roof-solar" | "antenna"
  | "pillar" | "lamp" | "mast" | "solar" | "canopy" | "entrance" | "path" | "road"
  | "tree" | "kennel" | "fence" | "fountain" | "coop" | "gate" | "sidewalk"
  | "camera" | "sensor" | "device";

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
export const snapTo = (value: number, step: number): number => step > 0 ? Math.round(value / step) * step : value;
export const round2 = (value: number): number => Number(value.toFixed(2));

/** The radar's rated detection area, from the Hi-Link HLK-LD2450 manual: 6 m, azimuth plus or minus 60 degrees. */
export const RADAR = { rangeM: 6, halfAngleDeg: 60 } as const;
/**
 * What each sensor model is rated for. LD2450: 6 m, plus or minus 60 degrees (its manual). LD2461: people moving up to 8 m, 90 degrees
 * horizontally so plus or minus 45 (its specification). These are the manufacturers' figures, not measurements of an installation.
 */
export const RADAR_MODELS = { LD2450: RADAR, LD2461: { rangeM: 8, halfAngleDeg: 45 } } as const;
export const radarView = (sensor: { kind: "LD2450" | "LD2461" }): { rangeM: number; halfAngleDeg: number } => RADAR_MODELS[sensor.kind] ?? RADAR;
/** The manual recommends mounting the radar 1.5 m to 2 m up. */
export const SENSOR_HEIGHT_M = 1.5;
/** A camera's field of view is drawn as an indication only: it depends on the lens, which the site model does not know. */
export const CAMERA_VIEW = { rangeM: 12, halfAngleDeg: 45 } as const;
/** What a camera sees: its own field of view and range when the operator set them, else the defaults. */
export const cameraView = (camera: { fov?: number; range?: number }): { rangeM: number; halfAngleDeg: number } => ({ rangeM: camera.range ?? CAMERA_VIEW.rangeM, halfAngleDeg: (camera.fov ?? CAMERA_VIEW.halfAngleDeg * 2) / 2 });
export const CAMERA_HEIGHT_M = 2.4;

export type ToolMode = "2d" | "3d";
/** `views` says where the tool works; the panel of both views shows every tool and greys out the ones the other view cannot use. */
export type ToolSpec = { tool: Tool; key: string; labelKey: string; views: readonly ToolMode[] };
const BOTH: readonly ToolMode[] = ["2d", "3d"], ONLY_2D: readonly ToolMode[] = ["2d"], ONLY_3D: readonly ToolMode[] = ["3d"];

/** Every tool, in groups, the same in the 2D plan and in the 3D view. */
export const TOOL_GROUPS: ReadonlyArray<readonly ToolSpec[]> = [
  [{ tool: "select", key: "V", labelKey: "toolSelect", views: BOTH }, { tool: "move", key: "X", labelKey: "toolMove", views: BOTH }, { tool: "elevate", key: "Z", labelKey: "toolElevate", views: ONLY_3D }],
  [{ tool: "terrain-rect", key: "T", labelKey: "toolTerrainRect", views: ONLY_2D }, { tool: "terrain-poly", key: "Y", labelKey: "toolTerrainPoly", views: ONLY_2D }],
  [{ tool: "building-rect", key: "B", labelKey: "toolBuildingRect", views: ONLY_2D }, { tool: "building-poly", key: "G", labelKey: "toolBuildingPoly", views: ONLY_2D }, { tool: "door", key: "D", labelKey: "toolDoor", views: BOTH }, { tool: "window", key: "N", labelKey: "toolWindow", views: BOTH }, { tool: "wall-lamp", key: "W", labelKey: "toolWallLamp", views: BOTH }],
  [{ tool: "chimney", key: "C", labelKey: "toolChimney", views: BOTH }, { tool: "roof-solar", key: "R", labelKey: "toolRoofSolar", views: BOTH }, { tool: "antenna", key: "A", labelKey: "toolAntenna", views: BOTH }],
  [{ tool: "pillar", key: "P", labelKey: "toolPillar", views: BOTH }, { tool: "lamp", key: "F", labelKey: "toolLamp", views: BOTH }, { tool: "mast", key: "M", labelKey: "toolMast", views: BOTH }, { tool: "solar", key: "S", labelKey: "toolSolar", views: BOTH }, { tool: "canopy", key: "Q", labelKey: "toolCanopy", views: BOTH }, { tool: "entrance", key: "E", labelKey: "toolEntrance", views: BOTH }, { tool: "path", key: "H", labelKey: "toolPath", views: BOTH }, { tool: "road", key: "O", labelKey: "toolRoad", views: BOTH }, { tool: "sidewalk", key: "4", labelKey: "toolSidewalk", views: BOTH }],
  [{ tool: "tree", key: "I", labelKey: "toolTree", views: BOTH }, { tool: "fence", key: "J", labelKey: "toolFence", views: BOTH }, { tool: "gate", key: "3", labelKey: "toolGate", views: BOTH }, { tool: "fountain", key: "1", labelKey: "toolFountain", views: BOTH }, { tool: "kennel", key: "U", labelKey: "toolKennel", views: BOTH }, { tool: "coop", key: "2", labelKey: "toolCoop", views: BOTH }],
  [{ tool: "camera", key: "K", labelKey: "toolCamera", views: BOTH }, { tool: "sensor", key: "L", labelKey: "toolSensor", views: BOTH }, { tool: "device", key: "9", labelKey: "toolDevice", views: BOTH }],
];
const inView = (mode: ToolMode) => TOOL_GROUPS.map(group => group.filter(spec => spec.views.includes(mode))).filter(group => group.length > 0);
/** The tools that work in the 2D plan, and in the 3D view. */
export const PLAN_TOOL_GROUPS: ReadonlyArray<readonly ToolSpec[]> = inView("2d");
export const VIEW_TOOL_GROUPS: ReadonlyArray<readonly ToolSpec[]> = inView("3d");
export const toolWorksIn = (tool: Tool, mode: ToolMode): boolean => TOOL_GROUPS.flat().some(spec => spec.tool === tool && spec.views.includes(mode));

const ALL_SPECS = TOOL_GROUPS.flat();
export const toolLabelKey = (tool: Tool): string => ALL_SPECS.find(spec => spec.tool === tool)?.labelKey ?? "toolSelect";
export const toolKeyOf = (tool: Tool): string => ALL_SPECS.find(spec => spec.tool === tool)?.key ?? "";
/** The tool bound to a key in a view (the 3D view has fewer). */
export const toolForKey = (key: string, mode: ToolMode): Tool | undefined =>
  TOOL_GROUPS.flat().find(spec => spec.key === key.toUpperCase() && spec.views.includes(mode))?.tool;

/** A camera or radar (percent of the work area) as a point in metres. */
export const toMetres = (item: { x: number; y: number }, dimensions: Dimensions): Point => ({ x: item.x / 100 * dimensions.width, y: (1 - item.y / 100) * dimensions.depth });
/** A point in metres as the percentages a camera or radar stores. */
export const toPercent = (point: Point, dimensions: Dimensions): { x: number; y: number } => ({
  x: Math.round(clamp(point.x / dimensions.width * 100, 0, 100) * 100) / 100, y: Math.round(clamp((1 - point.y / dimensions.depth) * 100, 0, 100) * 100) / 100,
});

/**
 * Where a camera or radar faces, in degrees anticlockwise from east. Unless the operator has set it, it looks
 * from its position toward the middle of the work area.
 */
export function headingOf(item: Pick<Camera | Sensor, "x" | "y"> & { heading?: number }, dimensions: Dimensions): number {
  if (item.heading !== undefined && Number.isFinite(item.heading)) return ((item.heading % 360) + 360) % 360;
  const at = toMetres(item, dimensions), dx = dimensions.width / 2 - at.x, dy = dimensions.depth / 2 - at.y;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return 90;
  return ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
}

/** Points along an arc from `from` to `to` degrees (anticlockwise from east) around a centre. */
export function arcPoints(centre: Point, radius: number, from: number, to: number, steps = 24): Point[] {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = (from + (to - from) * index / steps) * Math.PI / 180;
    return { x: centre.x + Math.cos(angle) * radius, y: centre.y + Math.sin(angle) * radius };
  });
}
/** The corners of a detection sector: the apex, then the arc. */
export const sectorPoints = (apex: Point, heading: number, halfAngleDeg: number, rangeM: number): Point[] => [apex, ...arcPoints(apex, rangeM, heading - halfAngleDeg, heading + halfAngleDeg)];

/** Whether a point lies inside a sector. */
export function inSector(point: Point, apex: Point, heading: number, halfAngleDeg: number, rangeM: number): boolean {
  const dx = point.x - apex.x, dy = point.y - apex.y;
  if (Math.hypot(dx, dy) > rangeM) return false;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return Math.abs(((angle - heading + 540) % 360) - 180) <= halfAngleDeg;
}

/**
 * A radar target, reported in the radar's own frame (millimetres: `x` sideways, `y` ahead), as a point on the site.
 * The manual gives no orientation for the axes beyond its worked example, so which side positive `x` lies on is an
 * assumption (to the right of the way the radar faces, unless `mirror` is set) and is marked as unverified where shown.
 */
export function targetToSite(apex: Point, headingDeg: number, target: { x_mm: number; y_mm: number }, mirror = false): Point {
  const forward = target.y_mm / 1000, sideways = (mirror ? -1 : 1) * target.x_mm / 1000, h = headingDeg * Math.PI / 180;
  return { x: apex.x + Math.cos(h) * forward + Math.sin(h) * sideways, y: apex.y + Math.sin(h) * forward - Math.cos(h) * sideways };
}

/** A pleasant scale-bar length (1, 2, 5, 10, 20, 50 ... metres) for a view where one metre is `pixelsPerMetre` wide. */
export function niceScaleLength(pixelsPerMetre: number, targetPixels = 110): number {
  const raw = targetPixels / Math.max(pixelsPerMetre, 1e-6), magnitude = 10 ** Math.floor(Math.log10(raw)), normalized = raw / magnitude;
  return (normalized < 1.5 ? 1 : normalized < 3.5 ? 2 : normalized < 7.5 ? 5 : 10) * magnitude;
}

/** Keep a floating panel fully inside its container, whatever the container's size has become. */
export function clampPanel(position: Point, panel: { width: number; height: number }, container: { width: number; height: number }, margin = 8): Point {
  return { x: clamp(position.x, margin, Math.max(margin, container.width - panel.width - margin)), y: clamp(position.y, margin, Math.max(margin, container.height - panel.height - margin)) };
}

/** The zoom and offset (in pixels) that fit a rectangle of the site, with a margin, in a viewport. */
export function fitTransform(box: { minX: number; minY: number; maxX: number; maxY: number }, viewport: { width: number; height: number }, margin = 64): { scale: number; x: number; y: number } {
  const width = Math.max(1, box.maxX - box.minX), depth = Math.max(1, box.maxY - box.minY);
  const scale = Math.max(1, Math.min((viewport.width - margin * 2) / width, (viewport.height - margin * 2) / depth));
  // The plan is drawn with y up: a point (x, y) lands at (offset.x + x * scale, offset.y - y * scale).
  return { scale, x: (viewport.width - width * scale) / 2 - box.minX * scale, y: (viewport.height - depth * scale) / 2 + box.maxY * scale };
}

/** A metre distance as text: "3.25 m", or "45 cm" below a metre. */
export const formatMetres = (value: number): string => value < 1 ? `${Math.round(value * 100)} cm` : `${round2(value)} m`;

/** What is selected in the designer. A terrain or building may also have one of its corners selected. */
export type Selection =
  | { kind: "none" }
  | { kind: "terrain"; vertex?: number }
  | { kind: "building"; id: string; vertex?: number }
  | { kind: "opening" | "roofItem" | "wallLamp" | "feature" | "camera" | "sensor" | "device"; id: string };
export const NO_SELECTION: Selection = { kind: "none" };
export const sameSelection = (a: Selection, b: Selection): boolean => a.kind === b.kind && ("id" in a ? "id" in b && a.id === b.id : true);
