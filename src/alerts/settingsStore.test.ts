// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALERT_KEY, DEFAULT_ALERTS, getAlerts, isSoundChoice, parseAlerts, reloadAlerts, resetAlerts, setAlerts, subscribeAlerts } from "./settings";

const memory = new Map<string, string>();
const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => void memory.set(key, value), removeItem: (key: string) => void memory.delete(key) };

beforeEach(() => {
  memory.clear();
  Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
  reloadAlerts();
});
afterEach(() => { reloadAlerts(); vi.restoreAllMocks(); });

describe("the choices about alarms that the person makes", () => {
  it("start from the defaults, and a change is kept, cleaned and told to whoever is listening", () => {
    expect(getAlerts()).toEqual(DEFAULT_ALERTS);
    const heard = vi.fn();
    const stop = subscribeAlerts(heard);
    const saved = setAlerts({ volume: 500, muted: true, redirect: "all" });
    expect(saved.volume).toBe(100);
    expect(saved.muted).toBe(true);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(JSON.parse(memory.get(ALERT_KEY)!)).toMatchObject({ volume: 100, muted: true, redirect: "all" });
    stop();
    setAlerts({ volume: 10 });
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("a change to one part does not lose the rest, and a damaged value in a patch is replaced by the default", () => {
    setAlerts({ sounds: { critical: "bell", high: "klaxon", warning: "chime" } });
    setAlerts({ popups: { enabled: false, seconds: 5, blink: false, onlyWhileArmed: true, maxOnScreen: 3 } });
    expect(getAlerts().sounds.critical).toBe("bell");
    expect(getAlerts().popups.maxOnScreen).toBe(3);
    setAlerts({ sounds: { critical: "../../etc", high: "klaxon", warning: "chime" } });
    expect(getAlerts().sounds.critical).toBe("siren");
  });

  it("are read back after a reload, and damaged stored text gives the defaults instead of an error", () => {
    setAlerts({ volume: 33 });
    reloadAlerts();
    expect(getAlerts().volume).toBe(33);
    memory.set(ALERT_KEY, "{broken");
    reloadAlerts();
    expect(getAlerts()).toEqual(DEFAULT_ALERTS);
  });

  it("still work for the life of the page when the browser refuses to store anything", () => {
    Object.defineProperty(window, "localStorage", { configurable: true, value: { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("quota"); } } });
    reloadAlerts();
    expect(getAlerts()).toEqual(DEFAULT_ALERTS);
    expect(() => setAlerts({ volume: 20 })).not.toThrow();
    expect(getAlerts().volume).toBe(20);
  });

  it("reset puts everything back, and tells the listeners", () => {
    setAlerts({ volume: 5, muted: true });
    const heard = vi.fn();
    subscribeAlerts(heard);
    expect(resetAlerts()).toEqual(DEFAULT_ALERTS);
    expect(heard).toHaveBeenCalled();
  });

  it("only built-in sounds and sounds of the library are accepted as a choice", () => {
    for (const good of ["none", "siren", "pulse", "custom:abcd", "custom:my-sound-01"]) expect(isSoundChoice(good), good).toBe(true);
    for (const bad of ["", "SIREN", "custom:", "custom:abc", "custom:UPPER", `custom:${"a".repeat(41)}`, "http://x/y.mp3", "../x", 5, null, undefined, {}]) expect(isSoundChoice(bad), String(bad)).toBe(false);
  });

  it("keeps muted severities and sources only from the known lists, once each, in a fixed order", () => {
    const parsed = parseAlerts(JSON.stringify({ mutedSeverities: ["warning", "bogus", "critical", "warning"], mutedSources: ["network", "moon", "camera"], sourceSounds: { camera: "bell", moon: "bell", node: "evil" } }));
    expect(parsed.mutedSeverities).toEqual(["critical", "warning"]);
    expect(parsed.mutedSources).toEqual(["camera", "network"]);
    expect(parsed.sourceSounds).toEqual({ camera: "bell" });
  });

  it("clamps what is out of range, ignores what is not a number, and keeps the language only when it looks like one", () => {
    const parsed = parseAlerts(JSON.stringify({ volume: "loud", voice: { rate: 1000, language: "pt-PT", enabled: "yes" }, popups: { maxOnScreen: 0, seconds: 999.6 } }));
    expect(parsed.volume).toBe(70);
    expect(parsed.voice.rate).toBe(160);
    expect(parsed.voice.language).toBe("pt-PT");
    expect(parsed.voice.enabled).toBe(false);
    expect(parsed.popups.maxOnScreen).toBe(1);
    expect(parsed.popups.seconds).toBe(120);
    for (const language of ["en_US", "english", "e", "<b>", "en-", "pt-PT-extra-long-tag"]) expect(parseAlerts(JSON.stringify({ voice: { language } })).voice.language, language).toBe("");
    for (const raw of [null, "", "null", "[]", "42", "\"text\"", "true"]) expect(parseAlerts(raw), String(raw)).toEqual(DEFAULT_ALERTS);
  });
});
