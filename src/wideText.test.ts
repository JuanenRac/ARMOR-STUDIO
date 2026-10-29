import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), "utf8");
const indexCss = read("./index.css"), compactCss = read("./compact.css"), wideCss = read("./wide-text.css"), solarCss = read("./views/solar.css");
const electricalCss = read("./electrical/electrical.css"), configurationCss = read("./configuration.css"), securityCss = read("./security.css");

type Rule = { selector: string; body: string };
/** The plain rules of a style sheet (media blocks are read through, their inner rules count too). */
const rulesOf = (css: string): Rule[] => [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({ selector: match[1].trim(), body: match[2] }));
const maxWidthOf = (rule: Rule): string | null => rule.body.match(/(?:^|[;\s])max-width\s*:\s*([^;}]+)/)?.[1].trim() ?? null;
const WIDE = new Set(["none", "100%"]);

describe("the introduction under the title of a menu", () => {
  it("has no restrictive width in the style sheets that style it", () => {
    for (const [name, css] of Object.entries({ compactCss, wideCss, solarCss, electricalCss, configurationCss, securityCss })) {
      for (const rule of rulesOf(css)) {
        const intro = rule.selector.split(",").some(part => /\.muted\b/.test(part) && !/\.small\b/.test(part) && /(devices-head|ov-hero|solar-title|ed-head|stack-card|wide-card|sec-card|config-panel|main-stage)/.test(part));
        const width = maxWidthOf(rule);
        if (intro && width) expect(WIDE.has(width), `${name}: ${rule.selector} { max-width: ${width} }`).toBe(true);
      }
    }
  });

  it("is let through by a rule that wins over the base width of a muted text", () => {
    expect(rulesOf(indexCss).some(rule => /^\.muted$/.test(rule.selector) && maxWidthOf(rule) === "700px")).toBe(true);
    const winner = rulesOf(wideCss).find(rule => rule.selector.includes(".muted:not(#ui)") && rule.selector.includes(".menu-title-text") && rule.selector.includes(".solar-title") && rule.selector.includes(".ed-head"));
    expect(winner).toBeDefined();
    expect(maxWidthOf(winner!)).toBe("none");
  });

  it("follows the language, the text size and the window: no fixed height, a line height in rem, a head that shares its row", () => {
    const winner = rulesOf(wideCss).find(rule => rule.selector.includes(".muted:not(#ui)"))!;
    expect(winner.body).toMatch(/line-height:\s*[\d.]+rem/);
    expect(winner.body).toContain("min-width: 0");
    expect(winner.body).not.toMatch(/(?:^|[;\s])(?:height|max-height)\s*:/);
    const solar = rulesOf(wideCss).filter(rule => rule.selector.includes(".solar-head"));
    expect(solar.some(rule => /grid-template-columns:\s*auto minmax\(0, 1fr\) auto/.test(rule.body))).toBe(true);
    expect(solar.some(rule => rule.selector.includes(".solar-title > .muted") && rule.body.includes("grid-column: 1 / -1"))).toBe(true);
    expect(rulesOf(wideCss).some(rule => rule.selector.includes(".menu-title") && /flex:\s*1 1/.test(rule.body))).toBe(true);
    expect(wideCss).toContain("@media (max-width: 760px)");
  });
});

describe("the card that opens a designer from a menu", () => {
  const linkCss = read("./components/designer-link.css");
  const rule = (selector: string) => rulesOf(linkCss).find(item => item.selector === selector)!;

  it("puts the title and the button on one row and the explanation under them, across the whole card", () => {
    expect(rule(".designer-link").body).toMatch(/display:\s*grid/);
    expect(rule(".designer-link").body).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) auto/);
    expect(rule(".designer-link-text").body).toContain("display: contents");
    expect(rule(".designer-link p").body).toContain("grid-column: 1 / -1");
    expect(maxWidthOf(rule(".designer-link p"))).toBe("none");
  });

  it("wraps by the language, the text size and the window: a line height in rem, no fixed height and the button below on a phone", () => {
    expect(rule(".designer-link p").body).toMatch(/line-height:\s*[\d.]+rem/);
    expect(rule(".designer-link p").body).not.toMatch(/(?:^|[;\s])(?:height|max-height)\s*:/);
    expect(rule(".designer-link p").body).toContain("overflow-wrap: anywhere");
    expect(linkCss).toContain("@media (max-width: 520px)");
  });
});

describe("the card that introduces a tab of the settings", () => {
  it("takes the whole row of the grid, so that its text runs along the page and not along a third of it", () => {
    const rule = rulesOf(configurationCss).find(item => item.selector === ".config-grid .full-card");
    expect(rule).toBeDefined();
    expect(rule!.body).toContain("grid-column: 1 / -1");
    for (const file of ["./CapturePanel.tsx", "./BatteryMaintenance.tsx"]) expect(read(file), file).toContain("stack-card full-card");
  });
});
