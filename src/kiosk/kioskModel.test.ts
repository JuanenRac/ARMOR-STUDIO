import { describe, expect, it } from "vitest";
import type { Alarm } from "../api/alarms";
import { sourceCatalogues } from "../i18nSources";
import { alarmWaiting, alarmsToShow, isResting, KIOSK_CONFIG, kioskWanted } from "./kioskModel";
import { kioskCatalogues } from "./kioskText";

const alarm = (id: string, raised_at: string, extra: Partial<Alarm> = {}): Alarm => ({ id, key: id, source: { type: "node", id: "n1" }, severity: "high", code: "intrusion", raised_at, ...extra });

describe("when the wall panel is shown", () => {
  it("is off unless the page asks for it, and the page asks with ?kiosk=1", () => {
    expect(kioskWanted("", false)).toBe(false);
    expect(kioskWanted("?view=alarms", false)).toBe(false);
    expect(kioskWanted("?kiosk=1", false)).toBe(true);
    expect(kioskWanted("?kiosk=yes", false)).toBe(false);
  });
  it("is remembered by this browser, and ?kiosk=0 leaves it", () => {
    expect(kioskWanted("", true)).toBe(true);
    expect(kioskWanted("?kiosk=0", true)).toBe(false);
  });
});

describe("when the panel rests", () => {
  const limit = KIOSK_CONFIG.idle_after_s * 1000;
  it("rests only after the time of the configuration without a touch", () => {
    expect(isResting(limit - 1, 0, KIOSK_CONFIG.idle_after_s, false)).toBe(false);
    expect(isResting(limit, 0, KIOSK_CONFIG.idle_after_s, false)).toBe(true);
  });
  it("never rests with an alarm waiting for a person, or with the time set to 0", () => {
    expect(isResting(limit * 10, 0, KIOSK_CONFIG.idle_after_s, true)).toBe(false);
    expect(isResting(limit * 10, 0, 0, false)).toBe(false);
  });
  it("has numbers that make sense", () => {
    expect(KIOSK_CONFIG.idle_after_s).toBeGreaterThan(0);
    expect(KIOSK_CONFIG.alarm_poll_ms).toBeGreaterThanOrEqual(1000);
  });
});

describe("the alarms of the panel", () => {
  it("lists the ones not cleared, those nobody has acknowledged first and the oldest first", () => {
    const list = alarmsToShow([
      alarm("seen", "2026-01-01T10:00:00Z", { acknowledged_at: "2026-01-01T10:05:00Z" }),
      alarm("late", "2026-01-01T12:00:00Z"),
      alarm("gone", "2026-01-01T09:00:00Z", { cleared_at: "2026-01-01T09:30:00Z" }),
      alarm("early", "2026-01-01T11:00:00Z"),
    ]);
    expect(list.map(item => item.id)).toEqual(["early", "late", "seen"]);
  });
  it("tells that one waits for a person only while one is not acknowledged", () => {
    expect(alarmWaiting(undefined)).toBe(false);
    expect(alarmWaiting([alarm("a", "2026-01-01T10:00:00Z", { acknowledged_at: "x" })])).toBe(false);
    expect(alarmWaiting([alarm("a", "2026-01-01T10:00:00Z")])).toBe(true);
  });
});

describe("the words of the panel", () => {
  it("are in the eight languages, not empty, and the tables of the console carry them", () => {
    const keys = Object.keys(kioskCatalogues.en);
    expect(keys.length).toBeGreaterThan(10);
    for (const code of ["en", "es", "de", "fr", "it", "ja", "zh", "pt"] as const) {
      for (const key of keys) expect(sourceCatalogues[code][key], `${code} ${key}`).toBeTruthy();
    }
    for (const key of keys) expect(new Set(["es", "de", "fr", "it", "ja", "zh", "pt"].map(code => sourceCatalogues[code as "es"][key])).size, key).toBeGreaterThan(3);
  });
});
