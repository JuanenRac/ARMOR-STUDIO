/**
 * Camera list helpers shared by the Studio views.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Camera } from "./domain";

/** Where a camera without a saved position is placed on the plan: four to a row. */
export const defaultCameraPosition = (index: number): { x: number; y: number } => ({ x: 15 + (index % 4) * 24, y: 20 + Math.floor(index / 4) * 45 });

/**
 * Replace the local list by what the server reports, keeping what only Studio
 * knows: whether a camera is switched on and where it sits on the plan.
 * An empty server list changes nothing (the server may simply be unreachable).
 */
/** The parts of a camera that belong to the design and not to the server (how it looks and where it points): kept from the local camera when the server list is read again. */
const DESIGN_KEYS = ["heading", "tilt", "z", "fov", "range", "kind", "pan", "tiltSweep", "mount", "nightRange", "lens", "opticalZoom", "digitalZoom"] as const;
const designOf = (local: Camera | undefined): Partial<Camera> => local ? Object.fromEntries(DESIGN_KEYS.filter(key => local[key] !== undefined).map(key => [key, local[key]])) : {};

export function mergeServerCameras(current: readonly Camera[], reported: ReadonlyArray<Omit<Camera, "enabled" | "x" | "y"> & Partial<Pick<Camera, "enabled" | "x" | "y">>>): Camera[] {
  if (!reported.length) return [...current];
  const known = new Map(current.map(camera => [camera.id, camera]));
  return reported.map((camera, index) => {
    const local = known.get(camera.id);
    const fallback = defaultCameraPosition(index);
    return { ...camera, enabled: local?.enabled ?? true, x: local?.x ?? fallback.x, y: local?.y ?? fallback.y, ...designOf(local) };
  });
}

/** Add or update one camera (a save from the configuration form). */
export function upsertCamera(current: readonly Camera[], camera: Camera): Camera[] {
  return current.some(item => item.id === camera.id) ? current.map(item => item.id === camera.id ? { ...item, ...camera } : item) : [...current, camera];
}

/** The id to select after a camera is removed: the first remaining one, or none. */
export const selectionAfterRemoval = (remaining: readonly Camera[], selectedId: string, removedId: string): string =>
  selectedId === removedId ? remaining[0]?.id ?? "" : selectedId;
