import { describe, expect, it } from "vitest";
import { chromeCatalogues } from "../chromeText";

describe("the list that jumps to another object of the site", () => {
  it("has its name in the eight languages", () => {
    for (const code of ["en", "es", "de", "fr", "it", "ja", "zh"] as const) expect(chromeCatalogues[code].site_jump).toBeTruthy();
  });
});
