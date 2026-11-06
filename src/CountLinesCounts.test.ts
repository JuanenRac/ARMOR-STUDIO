import { afterEach, describe, expect, it, vi } from "vitest";
import { readLineCounts } from "./api";
import { errorText } from "./apiErrorText";
import { locales, text } from "./i18n";

const KEYS = ["lc_counts_title", "lc_counts_reading", "lc_counts_left", "lc_counts_right", "lc_counts_refresh", "lc_counts_none",
  "lc_counts_err_heatmap_disabled", "lc_counts_err_counts_pipeline_off", "lc_counts_err_counts_not_configured", "lc_counts_err_generic"];

describe("the crossings counted on each counting line", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("are asked of the route of the server and come back as numbers per camera and line", async () => {
    const seen: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => { seen.push(url); return new Response(JSON.stringify({ cameras: { front: { gate: { to_left: 3, to_right: 5 } } } }), { status: 200, headers: { "Content-Type": "application/json" } }); }));
    const answer = await readLineCounts("http://armor.local:8080");
    expect(new URL(seen[0]!).pathname).toBe("/api/v1/vision/counts");
    expect(answer.cameras.front!.gate).toEqual({ to_left: 3, to_right: 5 });
  });

  it("have their phrases in all eight languages", () => {
    for (const locale of locales) for (const key of KEYS) {
      const phrase = text(locale, key);
      expect(phrase.trim().length, `${locale} ${key}`).toBeGreaterThan(0);
      expect(phrase, `${locale} ${key} is missing`).not.toBe(key);
    }
  });

  it("explain in words why they cannot be shown: the report is off, the analysis is off, the service is not set up", async () => {
    const refuse = async (status: number, body: unknown) => {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })));
      try { await readLineCounts("http://armor.local:8080"); } catch (error) { return error; }
      throw new Error("it was not refused");
    };
    const t = (key: string) => text("en", key);
    expect(errorText(t, await refuse(404, { error: "heatmap_disabled" }), "lc_counts_err_")).toBe(text("en", "lc_counts_err_heatmap_disabled"));
    expect(errorText(t, await refuse(404, { error: "counts_pipeline_off" }), "lc_counts_err_")).toBe(text("en", "lc_counts_err_counts_pipeline_off"));
    expect(errorText(t, await refuse(503, { error: "counts_not_configured" }), "lc_counts_err_")).toBe(text("en", "lc_counts_err_counts_not_configured"));
    expect(errorText(t, await refuse(502, { error: "counts_failed" }), "lc_counts_err_")).toBe(text("en", "lc_counts_err_generic"));
  });
});
