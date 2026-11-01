import { describe, expect, it } from "vitest";
import { locales, text } from "../i18n";
import { uxCatalogues } from "../uxText";

describe("the phrases of the small checks", () => {
  it("are in the eight languages, Portuguese of Portugal included, and each language really differs from English", () => {
    const keys = Object.keys(uxCatalogues.en);
    expect(keys.length).toBeGreaterThan(20);
    for (const code of locales) {
      for (const key of keys) expect(text(code, key).trim().length, `${code}.${key}`).toBeGreaterThan(0);
    }
    for (const code of locales.filter(item => item !== "en")) {
      const same = keys.filter(key => text(code, key) === text("en", key));
      expect(same, code).toEqual([]);
    }
  });

  it("use Portuguese of Portugal, not Brazilian, words", () => {
    for (const key of Object.keys(uxCatalogues.en)) {
      expect(text("pt", key), key).not.toMatch(/\b(senha|você|usuário|arquivo|tela|celular|digite)\b/i);
    }
  });
});
