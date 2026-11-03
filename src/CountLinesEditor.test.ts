import { describe, expect, it } from "vitest";
import { lineBetween, nextLineId } from "./CountLinesEditor";

describe("drawing a counting line", () => {
  it("is the segment between the two points that were dragged", () => {
    expect(lineBetween("gate", { x: 0.2, y: 0.3 }, { x: 0.6, y: 0.7 })).toEqual({ id: "gate", a: [0.2, 0.3], b: [0.6, 0.7] });
  });
  it("is kept inside the picture", () => {
    expect(lineBetween("gate", { x: -0.5, y: 0.5 }, { x: 0.5, y: 1.7 })).toEqual({ id: "gate", a: [0, 0.5], b: [0.5, 1] });
  });
  it("is nothing when it is only a click or too short", () => {
    expect(lineBetween("gate", { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 })).toBeNull();
    expect(lineBetween("gate", { x: 0.1, y: 0.1 }, { x: 0.11, y: 0.11 })).toBeNull();
  });
  it("gets the first name that no other line has", () => {
    expect(nextLineId([])).toBe("line1");
    expect(nextLineId([{ id: "line1", a: [0, 0], b: [1, 1] }, { id: "gate", a: [0, 0], b: [1, 1] }])).toBe("line2");
  });
});
