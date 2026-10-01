import { describe, expect, it } from "vitest";
import { familyKey, isActive, toneOf } from "./views/ServicesView";
import { servicesCatalogues } from "./servicesText";
import { LANGUAGE_ORDER } from "./catalogueRows";

describe("the services menu", () => {
  it("colours a state by what it means: green works, red is stopped, amber failed or starting, grey is not there", () => {
    expect(toneOf("running")).toBe("green"); expect(toneOf("online")).toBe("green");
    expect(toneOf("stopped")).toBe("red"); expect(toneOf("offline")).toBe("red");
    expect(toneOf("failed")).toBe("amber"); expect(toneOf("starting")).toBe("amber");
    expect(toneOf("not_installed")).toBe("slate"); expect(toneOf("unknown")).toBe("slate");
    expect(["running", "online"].every(state => isActive(state as never))).toBe(true);
    expect(["stopped", "failed", "unknown", "not_installed", "offline", "starting"].some(state => isActive(state as never))).toBe(false);
  });
  it("finds the translated name of a family", () => {
    expect(familyKey("AI and voice")).toBe("svcFamily_AI_and_voice");
    expect(servicesCatalogues.es[familyKey("Field nodes")]).toBe("Nodos de campo");
  });
  it("has every phrase in the seven languages, and a state label for every state", () => {
    for (const code of LANGUAGE_ORDER) {
      for (const key of Object.keys(servicesCatalogues.en)) expect(servicesCatalogues[code][key], `${code} ${key}`).toBeTruthy();
      for (const state of ["running", "stopped", "failed", "starting", "not_installed", "online", "offline", "unknown"]) expect(servicesCatalogues[code][`svcState_${state}`]).toBeTruthy();
    }
  });
});
