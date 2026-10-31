import { describe, expect, it } from "vitest";
import { analyseCoverage, DEFAULT_OPTIONS } from "./engine";
import { levelOf } from "./levels";
import { blindToDraw } from "./CoveragePanel";
import { SITE_TEMPLATES, addSiteTemplate } from "./siteTemplates";
import { parseStudioSettings, serializeStudioSettings, type StudioSettings } from "../settings";
import { parsePrefs, DEFAULT_PREFS } from "../prefs";
import { toMetres } from "../designer/model";
import type { SiteModel } from "../designer/ops";
import type { Building, Opening, Sensor } from "../domain";

const dimensions = { width: 40, depth: 40, height: 4 };
const roof = { style: "flat", slope: 0, overhang: 0, ridge: 0 } as const;
const empty: SiteModel = { terrain: { points: [] }, buildings: [], openings: [], roofItems: [], wallLamps: [], features: [], cameras: [], sensors: [], placements: [] };
const box = (id: string, x: number, y: number, w: number, h: number, floors: number[] = [2.8]): Building => ({ id, name: id, points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }], base: 0, floors, roof, thickness: 0.2 });
const radar = (id: string, x: number, y: number, heading: number, extra: Partial<Sensor> = {}): Sensor => ({ id, name: id, x: x / 40 * 100, y: (1 - y / 40) * 100, kind: "LD2450", heading, ...extra });
const window1 = (id: string, floor: number): Opening => ({ id, buildingId: "b1", edge: 0, floor, kind: "window", offset: 3, width: 1, height: 1.2, sill: 0.9 });

describe("characterization: the flat check as it was", () => {
  const room = { ...empty, buildings: [box("b1", 10, 10, 8, 6)], sensors: [radar("r1", 14, 10.3, 90)] };

  it("keeps the figures of a radar on the south wall of a room", () => {
    const report = analyseCoverage(room, dimensions);
    const zone = report.zones[0];
    expect(zone.floor).toBeUndefined();
    expect([zone.areaM2, zone.coveredM2, zone.blindM2, zone.blindCells.length]).toEqual([48, 23.88, 24.13, 386]);
    expect(report.warnings.map(w => w.code)).toEqual(["blind_spot", "blind_spot"]);
    expect(zone.blindDraw).toBeUndefined();
  });

  it("counts the squares next to the radar as blind whole when one corner is out of its field", () => {
    const zone = analyseCoverage(room, dimensions).zones[0];
    const near = zone.blindCells.filter(cell => Math.hypot(cell.x + cell.size / 2 - 14, cell.y + cell.size / 2 - 10.3) < 1.2);
    expect(near).toHaveLength(32);
  });

  it("ignores floors: a radar high up in a two-floor building counts for the whole footprint, and it says so", () => {
    const tall = { ...empty, buildings: [box("b1", 10, 10, 8, 6, [2.8, 2.8])], sensors: [radar("r1", 14, 10.3, 90, { z: 4.3 })] };
    const report = analyseCoverage(tall, dimensions);
    expect(report.zones).toHaveLength(1);
    expect(report.zones[0].coveredM2).toBe(23.88);
    expect(report.warnings.map(w => w.code)).toContain("upper_floors");
  });

  it("has all the new options off by default", () => {
    expect([DEFAULT_OPTIONS.floors, DEFAULT_OPTIONS.threeD, DEFAULT_OPTIONS.refine]).toEqual([false, false, false]);
    expect([DEFAULT_PREFS.coverageFloors, DEFAULT_PREFS.coverage3d, DEFAULT_PREFS.coverageRefine]).toEqual([false, false, false]);
  });
});

