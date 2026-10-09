import { describe, expect, it } from "vitest";
import { FLOOR_STYLES, FEATURE_STYLES, type Building } from "../domain";
import { parseStudioSettings } from "../settings";
import { DEFAULT_FEATURE_COLOUR, featureColourOf, isColour } from "./colors";
import { FLOOR_LOOKS, floorAt, floorColourOf, floorFinish, floorPatternId, isFloorStyle } from "./floors";
import { createBuilding, removeFloor, addFloor, updateBuilding, duplicateBuilding, FEATURE_DEFAULTS, type SiteModel } from "./ops";

const empty = (): SiteModel => ({ terrain: { points: [] }, buildings: [], openings: [], roofItems: [], wallLamps: [], features: [], cameras: [], sensors: [], placements: [] } as unknown as SiteModel);
const house = (): Building => ({ id: "b1", name: "House", points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 8 }, { x: 0, y: 8 }], base: 1, floors: [2.8, 2.6, 2.4], roof: { style: "flat", slope: 0, overhang: 0, ridge: 0 }, thickness: 0.25 });

describe("the floors of a building", () => {
  it("knows every finish, with a real colour and a size for its pattern", () => {
    expect(FLOOR_STYLES.length).toBe(10);
    for (const style of FLOOR_STYLES) {
      expect(isFloorStyle(style)).toBe(true);
      expect(isColour(FLOOR_LOOKS[style].colour), style).toBe(true);
      expect(FLOOR_LOOKS[style].tile, style).toBeGreaterThan(0.5);
      expect(floorColourOf(style)).toBe(FLOOR_LOOKS[style].colour);
      expect(featureColourOf("floor", style)).toBe(FLOOR_LOOKS[style].colour);
    }
    expect(FEATURE_STYLES.floor).toEqual(FLOOR_STYLES);
    expect(isColour(DEFAULT_FEATURE_COLOUR.floor)).toBe(true);
    expect(isFloorStyle("oak")).toBe(false);
    expect(floorPatternId("flParquet", "#B08A5A")).toBe("fl-flParquet-b08a5a");
    expect(FEATURE_DEFAULTS.floor.style).toBe("flParquet");
  });

  it("says the finish of each level: the one chosen, or the plain slab", () => {
    const building: Building = { ...house(), floorMaterials: ["flMarble", "", "flCarpet"], floorColors: ["", "", "#112233"] };
    expect(floorFinish(building, 0)).toEqual({ style: "flMarble", colour: FLOOR_LOOKS.flMarble.colour, chosen: true });
    expect(floorFinish(building, 1)).toEqual({ style: "flConcrete", colour: FLOOR_LOOKS.flConcrete.colour, chosen: false });
    expect(floorFinish(building, 2)).toEqual({ style: "flCarpet", colour: "#112233", chosen: true });
    expect(floorFinish(house(), 0).chosen).toBe(false);
    expect(floorFinish({ ...house(), floorMaterials: ["nonsense"] }, 0).chosen).toBe(false);
  });

  it("finds which floor of which building a point at a height belongs to", () => {
    const buildings = [house()];
    expect(floorAt(buildings, { x: 5, y: 4 }, 1)?.floor).toBe(0);
    expect(floorAt(buildings, { x: 5, y: 4 }, 1 + 2.8)?.floor).toBe(1);
    expect(floorAt(buildings, { x: 5, y: 4 }, 1 + 2.8 + 2.6)?.floor).toBe(2);
    expect(floorAt(buildings, { x: 5, y: 4 }, 0)?.floor).toBe(0);          // a little under the ground floor is still the ground floor
    expect(floorAt(buildings, { x: 50, y: 4 }, 1)).toBeUndefined();         // outside every building
  });

  it("keeps the finishes with their levels when a level goes, and in a copy", () => {
    let model = empty();
    model = createBuilding(model, house().points, "House").model;
    const id = model.buildings[0].id;
    model = addFloor(addFloor(model, id), id);
    model = updateBuilding(model, id, { floorMaterials: ["flParquet", "flMarble", "flCarpet"], floorColors: ["", "#102030", ""] });
    const without = removeFloor(model, id, 1).buildings[0];
    expect(without.floorMaterials).toEqual(["flParquet", "flCarpet"]);
    expect(without.floorColors).toEqual(["", ""]);
    const copy = duplicateBuilding(model, id)!.model.buildings[1];
    expect(copy.floorMaterials).toEqual(["flParquet", "flMarble", "flCarpet"]);
    expect(copy.floorMaterials).not.toBe(model.buildings[0].floorMaterials);   // not the same list
  });

  it("is saved with the design and cleaned when it is read back", () => {
    const stored = (raw: unknown) => parseStudioSettings(JSON.stringify({ buildings: [raw], features: [{ id: "floor-1", kind: "floor", x: 3, y: 3, z: 1, width: 4, depth: 3, height: 0.03, rotation: 0, slope: 0, style: "flMarble", label: "Kitchen" }] }));
    const ok = stored({ ...house(), floorMaterials: ["flMarble", "junk", "flCarpet", "flCarpet", "x"], floorColors: ["#aabbcc", "red", "", "#000000", ""] });
    const building = ok.buildings![0];
    expect(building.floorMaterials).toEqual(["flMarble", "", "flCarpet", "flCarpet", ""]);
    expect(building.floorColors).toEqual(["#aabbcc", "", "", "#000000", ""]);
    expect(ok.features![0]).toMatchObject({ kind: "floor", style: "flMarble", label: "Kitchen" });
    expect(stored({ ...house(), floorMaterials: ["", "junk"] }).buildings![0].floorMaterials).toBeUndefined();   // nothing known: nothing kept
    expect(stored(house()).buildings![0].floorColors).toBeUndefined();
  });
});
