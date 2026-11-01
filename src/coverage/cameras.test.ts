// Q: the camera looked at like a radar: its own floor (read safely from the stored design), the 3D check with a vertical field that errs on the small side, the cones, and a plan imported
// from a JSON file that is read strictly. Written as a characterization of what the check said about a camera before, then the new things.
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { analyseCoverage, verticalHalfDeg } from "./engine";
import { CoveragePanel } from "./CoveragePanel";
import { parseSiteTemplate, TEMPLATE_LIMITS, TEMPLATE_SCHEMA } from "./siteTemplates";
import { parseStudioSettings, serializeStudioSettings, type StudioSettings } from "../settings";
import { DEFAULT_PREFS, parsePrefs } from "../prefs";
import { locales, text } from "../i18n";
import type { SiteModel } from "../designer/ops";
import type { Building, Camera, Opening } from "../domain";

const dimensions = { width: 40, depth: 40, height: 4 };
const roof = { style: "flat", slope: 0, overhang: 0, ridge: 0 } as const;
const empty: SiteModel = { terrain: { points: [] }, buildings: [], openings: [], roofItems: [], wallLamps: [], features: [], cameras: [], sensors: [], placements: [] };
const box = (floors: number[] = [2.8, 2.8]): Building => ({ id: "b1", name: "b1", points: [{ x: 10, y: 10 }, { x: 18, y: 10 }, { x: 18, y: 16 }, { x: 10, y: 16 }], base: 0, floors, roof, thickness: 0.2 });
const camera = (id: string, extra: Partial<Camera> = {}): Camera => ({ id, name: id, host: "", snapshotUrl: "", enabled: true, x: 14 / 40 * 100, y: (1 - 12 / 40) * 100, heading: 270, ...extra } as Camera);
const window1 = (floor: number): Opening => ({ id: "w1", buildingId: "b1", edge: 0, floor, kind: "window", offset: 3.5, width: 1, height: 1.2, sill: 0.9 });
const withCamera = (cam: Camera, floor = 0): SiteModel => ({ ...empty, buildings: [box()], openings: [window1(floor)], cameras: [cam] });
const stateOf = (model: SiteModel, options = {}) => analyseCoverage(model, dimensions, options).openings[0]!.state;

describe("characterization: what the check said about a camera before it had a floor", () => {
  it("the flat check lets a camera on the ground floor see the window of the ground floor", () => {
    expect(stateOf(withCamera(camera("c1", { z: 2.4 })))).toBe("video");
  });
  it("with the floors on, a camera with no floor and no height is the ground floor and the check says so when the building has two", () => {
    const report = analyseCoverage(withCamera(camera("c1")), dimensions, { floors: true });
    expect(report.warnings.map(w => w.code)).toContain("camera_floor_assumed");
  });
  it("a camera that is not given a floor keeps being placed by its height", () => {
    expect(stateOf(withCamera(camera("c1", { z: 4 }), 1), { floors: true })).toBe("video");
    expect(stateOf(withCamera(camera("c1", { z: 4 }), 0), { floors: true })).toBe("none");
  });
});

describe("the floor of a camera", () => {
  it("wins over its height", () => {
    expect(stateOf(withCamera(camera("c1", { z: 2.4, floor: 1 }), 1), { floors: true })).toBe("video");
    expect(stateOf(withCamera(camera("c1", { z: 2.4, floor: 1 }), 0), { floors: true })).toBe("none");
  });
  it("is not asked for when it is given, and the warning goes away", () => {
    const report = analyseCoverage(withCamera(camera("c1", { floor: 0 })), dimensions, { floors: true });
    expect(report.warnings.map(w => w.code)).not.toContain("camera_floor_assumed");
  });
  it("does not change the flat check at all", () => {
    expect(stateOf(withCamera(camera("c1", { z: 2.4, floor: 1 }), 0))).toBe(stateOf(withCamera(camera("c1", { z: 2.4 }), 0)));
  });
});