describe("the floors one by one", () => {
  const two = (sensors: Sensor[], openings: Opening[] = []): SiteModel => ({ ...empty, buildings: [box("b1", 10, 10, 8, 6, [2.8, 2.8])], sensors, openings });
  const options = { floors: true };

  it("gives a zone for every floor, and an upper floor with no radar is unwatched", () => {
    const report = analyseCoverage(two([radar("r1", 14, 10.3, 90, { floor: 0 })]), dimensions, options);
    expect(report.zones.map(zone => zone.floor)).toEqual([0, 1]);
    expect(report.zones[0].coveredM2).toBe(23.88);
    expect(report.zones[1].coveredM2).toBe(0);
    expect(report.warnings.filter(w => w.code === "zone_unwatched").map(w => w.floor)).toEqual([1]);
    expect(report.warnings.map(w => w.code)).not.toContain("upper_floors");
  });

  it("follows the mounting height when the floor is not given", () => {
    const report = analyseCoverage(two([radar("r1", 14, 10.3, 90, { z: 4.3 })]), dimensions, options);
    expect(report.zones[0].coveredM2).toBe(0);
    expect(report.zones[1].coveredM2).toBe(23.88);
  });

  it("an explicit floor wins over the height", () => {
    const report = analyseCoverage(two([radar("r1", 14, 10.3, 90, { z: 4.3, floor: 0 })]), dimensions, options);
    expect(report.zones.map(zone => zone.coveredM2)).toEqual([23.88, 0]);
  });

  it("assumes the ground floor for a radar with neither floor nor height, and says so only when the building has several floors", () => {
    const many = analyseCoverage(two([radar("r1", 14, 10.3, 90)]), dimensions, options);
    expect(many.zones.map(zone => zone.coveredM2)).toEqual([23.88, 0]);
    expect(many.warnings.map(w => w.code)).toContain("sensor_floor_assumed");
    const single = analyseCoverage({ ...empty, buildings: [box("b1", 10, 10, 8, 6)], sensors: [radar("r1", 14, 10.3, 90)] }, dimensions, options);
    expect(single.warnings.map(w => w.code)).not.toContain("sensor_floor_assumed");
    expect(single.zones[0].coveredM2).toBe(23.88);
  });

  it("a floor beyond the building sees nothing and does not break", () => {
    const report = analyseCoverage(two([radar("r1", 14, 10.3, 90, { floor: 7 })]), dimensions, options);
    expect(report.zones.map(zone => zone.coveredM2)).toEqual([0, 0]);
  });

  it("one floor with one radar is the same as the flat check", () => {
    const flat = analyseCoverage({ ...empty, buildings: [box("b1", 10, 10, 8, 6)], sensors: [radar("r1", 14, 10.3, 90)] }, dimensions);
    const floors = analyseCoverage({ ...empty, buildings: [box("b1", 10, 10, 8, 6)], sensors: [radar("r1", 14, 10.3, 90)] }, dimensions, options);
    expect(floors.zones[0].blindCells).toEqual(flat.zones[0].blindCells);
    expect(floors.zones[0].coveredM2).toBe(flat.zones[0].coveredM2);
  });

  it("checks the windows of every floor against the radars of that floor", () => {
    const model = two([radar("r1", 13.5, 12, 270, { floor: 1 })], [window1("w0", 0), window1("w1", 1)]);
    const report = analyseCoverage(model, dimensions, options);
    const states = Object.fromEntries(report.openings.map(opening => [opening.id, opening.state]));
    expect(states).toEqual({ w0: "none", w1: "presence" });
    expect(report.notChecked.openings).toBe(0);
  });

  it("without the option an upper window is not checked, as before", () => {
    const report = analyseCoverage(two([radar("r1", 14, 10.6, 90)], [window1("w1", 1)]), dimensions);
    expect(report.openings).toHaveLength(0);
    expect(report.notChecked.openings).toBe(1);
  });

  it("is the same twice and leaves the model alone", () => {
    const model = two([radar("r1", 14, 10.3, 90, { floor: 1 })], [window1("w1", 1)]);
    const before = JSON.stringify(model);
    expect(JSON.stringify(analyseCoverage(model, dimensions, { ...options, threeD: true, refine: true }))).toBe(JSON.stringify(analyseCoverage(model, dimensions, { ...options, threeD: true, refine: true })));
    expect(JSON.stringify(model)).toBe(before);
  });

  it("never sees more with the floors on than the flat check sees in total", () => {
    const model = two([radar("r1", 14, 10.3, 90, { floor: 0 }), radar("r2", 12, 15.5, 270, { floor: 1 })]);
    const flat = analyseCoverage(model, dimensions).zones[0].coveredM2;
    const per = analyseCoverage(model, dimensions, options).zones.map(zone => zone.coveredM2);
    for (const covered of per) expect(covered).toBeLessThanOrEqual(flat + 1e-9);
  });
});

