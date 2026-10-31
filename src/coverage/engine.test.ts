import { describe, expect, it } from "vitest";
import { analyseCoverage } from "./engine";
import { inSectorOf, insidePolygon } from "./geometry";
import { toMetres, headingOf, radarView } from "../designer/model";
import type { SiteModel } from "../designer/ops";
import type { Building, Opening, Sensor } from "../domain";

const dimensions = { width: 40, depth: 40, height: 4 };
const roof = { style: "flat", slope: 0, overhang: 0, ridge: 0 } as const;
const empty: SiteModel = { terrain: { points: [] }, buildings: [], openings: [], roofItems: [], wallLamps: [], features: [], cameras: [], sensors: [], placements: [] };
const box = (id: string, x: number, y: number, w: number, h: number): Building => ({ id, name: id, points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }], base: 0, floors: [2.8], roof, thickness: 0.2 });
// a radar given in metres on the 40 m x 40 m work area (the plan keeps percentages)
const radar = (id: string, x: number, y: number, heading: number, kind: Sensor["kind"] = "LD2450"): Sensor => ({ id, name: id, x: x / 40 * 100, y: (1 - y / 40) * 100, kind, heading });
const door = (id: string, buildingId: string, edge: number, offset: number, extra: Partial<Opening> = {}): Opening => ({ id, buildingId, edge, floor: 0, kind: "door", offset, width: 1, height: 2.1, sill: 0, ...extra });

// a small seeded generator, so a failure can be repeated
function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
}

describe("coverage of the plan", () => {
  it("says nothing is seen when there is no radar, and a room is unwatched", () => {
    const report = analyseCoverage({ ...empty, buildings: [box("b1", 10, 10, 8, 6)] }, dimensions);
    expect(report.zones[0].coveredM2).toBe(0);
    expect(report.warnings.map(w => w.code)).toContain("zone_unwatched");
  });

  it("is the same twice", () => {
    const model = { ...empty, buildings: [box("b1", 10, 10, 8, 6)], sensors: [radar("r1", 10.3, 10.3, 35)], openings: [door("d1", "b1", 0, 3)] };
    expect(JSON.stringify(analyseCoverage(model, dimensions))).toBe(JSON.stringify(analyseCoverage(model, dimensions)));
  });

  it("sees the whole of a small room from a corner and finds no blind spot", () => {
    const model = { ...empty, buildings: [box("b1", 10, 10, 3, 3)], sensors: [radar("r1", 10.3, 10.3, 45)] };
    const report = analyseCoverage(model, dimensions, { marginPercent: 0 });
    expect(report.zones[0].blindSpots).toEqual([]);
    expect(report.zones[0].coveredRatio).toBeGreaterThan(0.9);
  });

  it("finds the far part of a long room as a blind spot, with a suggestion inside the building", () => {
    const model = { ...empty, buildings: [box("b1", 5, 10, 20, 4)], sensors: [radar("r1", 5.2, 12, 0)] };
    const report = analyseCoverage(model, dimensions);
    const spot = report.zones[0].blindSpots[0];
    expect(spot.areaM2).toBeGreaterThan(5);
    expect(spot.centre.x).toBeGreaterThan(14);
    expect(insidePolygon(spot.suggestion, model.buildings[0].points)).toBe(true);
  });

  it("does not see through a wall", () => {
    const model = { ...empty, buildings: [box("b1", 10, 10, 6, 6)], sensors: [radar("outside", 8, 13, 0)] };
    const report = analyseCoverage(model, dimensions, { marginPercent: 0 });
    expect(report.zones[0].coveredM2).toBe(0);
  });

  it("takes a door as guarded by its contact, by a radar that sees it, or by nothing", () => {
    const model = {
      ...empty, buildings: [box("b1", 10, 10, 8, 6)], sensors: [radar("r1", 11, 11, 0)],
      openings: [door("d-contact", "b1", 2, 3, { contact: true }), door("d-radar", "b1", 0, 1.5), door("d-none", "b1", 2, 6)],
    };
    const states = Object.fromEntries(analyseCoverage(model, dimensions).openings.map(opening => [opening.id, opening.state]));
    expect(states["d-contact"]).toBe("contact");
    expect(states["d-radar"]).toBe("presence");
    expect(states["d-none"]).toBe("none");
  });

  it("warns about a door nothing guards, with a place for a radar", () => {
    const model = { ...empty, buildings: [box("b1", 10, 10, 8, 6)], openings: [door("d1", "b1", 0, 3)] };
    const warning = analyseCoverage(model, dimensions).warnings.find(w => w.code === "opening_unguarded");
    expect(warning?.args).toEqual(["door", "d1"]);
    expect(insidePolygon(warning!.suggestion!, model.buildings[0].points)).toBe(true);
  });

  it("does not check the doors of other floors, and says how many", () => {
    const model = { ...empty, buildings: [box("b1", 10, 10, 8, 6)], openings: [door("up", "b1", 0, 3, { floor: 1 })] };
    const report = analyseCoverage(model, dimensions);
    expect(report.notChecked.openings).toBe(1);
    expect(report.openings).toEqual([]);
  });

  it("points out two radars that see the same floor and a radar the others make useless", () => {
    const model = { ...empty, buildings: [box("b1", 10, 10, 4, 4)], sensors: [radar("a", 10.2, 10.2, 45, "LD2461"), radar("b", 10.2, 10.2, 45, "LD2461")] };
    const report = analyseCoverage(model, dimensions, { marginPercent: 0 });
    const codes = report.warnings.map(w => w.code);
    expect(codes).toContain("zone_overlap");
    expect(report.sensors.every(sensor => sensor.redundant)).toBe(true);
  });

  it("a bigger margin never shows more covered", () => {
    const model = { ...empty, buildings: [box("b1", 10, 10, 12, 8)], sensors: [radar("r1", 10.3, 14, 0)] };
    const covered = [0, 10, 20, 30].map(marginPercent => analyseCoverage(model, dimensions, { marginPercent }).zones[0].coveredM2);
    for (let i = 1; i < covered.length; i += 1) expect(covered[i]).toBeLessThanOrEqual(covered[i - 1]);
  });

  it("makes the cells coarser, and says so, when the buildings are too big for the limit", () => {
    const report = analyseCoverage({ ...empty, buildings: [box("b1", 0, 0, 30, 30)], sensors: [radar("r1", 1, 1, 45)] }, dimensions, { maxCells: 500 });
    expect(report.cellM).toBeGreaterThan(0.25);
    expect(report.warnings.map(w => w.code)).toContain("cell_coarsened");
  });
});