describe("the 3D check of a camera errs on the small side", () => {
  it("never gives a camera more vertical field than a radar, and a fixed camera a part of its horizontal angle", () => {
    expect(verticalHalfDeg("radar", {})).toBe(35);
    for (const fov of [30, 60, 90, 120, 180]) {
      const v = verticalHalfDeg("camera", { fov });
      expect(v).toBeLessThanOrEqual(35);
      expect(v).toBeGreaterThanOrEqual(8);
      expect(v).toBeLessThan(fov / 2 + 1e-9);
    }
    expect(verticalHalfDeg("camera", { fov: 90 })).toBe(27);
    expect(verticalHalfDeg("camera", { kind: "ptz", tiltSweep: 180 })).toBe(60);
    expect(verticalHalfDeg("camera", { kind: "ptz", tiltSweep: 30 })).toBe(15);
    expect(verticalHalfDeg("camera", { kind: "ptz" })).toBe(45);
  });
  it("a camera that looks at the sky does not guard a window it only sees on the flat plan", () => {
    const up = camera("c1", { z: 2.4, floor: 0, tilt: -60 });
    expect(stateOf(withCamera(up), { floors: true })).toBe("video");
    expect(stateOf(withCamera(up), { floors: true, threeD: true })).toBe("none");
  });
  it("a camera that looks level at a window of its own floor still guards it in 3D", () => {
    expect(stateOf(withCamera(camera("c1", { z: 2.4, floor: 0, tilt: 5 })), { floors: true, threeD: true })).toBe("video");
  });
  it("the 3D check only ever takes coverage away from a camera, never gives it: property over heights and tilts", () => {
    let seed = 5;
    const random = (limit: number): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % limit; };
    for (let round = 0; round < 80; round += 1) {
      const cam = camera("c1", { floor: 0, z: random(40) / 10, tilt: random(120) - 60, fov: 40 + random(100) });
      const flat = stateOf(withCamera(cam), { floors: true }), solid = stateOf(withCamera(cam), { floors: true, threeD: true });
      if (flat !== "video") expect(solid, JSON.stringify(cam)).not.toBe("video");
    }
  });
});

describe("the floor of a camera in the stored design", () => {
  const site = (item: object) => JSON.stringify({ cameras: [{ id: "c1", name: "Gate", host: "h", snapshotUrl: "", enabled: true, x: 10, y: 10, ...item }] });
  it("an old design with no floor is read as before", () => expect(parseStudioSettings(site({}))?.cameras?.[0]?.floor).toBeUndefined());
  it("keeps a good floor and drops a bad one", () => {
    expect(parseStudioSettings(site({ floor: 2 }))?.cameras?.[0]?.floor).toBe(2);
    for (const bad of [-1, 1.5, "1", null, 999, Number.NaN, true]) expect(parseStudioSettings(site({ floor: bad }))?.cameras?.[0]?.floor, String(bad)).toBeUndefined();
  });
  it("writes the floor back", () => {
    const back = JSON.parse(serializeStudioSettings(parseStudioSettings(site({ floor: 1 })) as StudioSettings));
    expect(back.cameras[0].floor).toBe(1);
  });
});

describe("the cones of the 3D view and the modes of the card", () => {
  it("the cones are off by default and a stored value that is not a boolean is off", () => {
    expect(DEFAULT_PREFS.coverageCones).toBe(false);
    expect(parsePrefs(JSON.stringify({ coverageCones: "yes" })).coverageCones).toBe(false);
    expect(parsePrefs(JSON.stringify({ coverageCones: true })).coverageCones).toBe(true);
  });
  it("the card offers the modes of the check, and the cones, with their stored state", () => {
    const report = analyseCoverage(withCamera(camera("c1")), dimensions, {});
    const html = renderToStaticMarkup(createElement(CoveragePanel, { t: (key: string) => text("en", key), report, margin: 10, modes: { floors: true, threeD: false, refine: false, cones: true }, showBlind: true, setShowBlind: () => undefined, onClose: () => undefined, onNotice: () => undefined, onAddTemplate: () => undefined }));
    expect(html).toContain('data-testid="cov-modes"');
    expect(html).toMatch(/data-testid="cov-mode-floors"[^>]*checked|checked[^>]*data-testid="cov-mode-floors"/);
    expect(html).toMatch(/data-testid="cov-mode-cones"[^>]*checked|checked[^>]*data-testid="cov-mode-cones"/);
    expect(html).not.toMatch(/data-testid="cov-mode-3d"[^>]*checked|checked[^>]*data-testid="cov-mode-3d"/);
    expect(html).toContain('data-testid="cov-import"');
    expect(renderToStaticMarkup(createElement(CoveragePanel, { t: (key: string) => text("en", key), report, margin: 10, showBlind: true, setShowBlind: () => undefined, onClose: () => undefined, onNotice: () => undefined }))).not.toContain("cov-modes");
  });
});

