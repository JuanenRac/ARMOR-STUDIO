import { describe, expect, it } from "vitest";
import { LANGUAGES } from "./domain";
import { locales, requiredUiKeys, text } from "./i18n";

describe("Studio internationalisation", () => {
  it("has a complete catalogue for all seven supported languages", () => {
    expect(locales).toHaveLength(7);
    for (const locale of locales) {
      for (const key of requiredUiKeys) expect(text(locale, key).trim()).not.toHaveLength(0);
    }
    expect(text("es", "cameras")).toBe("Cámaras");
    expect(text("ja", "configuration")).toBe("設定");
  });

  it("offers exactly the languages the catalogue provides", () => {
    expect(LANGUAGES.map(language => language.code).sort()).toEqual([...locales].sort());
  });

  it("never falls back to a technical key: a translation equal to its key must be the English word itself", () => {
    for (const locale of locales.filter(item => item !== "en")) {
      for (const key of requiredUiKeys) {
        if (text(locale, key) === key) expect(text("en", key), `${locale}:${key}`).toBe(key);
      }
    }
  });
});
