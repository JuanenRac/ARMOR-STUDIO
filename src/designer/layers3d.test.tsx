// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { locales, text } from "../i18n";

// the renderer cannot draw in a test browser: only what the module says about its layers is looked at
vi.mock("@react-three/fiber", () => ({ useFrame: () => undefined, useThree: () => ({}), Canvas: () => null, extend: () => undefined }));
vi.mock("@react-three/drei", () => ({ Edges: () => null, Grid: () => null, Html: () => null, Line: () => null, OrbitControls: () => null }));

describe("the layers of the 3D view", () => {
  it("has the cones of the fields of view as a layer of its own, off until it is switched on, and every other layer on", async () => {
    const { ALL_LAYERS, LAYER_KEYS } = await import("./Viewport3D");
    expect(LAYER_KEYS).toContain("cones");
    expect(ALL_LAYERS.cones).toBe(false);
    for (const key of LAYER_KEYS.filter(item => item !== "cones")) expect(ALL_LAYERS[key], key).toBe(true);
    expect(Object.keys(ALL_LAYERS).sort()).toEqual([...LAYER_KEYS].sort());
  });

  it("is named in the eight languages", () => {
    for (const locale of locales) {
      expect(text(locale, "layer_cones"), locale).not.toBe("layer_cones");
      expect(text(locale, "layer_cones").length, locale).toBeGreaterThan(3);
    }
    expect(text("pt", "layer_cones")).toBe("Cones 3D dos campos");
  });
});