describe("a plan imported from a JSON file", () => {
  const good = () => ({
    schema: TEMPLATE_SCHEMA, name: "My house", width: 10, depth: 8, floors: [2.8, 2.6],
    openings: [{ edge: 0, floor: 0, kind: "door", offset: 4.5, width: 0.9, height: 2.1, sill: 0 }, { edge: 1, floor: 1, kind: "window", offset: 3, width: 1.2, height: 1.2, sill: 0.9 }],
    radars: [{ floor: 0, x: 0.4, y: 0.4, heading: 45 }, { floor: 1, x: 9.6, y: 7.6, heading: 225 }],
  });
  const read = (value: unknown) => parseSiteTemplate(typeof value === "string" ? value : JSON.stringify(value));

  it("a good file is a template with its own name and nothing else", () => {
    const result = read(good());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template).toMatchObject({ id: "imported", name: "My house", width: 10, depth: 8, floors: [2.8, 2.6] });
    expect(result.template.openings).toHaveLength(2);
    expect(result.template.radars).toHaveLength(2);
  });
  it("openings and radars may be left out", () => {
    const { openings: _o, radars: _r, ...bare } = good();
    expect(read(bare).ok).toBe(true);
  });
  const bad: Array<[string, unknown, string]> = [
    ["not json", "{nope", "not_json"], ["an array", [], "not_a_template"], ["another schema", { ...good(), schema: "other" }, "not_a_template"], ["no schema", { name: "x" }, "not_a_template"],
    ["an unknown field", { ...good(), pin: "1" }, "unknown_field"], ["no name", { ...good(), name: "" }, "name"], ["a name with markup", { ...good(), name: "<b>x</b>" }, "name"],
    ["a name of 61 characters", { ...good(), name: "n".repeat(61) }, "name"], ["a name that is a number", { ...good(), name: 5 }, "name"],
    ["a width of 1", { ...good(), width: 1 }, "size"], ["a depth of 81", { ...good(), depth: 81 }, "size"], ["a width as a text", { ...good(), width: "10" }, "size"], ["a width that is NaN", { ...good(), width: Number.NaN }, "size"],
    ["no floors", { ...good(), floors: [] }, "floors"], ["eleven floors", { ...good(), floors: Array(11).fill(3) }, "floors"], ["a floor of 1 metre", { ...good(), floors: [1] }, "floors"], ["a floor of 9 metres", { ...good(), floors: [9] }, "floors"],
    ["floors as a number", { ...good(), floors: 3 }, "floors"],
    ["an opening with an unknown field", { ...good(), openings: [{ ...good().openings[0], x: 1 }] }, "opening"], ["an opening on a wall that does not exist", { ...good(), openings: [{ ...good().openings[0], edge: 4 }] }, "opening"],
    ["an opening on a floor that does not exist", { ...good(), openings: [{ ...good().openings[0], floor: 2 }] }, "opening"], ["an opening of a kind that does not exist", { ...good(), openings: [{ ...good().openings[0], kind: "gate" }] }, "opening"],
    ["an opening that does not fit in the wall", { ...good(), openings: [{ ...good().openings[0], offset: 9.5 }] }, "opening"], ["an opening taller than the floor", { ...good(), openings: [{ ...good().openings[0], sill: 2, height: 2 }] }, "opening"],
    ["an opening with a negative offset", { ...good(), openings: [{ ...good().openings[0], offset: -1 }] }, "opening"], ["openings that are not a list", { ...good(), openings: {} }, "opening"],
    ["sixty-one openings", { ...good(), openings: Array(61).fill(good().openings[0]) }, "opening"],
    ["a radar outside the footprint", { ...good(), radars: [{ floor: 0, x: 11, y: 1, heading: 0 }] }, "radar"], ["a radar on a floor that does not exist", { ...good(), radars: [{ floor: 5, x: 1, y: 1, heading: 0 }] }, "radar"],
    ["a radar heading of 361", { ...good(), radars: [{ floor: 0, x: 1, y: 1, heading: 361 }] }, "radar"], ["a radar with an unknown field", { ...good(), radars: [{ floor: 0, x: 1, y: 1, heading: 0, node: "x" }] }, "radar"],
    ["twenty-one radars", { ...good(), radars: Array(21).fill({ floor: 0, x: 1, y: 1, heading: 0 }) }, "radar"], ["a radar with a fractional floor", { ...good(), radars: [{ floor: 0.5, x: 1, y: 1, heading: 0 }] }, "radar"],
  ];
  for (const [name, value, problem] of bad) it(`refuses ${name} whole, saying ${problem}`, () => {
    const result = read(value);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problem).toBe(problem);
  });
  it("refuses a file over the size limit before reading it", () => {
    const result = parseSiteTemplate(" ".repeat(TEMPLATE_LIMITS.bytes + 1));
    expect(result).toEqual({ ok: false, problem: "too_big" });
  });
  it("says where an opening or a radar is wrong", () => {
    const result = read({ ...good(), radars: [good().radars[0], { floor: 0, x: 99, y: 1, heading: 0 }] });
    expect(result).toEqual({ ok: false, problem: "radar", where: "radars[1]" });
  });
  it("has every word of the import in the eight languages", () => {
    const keys = ["cov_import", "cov_import_help", "cov_site_tpl_imported", "cameraFloor", "cov_modes_title", "pf_cov_cones", "pf_cov_cones_h", "cov_w_camera_floor_assumed", "cov_s_camera_floor_assumed",
      ...["too_big", "not_json", "not_a_template", "unknown_field", "name", "size", "floors", "opening", "radar"].map(problem => `cov_import_bad_${problem}`)];
    for (const locale of locales) for (const key of keys) {
      expect(text(locale, key).trim().length, `${locale} ${key}`).toBeGreaterThan(1);
      expect(text(locale, key), `${locale} ${key}`).not.toBe(key);
    }
    expect(text("pt", "cameraFloor")).toBe("Piso da câmara");
  });
});
