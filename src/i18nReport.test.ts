import { describe, expect, it } from "vitest";
import { judgeReport, readLimits, renderReport, reportLanguages } from "./i18nReport";
import { sourceCatalogues } from "./i18nSources";
import raw from "./i18nReport.config.json";

describe("reportLanguages", () => {
  const catalogues = {
    en: { save: "Save", name: "Name", long: "A phrase long enough to count when it is left in English", arm: "Arm" },
    de: { save: "Speichern", name: "Name", long: "A phrase long enough to count when it is left in English", arm: "Scharfschaltung der gesamten Anlage" },
    ja: { save: "保存", arm: "警戒" },
  };

  it("counts what a language lacks and what it leaves as English", () => {
    const [de, ja] = reportLanguages(catalogues);
    expect(de).toMatchObject({ code: "de", total: 4, missing: 0, sameAsEnglish: 1 });
    expect(ja).toMatchObject({ code: "ja", missing: 2, sameAsEnglish: 0 });
  });

  it("lists a short label whose translation is much longer, except in Japanese and Chinese", () => {
    const [de, ja] = reportLanguages(catalogues);
    expect(de?.longLabels.map(item => item.key)).toEqual(["arm"]);
    expect(ja?.longLabels).toEqual([]);
  });

  it("writes a table with one line per language", () => {
    const text = renderReport(reportLanguages(catalogues));
    expect(text.split("\n")[0]).toContain("missing");
    expect(text).toContain("de: labels much longer than English");
  });
});

describe("the limits of the check", () => {
  const reports = [{ code: "de", total: 10, missing: 3, sameAsEnglish: 2, longLabels: [] }, { code: "fr", total: 10, missing: 0, sameAsEnglish: 0, longLabels: [] }];

  it("warns about a language over a warning limit and never fails below the failing one", () => {
    const verdict = judgeReport(reports, readLimits({ warnMissing: 0, failMissing: 10 }));
    expect(verdict.warnings).toEqual(["de lacks 3 phrases"]);
    expect(verdict.failures).toEqual([]);
  });
  it("fails only over the failing limit", () => {
    expect(judgeReport(reports, readLimits({ warnMissing: 0, failMissing: 2 })).failures).toEqual(["de lacks 3 phrases (the limit is 2)"]);
  });
  it("reads a value that is not a whole number of at least 0 as never", () => {
    expect(judgeReport(reports, readLimits({ warnMissing: -1, failMissing: "x", warnSameAsEnglish: 1.5 }))).toEqual({ warnings: [], failures: [] });
  });
  it("ships a configuration that is permissive and does not stop the build, whatever the tables hold today", () => {
    expect(raw.schema).toBe("armor-studio/locales-report-config/1");
    const verdict = judgeReport(reportLanguages(sourceCatalogues), readLimits(raw));
    if (verdict.warnings.length > 0) console.warn(`Language tables:\n${verdict.warnings.join("\n")}`);
    expect(verdict.failures).toEqual([]);
  });
});
