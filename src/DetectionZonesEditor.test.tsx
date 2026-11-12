import { describe, expect, it } from "vitest";
import { area, MODES, nextZoneId, parseLabels, withoutZone, zoneFrom } from "./DetectionZonesEditor";
import { locales, text } from "./i18n";

describe("the detection zones of a camera", () => {
  it("makes a zone from the corners clicked, and refuses too few, too many or a flat shape", () => {
    expect(zoneFrom("zone1", [[0.1, 0.1], [0.5, 0.1], [0.5, 0.5]])).toMatchObject({ id: "zone1", kind: "alert", labels: [], min_frames: 1, min_seconds: 0 });
    expect(zoneFrom("z", [[0.1, 0.1], [0.5, 0.1]])).toBeNull();
    expect(zoneFrom("z", [[0, 0], [0.5, 0.5], [1, 1]])).toBeNull();
    expect(zoneFrom("z", Array.from({ length: 13 }, (_, i) => [i / 13, (i % 2) / 2] as [number, number]))).toBeNull();
    expect(area([[0, 0], [1, 0], [1, 1], [0, 1]])).toBeCloseTo(1);
  });

  it("names the next zone, reads the labels as text and takes a removed zone out of every profile", () => {
    expect(nextZoneId([])).toBe("zone1");
    expect(nextZoneId([{ id: "zone1" }, { id: "zone3" }] as never)).toBe("zone2");
    expect(parseLabels("Person, car, person, Not A Name!, dog")).toEqual(["person", "car", "dog"]);
    expect(parseLabels("")).toEqual([]);
    const cleaned = withoutZone({ home: { watch: ["a", "b"], sensitivity: "low", notify: false } }, "a");
    expect(cleaned.home).toEqual({ watch: ["b"], sensitivity: "low", notify: false });
    expect(MODES).toEqual(["away", "home", "night", "disarmed"]);
  });

  it("has every phrase in all eight languages, translated and not repeated", () => {
    const ids = ["dz_title", "dz_help", "dz_draw", "dz_close", "dz_undo", "dz_none", "dz_save", "dz_error", "dz_profiles_title", "dz_profiles_help", "dz_notify", ...MODES.map(mode => `dz_mode_${mode}`)];
    for (const id of ids) {
      const words = new Set<string>();
      for (const locale of locales) {
        const phrase = text(locale, id);
        expect(phrase.trim().length, `${locale} ${id}`).toBeGreaterThan(0);
        expect(phrase, `${locale} ${id} is not the key`).not.toBe(id);
        words.add(phrase);
      }
      expect(words.size, `${id} is translated`).toBeGreaterThan(5);
    }
  });
});
