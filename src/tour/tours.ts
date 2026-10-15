/**
 * The guided tours of Studio: each one is a list of steps, and a step says which menu to open, which part of the page to light up and which picture to show. The words of a step are in
 * tourText.ts under `tour_<id>_<n>_t` (title) and `tour_<id>_<n>_b` (body), so a step cannot exist without its sentences in the seven languages.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { View } from "../domain";
import type { ArtId } from "./TourArt";

export type TourStep = {
  /** The menu to be in for this step; the tour opens it by itself. */
  view?: View;
  /** The part of the page to light up: the value of a `data-tour` attribute. Without it the step is a card in the middle of the screen. */
  target?: string;
  art: ArtId;
  placement?: "right" | "left" | "top" | "bottom";
};
export type Tour = { id: string; /** The minutes it takes, about. */ minutes: number; art: ArtId; steps: readonly TourStep[] };

const nav = (view: View): string => `nav-${view}`;

export const TOURS: readonly Tour[] = [
  { id: "welcome", minutes: 2, art: "welcome", steps: [
    { art: "welcome" },
    { target: "brand", art: "menu", placement: "right" },
    { view: "overview", target: nav("overview"), art: "monitor", placement: "right" },
    { target: nav("alarms"), art: "bell", placement: "right" },
    { target: nav("cameras"), art: "camera", placement: "right" },
    { target: nav("siteDesigner"), art: "design", placement: "right" },
    { target: nav("configuration"), art: "settings", placement: "right" },
    { target: "arm", art: "shield", placement: "bottom" },
    { target: "help", art: "tips", placement: "bottom" },
    { target: "statusbar", art: "welcome", placement: "top" },
  ] },
  { id: "security", minutes: 2, art: "alarm", steps: [
    { view: "alarms", target: nav("alarms"), art: "bell", placement: "right" },
    { view: "alarmPanels", target: nav("alarmPanels"), art: "alarm", placement: "right" },
    { view: "cameras", target: nav("cameras"), art: "camera", placement: "right" },
    { view: "radar", target: nav("radar"), art: "radar", placement: "right" },
    { view: "history", target: nav("history"), art: "monitor", placement: "right" },
  ] },
  { id: "designers", minutes: 2, art: "design", steps: [
    { view: "siteDesigner", target: nav("siteDesigner"), art: "design", placement: "right" },
    { view: "alarmDesigner", target: nav("alarmDesigner"), art: "alarm", placement: "right" },
    { view: "electricalDesigner", target: nav("electricalDesigner"), art: "energy", placement: "right" },
    { view: "networkDesigner", target: nav("networkDesigner"), art: "network", placement: "right" },
    { target: "brand", art: "design", placement: "right" },
  ] },
  { id: "energy", minutes: 1, art: "energy", steps: [
    { view: "inverters", target: nav("inverters"), art: "energy", placement: "right" },
    { view: "batteries", target: nav("batteries"), art: "energy", placement: "right" },
    { view: "electrical", target: nav("electrical"), art: "energy", placement: "right" },
  ] },
  { id: "house", minutes: 1, art: "house", steps: [
    { view: "devices", target: nav("devices"), art: "house", placement: "right" },
    { view: "automations", target: nav("automations"), art: "settings", placement: "right" },
    { view: "network", target: nav("network"), art: "network", placement: "right" },
  ] },
  { id: "admin", minutes: 2, art: "admin", steps: [
    { view: "configuration", target: "config-tabs", art: "settings", placement: "bottom" },
    { view: "configuration", target: "tab-updates", art: "update", placement: "bottom" },
    { view: "configuration", target: "tab-console", art: "terminal", placement: "bottom" },
    { view: "configuration", target: "tab-preferences", art: "tips", placement: "bottom" },
  ] },
];

export const tourById = (id: string): Tour | undefined => TOURS.find(tour => tour.id === id);

/** Every part of the page a step lights up, so that a test can check each one is marked in the page. */
export const TOUR_TARGETS: readonly string[] = [...new Set(TOURS.flatMap(tour => tour.steps.flatMap(step => (step.target ? [step.target] : []))))];

/** The key of the title or the body of a step. */
export const stepKey = (tourId: string, index: number, part: "t" | "b"): string => `tour_${tourId}_${index}_${part}`;

/** Move through a tour: the step after a move, or `null` when the move goes past an end (the tour is over). */
export function moveStep(index: number, direction: 1 | -1, length: number): number | null {
  const next = index + direction;
  if (next < 0) return 0;
  return next >= length ? null : next;
}

/** Where a card goes next to the part it explains, kept inside the screen: the side asked for when it fits, else the opposite one, else the middle. */
export function placeCard(target: { left: number; top: number; width: number; height: number }, card: { width: number; height: number }, screen: { width: number; height: number }, side: "right" | "left" | "top" | "bottom" = "right", gap = 16): { left: number; top: number; side: string } {
  const room = { right: screen.width - (target.left + target.width) - gap, left: target.left - gap, bottom: screen.height - (target.top + target.height) - gap, top: target.top - gap };
  const fits = (candidate: keyof typeof room): boolean => (candidate === "left" || candidate === "right" ? room[candidate] >= card.width : room[candidate] >= card.height);
  const opposite = { right: "left", left: "right", top: "bottom", bottom: "top" } as const;
  const order = [side, opposite[side], ...(["bottom", "right", "top", "left"] as const)];
  const chosen = order.find(fits);
  const clampLeft = (value: number): number => Math.max(12, Math.min(screen.width - card.width - 12, value));
  const clampTop = (value: number): number => Math.max(12, Math.min(screen.height - card.height - 12, value));
  if (!chosen) return { left: clampLeft((screen.width - card.width) / 2), top: clampTop((screen.height - card.height) / 2), side: "center" };
  if (chosen === "right") return { left: clampLeft(target.left + target.width + gap), top: clampTop(target.top + target.height / 2 - card.height / 2), side: chosen };
  if (chosen === "left") return { left: clampLeft(target.left - gap - card.width), top: clampTop(target.top + target.height / 2 - card.height / 2), side: chosen };
  if (chosen === "bottom") return { left: clampLeft(target.left + target.width / 2 - card.width / 2), top: clampTop(target.top + target.height + gap), side: chosen };
  return { left: clampLeft(target.left + target.width / 2 - card.width / 2), top: clampTop(target.top - gap - card.height), side: chosen };
}
