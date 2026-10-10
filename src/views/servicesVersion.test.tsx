import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { text } from "../i18n";
import { VersionBadge } from "./ServicesView";

describe("the version box of a service", () => {
  it("shows the version under its label in every language", () => {
    for (const language of ["en", "es", "de", "fr", "it", "ja", "zh"] as const) {
      const html = renderToStaticMarkup(createElement(VersionBadge, { t: (key: string) => text(language, key), version: "0.5.2" }));
      expect(html).toContain("0.5.2");
      expect(html, language).not.toContain("svcVersion");
    }
  });
  it("shows nothing when the server could not tell", () => {
    expect(renderToStaticMarkup(createElement(VersionBadge, { t: (key: string) => key, version: null }))).toBe("");
    expect(renderToStaticMarkup(createElement(VersionBadge, { t: (key: string) => key }))).toBe("");
  });
});
