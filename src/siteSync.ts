/**
 * The site design as one document the server keeps for every browser and the phone: what goes into it, and how one that came back is
 * checked and put on top of the local state. Kept apart from React so it is unit-tested.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Camera } from "./domain";
import { parseStudioSettings, type StudioSettings } from "./settings";

export type SiteDesign = Pick<StudioSettings, "dimensions" | "terrain" | "buildings" | "openings" | "roofItems" | "wallLamps" | "features" | "sensors" | "placements" | "cameras">;
/** The parts of a camera that belong to the design (its place and how it looks); the rest of a camera is the server's own. */
type CameraPlace = { x: number; y: number; heading?: number; tilt?: number; z?: number; fov?: number; range?: number; kind?: "ptz"; lens?: string; opticalZoom?: number; digitalZoom?: number; pan?: number; tiltSweep?: number; mount?: string; nightRange?: number };

export const SITE_SCHEMA = "armor-studio/site/1";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** The document to store: the design only, never a camera's address or credentials. */
export function buildSiteDoc(design: SiteDesign): Record<string, unknown> {
  const cameraPlacements: Record<string, CameraPlace> = {};
  for (const camera of design.cameras) {
    cameraPlacements[camera.id] = { x: camera.x, y: camera.y, ...(camera.heading !== undefined ? { heading: camera.heading } : {}), ...(camera.tilt !== undefined ? { tilt: camera.tilt } : {}), ...(camera.z !== undefined ? { z: camera.z } : {}), ...(camera.fov !== undefined ? { fov: camera.fov } : {}), ...(camera.kind === "ptz" ? { kind: "ptz" as const } : {}), ...(camera.pan !== undefined ? { pan: camera.pan } : {}), ...(camera.tiltSweep !== undefined ? { tiltSweep: camera.tiltSweep } : {}), ...(camera.mount !== undefined ? { mount: camera.mount } : {}), ...(camera.nightRange !== undefined ? { nightRange: camera.nightRange } : {}), ...(camera.lens !== undefined ? { lens: camera.lens } : {}), ...(camera.opticalZoom !== undefined ? { opticalZoom: camera.opticalZoom } : {}), ...(camera.digitalZoom !== undefined ? { digitalZoom: camera.digitalZoom } : {}), ...(camera.range !== undefined ? { range: camera.range } : {}) };
  }
  const { dimensions, terrain, buildings, openings, roofItems, wallLamps, features, sensors, placements } = design;
  return { schema: SITE_SCHEMA, dimensions, terrain, buildings, openings, roofItems, wallLamps, features, sensors, placements, cameraPlacements };
}

/** A stable text of a document, to tell whether the design changed since it was last saved. */
export const siteDocKey = (design: SiteDesign): string => JSON.stringify(buildSiteDoc(design), (_key, value: unknown) =>
  isRecord(value) ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)) : value);

/**
 * A stored document over the current state: every part that is present and valid replaces the local one, the rest stays. Cameras are
 * never added or removed by it (the server owns which cameras exist); only their places are set.
 */
export function applySiteDoc(document: unknown, current: SiteDesign): SiteDesign {
  if (!isRecord(document)) return current;
  const parsed = parseStudioSettings(JSON.stringify(document));
  const places = isRecord(document.cameraPlacements) ? document.cameraPlacements : {};
  const cameras = current.cameras.map((camera): Camera => {
    const place = places[camera.id];
    if (!isRecord(place) || !finite(place.x) || !finite(place.y)) return camera;
    const next: Camera = { ...camera, x: Math.min(100, Math.max(0, place.x)), y: Math.min(100, Math.max(0, place.y)) };
    delete next.heading; delete next.tilt; delete next.z; delete next.fov; delete next.range; delete next.kind; delete next.pan; delete next.tiltSweep; delete next.mount; delete next.nightRange; delete next.lens; delete next.opticalZoom; delete next.digitalZoom;
    if (finite(place.heading)) next.heading = place.heading;
    if (finite(place.tilt)) next.tilt = place.tilt;
    if (finite(place.z)) next.z = place.z;
    if (finite(place.fov)) next.fov = Math.min(180, Math.max(20, place.fov));
    if (finite(place.range)) next.range = Math.min(60, Math.max(2, place.range));
    if (place.kind === "ptz") next.kind = "ptz";
    if (finite(place.pan)) next.pan = Math.min(360, Math.max(90, place.pan));
    if (finite(place.tiltSweep)) next.tiltSweep = Math.min(180, Math.max(30, place.tiltSweep));
    if (place.mount === "wall" || place.mount === "ceiling" || place.mount === "pole" || place.mount === "ground") next.mount = place.mount;
    if (finite(place.nightRange)) next.nightRange = Math.min(100, Math.max(1, place.nightRange));
    if (place.lens === "varifocal" || place.lens === "motorised") next.lens = place.lens;
    if (finite(place.opticalZoom) && next.lens) next.opticalZoom = Math.min(60, Math.max(1, Math.round(place.opticalZoom)));
    if (finite(place.digitalZoom)) next.digitalZoom = Math.min(32, Math.max(1, Math.round(place.digitalZoom)));
    return next;
  });
  return {
    dimensions: parsed.dimensions ?? current.dimensions, terrain: parsed.terrain ?? current.terrain, buildings: parsed.buildings ?? current.buildings,
    openings: parsed.openings ?? current.openings, roofItems: parsed.roofItems ?? current.roofItems, wallLamps: parsed.wallLamps ?? current.wallLamps,
    features: parsed.features ?? current.features, sensors: parsed.sensors ?? current.sensors, placements: parsed.placements ?? current.placements, cameras,
  };
}
