import { describe, expect, it } from "vitest";
import { nodeKindIn, nodeKindOf } from "./nodeKind";

describe("the kind of a node", () => {
  it("is what its own panel says, and failing that what its name says", () => {
    expect(nodeKindOf({ ports: [{ banner: "A.R.M.O.R. Radar" }], hostname: "armor-whatever" })).toBe("radar");
    expect(nodeKindOf({ ports: [], hostname: "armor-nodo-solar-2" })).toBe("solar");
    expect(nodeKindOf({ hostname: "armor-elec-1" })).toBe("electrical");
    expect(nodeKindOf({ ports: [{ banner: "A.R.M.O.R. HMI" }] })).toBe("hmi");
    expect(nodeKindOf({ hostname: "armor-pantalla" })).toBeUndefined();
    expect(nodeKindOf({})).toBeUndefined();
  });
  it("reads an alarm panel and does not take a word that merely contains 'hmi' for a touch panel", () => {
    expect(nodeKindIn("a.r.m.o.r. alarm")).toBe("alarm");
    expect(nodeKindIn("rhmic-box")).toBeUndefined();
  });
});
