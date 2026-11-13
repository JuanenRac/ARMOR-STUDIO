// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { sinceFromLocal, timelineQuery } from "./api";
import { RETENTION_LIMITS, retentionValue } from "./SecurityPanel";
import { text, locales } from "./i18n";
import { fakeServer, mount } from "./testLive";
import { TimelinePanel } from "./views/TimelinePanel";

const O = "http://armor.local:18080/";
const t = (key: string) => text("en", key);
const cameras = [{ id: "cam-gate", name: "Gate" }, { id: "cam-back", name: "Back" }];
const item = (id: string, over: Record<string, unknown> = {}) => ({ id, at: "2030-01-10T12:00:00.000Z", camera_id: "cam-gate", level: "alert", zone_id: "drive", zone_name: "Driveway", label: "person", alarm_id: "alarm-1", snapshot_id: "photo-1.jpg", clip_id: null, ...over });
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ""; });

describe("the query of the timeline", () => {
  it("writes only the filters that are set, the way the server reads them", () => {
    expect(timelineQuery({})).toBe("");
    expect(timelineQuery({ level: "alert", cameraId: "cam-gate", limit: 50, since: "2030-01-10T12:00:00.000Z" })).toBe("?since=2030-01-10T12%3A00%3A00.000Z&level=alert&camera_id=cam-gate&limit=50");
    expect(timelineQuery({ cameraId: "" })).toBe("");
  });
  it("turns a typed local date and time into an instant, and an unfinished one into nothing", () => {
    expect(sinceFromLocal("2030-01-10T12:00")).toMatch(/^2030-01-10T\d{2}:\d{2}:00\.000Z$/);
    for (const bad of ["", "2030-01-10", "2030-13-45T00:00", "yesterday"]) expect(sinceFromLocal(bad), bad).toBeUndefined();
  });
});

describe("the days of the timeline in the security options", () => {
  it("are a whole number from 1 to 3650", () => {
    expect(RETENTION_LIMITS["vision.timeline_days"]).toEqual({ min: 1, max: 3650, id: "timeline" });
    expect(retentionValue("vision.timeline_days", "30")).toBe(30);
    for (const bad of ["0", "3651", "1.5", "", "abc"]) expect(retentionValue("vision.timeline_days", bad), bad).toBeUndefined();
  });
  it("and every phrase of the timeline are translated in the eight languages", () => {
    const ids = ["tl_tab", "tl_title", "tl_help", "tl_since", "tl_level", "tl_level_all", "tl_level_alert", "tl_level_detection", "tl_camera", "tl_camera_all", "tl_refresh", "tl_delete_all", "tl_delete_one", "tl_delete_one_ask", "tl_delete_all_ask", "tl_deleted", "tl_off", "tl_empty", "tl_alarm", "tl_no_alarm", "tl_photo", "tl_video", "tl_error", "sec_opt_vtimeline", "sec_opt_vtimeline_help", "sec_opt_vtimeline_warn", "sec_ret_timeline"];
    for (const id of ids) {
      const words = new Set<string>();
      for (const locale of locales) { const phrase = text(locale, id); expect(phrase.trim().length, `${locale} ${id}`).toBeGreaterThan(1); expect(phrase, `${locale} ${id}`).not.toBe(id); words.add(phrase); }
      if (!["tl_photo", "tl_alarm"].includes(id)) expect(words.size, `${id} is translated, not repeated`).toBeGreaterThan(4);
    }
    for (const locale of locales) { expect(text(locale, "tl_deleted")).toContain("{n}"); expect(text(locale, "tl_empty")).toContain("{days}"); }
  });
});

