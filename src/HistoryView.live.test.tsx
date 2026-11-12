// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { HistoryView } from "./HistoryView";
import { text } from "./i18n";
import { byText, fakeServer, mount, pokeAll, typeInto } from "./testLive";

const downloads: Array<{ name: string; body: string }> = [];
vi.mock("./download", () => ({ downloadText: (name: string, body: string) => { downloads.push({ name, body }); } }));

const O = "http://armor.local:18080/";
const t = (key: string) => text("en", key);
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ""; downloads.length = 0; });
beforeEach(() => { vi.spyOn(window, "confirm").mockReturnValue(true); });

const events = [
  { id: 3, at: "2026-01-02T10:00:00Z", type: "alert", node_id: "radar1", from: "normal", to: "high", targets: 2 },
  { id: 2, at: "2026-01-02T09:00:00Z", type: "mode", mode: "armed" },
  { id: 1, at: "2026-01-02T08:00:00Z", type: "node", node_id: "radar1", from: null, to: "online" },
];
const summary = { total: 3, oldest_at: "2026-01-02T08:00:00Z", newest_at: "2026-01-02T10:00:00Z", by_type: {}, last_24h: { events: 3, high_alerts: 1, node_incidents: 1, camera_incidents: 1 } };
const client = (extra: Record<string, unknown> = {}) => ({ id: "c1", kind: "studio", user: "ana", label: "Laptop", app_version: "1.0", first_seen: "2026-01-01T00:00:00Z", last_seen: "2026-01-02T00:00:00Z", active_sessions: 1, logins_ok: 4, logins_failed: 2, last_failure: "2026-01-01T12:00:00Z", ...extra });
const rules = () => ({ schema: 1, dwell_ms: 2000, zones: [{ id: "door", name: "Door", action: "ignore", x_min_mm: -500, x_max_mm: 500, y_min_mm: 0, y_max_mm: 1000 }] });
const routes = (extra: Record<string, unknown> = {}) => ({
  "GET /api/v1/history": { events, next_before: null },
  "GET /api/v1/history/summary": summary,
  "GET /api/v1/history/connections": { clients: [client(), client({ id: "c2", ip: "10.0.0.2", agent: "Agent/1" })] },
  "GET /api/v1/rules": rules(),
  "PUT /api/v1/rules": (body: unknown) => body,
  "DELETE /api/v1/history": { deleted: 3, remaining: 0 },
  ...extra,
});
const subFilters = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>(".media-filters:not(.history-tabs) button")];

