/**
 * Which camera looks at the place a radar watches: an intruder seen by a radar opens that camera, not only the radar's map. The answer comes from the plan the person drew (where the
 * radar and the cameras stand, where each camera faces, how wide and how far it sees) - it is the same fan that the plan draws for a camera.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Camera, Sensor } from "../domain";

const DEFAULT_FOV = 90, DEFAULT_RANGE = 12;

/** Degrees between two directions, 0 to 180. */
const between = (a: number, b: number): number => { const d = Math.abs(((a - b) % 360 + 540) % 360 - 180); return d; };

/** Whether a point is inside what a camera sees. A motorised camera covers the whole sweep it can turn through. */
export function cameraSees(camera: Camera, point: { x: number; y: number }, middle: { x: number; y: number }): boolean {
  const dx = point.x - camera.x, dy = point.y - camera.y;
  const distance = Math.hypot(dx, dy);
  if (distance > (camera.range ?? DEFAULT_RANGE)) return false;
  if (distance < 0.05) return true;
  // The plan has y growing downward; headings run anticlockwise from east, like the plan's own drawing of the fan.
  const bearing = (Math.atan2(-dy, dx) * 180) / Math.PI;
  const facing = camera.heading ?? (Math.atan2(-(middle.y - camera.y), middle.x - camera.x) * 180) / Math.PI;
  const half = camera.kind === "ptz" ? Math.min(180, (camera.pan ?? 360) / 2 + (camera.fov ?? DEFAULT_FOV) / 2) : (camera.fov ?? DEFAULT_FOV) / 2;
  return between(bearing, facing) <= half;
}

/** The camera (that is switched on) that sees the radar of this node, the nearest one if several do. */
export function cameraCoveringNode(nodeId: string, sensors: readonly Sensor[], cameras: readonly Camera[], middle: { x: number; y: number } = { x: 0, y: 0 }): string | undefined {
  const radars = sensors.filter(sensor => sensor.node === nodeId);
  let best: { id: string; distance: number } | undefined;
  for (const radar of radars) {
    for (const camera of cameras) {
      if (!camera.enabled || !cameraSees(camera, radar, middle)) continue;
      const distance = Math.hypot(radar.x - camera.x, radar.y - camera.y);
      if (!best || distance < best.distance) best = { id: camera.id, distance };
    }
  }
  return best?.id;
}
