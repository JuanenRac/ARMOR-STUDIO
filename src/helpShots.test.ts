import { describe, expect, it } from "vitest";
import { locales } from "./i18n";
import { HELP_SECTIONS } from "./helpText";

// The pictures of the Help (public/help/<language>/<menu>.jpg) are made with example data, one set per language: a language or a menu without its picture is a gap in the Help.
// Vite lists the files at build/test time, so no Node types are needed here.
const PICTURES = Object.keys(import.meta.glob("../public/help/*/*.jpg", { query: "?url" }));
const MENUS = ["overview", "alarms", "alarmPanels", "radar", "inverters", "batteries", "electrical", "devices", "network", "siteDesigner", "configuration"];

describe("the pictures of the Help", () => {
  it("exist for every language and every pictured menu, and only for menus that have a section", () => {
    const sections = new Set(HELP_SECTIONS.map(section => section.id));
    for (const menu of MENUS) expect(sections.has(menu), menu).toBe(true);
    for (const language of locales) {
      for (const menu of MENUS) expect(PICTURES.includes(`../public/help/${language}/${menu}.jpg`), `${language}/${menu}`).toBe(true);
    }
  });
});