describe("History, run for real", () => {
  it("lists the events and the summary, opens the details of one and filters by kind, search, level, order and range", async () => {
    const calls = fakeServer(routes());
    const view = await mount(createElement(HistoryView, { origin: O, t }));
    expect(view.host.querySelectorAll(".history-row")).toHaveLength(3);
    expect(view.host.textContent).toContain("3 / 3");
    await view.click(view.host.querySelector(".history-row-button"));
    expect(view.host.querySelector(".history-details")).not.toBeNull();
    await view.click(view.host.querySelector(".history-row-button"));
    expect(view.host.querySelector(".history-details")).toBeNull();
    await view.click(byText(view.host, t("event_alert")));
    expect(calls.some(call => call.path === "/api/v1/history")).toBe(true);
    await typeInto(view.host.querySelector<HTMLInputElement>("input[type=search]"), "radar");
    await typeInto(view.host.querySelector<HTMLSelectElement>("select[aria-label]"), "high");
    await view.click(byText(view.host, t("newestFirst")));
    expect(byText(view.host, t("oldestFirst"))).not.toBeNull();
    await typeInto(view.host.querySelectorAll<HTMLSelectElement>("select")[1], "custom");
    expect(view.host.querySelectorAll("input[type=date]")).toHaveLength(2);
    await typeInto(view.host.querySelectorAll<HTMLInputElement>("input[type=date]")[0], "2026-01-01");
    await typeInto(view.host.querySelectorAll<HTMLInputElement>("input[type=date]")[1], "2026-01-03");
    await view.click(byText(view.host, t("clearFilters")));
    await view.unmount();
  });

  it("walks the tabs: connections with the sessions of each app, devices, system with its categories and settings", async () => {
    fakeServer(routes());
    const view = await mount(createElement(HistoryView, { origin: O, t }));
    await view.click(byText(view.host, t("his_tab_connections")));
    await view.settle();
    expect(view.host.querySelector(".history-clients-table")).not.toBeNull();
    expect(view.host.textContent).toContain("10.0.0.2");
    await view.click(view.host.querySelector(".history-check input"));
    for (const button of subFilters(view.host)) await view.click(button);
    await view.click(byText(view.host, t("his_tab_system")));
    for (const button of subFilters(view.host)) await view.click(button);
    await view.click(byText(view.host, t("his_tab_devices")));
    await view.click(byText(view.host, t("his_tab_alarms")));
    await view.click(byText(view.host, t("his_tab_settings")));
    await view.unmount();
  });

  it("says the history could not be read, and the connections too, when the server refuses", async () => {
    fakeServer({});
    const view = await mount(createElement(HistoryView, { origin: O, t }));
    expect(view.host.textContent).toContain(t("historyFailed"));
    await view.click(byText(view.host, t("his_tab_connections")));
    await view.settle();
    expect(view.host.textContent).toContain(t("cl_load_failed"));
    await view.unmount();
  });

  it("shows the empty notice, with and without a filter", async () => {
    fakeServer(routes({ "GET /api/v1/history": { events: [], next_before: null } }));
    const view = await mount(createElement(HistoryView, { origin: O, t }));
    expect(view.host.textContent).toContain(t("noEvents"));
    await view.click(byText(view.host, t("event_alert")));
    expect(view.host.textContent).toContain(t("noEventsFiltered"));
    await view.unmount();
  });

  it("loads the next page when there are more events than a page", async () => {
    const page = Array.from({ length: 100 }, (_, index) => ({ id: 500 - index, at: "2026-01-02T10:00:00Z", type: "mode", mode: "armed" }));
    const calls = fakeServer(routes({ "GET /api/v1/history": { events: page, next_before: 401 } }));
    const view = await mount(createElement(HistoryView, { origin: O, t }));
    await view.click(view.host.querySelector(".history-more"));
    expect(calls.filter(call => call.path === "/api/v1/history").length).toBeGreaterThanOrEqual(2);
    await view.unmount();
  });

  it("pauses and resumes the live refresh, and exports what is shown as CSV and as JSON", async () => {
    fakeServer(routes());
    const view = await mount(createElement(HistoryView, { origin: O, t }));
    await view.click(byText(view.host, t("liveOn")));
    expect(byText(view.host, t("livePaused"))).not.toBeNull();
    await view.click(byText(view.host, t("livePaused")));
    await view.click(byText(view.host, "CSV"));
    await view.click(byText(view.host, "JSON"));
    expect(downloads.map(item => item.name.split(".").pop())).toEqual(["csv", "json"]);
    expect(downloads[1].body).toContain("radar1");
    expect(view.host.textContent).toContain(t("exported"));
    await view.unmount();
  });

  it("says the export failed when the server stops answering, and the notice can be closed", async () => {
    let fail = false;
    fakeServer(routes({ "GET /api/v1/history": () => { if (fail) throw new Error("down"); return { events, next_before: null }; } }));
    const view = await mount(createElement(HistoryView, { origin: O, t }));
    fail = true;
    await view.click(byText(view.host, "CSV"));
    expect(view.host.textContent).toContain(t("exportFailed"));
    await view.click(view.host.querySelector(".history-notice button"));
    expect(view.host.querySelector(".history-notice")).toBeNull();
    await view.unmount();
  });

  it("asks before it deletes, can export first or cancel, and deletes with the explicit scope", async () => {
    const calls = fakeServer(routes());
    const view = await mount(createElement(HistoryView, { origin: O, t }));
    await view.click(view.host.querySelector(".history-menu .danger-button"));
    await view.click(view.host.querySelectorAll<HTMLElement>(".history-menu [role=menuitem]")[0]);
    expect(view.host.querySelector("[role=alertdialog]")).not.toBeNull();
    await view.click(byText(view.host, t("exportFirst")));
    expect(downloads).toHaveLength(1);
    await view.click(byText(view.host, t("cancel")));
    expect(view.host.querySelector("[role=alertdialog]")).toBeNull();
    await view.click(view.host.querySelector(".history-menu .danger-button"));
    await view.click(view.host.querySelector(".history-menu .danger[role=menuitem]"));
    await view.click(byText(view.host, t("deleteNow")));
    expect(calls.find(call => call.method === "DELETE")?.path).toBe("/api/v1/history");
    expect(view.host.textContent).toContain(t("deleted"));
    await view.unmount();
  });

  it("says the deletion failed", async () => {
    fakeServer(routes({ "DELETE /api/v1/history": undefined }));
    const view = await mount(createElement(HistoryView, { origin: O, t }));
    await view.click(view.host.querySelector(".history-menu .danger-button"));
    await view.click(view.host.querySelector(".history-menu .danger[role=menuitem]"));
    await view.click(byText(view.host, t("deleteNow")));
    expect(view.host.textContent).toContain(t("deleteFailed"));
    await view.unmount();
  });

  it("edits the alert rules: waiting time, a bad zone refused, a good one added, one removed, and saves", async () => {
    const calls = fakeServer(routes());
    const view = await mount(createElement(HistoryView, { origin: O, t }));
    await view.click(byText(view.host, t("rules")));
    expect(view.host.textContent).toContain("Door");
    expect((byText(view.host, t("saveRules")) as HTMLButtonElement).disabled).toBe(true);
    await typeInto(view.host.querySelector<HTMLInputElement>("input[type=number]"), "5");
    expect((byText(view.host, t("saveRules")) as HTMLButtonElement).disabled).toBe(false);
    await view.click(byText(view.host, t("addZone")));
    expect(view.host.textContent).toContain(t("zoneInvalid"));
    const values = ["Gate", "", "", "-1000", "1000", "500", "2500"];
    for (let index = 0; index < values.length; index += 1) await typeInto(view.host.querySelectorAll<HTMLInputElement>(".zone-form input")[index], values[index]);
    await view.click(byText(view.host, t("addZone")));
    expect(view.host.querySelectorAll(".zone-list li")).toHaveLength(2);
    await view.click(byText(view.host, t("removeZone")));
    expect(view.host.querySelectorAll(".zone-list li")).toHaveLength(1);
    await view.click(byText(view.host, t("saveRules")));
    expect((calls.find(call => call.method === "PUT")?.body as { dwell_ms: number }).dwell_ms).toBe(5000);
    expect(view.host.textContent).toContain(t("rulesSaved"));
    await view.unmount();
  });

  it("says the rules could not be saved", async () => {
    fakeServer(routes({ "PUT /api/v1/rules": undefined }));
    const view = await mount(createElement(HistoryView, { origin: O, t }));
    await view.click(byText(view.host, t("rules")));
    await typeInto(view.host.querySelector<HTMLInputElement>("input[type=number]"), "9");
    await view.click(byText(view.host, t("saveRules")));
    expect(view.host.textContent).toContain(t("rulesFailed"));
    await view.unmount();
  });

  it("draws a zone on the plane with the pointer", async () => {
    fakeServer(routes());
    const view = await mount(createElement(HistoryView, { origin: O, t }));
    await view.click(byText(view.host, t("rules")));
    const svg = view.host.querySelector("svg.zone-canvas, .zone-canvas svg") as SVGSVGElement;
    expect(svg).not.toBeNull();
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0, toJSON: () => ({}) });
    (svg as unknown as { setPointerCapture: () => void }).setPointerCapture = () => undefined;
    const fire = async (type: string, x: number, y: number) => { await act(async () => { svg.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y })); }); };
    await fire("pointerdown", 100, 50); await fire("pointermove", 200, 150); await fire("pointerup", 200, 150);
    await fire("pointerdown", 10, 10); await fire("pointercancel", 10, 10);
    await view.unmount();
  });

  it("says the rules could not be read, and shows the reports tab to those who may see it", async () => {
    fakeServer(routes({ "GET /api/v1/rules": undefined }));
    const view = await mount(createElement(HistoryView, { origin: O, t, reports: { language: "en", cameras: [{ id: "c1", name: "Gate" }] } }));
    expect(byText(view.host, t("rep_tab"))).not.toBeNull();
    await view.click(byText(view.host, t("rules")));
    expect(view.host.textContent).toContain(t("rulesFailed"));
    await view.click(byText(view.host, t("rep_tab")));
    await view.unmount();
  });

  it("uses every control of the log once without breaking", async () => {
    fakeServer(routes());
    const view = await mount(createElement(HistoryView, { origin: O, t }));
    expect(await pokeAll(view.host)).toBeGreaterThan(10);
    await view.unmount();
  });
});
