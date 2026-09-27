import { describe, expect, it } from "vitest";
import type { ArmorEvent, Zone } from "./api";
import { csvCell, DEFAULT_FILTERS, DEFAULT_ZONE_VIEW, describeEvent, emptyZoneDraft, eventsToCsv, formatUptime, historyQuery, localDayBound, pixelToMm, rectFromDrag, zoneFromDraft } from "./history";
import { locales, text } from "./i18n";

const draft = (extra: Partial<ReturnType<typeof emptyZoneDraft>> = {}) => ({ ...emptyZoneDraft(), name: "Road", x_min_mm: "0", x_max_mm: "3000", y_min_mm: "0", y_max_mm: "2000", ...extra });

describe("zone form", () => {
  it("builds a validated zone with an id derived from its name", () => {
    expect(zoneFromDraft(draft({ node_id: "North-1", sensor_id: "2" }), [])).toEqual({
      id: "road", name: "Road", action: "ignore", node_id: "north-1", sensor_id: 2, x_min_mm: 0, x_max_mm: 3000, y_min_mm: 0, y_max_mm: 2000,
    });
  });

  it("keeps ids unique and never refuses a repeated name", () => {
    const first = zoneFromDraft(draft(), []) as Zone;
    const second = zoneFromDraft(draft(), [first]) as Zone;
    expect(second.id).toBe("road-2");
    expect(zoneFromDraft(draft({ name: "Área Norte!" }), [])?.id).toBe("area-norte");
    expect(zoneFromDraft(draft({ name: "???" }), [])?.id).toBe("zone");
  });

  it("refuses an empty, inverted, out-of-range or malformed zone", () => {
    for (const bad of [
      draft({ name: "  " }), draft({ x_min_mm: "" }), draft({ x_min_mm: "3000", x_max_mm: "0" }), draft({ y_max_mm: "abc" }),
      draft({ x_max_mm: "1e9" }), draft({ sensor_id: "4" }), draft({ sensor_id: "1.5" }), draft({ node_id: "../x" }), draft({ name: "x".repeat(81) }),
    ]) expect(zoneFromDraft(bad, [])).toBeNull();
  });
});

describe("event descriptions", () => {
  const t = (key: string) => text("en", key);
  const at = "2026-01-01T00:00:00.000Z";
  it("reads each kind of event", () => {
    expect(describeEvent({ id: 1, at, type: "mode", mode: "armed" } as ArmorEvent, t)).toBe("ARMED");
    expect(describeEvent({ id: 2, at, type: "alert", node_id: "north-1", from: "review", to: "high", targets: 2 } as ArmorEvent, t)).toBe("north-1: review → HIGH (2 targets)");
    expect(describeEvent({ id: 3, at, type: "node", node_id: "north-1", from: "online", to: "stale" } as ArmorEvent, t)).toBe("north-1: online → silent");
    expect(describeEvent({ id: 4, at, type: "node", node_id: "north-1", from: null, to: "online" } as ArmorEvent, t)).toBe("north-1: online");
  });
  it("has a translation of every history word in every language", () => {
    for (const locale of locales) {
      for (const key of ["history", "event_alert", "level_high", "status_stale", "rulesHelp", "zoneInvalid"]) {
        expect(text(locale, key), `${locale}:${key}`).not.toBe(key);
        if (locale !== "en") expect(text(locale, key), `${locale}:${key}`).not.toBe(text("en", key));
      }
    }
  });
});

