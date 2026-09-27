import { describe, expect, it } from "vitest";
import { designerCatalogues } from "./designerText";
import { locales, requiredUiKeys, text } from "./i18n";
import { PLAN_TOOL_GROUPS, VIEW_TOOL_GROUPS } from "./designer/model";

describe("designer text", () => {
  it("has every phrase in all seven languages, and no language repeats another's placeholder text for a whole sentence", () => {
    const keys = Object.keys(designerCatalogues.en);
    for (const locale of locales) expect(Object.keys(designerCatalogues[locale]).sort()).toEqual(keys.slice().sort());
    for (const locale of locales) for (const key of keys) expect(designerCatalogues[locale][key].trim().length, `${locale}:${key}`).toBeGreaterThan(0);
  });
  it("names and explains every tool of both views", () => {
    for (const spec of [...PLAN_TOOL_GROUPS.flat(), ...VIEW_TOOL_GROUPS.flat()]) {
      for (const key of [spec.labelKey, `${spec.labelKey}Help`]) {
        expect(requiredUiKeys, key).toContain(key);
        for (const locale of locales) expect(text(locale, key), `${locale}:${key}`).not.toBe(key);
      }
    }
  });
  it("has the words the designer builds from a kind", () => {
    const kinds = ["layer_terrain", "layer_buildings", "layer_roofs", "layer_features", "layer_cameras", "layer_sensors", "layer_fields", "layer_grid", "roof_flat", "roof_shed", "roof_gable", "roof_hip", "roof_pyramid", "roofItem_chimney", "roofItem_solar", "roofItem_antenna", "roofItem_vent", "door", "window"];
    for (const key of kinds) for (const locale of locales) expect(text(locale, key), `${locale}:${key}`).not.toBe(key);
  });
});
