/**
 * The kinds of camera the form offers, from a single fixed lens to a motorised body with several lenses. A kind only fills in what the camera can do (its layout and whether it pans, tilts
 * and zooms); every value can still be changed by hand afterwards.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { CameraTraits } from "./api/cameras";

export const CAMERA_PRESETS = ["fixed", "fixed_zoom", "pan_tilt", "ptz", "dual_fixed", "dual_ptz", "multi"] as const;
export type CameraPreset = (typeof CAMERA_PRESETS)[number];

const PRESET_TRAITS: Record<CameraPreset, Required<Pick<CameraTraits, "layout" | "ptz" | "zoom">>> = {
  fixed: { layout: "single", ptz: false, zoom: false },
  fixed_zoom: { layout: "single", ptz: false, zoom: true },
  pan_tilt: { layout: "single", ptz: true, zoom: false },
  ptz: { layout: "single", ptz: true, zoom: true },
  dual_fixed: { layout: "split", ptz: false, zoom: false },
  dual_ptz: { layout: "split", ptz: true, zoom: true },
  multi: { layout: "single", ptz: false, zoom: false },
};

export const isCameraPreset = (value: unknown): value is CameraPreset => typeof value === "string" && (CAMERA_PRESETS as readonly string[]).includes(value);
export const presetTraits = (preset: CameraPreset) => PRESET_TRAITS[preset];
export const presetKey = (preset: CameraPreset): string => `cam_preset_${preset}`;

/** Whether the buttons that turn the lens (and the ones that zoom it) are shown: a camera that never said what it can do keeps all of them, as before. */
export const canPanTilt = (camera: Pick<CameraTraits, "ptz">): boolean => camera.ptz !== false;
export const canZoom = (camera: Pick<CameraTraits, "zoom">): boolean => camera.zoom !== false;
/** A fixed camera with no zoom has nothing to move, so its movement toggle is not drawn at all. */
export const hasMovement = (camera: Pick<CameraTraits, "ptz" | "zoom">): boolean => canPanTilt(camera) || canZoom(camera);

export type LensDraft = { name: string; rtspPath: string; previewPath: string; ptz: boolean; zoom: boolean };
export const newLenses = (count: number, preset: CameraPreset = "multi"): LensDraft[] =>
  Array.from({ length: Math.max(2, Math.min(8, Math.round(count))) }, (_, index) => ({ name: `${index + 1}`, rtspPath: "", previewPath: "", ptz: presetTraits(preset).ptz, zoom: presetTraits(preset).zoom }));

/** The address of the camera's own configurator: the one noted, or else its web page on the address of the camera. */
export function cameraWebAddress(camera: { webUrl?: string; host: string }): string {
  if (camera.webUrl) return camera.webUrl;
  const host = camera.host.trim();
  return host && host !== "Not configured" ? `http://${host}/` : "";
}

/** One camera per lens, tied by `group`, each with its own stream and its own movement. */
export function lensCameras<T extends CameraTraits & { id: string; name: string }>(base: T, group: string, lenses: readonly LensDraft[]): (T & CameraTraits)[] {
  return lenses.map((lens, index) => ({
    ...base, id: `${group}-${index + 1}`, name: `${base.name} · ${lens.name}`, group, lensName: lens.name, preset: "multi", layout: "single" as const,
    rtspPath: lens.rtspPath, previewPath: lens.previewPath, ptz: lens.ptz, zoom: lens.zoom,
  }));
}
