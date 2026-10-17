import { describe, expect, it } from "vitest";
import { locales, requiredUiKeys, text } from "./i18n";

/** Names, protocols and loanwords that are written the same in every language. */
const SAME_EVERYWHERE = new Set([
  "preset_zigbee2mqtt", "preset_shelly", "protocol_thread", "nt_homeassistant", "ndk_modem", "ndk_hub", "sensorOptional", "serverOffline", "ndp_down_mbps", "ndp_up_mbps", "ad_zone_normal",
  "elWireSection", "nd_medium_eth", "nd_medium_wifi",
]);

describe("the translations", () => {
  it("do not leave a phrase in English in another language (names and loanwords are listed above)", () => {
    for (const locale of locales) {
      if (locale === "en") continue;
      const left = requiredUiKeys.filter(key => {
        const english = text("en", key);
        return text(locale, key) === english && /[A-Za-z]{3,}[^A-Za-z]+[A-Za-z]{2,}/.test(english) && !SAME_EVERYWHERE.has(key);
      });
      expect(left, `${locale} has phrases still in English`).toEqual([]);
    }
  });

  it("keep the same {placeholders} in every language", () => {
    const holes = (value: string) => (value.match(/\{\d+\}/g) ?? []).sort().join(",");
    const wrong: string[] = [];
    for (const key of requiredUiKeys) {
      const english = holes(text("en", key));
      for (const locale of locales) if (holes(text(locale, key)) !== english) wrong.push(`${locale}:${key}`);
    }
    expect(wrong).toEqual([]);
  });

  it("exist for every literal key the screens ask for", () => {
    const sources = import.meta.glob("./**/*.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
    const known = new Set(requiredUiKeys);
    const missing: string[] = [];
    for (const [file, source] of Object.entries(sources)) {
      if (/\.test\./.test(file)) continue;
      for (const match of source.matchAll(/[^A-Za-z0-9_.]t\("([A-Za-z][A-Za-z0-9_]*)"\)/g)) if (!known.has(match[1])) missing.push(`${file}: ${match[1]}`);
    }
    expect(missing).toEqual([]);
  });
});
