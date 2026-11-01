// @vitest-environment jsdom
// The reports in History: the summary of a day and the heat map, only for administrators and operators, with the refusals of the server told in words that say what to do.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api";
import { reportRefusal } from "../api/reports";
import { HistoryView } from "../HistoryView";
import { locales, text } from "../i18n";
import { ReportsPanel } from "./ReportsPanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const t = (key: string) => text("en", key);
let root: Root | null = null;
let container: HTMLElement;
const calls: string[] = [];
let replies: Array<{ status: number; body: unknown; type?: string }> = [];

const REPORT = { date: "2026-03-05", language: "en", summary: { schema: "armor-daily-summary/1", totals: { events: 7, alarms: 5, serious_alarms: 2, false_alarms: 1 }, by_type: {}, by_zone: {}, by_hour: [] },
  findings: [{ kind: "recurrent_false_alarm", subject: { zone: "garden" }, count: 4, detail: {}, evidence: [] }], text: "A quiet day with two serious alarms.", ai_note: "Check the garden sensor." };
const MAP = { schema: "armor.vision.heatmap/v1", camera_id: "cam-front", cols: 4, rows: 3, accepted_positions: 12, rejected_positions: 0, total: 12, max: 5, weights: [[1]], normalized: [[1]], contains_images: false };

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  calls.length = 0; replies = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    calls.push(String(url));
    const reply = replies.shift() ?? { status: 500, body: {} };
    const body = reply.type ? new Blob(["x"], { type: reply.type }) : JSON.stringify(reply.body);
    return new Response(body, { status: reply.status, headers: { "Content-Type": reply.type ?? "application/json" } });
  }));
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:heat"), revokeObjectURL: vi.fn() }));
});
afterEach(() => { act(() => root?.unmount()); root = null; container.remove(); vi.unstubAllGlobals(); });

const mount = (element: ReturnType<typeof createElement>) => { root = createRoot(container); act(() => root!.render(element)); };
const click = async (testid: string) => { await act(async () => { (container.querySelector(`[data-testid="${testid}"]`) as HTMLElement).click(); await new Promise(resolve => setTimeout(resolve, 0)); await Promise.resolve(); }); };
const panel = () => createElement(ReportsPanel, { t, origin: "http://x", language: "es", cameras: [{ id: "cam-front", name: "Front" }] });

describe("the summary of a day", () => {
  it("asks for the day and the language chosen and shows the counts, the text, the patterns and the note of the AI", async () => {
    mount(panel());
    expect((container.querySelector('[data-testid="rep-language"]') as HTMLSelectElement).value, "starts in the language of the console").toBe("es");
    replies = [{ status: 200, body: REPORT }];
    await click("rep-summary-show");
    expect(calls[0]).toMatch(/^http:\/\/x\/api\/v1\/summary\/daily\?date=\d{4}-\d{2}-\d{2}&lang=es$/);
    const result = container.querySelector('[data-testid="rep-summary-result"]')!;
    expect(result.textContent).toContain("A quiet day with two serious alarms.");
    expect(result.textContent).toContain("7");
    expect(result.textContent).toContain("A zone with recurring false alarms");
    expect(result.textContent).toContain("garden");
    expect(container.querySelector('[data-testid="rep-ai-note"]')!.textContent).toContain("Check the garden sensor.");
  });

  const refusals: Array<[number, unknown, string]> = [
    [404, { error: "daily_summary_disabled" }, "turns it on in Configuration"], [403, { error: "only an administrator or an operator can ask for this" }, "Only an administrator or an operator"],
    [422, { error: "invalid_date" }, "not a day"], [422, { error: "invalid_language" }, "that language"], [503, { error: "daily_summary_not_configured" }, "not set up on the server"],
    [503, { error: "daily_summary_off_in_settings" }, "its own settings file"], [503, { error: "report_busy" }, "another report"], [502, { error: "daily_summary_failed" }, "could not be made"],
    [429, { error: "Too many requests" }, "Too many requests this minute"], [401, {}, "Only an administrator or an operator"],
  ];
  for (const [status, body, words] of refusals) it(`tells ${status} ${JSON.stringify(body).slice(0, 40)} in words`, async () => {
    mount(panel());
    replies = [{ status, body }];
    await click("rep-summary-show");
    expect(container.querySelector('[data-testid="rep-summary-refusal"]')!.textContent).toContain(words);
    expect(container.querySelector('[data-testid="rep-summary-result"]')).toBeNull();
  });
});

