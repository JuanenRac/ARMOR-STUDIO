import { describe, expect, it } from "vitest";
import { INITIAL_BUILDINGS, INITIAL_CAMERAS, INITIAL_FEATURES, INITIAL_OPENINGS, INITIAL_ROOF_ITEMS, INITIAL_TERRAIN, INITIAL_WALL_LAMPS, type SiteFeatureKind } from "../domain";
import { parseStudioSettings } from "../settings";
import { applySiteDoc, buildSiteDoc, siteDocKey } from "../siteSync";
import { DEFAULT_FEATURE_COLOUR, featureColourOf, isColour, readColour, shade } from "./colors";
import { cameraView, CAMERA_VIEW } from "./model";

describe("colours", () => {
  it("accept only #rrggbb and store it in lowercase", () => {
    expect(readColour("#A1b2C3")).toBe("#a1b2c3");
    for (const bad of ["red", "#fff", "#12345", "#1234567", "rgb(1,2,3)", 5, null, undefined, "#gggggg"]) expect(readColour(bad)).toBeUndefined();
    expect(isColour("#00ff7f")).toBe(true);
  });
  it("shade lightens and darkens, and leaves what is not a colour alone", () => {
    expect(shade("#808080", 1)).toBe("#ffffff");
    expect(shade("#808080", -1)).toBe("#000000");
    expect(shade("#000000", 0.5)).toBe("#808080");
    expect(shade("nope", 0.5)).toBe("nope");
  });
  it("every kind of ground object and every style has a default colour to start the picker from", () => {
    for (const kind of Object.keys(DEFAULT_FEATURE_COLOUR) as SiteFeatureKind[]) expect(isColour(featureColourOf(kind, undefined)), kind).toBe(true);
    for (const style of ["iron", "wood", "modern", "stone"]) expect(isColour(featureColourOf("gate", style))).toBe(true);
    for (const style of ["mesh", "picket", "rail", "wire", "wall"]) expect(isColour(featureColourOf("fence", style))).toBe(true);
    for (const style of ["concrete", "brick", "gravel"]) expect(isColour(featureColourOf("sidewalk", style))).toBe(true);
  });
});

describe("colours and the new properties in a saved design", () => {
  const painted = () => ({
    terrain: { ...INITIAL_TERRAIN, color: "#224466" },
    buildings: INITIAL_BUILDINGS.map(building => ({ ...building, color: "#eeeeee", roofColor: "#445566" })),
    openings: INITIAL_OPENINGS.map(opening => ({ ...opening, color: "#112233" })),
    roofItems: INITIAL_ROOF_ITEMS.map(item => ({ ...item, color: "#334455" })),
    wallLamps: INITIAL_WALL_LAMPS.map(lamp => ({ ...lamp, color: "#ffcc00" })),
    features: INITIAL_FEATURES.map(feature => ({ ...feature, color: "#993300", label: "North gate" })),
    cameras: INITIAL_CAMERAS.map(camera => ({ ...camera, fov: 120, range: 20 })),
  });
  it("keep their colours, names, field of view and range when read back", () => {
    const parsed = parseStudioSettings(JSON.stringify(painted()));
    expect(parsed.terrain?.color).toBe("#224466");
    expect(parsed.buildings?.every(item => item.color === "#eeeeee" && item.roofColor === "#445566")).toBe(true);
    expect(parsed.openings?.every(item => item.color === "#112233")).toBe(true);
    expect(parsed.roofItems?.every(item => item.color === "#334455")).toBe(true);
    expect(parsed.wallLamps?.every(item => item.color === "#ffcc00")).toBe(true);
    expect(parsed.features?.every(item => item.color === "#993300" && item.label === "North gate")).toBe(true);
    expect(parsed.cameras?.every(item => item.fov === 120 && item.range === 20)).toBe(true);
  });
  it("drop a colour that is not one and clamp a field of view and range that make no sense", () => {
    const messy = painted();
    const parsed = parseStudioSettings(JSON.stringify({ ...messy, terrain: { ...messy.terrain, color: "green" }, features: messy.features.map(feature => ({ ...feature, color: "url(x)", label: "  " })), cameras: messy.cameras.map(camera => ({ ...camera, fov: 400, range: 1 })) }));
    expect(parsed.terrain?.color).toBeUndefined();
    expect(parsed.features?.every(item => item.color === undefined && item.label === undefined)).toBe(true);
    expect(parsed.cameras?.every(item => item.fov === 180 && item.range === 2)).toBe(true);
  });
  it("a camera's own view falls back to the defaults", () => {
    expect(cameraView({})).toEqual({ rangeM: CAMERA_VIEW.rangeM, halfAngleDeg: CAMERA_VIEW.halfAngleDeg });
    expect(cameraView({ fov: 120, range: 20 })).toEqual({ rangeM: 20, halfAngleDeg: 60 });
    // a motorised camera covers its whole sweep (90 to 360 degrees), not the angle of its lens
    expect(cameraView({ kind: "ptz", pan: 270, fov: 60 }).halfAngleDeg).toBe(135);
    expect(cameraView({ kind: "ptz" }).halfAngleDeg).toBe(180);
    expect(cameraView({ kind: "ptz", pan: 30 }).halfAngleDeg).toBe(45);
    expect(cameraView({ kind: "ptz", pan: 720 }).halfAngleDeg).toBe(180);
    expect(cameraView({ kind: "fixed", pan: 270, fov: 60 }).halfAngleDeg).toBe(30);
  });
  it("travel with the design shared through the server", () => {
    const base = { dimensions: { width: 60, depth: 40, height: 3 }, sensors: [], placements: [], ...painted() };
    const stored = JSON.parse(JSON.stringify(buildSiteDoc(base)));
    const merged = applySiteDoc(stored, { ...base, terrain: INITIAL_TERRAIN, cameras: INITIAL_CAMERAS, features: INITIAL_FEATURES });
    expect(merged.terrain.color).toBe("#224466");
    expect(merged.cameras.every(camera => camera.fov === 120 && camera.range === 20)).toBe(true);
    expect(siteDocKey(merged)).toBe(siteDocKey(base));
  });
});