describe("properties of the coverage (fixed seed)", () => {
  it("never calls a cell covered when no radar sector, shrunk by the margin, holds the whole of it", () => {
    const random = generator(20240611);
    for (let round = 0; round < 40; round += 1) {
      const w = 4 + random() * 14, h = 3 + random() * 10, x = 5 + random() * 10, y = 5 + random() * 10;
      const building = box("b1", x, y, w, h);
      const sensors = Array.from({ length: 1 + Math.floor(random() * 3) }, (_, i) => radar(`r${i}`, x + random() * w, y + random() * h, random() * 360, random() < 0.5 ? "LD2450" : "LD2461"));
      const margin = Math.floor(random() * 31);
      const report = analyseCoverage({ ...empty, buildings: [building], sensors }, dimensions, { marginPercent: margin });
      const cell = report.cellM, blind = new Set(report.zones[0].blindCells.map(c => `${c.x}:${c.y}`));
      // every cell that is not blind must have a radar that sees its centre inside the shrunk sector
      const xs = building.points.map(p => p.x), ys = building.points.map(p => p.y);
      const minX = Math.min(...xs), minY = Math.min(...ys);
      let covered = 0;
      for (let cx = minX; cx < Math.max(...xs); cx += cell) for (let cy = minY; cy < Math.max(...ys); cy += cell) {
        const centre = { x: cx + cell / 2, y: cy + cell / 2 };
        if (!insidePolygon(centre, building.points) || blind.has(`${Number(cx.toFixed(2))}:${Number(cy.toFixed(2))}`)) continue;
        covered += 1;
        const seen = sensors.some(sensor => {
          const view = radarView(sensor), keep = 1 - margin / 100;
          return inSectorOf(centre, toMetres(sensor, dimensions), headingOf(sensor, dimensions), view.halfAngleDeg * keep, view.rangeM * keep);
        });
        expect(seen, `round ${round} cell ${centre.x},${centre.y}`).toBe(true);
      }
      expect(covered * cell * cell).toBeCloseTo(report.zones[0].coveredM2, 1);
    }
  });

  it("never covers anything beyond the range of the radar", () => {
    const random = generator(7);
    for (let round = 0; round < 25; round += 1) {
      const building = box("b1", 5, 5, 30, 30), sensor = radar("r1", 5.3 + random() * 2, 5.3 + random() * 2, random() * 360);
      const report = analyseCoverage({ ...empty, buildings: [building], sensors: [sensor] }, dimensions, { marginPercent: 0 });
      const apex = toMetres(sensor, dimensions);
      const blind = new Set(report.zones[0].blindCells.map(c => `${c.x}:${c.y}`));
      for (let cx = 5; cx < 35; cx += report.cellM) for (let cy = 5; cy < 35; cy += report.cellM) {
        if (blind.has(`${Number(cx.toFixed(2))}:${Number(cy.toFixed(2))}`)) continue;
        expect(Math.hypot(cx + report.cellM / 2 - apex.x, cy + report.cellM / 2 - apex.y)).toBeLessThanOrEqual(radarView(sensor).rangeM + 1e-6);
      }
    }
  });

  it("leaves the model alone", () => {
    const model = { ...empty, buildings: [box("b1", 10, 10, 8, 6)], sensors: [radar("r1", 11, 11, 0)], openings: [door("d1", "b1", 0, 2)] };
    const before = JSON.stringify(model);
    analyseCoverage(model, dimensions);
    expect(JSON.stringify(model)).toBe(before);
  });
});
