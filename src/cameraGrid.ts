/**
 * How the camera monitor fills its frame: for 1, 2, 4, 6, 8, 9, 12 or 16 views, the rows and columns that make every 16:9 tile as
 * large as the window allows, so the whole matrix is visible without scrolling and no picture is cropped.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export const TILE_ASPECT = 16 / 9;

export type FitGrid = { columns: number; rows: number; tileWidth: number; tileHeight: number; /** True when the tiles do not all fit and the frame scrolls (a narrow phone screen). */ scrolls: boolean };

/** The columns that give a full rectangle of `count` tiles (a divisor of it), fewest first. */
export function columnChoices(count: number): number[] {
  const choices: number[] = [];
  for (let columns = 1; columns <= count; columns += 1) if (count % columns === 0) choices.push(columns);
  return choices;
}

/**
 * The layout of `count` tiles in a frame of `width` x `height` pixels with `gap` between tiles. On a wide frame it picks the
 * arrangement with the largest tiles; on a phone-sized frame it stacks them in one or two columns and lets the frame scroll.
 */
export function fitGrid(count: number, width: number, height: number, gap = 12): FitGrid {
  const total = Math.max(1, Math.floor(count));
  if (!(width > 0) || !(height > 0)) return { columns: Math.min(total, 2), rows: Math.ceil(total / Math.min(total, 2)), tileWidth: 0, tileHeight: 0, scrolls: false };
  if (width < 640) {
    const columns = total === 1 || width < 440 ? 1 : 2, tileWidth = (width - gap * (columns - 1)) / columns;
    return { columns, rows: Math.ceil(total / columns), tileWidth, tileHeight: tileWidth / TILE_ASPECT, scrolls: total > columns };
  }
  let best: FitGrid | null = null;
  for (const columns of columnChoices(total)) {
    const rows = total / columns;
    const tileWidth = Math.min((width - gap * (columns - 1)) / columns, ((height - gap * (rows - 1)) / rows) * TILE_ASPECT);
    // The largest tile wins; among equals, the arrangement closer to the frame's own shape.
    if (!best || tileWidth > best.tileWidth + 0.5 || (Math.abs(tileWidth - best.tileWidth) <= 0.5 && Math.abs(columns / rows - width / height) < Math.abs(best.columns / best.rows - width / height))) {
      best = { columns, rows, tileWidth, tileHeight: tileWidth / TILE_ASPECT, scrolls: false };
    }
  }
  return best as FitGrid;
}
