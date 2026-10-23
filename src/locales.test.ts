import { describe, expect, it, vi } from "vitest";
import { ensureLocale, isLocaleLoaded, locales, requiredUiKeys, text } from "./i18n";
import { sourceCatalogues, HINT_PREFIX } from "./i18nSources";
import { HELP_SECTIONS } from "./helpText";
import { MENU_STEPS } from "./tour/menuToursText";
import { hintCatalogue } from "./hintText";
import { HELP_SECTION_IDS, HINT_KEYS, HINT_PREFIX as WRITTEN_PREFIX, MENU_STEP_LAYOUT } from "./locales/keys";

describe("the language tables the console loads (src/locales, written by tools/build_locales.mjs)", () => {
  it("say, in every one of the eight languages, exactly what the sources say (run `npm run locales` after changing a phrase)", () => {
    expect([...locales]).toEqual(["en", "es", "de", "fr", "it", "ja", "zh", "pt"]);
    for (const locale of locales) {
      const wrong = Object.entries(sourceCatalogues[locale]).filter(([key, value]) => text(locale, key) !== value).map(([key]) => `${locale}:${key}`);
      expect(wrong.slice(0, 10), `${locale} differs from its sources in ${wrong.length} phrases`).toEqual([]);
    }
  });

  it("have every phrase of English in every language (a language that lacks one would show it in English)", () => {
    for (const locale of locales) {
      const missing = Object.keys(sourceCatalogues.en).filter(key => !(key in sourceCatalogues[locale]) && !key.startsWith(HINT_PREFIX));
      expect(missing.slice(0, 10), `${locale} lacks ${missing.length} phrases`).toEqual([]);
    }
  });

  it("carry a hover hint in every language for every key of the hints", () => {
    for (const locale of ["en", "es", "de", "fr", "it", "ja", "zh"] as const) {
      const missing = HINT_KEYS.filter(key => !(HINT_PREFIX + key in sourceCatalogues[locale]));
      expect(missing, locale).toEqual([]);
    }
    expect(requiredUiKeys.some(key => key.startsWith(HINT_PREFIX))).toBe(false);
  });

  it("keep what does not depend on the language in step with the sources", () => {
    expect(WRITTEN_PREFIX).toBe(HINT_PREFIX);
    expect([...HELP_SECTION_IDS]).toEqual(HELP_SECTIONS.map(section => section.id));
    expect([...HINT_KEYS]).toEqual(Object.keys(hintCatalogue));
    const layout = Object.fromEntries(Object.entries(MENU_STEPS).map(([view, steps]) => [view, steps.map(step => ({ ...(step.target ? { target: step.target } : {}), ...(step.placement ? { placement: step.placement } : {}) }))]));
    expect(MENU_STEP_LAYOUT).toEqual(layout);
  });

  it("load a language only when it is asked for, English being there from the start", async () => {
    vi.resetModules();
    const fresh = await import("./i18n");
    expect(fresh.isLocaleLoaded("en")).toBe(true);
    for (const code of ["es", "de", "fr", "it", "ja", "zh", "pt"] as const) expect(fresh.isLocaleLoaded(code), code).toBe(false);
    expect(fresh.text("de", "overview")).toBe(fresh.text("en", "overview"));
    await fresh.ensureLocale("de");
    expect(fresh.isLocaleLoaded("de")).toBe(true);
    expect(fresh.isLocaleLoaded("es")).toBe(false);
    expect(fresh.text("de", "overview")).toBe(sourceCatalogues.de.overview);
    await fresh.ensureLocale("de");
    expect(isLocaleLoaded("pt")).toBe(true);
    await ensureLocale("pt");
  });

  it("are the only way the screens read phrases: no screen imports a table of phrases, which would put every language back into the first page", () => {
    const sources = import.meta.glob(["./**/*.ts", "./**/*.tsx"], { query: "?raw", import: "default", eager: true }) as Record<string, string>;
    const tables = /from "[^"]*\/(?:(?!apiErrorText")[A-Za-z]+Text|i18nSources|hintsA|hintsB|hintsC|hintsD|hintsE|hintsPt|helpPtA|helpPtB|ptCatalogue|catalogueRows|designerRows\/[a-z0-9]+|help\/sections[0-9]|tour\/menuSteps[A-Za-z]*|tour\/menuToursText|assistant\/topics\/[a-z0-9]+)"/;
    const allowed = /^\.\/(?:i18nSources|locales\.test|[A-Za-z/]*Text|[A-Za-z/]*\.test)\.tsx?$|^\.\/(?:hint[A-Za-z]*|helpPt[AB]|ptCatalogue|catalogueRows|designerRows\/.*|help\/.*|tour\/menuSteps.*|tour\/menuToursText|assistant\/topics\/.*|assistant\/knowledge|assistant\/engine)\.ts$|^\.\/locales\//;
    const offenders: string[] = [];
    for (const [file, source] of Object.entries(sources)) {
      if (allowed.test(file) || /\.test\.tsx?$/.test(file)) continue;
      if (tables.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
