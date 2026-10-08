import { describe, expect, it } from "vitest";
import { hintCatalogue } from "./hintText";
import { keyFor, normal } from "./hoverHints";
import { locales, text } from "./i18n";

describe("hover hints", () => {
  it("every hint is written in all seven languages and is not empty", () => {
    for (const [key, hint] of Object.entries(hintCatalogue)) {
      expect(hint.length, key).toBe(locales.length);
      for (const line of hint) expect(line.trim().length, key).toBeGreaterThan(2);
    }
  });
  it("every hint belongs to a label that exists", () => {
    for (const key of Object.keys(hintCatalogue)) {
      const label = key.replace(/^nav:/, "");
      if (label === "becomes") continue;   // its wording is the same word as its key
      expect(text("en", label), key).not.toBe(label);
    }
  });
  it("finds the hint of a control by what it says, in each language, and a menu entry gets the menu's own hint", () => {
    for (const locale of locales) {
      expect(keyFor([normal(text(locale, "acknowledge"))], locale, false), locale).toBe("acknowledge");
      expect(keyFor([normal(text(locale, "alarms"))], locale, true), locale).toBe("nav:alarms");
    }
    expect(keyFor([normal(text("en", "record"))], "en", false)).toBe("record");
    expect(keyFor([normal(text("en", "record"))], "en", true)).toBe("nav:record");
    expect(keyFor(["nothing like this"], "en", false)).toBeUndefined();
  });
});
