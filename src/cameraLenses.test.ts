import { describe, expect, it } from "vitest";
import { forWindows, lensId, sourceOf, withLensWindows } from "./cameraLenses";
import type { Camera } from "./domain";

const camera = (id: string, extra: Partial<Camera> = {}): Camera => ({ id, name: id, host: "h", snapshotUrl: "", enabled: true, x: 50, y: 50, ...extra });

describe("the windows of a camera with two lenses in one stream", () => {
  it("makes two windows, one after the other, tied to the real camera", () => {
    const list = withLensWindows([camera("a"), camera("yard", { layout: "split", name: "Yard" }), camera("b")], side => side);
    expect(list.map(item => item.id)).toEqual(["a", "yard.upper", "yard.lower", "b"]);
    expect(list[1]).toMatchObject({ name: "Yard · upper", lensView: "upper", sourceId: "yard", layout: "single" });
  });
  it("goes back from a window to the real camera", () => {
    expect(sourceOf(lensId("yard", "lower"))).toBe("yard");
    expect(sourceOf("yard")).toBe("yard");
  });
  it("gives each window what the real camera has (its stream address)", () => {
    const cameras = [camera("yard", { layout: "split" }), camera("a")];
    expect(forWindows(cameras, { yard: "u1", a: "u2" })).toEqual({ yard: "u1", a: "u2", "yard.upper": "u1", "yard.lower": "u1" });
  });
  it("leaves the cameras with one lens as they are", () => {
    const one = camera("a");
    expect(withLensWindows([one], side => side)).toEqual([one]);
  });
});
