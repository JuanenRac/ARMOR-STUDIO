import { describe, expect, it } from "vitest";
import { columnChoices, fitGrid, TILE_ASPECT } from "./cameraGrid";
import { GRID_SIZES } from "./domain";

describe("camera grid", () => {
  it("only makes full rectangles", () => {
    expect(columnChoices(6)).toEqual([1, 2, 3, 6]);
    expect(columnChoices(9)).toEqual([1, 3, 9]);
    expect(columnChoices(16)).toEqual([1, 2, 4, 8, 16]);
  });
  it("puts two cameras side by side on a wide frame and stacks them on a tall one", () => {
    expect(fitGrid(2, 1200, 640).columns).toBe(2);
    expect(fitGrid(2, 700, 900).columns).toBe(1);
  });
  it("lays every view count out as a familiar matrix on a desktop frame", () => {
    const shape = (count: number) => { const grid = fitGrid(count, 1300, 700); return `${grid.columns}x${grid.rows}`; };
    expect(shape(1)).toBe("1x1");
    expect(shape(4)).toBe("2x2");
    expect(shape(6)).toBe("3x2");
    expect(shape(9)).toBe("3x3");
    expect(shape(16)).toBe("4x4");
    expect(["4x2", "8x1"]).toContain(shape(8));
    expect(["4x3", "6x2"]).toContain(shape(12));
  });
  it("never lets the matrix outgrow its frame, for any view count and window", () => {
    for (const [width, height] of [[1920, 900], [1366, 620], [1100, 800], [900, 500], [700, 1000]] as const) {
      for (const count of GRID_SIZES) {
        const grid = fitGrid(count, width, height), gap = 12;
        expect(grid.columns * grid.rows, `${count} in ${width}x${height}`).toBe(count);
        expect(grid.columns * grid.tileWidth + gap * (grid.columns - 1)).toBeLessThanOrEqual(width + 0.5);
        expect(grid.rows * grid.tileHeight + gap * (grid.rows - 1)).toBeLessThanOrEqual(height + 0.5);
        expect(grid.tileWidth / grid.tileHeight).toBeCloseTo(TILE_ASPECT, 5);
      }
    }
  });
  it("uses one or two columns and scrolls on a phone", () => {
    expect(fitGrid(9, 380, 700)).toMatchObject({ columns: 1, scrolls: true });
    expect(fitGrid(9, 560, 700)).toMatchObject({ columns: 2, scrolls: true });
    expect(fitGrid(1, 380, 700)).toMatchObject({ columns: 1, scrolls: false });
  });
  it("copes with a frame that has not been measured yet", () => {
    expect(fitGrid(4, 0, 0)).toMatchObject({ tileWidth: 0, columns: 2, rows: 2 });
  });
});

describe("the full-screen wall", () => {
  it("is the chosen view laid out with no gap: 3 x 2 for six, 4 x 2 for eight, 3 x 3 for nine, 4 x 3 for twelve, 4 x 4 for sixteen", () => {
    const columns = (count: number) => fitGrid(count, 1920, 1080, 0).columns;
    expect([1, 2, 4, 6, 8, 9, 12, 16].map(columns)).toEqual([1, 2, 2, 3, 4, 3, 4, 4]);
  });
  it("keeps every picture 16:9 and fills the screen as far as that allows", () => {
    for (const count of [2, 4, 6, 8, 9, 12, 16]) {
      const layout = fitGrid(count, 1920, 1080, 0);
      expect(layout.tileWidth / layout.tileHeight).toBeCloseTo(16 / 9, 3);
      expect(layout.tileWidth * layout.columns).toBeLessThanOrEqual(1920.5);
      expect(layout.tileHeight * layout.rows).toBeLessThanOrEqual(1080.5);
    }
  });
});
