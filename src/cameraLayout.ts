/**
 * Which cameras the monitor shows and how many at once: the number of views and the camera of each place, kept in this browser so the screen is as it was left.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { GRID_SIZES, type GridSize } from "./domain";

export type CameraLayout = { gridSize: GridSize; slots: string[] };
export const LAYOUT_KEY = "armor-studio-camera-layout";

export function parseLayout(raw: string | null): CameraLayout | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CameraLayout>;
    if (!GRID_SIZES.includes(value.gridSize as GridSize)) return null;
    const slots = Array.isArray(value.slots) ? value.slots.filter((item): item is string => typeof item === "string").slice(0, 16) : [];
    return { gridSize: value.gridSize as GridSize, slots };
  } catch { return null; }
}

export function loadLayout(): CameraLayout | null {
  try { return parseLayout(window.localStorage.getItem(LAYOUT_KEY)); } catch { return null; }
}

export function saveLayout(layout: CameraLayout): void {
  try { window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch { /* storage may be blocked */ }
}

/**
 * The camera of each place of the grid: the one chosen for it when it still exists and is not already shown elsewhere, otherwise the first camera not shown yet;
 * a place with nothing left to show stays empty ("").
 */
export function resolveSlots(cameraIds: readonly string[], slots: readonly string[], size: number): string[] {
  const known = new Set(cameraIds), used = new Set<string>(), out: string[] = [];
  for (let index = 0; index < size; index++) {
    const wanted = slots[index];
    if (wanted && known.has(wanted) && !used.has(wanted)) { out.push(wanted); used.add(wanted); } else out.push("");
  }
  const spare = cameraIds.filter(id => !used.has(id));
  return out.map(id => id || spare.shift() || "");
}
