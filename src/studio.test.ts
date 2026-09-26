import { describe, expect, it } from "vitest";
import { defaultCameraPosition, mergeServerCameras, selectionAfterRemoval, upsertCamera } from "./cameras";
import { DEFAULT_SERVER_ORIGIN } from "./config";
import { cameraIsConfigured, DEFAULT_THEME, INITIAL_CAMERAS, THEMES, type Camera } from "./domain";
import { parseStudioSettings, serializeStudioSettings, siteExport, type StudioSettings } from "./settings";

const camera = (id: string, extra: Partial<Camera> = {}): Camera => ({ id, name: id, host: "192.168.0.5", snapshotUrl: "", enabled: true, x: 10, y: 20, ...extra });

describe("deployment defaults", () => {
  it("starts against the local server and with the family theme", () => {
    expect(DEFAULT_SERVER_ORIGIN).toBe("http://127.0.0.1:8080");
    expect(DEFAULT_THEME).toBe("Armor");
    expect(THEMES[0]).toBe("Armor");
  });
});

describe("cameraIsConfigured", () => {
  it("needs a real host and a way to reach video", () => {
    expect(cameraIsConfigured(INITIAL_CAMERAS[0])).toBe(false);
    expect(cameraIsConfigured(camera("a", { hasCredentials: true }))).toBe(true);
    expect(cameraIsConfigured(camera("a", { rtspPath: "live" }))).toBe(true);
    expect(cameraIsConfigured(camera("a"))).toBe(false);
    expect(cameraIsConfigured(camera("a", { host: " ", hasCredentials: true }))).toBe(false);
  });
});

describe("mergeServerCameras", () => {
  it("keeps what only Studio knows: power state and position", () => {
    const merged = mergeServerCameras([camera("a", { enabled: false, x: 5, y: 6 })], [{ id: "a", name: "Server name", host: "h", snapshotUrl: "", hasCredentials: true }]);
    expect(merged).toEqual([{ id: "a", name: "Server name", host: "h", snapshotUrl: "", hasCredentials: true, enabled: false, x: 5, y: 6 }]);
  });
  it("places a camera Studio has never seen on the default grid and switches it on", () => {
    const merged = mergeServerCameras([], [{ id: "a", name: "a", host: "h", snapshotUrl: "" }, { id: "b", name: "b", host: "h", snapshotUrl: "" }]);
    expect(merged.map(item => item.enabled)).toEqual([true, true]);
    expect({ x: merged[1].x, y: merged[1].y }).toEqual(defaultCameraPosition(1));
  });
  it("drops cameras the server no longer reports, and ignores an empty report", () => {
    expect(mergeServerCameras([camera("old")], [{ id: "new", name: "n", host: "h", snapshotUrl: "" }]).map(item => item.id)).toEqual(["new"]);
    expect(mergeServerCameras([camera("old")], []).map(item => item.id)).toEqual(["old"]);
  });
});

describe("camera list edits", () => {
  it("adds a new camera and updates an existing one in place", () => {
    expect(upsertCamera([camera("a")], camera("b")).map(item => item.id)).toEqual(["a", "b"]);
    expect(upsertCamera([camera("a")], camera("a", { name: "Renamed" }))[0].name).toBe("Renamed");
  });
  it("picks a sensible selection after a removal", () => {
    const remaining = [camera("b"), camera("c")];
    expect(selectionAfterRemoval(remaining, "a", "a")).toBe("b");
    expect(selectionAfterRemoval(remaining, "c", "a")).toBe("c");
    expect(selectionAfterRemoval([], "a", "a")).toBe("");
  });
});

const good: StudioSettings = {
  origin: "http://192.168.0.180:18080", theme: "Armor", language: "es", sidebarOpen: false, dimensions: { width: 10, depth: 8, height: 3 },
  cameras: [camera("cam-1", { username: "admin", hasCredentials: true })], sensors: [{ id: "s1", name: "R", kind: "LD2450", x: 1, y: 2 }],
  terrain: { points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 8 }, { x: 0, y: 8 }] },
  buildings: [{ id: "b1", name: "House", points: [{ x: 2, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 5 }, { x: 2, y: 5 }], base: 0, floors: [2.8, 2.6], roof: { style: "gable", slope: 30, overhang: 0.4, ridge: 0 }, thickness: 0.25 }],
  openings: [{ id: "o1", buildingId: "b1", edge: 0, floor: 1, kind: "window", offset: 1, width: 1.2, height: 1.2, sill: 0.9 }],
  roofItems: [{ id: "c1", buildingId: "b1", kind: "chimney", x: 4, y: 3, width: 0.6, depth: 0.6, height: 1.2, rotation: 0, tilt: 0 }],
  wallLamps: [{ id: "l1", buildingId: "b1", edge: 1, offset: 1, z: 2.4, reach: 0.4 }],
  features: [{ id: "lamp-1", kind: "lamp", x: 1, y: 1, z: 0, width: 0.12, depth: 0.12, height: 5, rotation: 0, slope: 0 }],
  placements: [{ device_id: "hall-smoke", x: 3, y: 3, z: 2.6, rotation: 0 }],
};