describe("the review panel", () => {
  it("says the timeline is off and lists nothing while the option is off", async () => {
    fakeServer({ "GET /api/v1/vision/timeline": { enabled: false, days: 30, items: [] } });
    const view = await mount(createElement(TimelinePanel, { t, origin: O, cameras, canDelete: true }));
    expect(view.host.querySelector("[data-testid=timeline-off]")).not.toBeNull();
    expect(view.host.querySelector("[data-testid=timeline-list]")).toBeNull();
    expect(view.host.querySelector("[data-testid=timeline-delete-all]")).toBeNull();
    await view.unmount();
  });

  it("lists the entries with the camera name, the alarm and the evidence, and says when there are none", async () => {
    fakeServer({ "GET /api/v1/vision/timeline": { enabled: true, days: 30, items: [item("vt-aaaaaaaa"), item("vt-bbbbbbbb", { level: "detection", camera_id: "cam-back", alarm_id: null, snapshot_id: null, clip_id: "clip-2.mp4" })] } });
    const view = await mount(createElement(TimelinePanel, { t, origin: O, cameras, canDelete: false }));
    const rows = [...view.host.querySelectorAll("[data-testid=timeline-item]")];
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent).toContain("Gate");
    expect(rows[0]!.textContent).toContain("alarm-1");
    expect(rows[0]!.textContent).toContain("photo-1.jpg");
    expect(rows[1]!.textContent).toContain("Back");
    expect(rows[1]!.textContent).toContain(t("tl_no_alarm"));
    expect(rows[1]!.textContent).toContain("clip-2.mp4");
    expect(view.host.querySelector("button.danger-button")).toBeNull();
    await view.unmount();
    fakeServer({ "GET /api/v1/vision/timeline": { enabled: true, days: 7, items: [] } });
    const empty = await mount(createElement(TimelinePanel, { t, origin: O, cameras, canDelete: true }));
    expect(empty.host.querySelector("[data-testid=timeline-empty]")?.textContent).toContain("7");
    await empty.unmount();
  });

  it("asks the server again with the filter chosen", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => { urls.push(String(url)); return new Response(JSON.stringify({ enabled: true, days: 30, items: [] }), { status: 200, headers: { "Content-Type": "application/json" } }); }));
    const view = await mount(createElement(TimelinePanel, { t, origin: O, cameras, canDelete: true }));
    const level = view.host.querySelector<HTMLSelectElement>("[data-testid=timeline-level]")!;
    const { act } = await import("react");
    await act(async () => { level.value = "alert"; level.dispatchEvent(new Event("change", { bubbles: true })); });
    await view.settle();
    expect(urls.some(url => url.includes("level=alert"))).toBe(true);
    await view.unmount();
  });

  it("deletes one entry or all of them for an administrator, after asking", async () => {
    vi.stubGlobal("confirm", () => true);
    window.confirm = () => true;
    const calls = fakeServer({ "GET /api/v1/vision/timeline": { enabled: true, days: 30, items: [item("vt-aaaaaaaa")] }, "DELETE /api/v1/vision/timeline/vt-aaaaaaaa": { deleted: 1 }, "DELETE /api/v1/vision/timeline": { deleted: 4 } });
    const view = await mount(createElement(TimelinePanel, { t, origin: O, cameras, canDelete: true }));
    await view.click(view.host.querySelector("li button.danger-button"));
    expect(calls.some(call => call.method === "DELETE" && call.path === "/api/v1/vision/timeline/vt-aaaaaaaa")).toBe(true);
    expect(view.host.textContent).toContain(t("tl_deleted").replace("{n}", "1"));
    await view.click(view.host.querySelector("[data-testid=timeline-delete-all]"));
    expect(calls.some(call => call.method === "DELETE" && call.path === "/api/v1/vision/timeline")).toBe(true);
    await view.unmount();
  });

  it("does not delete when the person says no", async () => {
    window.confirm = () => false;
    const calls = fakeServer({ "GET /api/v1/vision/timeline": { enabled: true, days: 30, items: [item("vt-aaaaaaaa")] } });
    const view = await mount(createElement(TimelinePanel, { t, origin: O, cameras, canDelete: true }));
    await view.click(view.host.querySelector("[data-testid=timeline-delete-all]"));
    expect(calls.filter(call => call.method === "DELETE")).toHaveLength(0);
    await view.unmount();
  });

  it("explains a refusal in words and shows no list", async () => {
    fakeServer({});
    const view = await mount(createElement(TimelinePanel, { t, origin: O, cameras, canDelete: true }));
    expect(view.host.querySelector("[role=status]")?.textContent?.length).toBeGreaterThan(0);
    expect(view.host.querySelector("[data-testid=timeline-item]")).toBeNull();
    await view.unmount();
  });
});
