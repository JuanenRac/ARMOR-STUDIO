import { describe, expect, it } from "vitest";
import { parseLayout, resolveSlots } from "./cameraLayout";

describe("the layout of the camera monitor", () => {
  it("keeps the camera chosen for each place and fills the others with the cameras not shown yet", () => {
    expect(resolveSlots(["a", "b", "c", "d"], ["c", "", "a"], 4)).toEqual(["c", "b", "a", "d"]);
  });
  it("forgets a camera that no longer exists and never shows one twice", () => {
    expect(resolveSlots(["a", "b"], ["gone", "a", "a"], 4)).toEqual(["b", "a", "", ""]);
  });
  it("leaves empty the places there is no camera for", () => {
    expect(resolveSlots(["a"], [], 2)).toEqual(["a", ""]);
  });
  it("reads only a valid saved layout", () => {
    expect(parseLayout(JSON.stringify({ gridSize: 6, slots: ["a", 3, "b"] }))).toEqual({ gridSize: 6, slots: ["a", "b"] });
    expect(parseLayout(JSON.stringify({ gridSize: 5, slots: [] }))).toBeNull();
    expect(parseLayout("not json")).toBeNull();
    expect(parseLayout(null)).toBeNull();
  });
});
