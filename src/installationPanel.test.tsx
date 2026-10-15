import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { text } from "./i18n";
import { InstallationPanel, ReportView, partsOf } from "./InstallationPanel";

const LANGUAGES = ["en", "es", "de", "fr", "it", "ja", "zh"] as const;

describe("the installation page", () => {
  it("reads what a file holds, and takes nothing that is not an installation file", () => {
    const file = { format: "armor-installation", version: 1, parts: { cameras: [{ id: "a" }, { id: "b" }], site: { buildings: [] }, rules: { zones: [] }, users: [{ username: "x", role: "admin" }], automations: null } };
    expect(partsOf(file)).toEqual([{ part: "cameras", count: 2 }, { part: "site", count: 1 }, { part: "rules", count: 1 }, { part: "users", count: 1 }]);
    expect(partsOf({ format: "something-else", parts: { cameras: [] } })).toEqual([]);
    expect(partsOf({ format: "armor-installation", parts: [] })).toEqual([]);
    expect(partsOf(null)).toEqual([]);
    expect(partsOf("text")).toEqual([]);
  });
  it("says what it is, in every language, with nothing left untranslated", () => {
    for (const language of LANGUAGES) {
      const html = renderToStaticMarkup(createElement(InstallationPanel, { t: (key: string, ...args: Array<string | number>) => text(language, key).replace(/\{(\d+)\}/g, (_m, i: string) => String(args[Number(i)])), origin: "http://x", isAdmin: true }));
      expect(html, language).not.toMatch(/\bin_[a-z_]+\b|tabInstallation/);
      expect(html.length).toBeGreaterThan(300);
    }
  });
  it("is for administrators only", () => {
    const html = renderToStaticMarkup(createElement(InstallationPanel, { t: (key: string) => text("en", key), origin: "http://x", isAdmin: false }));
    expect(html).not.toContain("Download the installation");
  });
  it("shows what was done, what was left alone, what did not check out and the cameras that need a password", () => {
    const report = { applied: { cameras: "1 added, 0 already there", site: "replaced (revision 3; the previous one is kept as a version)" }, skipped: { users: "kept for the record" }, failed: { rules: "not valid rules" }, cameras_need_credentials: ["gate"] };
    for (const language of LANGUAGES) {
      const html = renderToStaticMarkup(createElement(ReportView, { t: (key: string) => text(language, key), report }));
      expect(html).toContain("1 added, 0 already there");
      expect(html).toContain("not valid rules");
      expect(html).toContain("gate");
      expect(html, language).not.toMatch(/\bin_[a-z_]+\b/);
    }
  });
});