describe("browser-local settings", () => {
  it("round-trips valid settings", () => {
    expect(parseStudioSettings(serializeStudioSettings(good))).toMatchObject({ origin: good.origin, theme: "Armor", language: "es", sidebarOpen: false, dimensions: good.dimensions });
    const back = parseStudioSettings(serializeStudioSettings(good));
    expect(back.terrain).toEqual(good.terrain);
    expect(back.buildings).toEqual(good.buildings);
    expect(back.openings).toEqual(good.openings);
    expect(back.roofItems).toEqual(good.roofItems);
    expect(back.wallLamps).toEqual(good.wallLamps);
    expect(back.features).toEqual(good.features);
    expect(back.placements).toEqual(good.placements);
  });
  it("survives missing, damaged and wrongly shaped storage", () => {
    expect(parseStudioSettings(null)).toEqual({});
    expect(parseStudioSettings("{not json")).toEqual({});
    expect(parseStudioSettings("[1,2]")).toEqual({});
    expect(parseStudioSettings("42")).toEqual({});
  });
  it("drops every invalid value instead of trusting it", () => {
    const parsed = parseStudioSettings(JSON.stringify({
      origin: "javascript:alert(1)", theme: "Neon", language: "xx", sidebarOpen: "yes", dimensions: { width: -5, depth: 1, height: 1 },
      cameras: [{ id: "bad id" }, { id: "ok-1", name: "n", host: "h", snapshotUrl: "" }, null, 7],
      buildings: [{ id: "b", name: "x", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }, { id: "../x", name: "y" }], sensors: [{ id: "s", name: "x", kind: "OTHER" }],
      terrain: { points: [{ x: 0, y: 0 }, { x: 4, y: 4 }, { x: 4, y: 0 }, { x: 0, y: 4 }] }, features: [{ id: "f", kind: "spaceship", x: 1, y: 1 }],
    }));
    expect(parsed.origin).toBeUndefined();
    expect(parsed.theme).toBeUndefined();
    expect(parsed.language).toBeUndefined();
    expect(parsed.sidebarOpen).toBeUndefined();
    expect(parsed.dimensions).toEqual({ width: 0.25, depth: 1, height: 1 }); // clamped, not trusted
    expect(parsed.cameras?.map(item => item.id)).toEqual(["ok-1"]);
    expect(parsed.buildings).toEqual([]);
    expect(parsed.sensors).toEqual([]);
    expect(parsed.terrain).toBeUndefined();                 // a terrain that crosses itself is not a terrain
    expect(parsed.features).toEqual([]);
  });
  it("clamps positions and caps how many items are read", () => {
    const many = Array.from({ length: 200 }, (_, index) => ({ id: `cam-${index}`, name: "n", host: "h", snapshotUrl: "", x: 999, y: -5 }));
    const parsed = parseStudioSettings(JSON.stringify({ cameras: many }));
    expect(parsed.cameras).toHaveLength(64);
    expect(parsed.cameras?.[0]).toMatchObject({ x: 100, y: 0 });
  });
  it("keeps server-owned camera fields only when they have the right type", () => {
    const parsed = parseStudioSettings(JSON.stringify({ cameras: [{ id: "cam-1", name: "n", host: "h", snapshotUrl: "", hasCredentials: "yes", rtspPort: "554", username: 5 }] }));
    expect(parsed.cameras?.[0]).not.toHaveProperty("hasCredentials");
    expect(parsed.cameras?.[0]).not.toHaveProperty("rtspPort");
    expect(parsed.cameras?.[0]).not.toHaveProperty("username");
  });
});

