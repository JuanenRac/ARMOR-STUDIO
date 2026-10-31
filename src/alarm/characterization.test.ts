import { describe, expect, it } from "vitest";
import { analyse } from "./analysis";
import { emptyDesign, housePreset } from "./presets";
import { alarmKey, buildAlarmDoc, parseAlarmDoc } from "./sync";
import { radarView, headingOf } from "../designer/model";
import { DEFAULT_PREFS, parsePrefs } from "../prefs";

// These tests pin what the alarm designer and the site plan did before the design aids existed.
describe("the alarm designer as it was", () => {
  const house = housePreset(key => key);

  it("draws the typical house with the same parts and links", () => {
    expect(house.elements.map(element => element.kind)).toEqual(["central", "door-contact", "door-contact", "window-contact", "motion-pir", "smoke", "siren-indoor", "keypad", "power-supply", "battery"]);
    expect(house.wires).toHaveLength(9);
    expect(house.frames).toHaveLength(1);
  });
  it("keeps a stable text for an empty drawing", () => {
    expect(alarmKey(emptyDesign())).toBe('{"elements":[],"frames":[],"schema":"armor-studio/alarm-design/1","wires":[]}');
  });
  it("saves and reads the house back unchanged", () => {
    expect(parseAlarmDoc(buildAlarmDoc(house))).toEqual(house);
  });
  it("reads the house with the same checks", () => {
    const { issues, totals } = analyse(house);
    expect(issues.map(issue => `${issue.level}:${issue.code}`)).toEqual(["warn:unlinked", "info:no_battery", "info:central_not_tied"]);
    expect(totals).toMatchObject({ elements: 10, centrals: 1, sensors: 5, links: 9, wired: 4, wireless: 1, bound: 0 });
  });
  it("refuses what is not a design", () => {
    expect(parseAlarmDoc(null)).toBeUndefined();
    expect(parseAlarmDoc({ elements: [] })).toBeUndefined();
  });
});

describe("the radar view and the preferences as they were", () => {
  it("keeps the radar ranges", () => {
    expect(radarView({ kind: "LD2450" })).toEqual({ rangeM: 6, halfAngleDeg: 60 });
    expect(radarView({ kind: "LD2461" })).toEqual({ rangeM: 8, halfAngleDeg: 45 });
    expect(headingOf({ x: 50, y: 50, heading: -90 }, { width: 10, depth: 10, height: 3 })).toBe(270);
  });
  it("keeps the default preferences and ignores unknown ones", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('{"nonsense":1}')).toEqual(DEFAULT_PREFS);
  });
});
