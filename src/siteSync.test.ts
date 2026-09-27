import { describe, expect, it } from "vitest";
import { INITIAL_BUILDINGS, INITIAL_CAMERAS, INITIAL_DIMENSIONS, INITIAL_FEATURES, INITIAL_OPENINGS, INITIAL_ROOF_ITEMS, INITIAL_SENSORS, INITIAL_TERRAIN, INITIAL_WALL_LAMPS } from "./domain";
import { applySiteDoc, buildSiteDoc, siteDocKey, type SiteDesign } from "./siteSync";

const design = (): SiteDesign => ({
  dimensions: INITIAL_DIMENSIONS, terrain: INITIAL_TERRAIN, buildings: INITIAL_BUILDINGS, openings: INITIAL_OPENINGS, roofItems: INITIAL_ROOF_ITEMS, wallLamps: INITIAL_WALL_LAMPS,
  features: INITIAL_FEATURES, sensors: INITIAL_SENSORS, placements: [{ device_id: "smoke-1", x: 20, y: 15, z: 2.4, rotation: 0 }], cameras: INITIAL_CAMERAS.map(camera => ({ ...camera, host: "192.168.0.9", username: "admin", hasCredentials: true })),
});

describe("site document", () => {
  it("carries the design and no camera address or credentials", () => {
    const text = JSON.stringify(buildSiteDoc(design()));
    expect(text).not.toContain("192.168.0.9");
    expect(text).not.toContain("admin");
    expect(text).not.toContain("hasCredentials");
  });
  it("round-trips: what is stored and applied builds the same document", () => {
    const original = design();
    const stored = JSON.parse(JSON.stringify(buildSiteDoc(original)));
    expect(siteDocKey(applySiteDoc(stored, original))).toBe(siteDocKey(original));
  });
  it("puts a stored design on another browser's state without touching the server-owned camera fields", () => {
    const other = design();
    const stored = buildSiteDoc({ ...design(), placements: [], sensors: [{ id: "s", name: "Only", kind: "LD2450", x: 5, y: 6 }], cameras: design().cameras.map((camera, index) => index === 0 ? { ...camera, x: 11, y: 22, heading: 90, tilt: 15, z: 3 } : camera) });
    const merged = applySiteDoc(JSON.parse(JSON.stringify(stored)), other);
    expect(merged.sensors.map(sensor => sensor.name)).toEqual(["Only"]);
    expect(merged.placements).toEqual([]);
    expect(merged.cameras[0]).toMatchObject({ x: 11, y: 22, heading: 90, tilt: 15, z: 3, host: "192.168.0.9", username: "admin" });
    expect(merged.cameras).toHaveLength(other.cameras.length);
  });
  it("ignores parts that are missing or invalid and keeps the local ones", () => {
    const current = design();
    const merged = applySiteDoc({ schema: "x", terrain: "nope", buildings: 5, cameraPlacements: { "cam-01": { x: "a" } } }, current);
    expect(merged.terrain).toBe(current.terrain);
    expect(merged.buildings).toBe(current.buildings);
    expect(merged.cameras[0]).toEqual(current.cameras[0]);
    expect(applySiteDoc(null, current)).toBe(current);
  });
});