describe("the levels of radars and cameras", () => {
  const model: SiteModel = { ...empty, buildings: [{ ...box("b1", 10, 10, 8, 6, [2.8, 2.8, 2.8]), base: 1 }] };
  const at = (x: number, y: number) => ({ x: x / 40 * 100, y: (1 - y / 40) * 100 });
  it("takes the floor from the height", () => {
    expect(levelOf(model, { ...at(14, 12), z: 1.5 }, dimensions, 1.5)).toMatchObject({ floor: 0, assumed: false });
    expect(levelOf(model, { ...at(14, 12), z: 4.2 }, dimensions, 1.5)).toMatchObject({ floor: 1 });
    expect(levelOf(model, { ...at(14, 12), z: 7 }, dimensions, 1.5)).toMatchObject({ floor: 2 });
  });
  it("puts a radar with only a floor at the default height of that floor", () => {
    expect(levelOf(model, { ...at(14, 12), floor: 2 }, dimensions, 1.5).z).toBeCloseTo(1 + 5.6 + 1.5);
  });
  it("assumes the ground floor outside any building", () => {
    expect(levelOf(model, at(30, 30), dimensions, 1.5)).toEqual({ floor: 0, z: 1.5, assumed: false });
    expect(levelOf(model, { ...at(30, 30), z: 8 }, dimensions, 1.5).floor).toBe(0);
  });
  it("ignores a floor that is not a whole non-negative number", () => {
    expect(levelOf(model, { ...at(14, 12), floor: -1, z: 4.2 }, dimensions, 1.5).floor).toBe(1);
    expect(levelOf(model, { ...at(14, 12), floor: 1.5, z: 1.5 }, dimensions, 1.5).floor).toBe(0);
  });
});

describe("the simple 3D check", () => {
  const room = (sensor: Sensor): SiteModel => ({ ...empty, buildings: [box("b1", 10, 10, 8, 6)], sensors: [sensor] });
  const covered = (sensor: Sensor, options: object): number => analyseCoverage(room(sensor), dimensions, options).zones[0].coveredM2;

  it("never sees more than the flat check", () => {
    for (const z of [0.2, 1.5, 2.6]) for (const tilt of [0, 20, 45]) expect(covered(radar("r", 14, 10.3, 90, { z, tilt }), { threeD: true })).toBeLessThanOrEqual(covered(radar("r", 14, 10.3, 90, { z, tilt }), {}) + 1e-9);
  });
  it("a radar at the height of a person is as the flat check", () => {
    expect(covered(radar("r", 14, 10.3, 90, { z: 1 }), { threeD: true })).toBe(covered(radar("r", 14, 10.3, 90, { z: 1 }), {}));
  });
  it("a radar mounted high and looking level loses what is under its vertical field", () => {
    const flat = covered(radar("r", 14, 10.3, 90, { z: 2.7 }), {}), three = covered(radar("r", 14, 10.3, 90, { z: 2.7 }), { threeD: true });
    expect(three).toBeLessThan(flat);
  });
  it("tilting it down gives back the near floor", () => {
    expect(covered(radar("r", 14, 10.3, 90, { z: 2.7, tilt: 30 }), { threeD: true })).toBeGreaterThan(covered(radar("r", 14, 10.3, 90, { z: 2.7, tilt: 0 }), { threeD: true }));
  });
  it("a radar on another floor sees nothing of the ground floor plane", () => {
    expect(covered(radar("r", 14, 10.3, 90, { z: 9 }), { threeD: true })).toBe(0);
  });
});

