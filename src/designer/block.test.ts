import { describe, expect, it } from "vitest";
import { liveOfLink } from "./FeatureLink";
import { BLOCK_LIMITS, blockFits, blockGroup, generateApartmentBlock } from "./block";
import { addFeature, createBuilding, type SiteModel } from "./ops";
import { INTERIOR_KINDS } from "../domain";

const empty: SiteModel = { buildings: [], openings: [], roofItems: [], wallLamps: [], features: [], cameras: [], sensors: [], placements: [], terrain: { points: [] } } as unknown as SiteModel;
const rectangle = (width: number, depth: number) => [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: depth }, { x: 0, y: depth }];

describe("a block of flats", () => {
  it("fits only a rectangle with room for a corridor, two rows of flats and the core", () => {
    const small = createBuilding(empty, rectangle(8, 5));
    expect(blockFits(small.model.buildings[0], { floors: 4, flats: 4 })).toBe(false);
    const big = createBuilding(empty, rectangle(24, 12));
    expect(blockFits(big.model.buildings[0], { floors: 4, flats: 8 })).toBe(true);
    const lShape = createBuilding(empty, [{ x: 0, y: 0 }, { x: 24, y: 0 }, { x: 24, y: 6 }, { x: 12, y: 6 }, { x: 12, y: 12 }, { x: 0, y: 12 }]);
    expect(blockFits(lShape.model.buildings[0], { floors: 4, flats: 4 })).toBe(false);
    expect(generateApartmentBlock(lShape.model, lShape.id, { floors: 4, flats: 4 })).toBeNull();
  });

  it("makes the floors, the flats, the core and the equipment, all in one group", () => {
    const { model, id } = createBuilding(empty, rectangle(24, 12));
    const made = generateApartmentBlock(model, id, { floors: 5, flats: 6 })!;
    const building = made.buildings[0];
    expect(building.floors).toHaveLength(5);
    expect(building.use).toBe("apartments");
    const mine = made.features.filter(feature => feature.group === blockGroup(id));
    expect(mine.length).toBe(made.features.length);
    const count = (kind: string) => mine.filter(feature => feature.kind === kind).length;
    expect(count("stairs")).toBe(5);
    expect(count("lift")).toBe(5);
    expect(count("intercom-monitor")).toBe(5 * 6);       // a monitor in every flat
    expect(count("intercom")).toBe(1);                   // one street door
    expect(count("alarm-panel")).toBe(1);
    expect(count("alarm-keypad")).toBe(1);
    expect(count("stair-light")).toBe(5 * 2);
    expect(count("mailbox")).toBe(6);
    // each floor's pieces stand at the height of that floor
    const heights = new Set(mine.filter(feature => feature.kind === "stairs").map(feature => feature.z));
    expect(heights.size).toBe(5);
    // a window for every flat on every floor, and the street door
    expect(made.openings.filter(opening => opening.kind === "window")).toHaveLength(5 * 6);
    expect(made.openings.filter(opening => opening.kind === "door")).toHaveLength(1);
    // everything inside belongs to a floor
    for (const feature of mine) if (["stairs", "lift", "wall", "intercom-monitor"].includes(feature.kind)) expect(INTERIOR_KINDS.has(feature.kind)).toBe(true);
  });

  it("replaces what it made before when it is done again, and keeps what the person drew", () => {
    const { model, id } = createBuilding(empty, rectangle(24, 12));
    const withBench = addFeature(model, "bench", 30, 30).model;
    const once = generateApartmentBlock(withBench, id, { floors: 3, flats: 4 })!;
    const twice = generateApartmentBlock(once, id, { floors: 6, flats: 8 })!;
    expect(twice.features.filter(feature => feature.kind === "bench")).toHaveLength(1);
    expect(twice.features.filter(feature => feature.kind === "stairs")).toHaveLength(6);
    expect(twice.buildings[0].floors).toHaveLength(6);
    // the same ids are never used twice
    expect(new Set(twice.features.map(feature => feature.id)).size).toBe(twice.features.length);
  });

  it("works with the long side up and down as well", () => {
    const { model, id } = createBuilding(empty, rectangle(12, 24));
    const made = generateApartmentBlock(model, id, { floors: 3, flats: 4 })!;
    expect(made.openings.filter(opening => opening.kind === "window")).toHaveLength(3 * 4);
    expect(made.features.filter(feature => feature.kind === "lift")).toHaveLength(3);
  });

  it("keeps the limits", () => {
    const { model, id } = createBuilding(empty, rectangle(40, 14));
    const made = generateApartmentBlock(model, id, { floors: 99, flats: 99 })!;
    expect(made.buildings[0].floors).toHaveLength(BLOCK_LIMITS.floors[1]);
  });
});

describe("what a tied object says", () => {
  const node = (phase: string, siren = false, stale = false) => ({ node_id: "casa", stale, state: { phase, siren, zones: [] } }) as never;
  it("reads a tied alarm panel", () => {
    const link = { kind: "alarm" as const, id: "casa" };
    const sources = (n: unknown) => ({ alarmNodes: [n] as never[], devices: [], cameras: [] });
    expect(liveOfLink(link, sources(node("armed")))).toBe("armed");
    expect(liveOfLink(link, sources(node("disarmed")))).toBe("disarmed");
    expect(liveOfLink(link, sources(node("armed", true)))).toBe("alarm");
    expect(liveOfLink(link, sources(node("armed", false, true)))).toBe("offline");
    expect(liveOfLink({ kind: "alarm", id: "other" }, sources(node("armed")))).toBe("missing");
    expect(liveOfLink(undefined, sources(node("armed")))).toBeUndefined();
  });
  it("reads a tied device and notices a camera that is gone", () => {
    const devices = [{ id: "stair", online: true, state: { on: true } }, { id: "hall", online: false, state: {} }] as never[];
    expect(liveOfLink({ kind: "device", id: "stair" }, { alarmNodes: [], devices, cameras: [] })).toBe("on");
    expect(liveOfLink({ kind: "device", id: "hall" }, { alarmNodes: [], devices, cameras: [] })).toBe("offline");
    expect(liveOfLink({ kind: "camera", id: "gone" }, { alarmNodes: [], devices: [], cameras: [{ id: "door", name: "Door" }] })).toBe("missing");
    expect(liveOfLink({ kind: "camera", id: "door" }, { alarmNodes: [], devices: [], cameras: [{ id: "door", name: "Door" }] })).toBeUndefined();
  });
});
