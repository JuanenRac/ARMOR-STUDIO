import { describe, expect, it } from "vitest";
import { renderReport, reportLanguages } from "./i18nReport";

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
