import { describe, expect, it } from "vitest";
import { zoneBetween } from "./IgnoreZonesEditor";

describe("drawing a zone to ignore", () => {
  it("is the rectangle between two corners, whichever way it is dragged", () => {
    expect(zoneBetween({ x: 0.2, y: 0.3 }, { x: 0.6, y: 0.7 })).toEqual({ x: 0.2, y: 0.3, w: 0.4, h: 0.4 });
    expect(zoneBetween({ x: 0.6, y: 0.7 }, { x: 0.2, y: 0.3 })).toEqual({ x: 0.2, y: 0.3, w: 0.4, h: 0.4 });
  });
  it("is kept inside the picture", () => {
    expect(zoneBetween({ x: -0.5, y: 0.5 }, { x: 0.5, y: 1.7 })).toEqual({ x: 0, y: 0.5, w: 0.5, h: 0.5 });
  });
  it("is nothing when it is only a click or too thin", () => {
    expect(zoneBetween({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 })).toBeNull();
    expect(zoneBetween({ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.11 })).toBeNull();
  });
});
