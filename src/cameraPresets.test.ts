import { describe, expect, it } from "vitest";
import { canPanTilt, canZoom, cameraWebAddress, hasMovement, lensCameras, newLenses, presetTraits } from "./cameraPresets";

describe("camera kinds", () => {
  it("fill in what each kind can do", () => {
    expect(presetTraits("dual_fixed")).toEqual({ layout: "split", ptz: false, zoom: false });
    expect(presetTraits("ptz")).toEqual({ layout: "single", ptz: true, zoom: true });
  });
  it("keep every button for a camera that never said, and hide the movement of a fixed one", () => {
    expect(canPanTilt({}) && canZoom({})).toBe(true);
    expect(hasMovement({ ptz: false, zoom: false })).toBe(false);
    expect(hasMovement({ ptz: false, zoom: true })).toBe(true);
  });
  it("gives the web address of the configurator", () => {
    expect(cameraWebAddress({ host: "192.168.0.9" })).toBe("http://192.168.0.9/");
    expect(cameraWebAddress({ host: "x", webUrl: "https://cam.local/" })).toBe("https://cam.local/");
    expect(cameraWebAddress({ host: "" })).toBe("");
  });
  it("makes one camera per lens, tied by a group, with its own flags", () => {
    const lenses = newLenses(3);
    lenses[1].ptz = true;
    const cameras = lensCameras({ id: "", name: "Yard", host: "h" }, "cam-ab12", lenses);
    expect(cameras.map(c => c.id)).toEqual(["cam-ab12-1", "cam-ab12-2", "cam-ab12-3"]);
    expect(cameras.every(c => c.group === "cam-ab12")).toBe(true);
    expect(cameras.map(c => c.ptz)).toEqual([false, true, false]);
  });
});