describe("settings saved by earlier releases", () => {
  it("turns a closed loop of walls into one building with its doors and windows", () => {
    const parsed = parseStudioSettings(JSON.stringify({
      walls: [
        { id: "w1", x1: 0, y1: 0, x2: 6, y2: 0, z: 0, height: 2.8 }, { id: "w2", x1: 6, y1: 0, x2: 6, y2: 4, z: 0, height: 2.8 },
        { id: "w3", x1: 6, y1: 4, x2: 0, y2: 4, z: 0, height: 2.8 }, { id: "w4", x1: 0, y1: 4, x2: 0, y2: 0, z: 0, height: 2.8 },
      ],
      openings: [{ id: "o1", wallId: "w2", kind: "door", offset: 1, width: 0.9, height: 2.1, sill: 0 }, { id: "o2", wallId: "gone", kind: "window", offset: 1, width: 1, height: 1, sill: 1 }],
    }));
    expect(parsed.buildings).toHaveLength(1);
    expect(parsed.buildings?.[0].points).toHaveLength(4);
    expect(parsed.buildings?.[0].floors).toEqual([2.8]);
    expect(parsed.openings).toEqual([expect.objectContaining({ id: "o1", buildingId: "building-01", edge: 1, floor: 0, kind: "door" })]);
  });
  it("leaves loose walls that enclose nothing behind rather than inventing a building", () => {
    const parsed = parseStudioSettings(JSON.stringify({ walls: [{ id: "w1", x1: 0, y1: 0, x2: 6, y2: 0, z: 0, height: 3 }, { id: "w2", x1: 9, y1: 9, x2: 12, y2: 9, z: 0, height: 3 }, { id: "w3", x1: 1, y1: 5, x2: 3, y2: 5, z: 0, height: 3 }] }));
    expect(parsed.buildings).toBeUndefined();
  });
  it("drops what points at a floor, wall or building that does not exist", () => {
    const parsed = parseStudioSettings(JSON.stringify({
      buildings: good.buildings,
      openings: [{ ...good.openings[0] }, { ...good.openings[0], id: "o2", floor: 5 }, { ...good.openings[0], id: "o3", edge: 9 }, { ...good.openings[0], id: "o4", buildingId: "nope" }],
      roofItems: [{ ...good.roofItems[0] }, { ...good.roofItems[0], id: "c2", buildingId: "nope" }],
    }));
    expect(parsed.openings?.map(item => item.id)).toEqual(["o1"]);
    expect(parsed.roofItems?.map(item => item.id)).toEqual(["c1"]);
  });
});

describe("garden objects in saved settings", () => {
  it("keeps the style and the tilt of a tree, and drops a style its kind does not have", () => {
    const parsed = parseStudioSettings(JSON.stringify({ features: [
      { id: "t1", kind: "tree", x: 1, y: 1, width: 3, depth: 3, height: 5, style: "palm", pitch: 30, roll: -200 },
      { id: "f1", kind: "fence", x: 1, y: 1, width: 4, depth: 0.08, height: 1.2, style: "oak" },
      { id: "g1", kind: "gate", x: 1, y: 1, width: 4, depth: 0.6, height: 2.4, style: "stone" },
      { id: "k1", kind: "kennel", x: 1, y: 1, width: 1, depth: 1, height: 1, style: "oak" },
    ], cameras: [{ id: "cam-1", name: "n", host: "h", snapshotUrl: "", tilt: 200 }] }));
    expect(parsed.features?.map(item => item.kind)).toEqual(["tree", "fence", "gate", "kennel"]);
    expect(parsed.features?.[0]).toMatchObject({ style: "palm", pitch: 30, roll: -180 });
    expect(parsed.features?.[1].style).toBeUndefined();
    expect(parsed.features?.[2].style).toBe("stone");
    expect(parsed.features?.[3].style).toBeUndefined();
    expect(parsed.cameras?.[0].tilt).toBe(90);
  });
});

describe("site export", () => {
  it("never carries a username or credential flag", () => {
    const exported = JSON.parse(siteExport(good)) as { schema: string; cameras: Array<Record<string, unknown>> };
    expect(exported.schema).toBe("armor-studio/site-config/4");
    expect(exported.cameras[0]).not.toHaveProperty("username");
    expect(exported.cameras[0]).not.toHaveProperty("hasCredentials");
    expect(exported.cameras[0]).toHaveProperty("id", "cam-1");
    expect(JSON.stringify(exported)).not.toMatch(/password|admin/i);
  });
});
