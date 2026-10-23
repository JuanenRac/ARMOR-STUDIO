/**
 * One guided tour for every menu: the first step lights up the menu in the list, and the next ones light up the parts of the page itself, one control or one area at a time.
 * Where each step points (which part of the page, on which side the card goes) is the same in every language and is read from src/locales/keys.ts; what each step says is in the
 * language tables (see menuToursText.ts, which writes them). A menu without detailed steps falls back to three steps built from the Help.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { View } from "../domain";
import type { Tour, TourStep } from "./tours";
import { ART_OF_VIEW } from "./TourArt";
import { menuTourId } from "./menuTourId";
import { HELP_SECTION_IDS, MENU_STEP_LAYOUT } from "../locales/keys";

const VIEW_IDS = HELP_SECTION_IDS.filter(id => id !== "start" && id !== "tips") as View[];
export { menuTourId };

export const MENU_TOURS: readonly Tour[] = VIEW_IDS.map(view => {
  const art = ART_OF_VIEW[view] ?? "menu";
  const detail = MENU_STEP_LAYOUT[view];
  const inside: TourStep[] = detail
    ? detail.map((step): TourStep => ({ view, target: step.target ?? "stage", art, placement: step.placement ?? "bottom" }))
    : [0, 1, 2].map((): TourStep => ({ view, target: "stage", art, placement: "left" }));
  const steps: TourStep[] = [{ view, target: `nav-${view}`, art, placement: "right" }, ...inside];
  return { id: menuTourId(view), minutes: Math.max(1, Math.round(steps.length * 0.4)), art, steps };
});
