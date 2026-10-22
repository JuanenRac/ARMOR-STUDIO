import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LOGO_KINDS, MenuLogo, MenuTitle } from "./menuLogos";

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), "utf8");

describe("the animated logos of the menus", () => {
  it("has a drawing for every kind, and every drawing moves", () => {
    expect(LOGO_KINDS.length).toBeGreaterThanOrEqual(19);
    for (const kind of LOGO_KINDS) {
      const html = renderToStaticMarkup(createElement(MenuLogo, { kind }));
      expect(html, kind).toContain(`ml-${kind}`);
      expect(html, kind).toMatch(/class="ml-[a-z-]+/);
      expect(html, kind).toContain('aria-hidden="true"');
    }
  });

  it("the four designers have their own logo beside the title", () => {
    for (const kind of ["drawSite", "drawAlarm", "drawElectrical", "drawNetwork"] as const) expect(LOGO_KINDS).toContain(kind);
    const sources = { drawSite: read("./SiteDesignerInteractive.tsx"), drawAlarm: read("./AlarmDesigner.tsx"), drawElectrical: read("./ElectricalDesigner.tsx"), drawNetwork: read("./NetworkDesigner.tsx") };
    for (const [kind, source] of Object.entries(sources)) expect(source, kind).toContain(`<MenuTitle kind="${kind}">`);
  });

  it("a title carries its logo and keeps the text beside it", () => {
    const html = renderToStaticMarkup(createElement(MenuTitle, { kind: "drawAlarm", children: createElement("h2", null, "Title") }));
    expect(html).toContain("menu-title");
    expect(html).toContain("ml-drawAlarm");
    expect(html).toContain("<h2>Title</h2>");
  });

  it("every movement stops for a person who asks for less motion", () => {
    const css = read("./anim.css");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toMatch(/prefers-reduced-motion: reduce\)[^}]*\.ml \*[^}]*animation: none !important/);
  });
});
