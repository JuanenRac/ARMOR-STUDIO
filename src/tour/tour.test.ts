import { describe, expect, it } from "vitest";
import { NAV } from "../domain";
import { locales, text } from "../i18n";
import { PREFS_KEYS } from "../prefsText";
import { TOUR_KEYS } from "../tourText";
import { ART_IDS, ART_OF_VIEW } from "./TourArt";
import { TOURS, TOUR_TARGETS, moveStep, placeCard, stepKey } from "./tours";

import configurationSource from "../ConfigurationPanel.tsx?raw";
import { MENU_STEPS, menuTourCatalogues, menuTourId } from "./menuTours";
// every component of the page, so that a part a step lights up can be looked for in all of them
const components = import.meta.glob("../**/*.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const PAGE = Object.entries(components).filter(([path]) => !path.endsWith(".test.tsx")).map(([, text]) => text).join("\n");
const MENU_KEYS = Object.keys(menuTourCatalogues.en);

describe("the guided tours", () => {
  it("have a title and a body for every step, and a name and summary for every tour, in the eight languages", () => {
    const keys = new Set([...TOUR_KEYS, ...MENU_KEYS]);
    for (const tour of TOURS) {
      expect(keys.has(`tour_${tour.id}`), tour.id).toBe(true);
      expect(keys.has(`tour_${tour.id}_s`), tour.id).toBe(true);
      tour.steps.forEach((_step, index) => { for (const part of ["t", "b"] as const) expect(keys.has(stepKey(tour.id, index, part)), `${tour.id} ${index} ${part}`).toBe(true); });
    }
    for (const language of locales) for (const key of [...TOUR_KEYS, ...MENU_KEYS, ...PREFS_KEYS]) {
      const sentence = text(language, key);
      expect(sentence, `${language} ${key}`).not.toBe(key);
      expect(sentence.trim().length, `${language} ${key}`).toBeGreaterThan(0);
    }
  });

  it("do not keep a sentence nobody uses", () => {
    const used = new Set<string>(["tourNext", "tourVoiceOn", "tourVoiceOff", "tourVoiceTip", "tourGuideOn", "tourGuideOff", "tourGuideTip", "tourBack", "tourSkip", "tourFinish", "tourStep", "tourNever", "tourClose", "tourKeys", "tourNotShown", "tourHelpButton", "tourDoneBadge", "tourStart", "tourReplay", "tourMinutes", "tourStepsCount"]);
    for (const tour of TOURS) { used.add(`tour_${tour.id}`); used.add(`tour_${tour.id}_s`); tour.steps.forEach((_step, index) => { used.add(stepKey(tour.id, index, "t")); used.add(stepKey(tour.id, index, "b")); }); }
    expect(TOUR_KEYS.filter(key => !used.has(key))).toEqual([]);
  });

  it("only light up parts of the page that are marked in it, and visit menus that exist", () => {
    const menus = new Set<string>(NAV.map(([view]) => view));
    for (const target of TOUR_TARGETS) {
      if (target.startsWith("nav-")) expect(menus.has(target.slice(4)), target).toBe(true);
      else if (target.startsWith("tab-")) expect(configurationSource, target).toContain(`"${target.slice(4)}"`);
      else expect(PAGE, target).toContain(`data-tour="${target}"`);
    }
    expect(PAGE).toContain("data-tour={`nav-${key}`}");
    for (const tour of TOURS) for (const step of tour.steps) { if (step.view) expect(menus.has(step.view), step.view).toBe(true); expect(ART_IDS).toContain(step.art); }
  });

  it("explain every menu in detail: several steps with real explanations, in the eight languages", () => {
    for (const [view] of NAV) {
      const detail = MENU_STEPS[view];
      expect(detail, view).toBeDefined();
      expect(detail!.length, view).toBeGreaterThanOrEqual(3);
      const tour = TOURS.find(item => item.id === menuTourId(view))!;
      expect(tour.steps.length, view).toBe(detail!.length + 1);
      detail!.forEach((step, index) => {
        step.t.forEach((title, language) => expect(title.trim().length, `${view} ${index} title ${language}`).toBeGreaterThan(2));
        step.b.forEach((body, language) => expect(body.trim().length, `${view} ${index} body ${language}`).toBeGreaterThan(60));
        // a language that is not English never repeats the English text
        step.b.slice(1).forEach((body, language) => expect(body, `${view} ${index} body ${language + 1}`).not.toBe(step.b[0]));
      });
    }
    // the menu where there is most to say gets one step for each of its tabs
    const tabs = MENU_STEPS.configuration.map(step => step.target);
    for (const tab of ["general", "preferences", "users", "security", "notifications", "capture", "firmware", "updates", "services", "broker", "files", "installation", "console"]) expect(tabs, tab).toContain(`tab-${tab}`);
  });

  it("have a picture for every menu", () => { for (const [view] of NAV) expect(ART_IDS).toContain(ART_OF_VIEW[view]); });

  it("move one step at a time and end past the last one", () => {
    expect(moveStep(0, -1, 5)).toBe(0);
    expect(moveStep(2, 1, 5)).toBe(3);
    expect(moveStep(4, 1, 5)).toBeNull();
  });

  it("put the card beside the part it explains, inside the screen", () => {
    const screen = { width: 1000, height: 700 }, card = { width: 380, height: 300 };
    const right = placeCard({ left: 20, top: 100, width: 200, height: 30 }, card, screen, "right");
    expect(right.side).toBe("right"); expect(right.left).toBeGreaterThanOrEqual(220);
    const flipped = placeCard({ left: 700, top: 100, width: 280, height: 30 }, card, screen, "right");
    expect(flipped.side).toBe("left");
    const below = placeCard({ left: 400, top: 20, width: 100, height: 30 }, card, screen, "bottom");
    expect(below.side).toBe("bottom"); expect(below.top).toBeGreaterThanOrEqual(50);
    for (const where of [right, flipped, below]) { expect(where.left).toBeGreaterThanOrEqual(12); expect(where.top).toBeGreaterThanOrEqual(12); expect(where.left + card.width).toBeLessThanOrEqual(screen.width - 12); expect(where.top + card.height).toBeLessThanOrEqual(screen.height - 12); }
    expect(placeCard({ left: 0, top: 0, width: 1000, height: 700 }, card, screen, "right").side).toBe("center");
  });
});
