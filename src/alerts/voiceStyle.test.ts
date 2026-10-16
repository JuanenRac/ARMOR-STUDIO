import { describe, expect, it } from "vitest";
import { DEFAULT_ALERTS, VOICE_STYLES, parseAlerts } from "./settings";
import { speechParts, styledMessage } from "./voiceStyle";

const LANGUAGES = ["en", "es", "de", "fr", "it", "ja", "zh", "pt"];

describe("the styles of the spoken voice", () => {
  it("are read strictly and default to plain", () => {
    expect(DEFAULT_ALERTS.voice.style).toBe("plain");
    expect(parseAlerts(JSON.stringify({ voice: { style: "hero" } })).voice.style).toBe("hero");
    expect(parseAlerts(JSON.stringify({ voice: { style: "<script>" } })).voice.style).toBe("plain");
  });

  it("leave the plain voice exactly as it was", () => {
    expect(styledMessage("Door open", "plain", "en-GB")).toBe("Door open");
    expect(speechParts("Door open", "plain", "en-GB")).toEqual([{ text: "Door open", pitch: 1, rate: 1, volume: 1 }]);
  });

  it("have their own lines in the eight languages, and fall back to English for another", () => {
    for (const style of ["hero", "dark", "chaos"] as const) {
      const seen = new Set<string>();
      for (const language of LANGUAGES) {
        const text = styledMessage("X", style, `${language}-XX`, 0);
        expect(text.length, `${style}/${language}`).toBeGreaterThan(4);
        seen.add(text);
      }
      expect(seen.size, style).toBe(LANGUAGES.length);
      expect(styledMessage("X", style, "ko-KR", 0)).toBe(styledMessage("X", style, "en-GB", 0));
    }
  });

  it("change the words from one announcement to the next", () => {
    for (const style of ["hero", "dark", "chaos"] as const) {
      const words = new Set([0, 1, 2, 3].map(step => styledMessage("Door open", style, "en-GB", step)));
      expect(words.size, style).toBeGreaterThan(1);
    }
  });

  it("make the hero quick and bright and the dark lord slow and deep", () => {
    const hero = speechParts("X", "hero", "en")[0]!, dark = speechParts("X", "dark", "en")[0]!;
    expect(hero.rate).toBeGreaterThan(1); expect(hero.pitch).toBeGreaterThan(1);
    expect(dark.rate).toBeLessThan(1); expect(dark.pitch).toBeLessThan(1);
  });

  it("make the theatrical voice whisper and then rise, in a different order each time", () => {
    const first = speechParts("Door open", "chaos", "en", 0), second = speechParts("Door open", "chaos", "en", 1);
    for (const parts of [first, second]) {
      expect(parts).toHaveLength(3);
      expect(parts[1]!.text).toBe("Door open");
      const volumes = parts.map(part => part.volume);
      expect(Math.max(...volumes)).toBe(1);
      expect(Math.min(...volumes)).toBeLessThan(0.7);   // a whisper
    }
    expect(first[1]!.pitch).not.toBe(second[1]!.pitch);   // the message itself is calm one time and dramatic the next
  });

  it("offer every style in a label in the eight languages", async () => {
    const { text } = await import("../i18n");
    for (const style of VOICE_STYLES) for (const language of ["en", "es", "de", "fr", "it", "ja", "zh", "pt"] as const) {
      expect(text(language, `al_style_${style}`), `${language}/${style}`).not.toBe(`al_style_${style}`);
    }
  });
});
