import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Alarm } from "../api";
import { locales, text } from "../i18n";
import { alarmFactsCatalogues } from "../alarmFactsText";
import table from "../api/contract/alarm_facts.json";
import { AlarmsView } from "./AlarmsView";

const NOW = Date.parse("2026-01-01T12:00:00Z");
const alarm = (patch: Partial<Alarm> = {}): Alarm => ({ id: "a1", key: "k", source: { type: "device", id: "door-1" }, severity: "high", code: "door_open", raised_at: new Date(NOW - 60_000).toISOString(), ...patch });
const view = (alarms: { active: Alarm[]; recent: Alarm[] }, locale: (typeof locales)[number] = "en", readOnly = false) =>
  renderToStaticMarkup(createElement(AlarmsView, { t: (key: string) => text(locale, key), origin: "http://x", alarms, reload: () => undefined, devices: [], cameraNames: {}, mode: "disarmed", toggleMode: () => undefined, now: NOW, isAdmin: true, readOnly }));

describe("marking an alarm as a false alarm", () => {
  it("offers the button, says when it is marked, and offers taking the mark back", () => {
    const plain = view({ active: [alarm()], recent: [] });
    expect(plain).toContain("False alarm");
    expect(plain).not.toContain("Not a false alarm");
    const marked = view({ active: [alarm({ false_alarm: true, false_alarm_by: "ana" })], recent: [] });
    expect(marked).toContain("Not a false alarm");
    expect(marked).toContain("false alarm");
  });

  it("is disabled for a read-only account", () => {
    const html = view({ active: [alarm()], recent: [] }, "en", true);
    const button = html.match(/<button[^>]*>False alarm<\/button>/);
    expect(button?.[0]).toContain("disabled");
  });

  it("is worded in every language", () => {
    for (const locale of locales) for (const key of ["alarmFalse", "alarmFalseUndo", "alarmFalseTitle", "alarmFalseDone", "alarmFalseUndone", "alarmFalseMarked", "sec_vis_token_yes", "sec_vis_token_no"]) {
      expect(text(locale, key).trim().length, `${locale} ${key}`).toBeGreaterThan(1);
      expect(text(locale, key), `${locale} ${key}`).not.toBe(key);
    }
    expect(text("pt", "alarmFalse")).toBe("Falso alarme");
  });
});

describe("the shared table of alarm facts and help", () => {
  it("is what the console reads: every fact and every help text of the table is a phrase in the eight languages, with nothing left to write twice", () => {
    for (const locale of locales) {
      for (const key of Object.keys(table.facts)) expect(text(locale, `fact_${key}`), `${locale} fact_${key}`).toBe((table.facts as Record<string, Record<string, string>>)[key]![locale]);
      for (const code of Object.keys(table.help)) expect(text(locale, `alarmhelp_${code}`), `${locale} alarmhelp_${code}`).toBe((table.help as Record<string, Record<string, string>>)[code]![locale]);
    }
    expect(Object.keys(alarmFactsCatalogues.pt).length).toBe(Object.keys(table.facts).length + Object.keys(table.help).length);
  });
});