describe("zone canvas", () => {
  const size = { width: 600, height: 400 };
  it("maps pixels to millimetres in the sensor frame, snapped and clamped", () => {
    expect(pixelToMm(DEFAULT_ZONE_VIEW, size, { x: 300, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(pixelToMm(DEFAULT_ZONE_VIEW, size, { x: 0, y: 400 })).toEqual({ x: -6000, y: 6000 });
    expect(pixelToMm(DEFAULT_ZONE_VIEW, size, { x: 900, y: -50 })).toEqual({ x: 6000, y: 0 });
    expect(pixelToMm(DEFAULT_ZONE_VIEW, size, { x: 301, y: 200 })).toEqual({ x: 20, y: 3000 });
  });

  it("turns a drag into form fields in any direction, and ignores an accidental click", () => {
    expect(rectFromDrag({ x: 1000, y: 3000 }, { x: -500, y: 1000 })).toEqual({ x_min_mm: "-500", x_max_mm: "1000", y_min_mm: "1000", y_max_mm: "3000" });
    expect(rectFromDrag({ x: 0, y: 0 }, { x: 10, y: 4000 })).toBeNull();
    expect(zoneFromDraft({ ...emptyZoneDraft(), name: "Drawn", ...rectFromDrag({ x: 0, y: 500 }, { x: 900, y: 2500 })! }, [])?.x_max_mm).toBe(900);
  });

  it("describes camera events", () => {
    const t = (key: string) => text("en", key);
    expect(describeEvent({ id: 1, at: "2026-01-01T00:00:00.000Z", type: "camera", camera_id: "cam-01", from: "online", to: "offline" }, t)).toBe("cam-01: online → offline");
    for (const locale of locales) for (const key of ["event_camera", "unreachable", "forgetNode", "zoneCanvasHelp", "status_unknown"]) expect(text(locale, key), `${locale}:${key}`).not.toBe(key);
  });
});

describe("history filters", () => {
  const now = Date.parse("2026-03-10T12:00:00Z");
  it("turns filters into the server query", () => {
    expect(historyQuery(DEFAULT_FILTERS, now)).toEqual({ order: "desc" });
    expect(historyQuery({ ...DEFAULT_FILTERS, type: "camera", q: "  cam-01 ", range: "7d", order: "asc" }, now)).toEqual({ order: "asc", q: "cam-01", type: "camera", since: "2026-03-03T12:00:00.000Z" });
    expect(historyQuery({ ...DEFAULT_FILTERS, type: "node", level: "high" }, now).type).toBe("alert");   // a level only exists for alerts
    expect(historyQuery({ ...DEFAULT_FILTERS, q: "x".repeat(200) }, now).q).toHaveLength(80);
  });
  it("reads custom dates as whole local days and ignores anything else", () => {
    const start = localDayBound("2026-03-05", false)!, end = localDayBound("2026-03-05", true)!;
    expect(new Date(start).getHours()).toBe(0);
    expect(new Date(end).getHours()).toBe(23);
    expect(end - start).toBeGreaterThan(23.9 * 3600_000);
    expect(localDayBound("yesterday", false)).toBeUndefined();
    expect(localDayBound("2026-13-40", false)).toBeUndefined();
    const query = historyQuery({ ...DEFAULT_FILTERS, range: "custom", from: "2026-03-01", to: "2026-03-05" }, now);
    expect(Date.parse(query.since!)).toBeLessThan(Date.parse(query.until!));
    expect(historyQuery({ ...DEFAULT_FILTERS, range: "custom", from: "nope", to: "" }, now).since).toBeUndefined();
  });
});

describe("export", () => {
  it("quotes cells and neutralises spreadsheet formulas", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("-1+1")).toBe("'-1+1");
    expect(csvCell(null)).toBe("");
    expect(csvCell(7)).toBe("7");
  });
  it("writes one row per event with a header", () => {
    const at = "2026-01-01T00:00:00.000Z";
    const csv = eventsToCsv([
      { id: 2, at, type: "alert", node_id: "north-1", from: "review", to: "high", targets: 2 },
      { id: 1, at, type: "mode", mode: "armed" },
    ] as ArmorEvent[]);
    expect(csv.split(String.fromCharCode(13, 10))).toEqual(["id,time,type,subject,from,to,targets", `2,${at},alert,north-1,review,high,2`, `1,${at},mode,,,armed,`, ""]);
  });
});

describe("uptime", () => {
  it("reads as the two largest units", () => {
    expect(formatUptime(59)).toBe("59s");
    expect(formatUptime(125)).toBe("2m 5s");
    expect(formatUptime(3700)).toBe("1h 1m");
    expect(formatUptime(93784)).toBe("1d 2h");
    expect(formatUptime(-1)).toBe("-");
    expect(formatUptime(Number.NaN)).toBe("-");
  });
});
