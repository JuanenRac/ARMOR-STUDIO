/**
 * A field node with three radars covers 270 degrees: each LD2450 sees 120 degrees (plus or minus 60 from where it faces), and they
 * are mounted 75 degrees apart, so neighbouring radars overlap by 45 degrees and the two outer ones end 270 degrees apart. Three LD2461
 * (plus or minus 45) fill the same 270 degrees exactly, 90 degrees apart, with no overlap.
 * This builds the three sensors of such a node, already wired to it: same place, facings a quarter turn short of each other,
 * channels 1, 2 and 3 (the radar number the node reports).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Sensor } from "../domain";
import { RADAR, RADAR_MODELS } from "./model";

export const NODE_RADARS = 3;
/** How many degrees apart the neighbouring radars face: 270 = 2 x half angle + 2 x spacing, so spacing = (270 - 120) / 2. */
export const NODE_SPACING_DEG = (270 - 2 * RADAR.halfAngleDeg) / 2;
/** The same for a node of another sensor model: 270 = 2 x half angle + 2 x spacing. */
export const nodeSpacingDeg = (kind: Sensor["kind"]): number => (270 - 2 * RADAR_MODELS[kind].halfAngleDeg) / 2;

const wrap = (degrees: number): number => ((Math.round(degrees) % 360) + 360) % 360;

export type Node270Options = { name: string; node: string; x: number; y: number; heading: number; z?: number; kind?: Sensor["kind"] };

/** The three radars of a 270 degree node facing `heading` in the middle, left one the first (anticlockwise from it), right one the third. */
export function node270Sensors(existing: readonly Sensor[], options: Node270Options): Sensor[] {
  const taken = new Set(existing.map(sensor => sensor.id));
  let next = existing.length + 1;
  const freshId = (): string => {
    let id = `sensor-${String(next).padStart(2, "0")}`;
    while (taken.has(id)) { next += 1; id = `sensor-${String(next).padStart(2, "0")}`; }
    taken.add(id); next += 1;
    return id;
  };
  const name = options.name.trim().slice(0, 60) || options.node;
  const kind = options.kind ?? "LD2450", spacing = nodeSpacingDeg(kind);
  return Array.from({ length: NODE_RADARS }, (_, index): Sensor => {
    const offset = (index - 1) * spacing;   // -75, 0, +75 for the LD2450 (-90, 0, +90 for the LD2461): radar 1 on the left of the middle one, radar 3 on the right
    return {
      id: freshId(), name: `${name} ${index + 1}`, kind, x: options.x, y: options.y,
      heading: wrap(options.heading - offset), node: options.node, channel: index + 1, ...(options.z !== undefined ? { z: options.z } : {}),
    };
  });
}
