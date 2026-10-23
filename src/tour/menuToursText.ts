/**
 * The words of the menu tours, in the eight languages: the first step of each tour is the opening of the Help, so the tour and the book never say different things, and the next ones
 * are written in menuStepsMonitor.ts, menuStepsEnergyHouse.ts, menuStepsDesign.ts and menuStepsAdmin.ts. The console reads these words from the language tables that
 * tools/build_locales.mjs writes; this file is only read by that tool and by the tests.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { HELP_SECTIONS, HELP_PT } from "../helpText";
import { LANGUAGE_ORDER, type RowCatalogues } from "../catalogueRows";
import type { MenuSteps } from "./menuStepsTypes";
import { MONITOR_STEPS } from "./menuStepsMonitor";
import { ENERGY_HOUSE_STEPS } from "./menuStepsEnergyHouse";
import { DESIGN_STEPS } from "./menuStepsDesign";
import { ADMIN_STEPS } from "./menuStepsAdmin";
import { menuTourId } from "./menuTourId";

/** The detailed steps of every menu that has them, by menu. */
export const MENU_STEPS: MenuSteps = { ...MONITOR_STEPS, ...ENERGY_HOUSE_STEPS, ...DESIGN_STEPS, ...ADMIN_STEPS };

/** The first sentence, shortened, for the line under a tour's name. */
const summary = (text: string): string => { const first = text.split("\n\n")[0].replace(/\s+/g, " "); const cut = first.search(/[.。]\s|[.。]$/); const sentence = cut > 20 ? first.slice(0, cut + 1) : first; return sentence.length > 150 ? `${sentence.slice(0, 147)}…` : sentence; };

export const menuTourCatalogues: RowCatalogues = (() => {
  const result = Object.fromEntries(LANGUAGE_ORDER.map(code => [code, {} as Record<string, string>])) as RowCatalogues;
  for (const section of HELP_SECTIONS) {
    if (section.id === "start" || section.id === "tips") continue;
    const id = menuTourId(section.id);
    LANGUAGE_ORDER.forEach((code, language) => {
      const paragraphs = section.body[language].split("\n\n").filter(item => item.trim());
      const parts = [paragraphs[0], paragraphs[1] ?? paragraphs[0], paragraphs.slice(2).join("\n\n") || paragraphs[paragraphs.length - 1]];
      const target = result[code];
      target[`tour_${id}`] = section.title[language];
      target[`tour_${id}_s`] = summary(section.body[language]);
      target[`tour_${id}_0_t`] = section.title[language]; target[`tour_${id}_0_b`] = paragraphs[0];
      const detail = MENU_STEPS[section.id];
      if (detail) detail.forEach((step, index) => { target[`tour_${id}_${index + 1}_t`] = step.t[language]; target[`tour_${id}_${index + 1}_b`] = step.b[language]; });
      else parts.forEach((part, index) => { target[`tour_${id}_${index + 1}_t`] = section.title[language]; target[`tour_${id}_${index + 1}_b`] = part; });
    });
  }
  return result;
})();

/** The same tours in Portuguese, from the Portuguese Help. */
export const ptMenuTourCatalogue = (): Record<string, string> => {
  const target: Record<string, string> = {};
  for (const section of HELP_SECTIONS) {
    if (section.id === "start" || section.id === "tips") continue;
    const entry = HELP_PT[section.id];
    if (!entry) continue;
    const id = menuTourId(section.id);
    const paragraphs = entry[1].split("\n\n").filter(item => item.trim());
    const parts = [paragraphs[0], paragraphs[1] ?? paragraphs[0], paragraphs.slice(2).join("\n\n") || paragraphs[paragraphs.length - 1]];
    target[`tour_${id}`] = entry[0];
    target[`tour_${id}_s`] = summary(entry[1]);
    target[`tour_${id}_0_t`] = entry[0]; target[`tour_${id}_0_b`] = paragraphs[0];
    const detail = MENU_STEPS[section.id];
    if (detail) detail.forEach((step, index) => { target[`tour_${id}_${index + 1}_t`] = step.t[7]; target[`tour_${id}_${index + 1}_b`] = step.b[7]; });
    else parts.forEach((part, index) => { target[`tour_${id}_${index + 1}_t`] = entry[0]; target[`tour_${id}_${index + 1}_b`] = part; });
  }
  return target;
};
