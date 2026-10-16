/**
 * One guided tour for every menu, written from the Help so that the tour and the book never say different things: the first step lights up the menu in the list, and the next ones
 * light up the page itself while the text goes through what the menu shows, how it is used and what else it can do. Titles and bodies are the Help's own, in the seven languages.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { HELP_SECTIONS } from "../helpText";
import type { View } from "../domain";
import type { Tour, TourStep } from "./tours";
import { ART_OF_VIEW } from "./TourArt";
import { LANGUAGE_ORDER, type RowCatalogues } from "../catalogueRows";

const VIEW_IDS = HELP_SECTIONS.map(section => section.id).filter(id => id !== "start" && id !== "tips") as View[];
export const menuTourId = (view: string): string => `menu-${view.toLowerCase()}`;

export const MENU_TOURS: readonly Tour[] = VIEW_IDS.map(view => {
  const art = ART_OF_VIEW[view] ?? "menu";
  const steps: TourStep[] = [{ view, target: `nav-${view}`, art, placement: "right" }, ...[0, 1, 2].map((): TourStep => ({ view, target: "stage", art, placement: "left" }))];
  return { id: menuTourId(view), minutes: 1, art, steps };
});

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
      parts.forEach((part, index) => { target[`tour_${id}_${index + 1}_t`] = section.title[language]; target[`tour_${id}_${index + 1}_b`] = part; });
    });
  }
  return result;
})();
