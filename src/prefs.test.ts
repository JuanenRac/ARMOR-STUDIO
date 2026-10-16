import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PREFS, LIMITS, PREFS_KEY, applyPrefs, getPrefs, markTour, openingView, parsePrefs, reloadPrefs, resetPrefs, serializePrefs, setPrefs } from "./prefs";

const store = new Map<string, string>();
const root = { dataset: {} as Record<string, string>, style: { fontSize: "" } };
Object.assign(globalThis, { window: { localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value), removeItem: (key: string) => void store.delete(key) } }, document: { documentElement: root } });

describe("the preferences", () => {
  beforeEach(() => { store.clear(); reloadPrefs(); });

  it("start from sensible defaults when nothing is stored or what is stored is damaged", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("{not json")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("[1,2]")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("42")).toEqual(DEFAULT_PREFS);
  });

  it("round-trip what is valid and drop what is not", () => {
    const wanted = { ...DEFAULT_PREFS, tutorial: false, tooltips: "text" as const, tooltipDelay: 800, motion: "reduced" as const, density: "compact" as const, textScale: 110, startView: "cameras" as const, toursDone: ["welcome", "admin"], alertSound: false };
    expect(parsePrefs(serializePrefs(wanted))).toEqual(wanted);
    const odd = parsePrefs(JSON.stringify({ tooltips: "loud", tooltipDelay: 99999, textScale: 5, motion: 3, density: "huge", startView: "nowhere", toursDone: ["ok", "BAD ID", 7, "ok", "../x"], tutorial: "yes" }));
    expect(odd.tooltips).toBe("rich"); expect(odd.tooltipDelay).toBe(LIMITS.tooltipDelay[1]); expect(odd.textScale).toBe(LIMITS.textScale[0]);
    expect(odd.motion).toBe("full"); expect(odd.density).toBe("comfortable"); expect(odd.startView).toBe("overview"); expect(odd.toursDone).toEqual(["ok"]); expect(odd.tutorial).toBe(true);
  });

  it("are saved at once and applied to the page", () => {
    setPrefs({ motion: "off", density: "compact", textScale: 120, tooltips: "off" });
    expect(JSON.parse(store.get(PREFS_KEY) ?? "{}")).toMatchObject({ motion: "off", density: "compact", textScale: 120 });
    expect(root.dataset.motion).toBe("off"); expect(root.dataset.density).toBe("compact"); expect(root.dataset.tooltips).toBe("off"); expect(root.style.fontSize).toBe("120%");
    reloadPrefs();
    expect(getPrefs().motion).toBe("off");
    applyPrefs(DEFAULT_PREFS, root as never);
    expect(root.style.fontSize).toBe("");
  });

  it("remember the tours seen, can forget one and are restored to the defaults on request", () => {
    markTour("welcome"); markTour("admin"); markTour("welcome");
    expect(getPrefs().toursDone).toEqual(["admin", "welcome"]);
    markTour("admin", false);
    expect(getPrefs().toursDone).toEqual(["welcome"]);
    setPrefs({ tutorial: false });
    expect(resetPrefs()).toEqual(DEFAULT_PREFS);
  });

  it("open at the menu chosen, or at the last one", () => {
    expect(openingView({ ...DEFAULT_PREFS, startView: "radar" })).toBe("radar");
    expect(openingView({ ...DEFAULT_PREFS, startView: "last", lastView: "network" })).toBe("network");
    expect(openingView(DEFAULT_PREFS)).toBe("overview");
  });

  it("keeps where the assistant was put, only when both coordinates are there and inside the window", () => {
    expect(parsePrefs(JSON.stringify({ assistantX: 0.25, assistantY: 0.75 }))).toMatchObject({ assistantX: 0.25, assistantY: 0.75 });
    expect(parsePrefs(JSON.stringify({ assistantX: 0.25 }))).toMatchObject({ assistantX: null, assistantY: null });
    expect(parsePrefs(JSON.stringify({ assistantX: 9, assistantY: -3 }))).toMatchObject({ assistantX: 1, assistantY: 0 });
    expect(parsePrefs(JSON.stringify({ assistantX: "left", assistantY: "top" }))).toMatchObject({ assistantX: null, assistantY: null });
  });

  it("reads the pin, the size and the bubble of the assistant, with defaults for anything else", () => {
    expect(parsePrefs(null)).toMatchObject({ assistantPinned: false, assistantSize: "normal", assistantAutoOpen: true });
    expect(parsePrefs(JSON.stringify({ assistantPinned: true, assistantSize: "large", assistantAutoOpen: false }))).toMatchObject({ assistantPinned: true, assistantSize: "large", assistantAutoOpen: false });
    expect(parsePrefs(JSON.stringify({ assistantSize: "huge", assistantPinned: "yes" }))).toMatchObject({ assistantSize: "normal", assistantPinned: false });
  });
});