describe("the heat map", () => {
  it("asks for the camera, the size and the picture chosen and shows it with its caption", async () => {
    mount(panel());
    replies = [{ status: 200, body: MAP }, { status: 200, body: {}, type: "image/png" }];
    await act(async () => { const select = container.querySelector('[data-testid="rep-camera"]') as HTMLSelectElement; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(select, "cam-front"); select.dispatchEvent(new Event("change", { bubbles: true })); });
    await click("rep-heatmap-show");
    expect(calls.sort()).toEqual(["http://x/api/v1/vision/heatmap?camera=cam-front&format=json&scale=8", "http://x/api/v1/vision/heatmap?camera=cam-front&format=png&scale=8"]);
    const result = container.querySelector('[data-testid="rep-heatmap-result"]')!;
    expect(result.querySelector("img")!.getAttribute("src")).toBe("blob:heat");
    expect(result.textContent).toContain("12 positions counted on a grid of 4 x 3");
  });

  const refusals: Array<[number, string, string]> = [
    [404, "heatmap_disabled", "turns it on in Configuration"], [404, "unknown_camera", "does not know that camera"], [404, "heatmap_pipeline_off", "activity pipeline is off"],
    [503, "heatmap_not_configured", "address of the vision service"], [502, "heatmap_failed", "could not be made"], [400, "invalid_query", "did not understand"],
  ];
  for (const [status, error, words] of refusals) it(`tells ${status} ${error} in words`, async () => {
    mount(panel());
    replies = [{ status, body: { error } }, { status, body: { error } }];
    await click("rep-heatmap-show");
    expect(container.querySelector('[data-testid="rep-heatmap-refusal"]')!.textContent).toContain(words);
    expect(container.querySelector('[data-testid="rep-heatmap-result"]')).toBeNull();
  });
});

describe("who sees it", () => {
  it("History offers the reports only when it is given them (administrators and operators), and never to a viewer", () => {
    const without = renderToStaticMarkup(createElement(HistoryView, { origin: "http://x", t }));
    expect(without).not.toContain("Reports");
    const withReports = renderToStaticMarkup(createElement(HistoryView, { origin: "http://x", t, reports: { language: "en", cameras: [] } }));
    expect(withReports).toContain("Reports");
  });
});

describe("the refusals and the words", () => {
  it("maps what the server says to a phrase, and a failure of the network to its own", () => {
    expect(reportRefusal(new ApiError(404, "daily_summary_disabled"))).toBe("rep_err_summary_off");
    expect(reportRefusal(new ApiError(404, "generic"))).toBe("rep_err_off");
    expect(reportRefusal(new ApiError(503, "generic"))).toBe("rep_err_setup");
    expect(reportRefusal(new ApiError(403, "forbidden"))).toBe("rep_err_forbidden");
    expect(reportRefusal(new ApiError(418, "teapot"))).toBe("rep_err_generic");
    expect(reportRefusal(new Error("offline"))).toBe("rep_err_network");
  });
  it("has every phrase in the eight languages", () => {
    const keys = ["rep_tab", "rep_title", "rep_help", "rep_summary_title", "rep_date", "rep_language", "rep_show", "rep_events", "rep_alarms", "rep_serious", "rep_false", "rep_patterns", "rep_times", "rep_ai_note", "rep_summary_note",
      "rep_heatmap_title", "rep_heatmap_help", "rep_camera", "rep_camera_any", "rep_scale", "rep_format", "rep_heatmap_alt", "rep_heatmap_caption", "rep_download",
      ...["hourly_repeat", "intermittent_sensor", "intermittent_link", "recurrent_false_alarm", "anomalous_consumption"].map(kind => `rep_kind_${kind}`),
      ...["network", "summary_off", "heatmap_off", "date", "language", "query", "camera", "pipeline_off", "heatmap_setup", "summary_setup", "summary_off_settings", "busy", "failed", "rate", "forbidden", "off", "setup", "generic"].map(name => `rep_err_${name}`)];
    for (const locale of locales) for (const key of keys) {
      expect(text(locale, key).trim().length, `${locale} ${key}`).toBeGreaterThan(1);
      expect(text(locale, key), `${locale} ${key}`).not.toBe(key);
    }
    for (const locale of locales) { expect(text(locale, "rep_times")).toContain("{0}"); expect(text(locale, "rep_heatmap_caption")).toContain("{3}"); }
    expect(text("pt", "rep_tab")).toBe("Relatórios");
    expect(text("pt", "rep_camera")).toBe("Câmara");
  });
});
