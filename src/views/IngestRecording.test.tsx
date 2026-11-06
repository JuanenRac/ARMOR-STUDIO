import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadIngestRecording } from "../api";
import { ApiError } from "../api/transport";
import { errorText } from "../apiErrorText";
import { locales, text } from "../i18n";
import { IngestRecording } from "./IngestRecording";

const KEYS = ["rec_title", "rec_help", "rec_off", "rec_on", "rec_stats", "rec_size", "rec_since", "rec_download", "rec_file_now", "rec_file_old", "rec_done",
  "rec_err_recording_disabled", "rec_err_rate_limited", "rec_err_status_429", "rec_err_not_found", "rec_err_forbidden", "rec_err_generic"];

describe("the state and the download of the copy of the node traffic", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("has its phrases in all eight languages, with the placeholders of the English one", () => {
    for (const locale of locales) for (const key of KEYS) {
      const phrase = text(locale, key);
      expect(phrase.trim().length, `${locale} ${key}`).toBeGreaterThan(0);
      expect(phrase, `${locale} ${key} is missing`).not.toBe(key);
      const placeholders = (value: string) => [...value.matchAll(/\{\d\}/g)].map(match => match[0]).sort().join("");
      expect(placeholders(phrase), `${locale} ${key}`).toBe(placeholders(text("en", key)));
    }
  });

  it("draws its title and help before the state arrives, and nothing that needs the state", () => {
    const html = renderToStaticMarkup(createElement(IngestRecording, { t: key => text("en", key), origin: "http://127.0.0.1:8080" }));
    expect(html).toContain('data-testid="ingest-recording"');
    expect(html).toContain("Copy of the node traffic");
    expect(html).not.toContain("rec-stats");
  });

  it("asks the file by its index from the route of the administrator and gives back the text", async () => {
    const seen: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => { seen.push(url); return new Response("{\"topic\":\"armor/x\"}\n", { status: 200 }); }));
    expect(await downloadIngestRecording("http://armor.local:8080", 2)).toBe("{\"topic\":\"armor/x\"}\n");
    expect(new URL(seen[0]!).pathname + new URL(seen[0]!).search).toBe("/api/v1/system/ingest/recording/file?index=2");
  });

  it("says in words why a download was refused: the copy is off, too many downloads, no such file", async () => {
    const refuse = async (status: number, body: unknown) => {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })));
      try { await downloadIngestRecording("http://armor.local:8080", 0); } catch (error) { return error; }
      throw new Error("it was not refused");
    };
    const t = (key: string) => text("en", key);
    const off = await refuse(404, { error: "the copy is off", code: "recording_disabled" });
    expect(off).toBeInstanceOf(ApiError);
    expect(errorText(t, off, "rec_err_")).toBe(text("en", "rec_err_recording_disabled"));
    expect(errorText(t, await refuse(429, { error: "too many downloads", code: "rate_limited" }), "rec_err_")).toBe(text("en", "rec_err_rate_limited"));
    expect(errorText(t, await refuse(404, { error: "no such file", code: "not_found" }), "rec_err_")).toBe(text("en", "rec_err_not_found"));
    expect(errorText(t, await refuse(401, {}), "rec_err_")).toBe(text("en", "rec_err_forbidden"));
  });
});
