import { describe, expect, it } from "vitest";
import { canonical, diffDesigns } from "./designDiff";

describe("diffDesigns", () => {
  it("is the same when only the order of the keys differs", () => {
    expect(canonical({ a: 1, b: { c: 2, d: 3 } })).toBe(canonical({ b: { d: 3, c: 2 }, a: 1 }));
    expect(diffDesigns({ buildings: [{ id: "a", x: 1, y: 2 }] }, { buildings: [{ y: 2, id: "a", x: 1 }] }).same).toBe(true);
  });
  it("lists the items that come back, go away and change, by their id", () => {
    const version = { sensors: [{ id: "s1", x: 1 }, { id: "s2", x: 2 }], terrain: { width: 30 } };
    const current = { sensors: [{ id: "s2", x: 9 }, { id: "s3", x: 3 }], terrain: { width: 30 } };
    const diff = diffDesigns(version, current);
    expect(diff.same).toBe(false);
    expect(diff.parts).toEqual([{ name: "sensors", back: ["s1"], gone: ["s3"], changed: ["s2"] }]);
  });
  it("names a part that is not a list of items by its name", () => {
    expect(diffDesigns({ terrain: { width: 30 } }, { terrain: { width: 40 } }).parts).toEqual([{ name: "terrain", back: [], gone: [], changed: ["terrain"] }]);
  });
  it("treats a part missing on one side as all of it coming back or going away", () => {
    expect(diffDesigns({ openings: [{ id: "o1" }] }, {}).parts[0]).toEqual({ name: "openings", back: ["o1"], gone: [], changed: [] });
  });
});
