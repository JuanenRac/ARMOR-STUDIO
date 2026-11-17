import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { weatherCatalogues } from "../weatherText";

// The search of a place sends the typed text to a service outside the house: the line that says so sits under the search box, in every language.
describe("the note under the search of a place", () => {
  it("exists in the seven languages of the table and in Portuguese, and names the service", () => {
    for (const locale of ["en", "es", "de", "fr", "it", "ja", "zh"] as const) expect(weatherCatalogues[locale].wxSearchNote, locale).toContain("Open-Meteo");
    expect(readFileSync("src/ptCatalogue.ts", "utf8")).toContain("\"wxSearchNote\"");
  });
  it("is drawn by the search of a place", () => {
    expect(readFileSync("src/views/WeatherView.tsx", "utf8")).toContain("t(\"wxSearchNote\")");
  });
});
