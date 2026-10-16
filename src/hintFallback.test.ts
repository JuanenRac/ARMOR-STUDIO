import { describe, expect, it } from "vitest";
import { fallbackHint } from "./hintFallback";
import { locales } from "./i18n";

describe("the hint of a control with no row in the catalogue", () => {
  it("names what the control is, in every language", () => {
    for (const locale of locales) for (const kind of ["tool", "tile", "tab", "filter", "grid", "floor", "group", "choose", "switch", "slide", "type", "button"] as const) {
      const hint = fallbackHint(kind, "Door", locale);
      expect(hint, `${locale}/${kind}`).toContain("Door");
      expect(hint).not.toContain("{x}");
    }
    expect(fallbackHint("button", "", "en")).toBe("");
  });
});