describe("drawing the squares next to a radar", () => {
  const room: SiteModel = { ...empty, buildings: [box("b1", 10, 10, 8, 6)], sensors: [radar("r1", 14, 10.3, 90)] };
  const flat = analyseCoverage(room, dimensions), fine = analyseCoverage(room, dimensions, { refine: true });

  it("never changes a figure or a warning", () => {
    const { blindDraw: _draw, ...zone } = fine.zones[0];
    expect(zone).toEqual(flat.zones[0]);
    expect(fine.warnings).toEqual(flat.warnings);
    expect(fine.sensors).toEqual(flat.sensors);
  });
  it("paints less than the whole blind squares, never more area", () => {
    const area = (cells: Array<{ size: number }>) => cells.reduce((sum, cell) => sum + cell.size * cell.size, 0);
    expect(area(fine.zones[0].blindDraw!)).toBeLessThan(area(flat.zones[0].blindCells));
    expect(area(fine.zones[0].blindDraw!)).toBeGreaterThan(0);
  });
  it("does not paint a part that a radar sees", () => {
    const apex = toMetres(room.sensors[0], dimensions);
    for (const part of fine.zones[0].blindDraw!) {
      const centre = { x: part.x + part.size / 2, y: part.y + part.size / 2 };
      // a part that is well inside the (shrunk) field of the radar would be a seen part painted as blind
      const inside = Math.hypot(centre.x - apex.x, centre.y - apex.y) < 3 && Math.abs(Math.atan2(centre.y - apex.y, centre.x - apex.x) * 180 / Math.PI - 90) < 40;
      if (inside) {
        const whole = flat.zones[0].blindCells.some(cell => centre.x >= cell.x && centre.x <= cell.x + cell.size && centre.y >= cell.y && centre.y <= cell.y + cell.size);
        expect(whole).toBe(true);
      }
    }
  });
  it("every painted part lies inside a square that was blind", () => {
    for (const part of fine.zones[0].blindDraw!) {
      expect(flat.zones[0].blindCells.some(cell => part.x >= cell.x - 1e-6 && part.y >= cell.y - 1e-6 && part.x + part.size <= cell.x + cell.size + 1e-6 && part.y + part.size <= cell.y + cell.size + 1e-6)).toBe(true);
    }
  });
  it("the plan gets the finer drawing only when it is on, and the cautious union when all floors are shown", () => {
    expect(blindToDraw(flat, -1)).toEqual(flat.zones[0].blindCells);
    expect(blindToDraw(fine, -1)).toEqual(fine.zones[0].blindDraw);
    const two = analyseCoverage({ ...empty, buildings: [box("b1", 10, 10, 8, 6, [2.8, 2.8])], sensors: [radar("r1", 14, 10.3, 90, { floor: 0 })] }, dimensions, { floors: true });
    expect(blindToDraw(two, 1).length).toBe(two.zones[1].blindCells.length);
    expect(blindToDraw(two, 0).length).toBe(two.zones[0].blindCells.length);
    expect(blindToDraw(two, -1).length).toBe(two.zones[1].blindCells.length);   // the cells of floor 1 cover those of floor 0
  });
});

