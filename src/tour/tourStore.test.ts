import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPrefs, reloadPrefs, resetPrefs, setPrefs } from "../prefs";
import { activeTour, shouldAutoStart, startTour, stepTour, stopTour, subscribeTour } from "./tourStore";
import { TOURS } from "./tours";

const tour = TOURS[0]!;

beforeEach(() => {
  try { localStorage.clear(); } catch { /* no storage */ }
  reloadPrefs();
  resetPrefs();
  stopTour(false);
});

describe("which tour is running", () => {
  it("starts at the first step, and refuses a tour that does not exist", () => {
    expect(activeTour()).toBeNull();
    expect(startTour("no-such-tour")).toBe(false);
    expect(activeTour()).toBeNull();
    expect(startTour(tour.id)).toBe(true);
    expect(activeTour()).toEqual({ id: tour.id, index: 0 });
  });

  it("tells the listeners at every change and stops telling the one that unsubscribed", () => {
    const listener = vi.fn();
    const off = subscribeTour(listener);
    startTour(tour.id);
    stepTour(1);
    stopTour(false);
    expect(listener).toHaveBeenCalledTimes(3);
    off();
    startTour(tour.id);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("goes one step on and back, and does nothing when no tour runs", () => {
    stepTour(1);
    expect(activeTour()).toBeNull();
    startTour(tour.id);
    stepTour(1);
    expect(activeTour()?.index).toBe(1);
    stepTour(-1);
    expect(activeTour()?.index).toBe(0);
  });

  it("counts a tour as seen when it is left or finished, but not when asked not to", () => {
    startTour(tour.id);
    stopTour(false);
    expect(getPrefs().toursDone).not.toContain(tour.id);
    startTour(tour.id);
    stopTour();
    expect(getPrefs().toursDone).toContain(tour.id);
    expect(activeTour()).toBeNull();
    setPrefs({ toursDone: [] });
    startTour(tour.id);
    for (let index = 0; index < tour.steps.length + 2; index += 1) stepTour(1);
    expect(activeTour()).toBeNull();
    expect(getPrefs().toursDone).toContain(tour.id);
  });
});

describe("whether the first visit starts the welcome tour", () => {
  it("does when the tours and the first-visit tour are on and it was never seen", () => {
    setPrefs({ tutorial: true, tourAutoStart: true, toursDone: [] });
    expect(shouldAutoStart()).toBe(true);
  });
  it("does not when any of the three says no", () => {
    setPrefs({ tutorial: false, tourAutoStart: true, toursDone: [] });
    expect(shouldAutoStart()).toBe(false);
    setPrefs({ tutorial: true, tourAutoStart: false, toursDone: [] });
    expect(shouldAutoStart()).toBe(false);
    setPrefs({ tutorial: true, tourAutoStart: true, toursDone: ["welcome"] });
    expect(shouldAutoStart()).toBe(false);
  });
});
