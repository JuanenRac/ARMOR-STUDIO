import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, parsePrefs } from "../prefs";
import { locales, text } from "../i18n";

describe("the mascot and the voice of the step-by-step tours", () => {
  it("the mascot is on and the voice is off by default, and both are read strictly", () => {
    expect(DEFAULT_PREFS.tourMascot).toBe(true);
    expect(DEFAULT_PREFS.tourSpeak).toBe(false);
    expect(parsePrefs(JSON.stringify({ tourMascot: false, tourSpeak: true }))).toMatchObject({ tourMascot: false, tourSpeak: true });
    expect(parsePrefs(JSON.stringify({ tourMascot: "no", tourSpeak: 1 }))).toMatchObject({ tourMascot: true, tourSpeak: false });
  });

  it("have their labels in the eight languages", () => {
    for (const key of ["tourVoiceOn", "tourVoiceOff", "tourVoiceTip", "tourGuideOn", "tourGuideOff", "tourGuideTip", "pf_tour_mascot", "pf_tour_mascot_h", "pf_tour_speak", "pf_tour_speak_h"]) {
      for (const language of locales) expect(text(language, key), `${language}/${key}`).not.toBe(key);
    }
  });
});