describe("the floor of a radar in the stored design", () => {
  const site = (sensor: object) => JSON.stringify({ sensors: [{ id: "s1", name: "R", kind: "LD2450", x: 10, y: 10, ...sensor }] });
  it("an old design with no floor is read as before", () => {
    expect(parseStudioSettings(site({}))?.sensors?.[0].floor).toBeUndefined();
  });
  it("keeps a good floor and drops a bad one", () => {
    expect(parseStudioSettings(site({ floor: 2 }))?.sensors?.[0].floor).toBe(2);
    for (const bad of [-1, 1.5, "1", null, 999, Number.NaN]) expect(parseStudioSettings(site({ floor: bad }))?.sensors?.[0].floor).toBeUndefined();
  });
  it("writes the floor back and an old reader would only ignore it", () => {
    const parsed = parseStudioSettings(site({ floor: 1 }));
    const back = JSON.parse(serializeStudioSettings(parsed as StudioSettings));
    expect(back.sensors[0].floor).toBe(1);
    expect(back.sensors[0]).toMatchObject({ id: "s1", kind: "LD2450", x: 10, y: 10 });
  });
});

describe("the preferences of the check", () => {
  it("are off when nothing is stored and when the stored value is not a boolean", () => {
    expect(parsePrefs(null).coverageFloors).toBe(false);
    expect(parsePrefs(JSON.stringify({ coverageFloors: "yes", coverage3d: 1, coverageRefine: null }))).toMatchObject({ coverageFloors: false, coverage3d: false, coverageRefine: false });
    expect(parsePrefs(JSON.stringify({ coverageFloors: true, coverage3d: true, coverageRefine: true }))).toMatchObject({ coverageFloors: true, coverage3d: true, coverageRefine: true });
  });
});

describe("the floor-plan templates", () => {
  it("add a building with its floors, its radars with a floor, and keep what was there", () => {
    const start: SiteModel = { ...empty, buildings: [box("building-01", 5, 5, 6, 6)], sensors: [radar("sensor-01", 8, 8, 0)] };
    for (const template of SITE_TEMPLATES) {
      const made = addSiteTemplate(start, dimensions, template, template.id);
      const added = made.model.buildings.find(building => building.id === made.buildingId)!;
      expect(made.model.buildings).toHaveLength(2);
      expect(added.floors).toEqual([...template.floors]);
      expect(Math.min(...added.points.map(point => point.x))).toBeGreaterThanOrEqual(11);
      expect(made.model.sensors).toHaveLength(1 + template.radars.length);
      expect(made.model.sensors.slice(1).map(sensor => sensor.floor)).toEqual(template.radars.map(radarItem => radarItem.floor));
      // the radar that was there keeps its place on the ground even when the work area grew
      const before = toMetres(start.sensors[0], dimensions), after = toMetres(made.model.sensors[0], made.dimensions);
      expect(after.x).toBeCloseTo(before.x, 1); expect(after.y).toBeCloseTo(before.y, 1);
      expect(new Set(made.model.sensors.map(sensor => sensor.id)).size).toBe(made.model.sensors.length);
      expect(new Set(made.model.openings.map(opening => opening.id)).size).toBe(made.model.openings.length);
    }
  });
  it("each one is watched on every floor when the floors are checked, so the check has nothing unwatched to point out", () => {
    for (const template of SITE_TEMPLATES) {
      const made = addSiteTemplate(empty, dimensions, template, template.id);
      const report = analyseCoverage(made.model, made.dimensions, { floors: true });
      expect(report.zones).toHaveLength(template.floors.length);
      for (const zone of report.zones) expect(zone.coveredM2).toBeGreaterThan(0);
      expect(report.warnings.map(w => w.code)).not.toContain("zone_unwatched");
      expect(report.warnings.map(w => w.code)).not.toContain("sensor_floor_assumed");
      for (const opening of made.model.openings) expect(opening.edge).toBeLessThan(4);
    }
  });
  it("read back through the same reader as any stored design", () => {
    const made = addSiteTemplate(empty, dimensions, SITE_TEMPLATES[0], "House");
    const back = parseStudioSettings(serializeStudioSettings({ dimensions: made.dimensions, buildings: made.model.buildings, openings: made.model.openings, sensors: made.model.sensors } as StudioSettings));
    expect(back.buildings).toHaveLength(1);
    expect(back.openings).toHaveLength(made.model.openings.length);
    expect(back.sensors?.map(sensor => sensor.floor)).toEqual([0, 1]);
  });
});
