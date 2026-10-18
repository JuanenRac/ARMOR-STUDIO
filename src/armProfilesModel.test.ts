import { describe, expect, it } from "vitest";
import type { ArmProfile } from "./api";
import { cleaned, isReserved, knownZones, newProfile, newProfileId, problemsOf, profileName, summaryOf } from "./armProfilesModel";
import { locales, text } from "./i18n";

const defaults: ArmProfile[] = [{ id: "away", name: "Away", base: "away" }, { id: "stay", name: "Home", base: "stay" }, { id: "night", name: "Night", base: "stay", entry_delay_s: 45 }];

describe("the arming modes", () => {
  it("shows the three of the start in the language of the person until somebody renames them", () => {
    for (const language of locales) {
      const t = (key: string) => text(language, key);
      expect(profileName(defaults[0], t)).toBe(text(language, "apm_name_away"));
      expect(profileName(defaults[2], t)).toBe(text(language, "apm_name_night"));
      expect(profileName({ id: "night", name: "Siesta" }, t)).toBe("Siesta");
      expect(profileName({ id: "mine", name: "Night" }, t)).toBe("Night");   // another mode that happens to be called Night keeps its name
    }
    expect(text("es", "apm_name_stay")).toBe("En casa");
    expect(text("pt", "apm_name_stay")).toBe("Em casa");
  });

  it("makes an id from a name that is free in the list, within the limits of the contract", () => {
    expect(newProfileId("Garden party", [])).toBe("garden-party");
    expect(newProfileId("Garden party", ["garden-party"])).toBe("garden-party-2");
    expect(newProfileId("Niño ÁÉ", [])).toBe("nino-ae");
    expect(newProfileId("***", [])).toBe("mode");
    expect(newProfileId("a very very long name indeed", [])).toMatch(/^[a-z0-9][a-z0-9_-]{0,15}$/);
    expect(newProfileId("x".repeat(40), ["x".repeat(12)])).toMatch(/^[a-z0-9][a-z0-9_-]{0,15}$/);
    expect(newProfile(defaults, "Cinema")).toEqual({ id: "cinema", name: "Cinema", base: "stay" });
  });

  it("keeps only what a mode says", () => {
    const messy: ArmProfile = { id: "x", name: "  Cinema  ", base: "stay", exit_delay_s: 0, siren: true, notify: "urgent", zones: [{ id: "" }, { id: "hall" }, { id: "garage", armed: false, delay: "entry" }, { id: "door", delay: "instant" }, { id: "win", armed: true }] };
    expect(cleaned(messy)).toEqual({ id: "x", name: "Cinema", base: "stay", exit_delay_s: 0, zones: [{ id: "garage", armed: false }, { id: "door", delay: "instant" }, { id: "win", armed: true }] });
    expect(cleaned({ id: "q", name: "Quiet", base: "away", siren: false, notify: "normal" })).toEqual({ id: "q", name: "Quiet", base: "away", siren: false, notify: "normal" });
  });

  it("finds what the server would refuse before Save is offered", () => {
    expect(problemsOf(defaults)).toEqual([]);
    expect(problemsOf([defaults[1], defaults[2]])).toContain("reserved");
    expect(problemsOf([{ ...defaults[0], base: "stay" }, defaults[1]])).toContain("reserved");
    expect(problemsOf([...defaults, { ...defaults[2] }])).toContain("duplicate_id");
    expect(problemsOf([defaults[0], defaults[1], { id: "n", name: "  ", base: "away" }])).toContain("name");
    expect(problemsOf([defaults[0], defaults[1], { id: "n", name: "x".repeat(33), base: "away" }])).toContain("name");
    expect(problemsOf([defaults[0], defaults[1], { id: "n", name: "ok", base: "away", entry_delay_s: 301 }])).toContain("delay");
    expect(problemsOf([defaults[0], defaults[1], { id: "n", name: "ok", base: "away", exit_delay_s: 1.5 }])).toContain("delay");
    expect(problemsOf([defaults[0], defaults[1], { id: "n", name: "ok", base: "away", zones: [{ id: "a" }, { id: "a", armed: true }] }])).toContain("duplicate_zone");
    expect(problemsOf([defaults[0], defaults[1], ...Array.from({ length: 7 }, (_, index): ArmProfile => ({ id: `p${index}`, name: `P${index}`, base: "away" }))])).toContain("count");
    expect(isReserved("away") && isReserved("stay") && !isReserved("night")).toBe(true);
  });

  it("says in one line what a mode does beyond its base, in every language", () => {
    for (const language of locales) {
      const t = (key: string) => text(language, key);
      const line = summaryOf({ id: "night", name: "Night", base: "stay", exit_delay_s: 0, entry_delay_s: 45, siren: false, zones: [{ id: "a" }, { id: "b" }] }, t);
      expect(line, language).not.toMatch(/apm_|\{0\}/);
      expect(line.split(" · ").length, language).toBe(5);
    }
    expect(summaryOf(defaults[0], key => text("en", key))).toBe("like away");
    expect(summaryOf(defaults[2], key => text("en", key))).toBe("like at home · entry 45 s");
  });

  it("lists every zone of every panel once, by name", () => {
    const nodes = [{ state: { zones: [{ id: "window", name: "Window" }, { id: "door" }] } }, { state: { zones: [{ id: "door", name: "Other door" }, { id: "hall", name: "Hall" }] } }];
    expect(knownZones(nodes)).toEqual([["door", "door"], ["hall", "Hall"], ["window", "Window"]]);
    expect(knownZones([])).toEqual([]);
  });
});
