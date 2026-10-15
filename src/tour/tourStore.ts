/**
 * Which guided tour is running and at which step: a small store, so the Help, the Preferences, the first visit and the keyboard can all start one without passing it through the
 * components, and the tour window (TourHost) watches it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useSyncExternalStore } from "react";
import { getPrefs, markTour } from "../prefs";
import { moveStep, tourById } from "./tours";

export type ActiveTour = { id: string; index: number } | null;
let active: ActiveTour = null;
const listeners = new Set<() => void>();
const emit = (): void => listeners.forEach(listener => listener());

export const activeTour = (): ActiveTour => active;
export function subscribeTour(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
export const useActiveTour = (): ActiveTour => useSyncExternalStore(subscribeTour, activeTour, activeTour);

/** Start a tour at its first step; false when there is no such tour. */
export function startTour(id: string): boolean {
  if (!tourById(id)) return false;
  active = { id, index: 0 };
  emit();
  return true;
}

/** Leave the tour. With `seen` (the default) the tour counts as seen: skipping it on purpose is an answer, and the first visit does not offer it again. */
export function stopTour(seen = true): void {
  if (active && seen) markTour(active.id);
  active = null;
  emit();
}

/** One step on (1) or back (-1); past the last step the tour is over and counts as seen. */
export function stepTour(direction: 1 | -1): void {
  if (!active) return;
  const tour = tourById(active.id);
  if (!tour) { stopTour(false); return; }
  const next = moveStep(active.index, direction, tour.steps.length);
  if (next === null) { stopTour(true); return; }
  active = { id: active.id, index: next };
  emit();
}

/** Whether the first visit should start the welcome tour: the tours are on, the first-visit tour is on and it was never seen. */
export function shouldAutoStart(): boolean {
  const prefs = getPrefs();
  return prefs.tutorial && prefs.tourAutoStart && !prefs.toursDone.includes("welcome");
}
