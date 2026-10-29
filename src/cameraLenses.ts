/**
 * A camera whose single stream carries two lenses (one above the other) is shown in the camera monitor as two windows, each one a camera of its own in the grid, tied to the
 * same real camera: the picture, the state, the buttons and the recording are the ones of the real camera, and each window is one half of the picture.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Camera } from "./domain";

export type LensSide = "upper" | "lower";
export const LENS_SIDES: readonly LensSide[] = ["upper", "lower"];
/** The identifier of the window of a lens: it stays in the characters that the settings accept for a camera. */
export const lensId = (id: string, side: LensSide): string => `${id}.${side}`;
/** The real camera behind the identifier of a window, or the identifier itself when it is not a window. */
export const sourceOf = (id: string): string => id.replace(/\.(upper|lower)$/, "");

/** The cameras of the monitor with each split camera replaced by its two windows, one after the other. */
export function withLensWindows(cameras: readonly Camera[], label: (side: LensSide) => string): Camera[] {
  return cameras.flatMap(camera => camera.layout === "split"
    ? LENS_SIDES.map(side => ({ ...camera, id: lensId(camera.id, side), name: `${camera.name} · ${label(side)}`, layout: "single" as const, lensView: side, sourceId: camera.id }))
    : [camera]);
}

/** What belongs to a real camera, copied to the ids of its windows (the stream address, whether it is reachable). */
export function forWindows<T>(cameras: readonly Camera[], values: Record<string, T>): Record<string, T> {
  const result: Record<string, T> = { ...values };
  for (const camera of cameras) if (camera.layout === "split" && camera.id in values) for (const side of LENS_SIDES) result[lensId(camera.id, side)] = values[camera.id];
  return result;
}
