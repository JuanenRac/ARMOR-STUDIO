import { describe, expect, it } from "vitest";
import { assistantVoice } from "../alerts/sounds";
import { DEFAULT_ALERTS } from "../alerts/settings";
import { DEFAULT_PREFS, parsePrefs } from "../prefs";
import { locales, text } from "../i18n";

describe("the assistant that speaks", () => {
  it("is silent by default and the preference is read strictly", () => {
    expect(DEFAULT_PREFS.assistantSpeak).toBe(false);
    expect(parsePrefs(JSON.stringify({ assistantSpeak: true })).assistantSpeak).toBe(true);
    expect(parsePrefs(JSON.stringify({ assistantSpeak: "yes" })).assistantSpeak).toBe(false);
  });

  it("is heard with the voice of the alarms: its language, age, speed, volume and the pitch of its style, but no extra lines", () => {
    const base = assistantVoice(DEFAULT_ALERTS, "es", "  Hola\n\n  mundo ");
    expect(base).toMatchObject({ text: "Hola mundo", lang: "es-ES", pitch: 1, rate: 1 });
    const settings = { ...DEFAULT_ALERTS, volume: 40, voice: { ...DEFAULT_ALERTS.voice, language: "de-DE", age: "senior" as const, style: "dark" as const, rate: 120 } };
    const dark = assistantVoice(settings, "es", "x");
    expect(dark.lang).toBe("de-DE");
    expect(dark.pitch).toBeLessThan(0.5);   // senior and dark lord: low
    expect(dark.rate).toBeGreaterThan(0.1);
    expect(dark.volume).toBeCloseTo(0.4);
    expect(assistantVoice({ ...settings, voice: { ...settings.voice, style: "hero" } }, "en", "x").text).toBe("x");
    expect(assistantVoice(DEFAULT_ALERTS, "en", "a".repeat(2000)).text).toHaveLength(600);
  });

  it("has its labels in the eight languages", () => {
    for (const key of ["pf_asst_speak", "pf_asst_speak_h", "asst_speak_on", "asst_speak_off"]) for (const l of locales) expect(text(l, key), `${l}/${key}`).not.toBe(key);
  });
});
