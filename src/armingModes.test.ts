import { describe, expect, it } from "vitest";
import { locales, text } from "./i18n";
import type { ArmingModesDocument } from "./api";
import { isLowering } from "./SecurityPanel";
import { armedLabel, cleanedDocument, defendedCount, defendsRef, isEmptyMode, isRef, problemsOf, refOf, toggleRef, unknownRefs, zonesOfDevices, MAX_REFS } from "./armingModesModel";

const empty = (): ArmingModesDocument => ({ modes: { away: {}, home: {}, night: {} }, schedule: [] });

describe("the arming modes: the document the editor builds", () => {
  it("starts with Home and Night defending nothing (nothing is assigned by default) and says so", () => {
    const document = empty();
    expect(isEmptyMode(document, "home")).toBe(true);
    expect(isEmptyMode(document, "night")).toBe(true);
    expect(defendedCount(document.modes, "away")).toBe("all");
    expect(defendedCount(document.modes, "home")).toBe(0);
  });

  it("marks and unmarks a reference, ignoring the case, and never goes over the 64 of the contract", () => {
    let list = toggleRef(undefined, refOf("zone", "Kitchen"));
    expect(list).toEqual(["zone:Kitchen"]);
    expect(defendsRef(list, "zone:kitchen")).toBe(true);
    list = toggleRef(list, "zone:KITCHEN");
    expect(list).toEqual([]);
    const full = Array.from({ length: MAX_REFS }, (_, index) => `device:d${index}`);
    expect(toggleRef(full, "device:extra")).toEqual(full);
  });

  it("takes the zones from the places of the devices: one per place, case ignored, sorted, none for an empty place", () => {
    expect(zonesOfDevices([{ location: "Kitchen" }, { location: "kitchen " }, { location: "Hall" }, { location: "" }, {}, { location: "x".repeat(65) }])).toEqual(["Hall", "Kitchen"]);
  });

  it("knows the references of the contract and the ones the console cannot find any more", () => {
    expect(isRef("zone:Hall")).toBe(true);
    expect(isRef("camera:garden")).toBe(true);
    expect(isRef("sensor:x")).toBe(false);
    expect(isRef("zone:")).toBe(false);
    expect(isRef(`device:${"y".repeat(65)}`)).toBe(false);
    const universe = { zones: ["Hall"], devices: [{ id: "door-1", name: "Door" }], nodes: ["radar-1"], cameras: [{ id: "garden", name: "Garden" }] };
    expect(unknownRefs(["zone:hall", "device:door-1", "device:gone", "node:radar-1", "camera:garden", "camera:old"], universe)).toEqual(["device:gone", "camera:old"]);
  });

  it("finds what the server would refuse, so Save is not offered for it", () => {
    expect(problemsOf(empty())).toEqual([]);
    const bad: ArmingModesDocument = { modes: { away: { exit_delay_s: 301 }, home: { defends: ["zone:Hall", "ZONE:hall", "oops"] }, night: { entry_delay_s: -1 } },
      schedule: [{ mode: "home", days: [], at: "25:00" }, { mode: "night", days: [1, 1], at: "22:00" }] };
    expect(problemsOf(bad).sort()).toEqual(["bad_days", "bad_delay", "bad_reference", "bad_time", "clash", "duplicate_reference"]);
    const clash: ArmingModesDocument = { ...empty(), schedule: [{ mode: "home", days: [1, 2], at: "22:00" }, { mode: "night", days: [2], at: "22:00" }] };
    expect(problemsOf(clash)).toEqual(["clash"]);
    expect(problemsOf({ ...empty(), schedule: Array.from({ length: 17 }, (_, index) => ({ mode: "home" as const, days: [1], at: `0${index % 10}:${index < 10 ? "00" : "30"}` })) })).toContain("too_many_entries");
  });

  it("sends the document without the pieces the editor leaves empty, and the days in order", () => {
    const document: ArmingModesDocument = { modes: { away: { exit_delay_s: undefined, entry: [] }, home: { defends: ["zone:Hall"], entry: [], exit_delay_s: 30 }, night: { defends: [] } },
      schedule: [{ mode: "night", days: [5, 1, 3], at: "22:30" }] };
    expect(cleanedDocument(document)).toEqual({ modes: { away: {}, home: { defends: ["zone:Hall"], exit_delay_s: 30 }, night: {} }, schedule: [{ mode: "night", days: [1, 3, 5], at: "22:30" }] });
  });

  it("writes the state with the mode in force only when the server announces one", () => {
    const t = (key: string) => text("en", key);
    expect(armedLabel("disarmed", "away", t)).toBe(t("disarmed"));
    expect(armedLabel("armed", undefined, t)).toBe(t("armed"));
    expect(armedLabel("armed", "home", t)).toBe(`${t("armed")} - Home`);
  });

  it("has every phrase of the modes in the eight languages, with Portuguese of Portugal and the same placeholders", () => {
    const keys = ["am_mode_away", "am_mode_home", "am_mode_night", "am_dialog_title", "am_dialog_now", "am_arm_in", "am_pin_text", "am_confirm_text", "am_ed_title", "am_ed_save", "am_problem_clash", "am_day_1", "am_day_7",
      "sec_opt_modes", "sec_opt_modes_help", "sec_opt_modes_warn", "sec_opt_modepin", "sec_opt_modepin_required", "sec_opt_modepin_not_required", "sec_opt_modepin_warn", "sec_opt_modesched", "sec_opt_modelower_warn", "sec_opt_panelsync", "sec_opt_panelsync_warn"];
    for (const language of locales) for (const key of keys) {
      const value = text(language, key);
      expect(value, `${language}:${key}`).not.toBe(key);
      if (language !== "en") expect(value === text("en", key) && !/^(am_day_|am_mode_)/.test(key) && key !== "am_ed_tab", `${language}:${key} is English`).toBe(false);
      expect(value.match(/\{\d\}/g)?.sort() ?? [], `${language}:${key}`).toEqual(text("en", key).match(/\{\d\}/g)?.sort() ?? []);
    }
    expect(text("pt", "am_mode_home")).toBe("Em casa");
    expect(text("pt", "am_ed_save")).toBe("Guardar os modos");
    expect(text("pt", "sec_opt_modes_help")).not.toMatch(/\b(arquivo|tela|celular|salvar)\b/i);
  });

  it("asks before the two options that lower the defence are changed (PIN to go to a mode that defends less, timetable that may lower), and not before the ones that only add ways of arming", () => {
    expect(isLowering(["required", "not_required"], "required", "not_required")).toBe(true);
    expect(isLowering(["required", "not_required"], "not_required", "required")).toBe(false);
    expect(isLowering([false, true], false, true)).toBe(true);
    expect(isLowering([false, true], true, false)).toBe(false);
  });
});
