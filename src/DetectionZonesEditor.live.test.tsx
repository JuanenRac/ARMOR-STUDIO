// @vitest-environment jsdom
import { act, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DetectionZonesEditor } from "./DetectionZonesEditor";
import { text } from "./i18n";
import { fakeServer, mount, type Mounted } from "./testLive";

const O = "http://armor.local:18080/";
const t = (key: string) => text("en", key);
const ZONES = "/api/v1/cameras/cam-1/detection-zones";
const square = [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]];
const zone = (id: string, kind = "alert") => ({ id, name: `Zone ${id}`, points: square, kind, labels: ["person"], min_frames: 2, min_seconds: 1 });

beforeEach(() => {
  // jsdom has no layout: the picture is a box of 100 x 100 pixels at the corner of the page, so a click at (x, y) is the point (x / 100, y / 100).
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ""; });

const open = async (routes: Record<string, unknown>, isAdmin = true) => {
  const calls = fakeServer(routes);
  const view = await mount(createElement(DetectionZonesEditor, { t, origin: O, cameraId: "cam-1", isAdmin }));
  return { calls, view };
};
const clickAt = async (view: Mounted, x: number, y: number) => {
  const picture = view.host.querySelector(".iz-picture");
  await act(async () => { picture?.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: x, clientY: y })); });
  await view.settle();
};
const byId = (view: Mounted, id: string) => view.host.querySelector<HTMLElement>(`[data-testid="${id}"]`);
const echo = (body: unknown) => ({ camera_id: "cam-1", ...(body as object) });

describe("the detection zones of a camera, run for real", () => {
  it("lets an administrator click the corners of a zone, close it, and save it with the points as fractions of the picture", async () => {
    const { calls, view } = await open({ [`GET ${ZONES}`]: { camera_id: "cam-1", zones: [], profiles: {} }, [`PUT ${ZONES}`]: echo });
    expect(view.host.textContent).toContain(t("dz_none"));
    await clickAt(view, 10, 10);
    await clickAt(view, 50, 10);
    expect(byId(view, "dz-close")?.hasAttribute("disabled")).toBe(true);
    await clickAt(view, 50, 50);
    expect(view.host.textContent).toContain("(3 ");
    expect(byId(view, "dz-close")?.hasAttribute("disabled")).toBe(false);
    await view.click(byId(view, "dz-close"));
    expect(byId(view, "dz-zone-zone1")?.textContent).toContain("3");
    expect(view.host.textContent).not.toContain(t("dz_none"));
    await view.click(byId(view, "dz-save"));
    const put = calls.find(call => call.method === "PUT");
    expect(put?.path).toBe(ZONES);
    expect((put?.body as { zones: Array<{ id: string; points: number[][]; kind: string }> }).zones).toMatchObject([{ id: "zone1", points: [[0.1, 0.1], [0.5, 0.1], [0.5, 0.5]], kind: "alert" }]);
    expect(view.host.textContent).toContain(t("dz_saved"));
    await view.unmount();
  });

  it("does not close a zone that is flat or has too few corners, and takes back the last corner", async () => {
    const { view } = await open({ [`GET ${ZONES}`]: { camera_id: "cam-1", zones: [], profiles: {} } });
    for (const [x, y] of [[10, 10], [50, 50], [90, 90]]) await clickAt(view, x, y);
    expect(byId(view, "dz-close")?.hasAttribute("disabled")).toBe(true);
    const undo = [...view.host.querySelectorAll("button")].find(button => button.textContent === t("dz_undo"));
    await view.click(undo ?? null);
    expect(view.host.textContent).toContain("(2 ");
    await view.click(undo ?? null);
    await view.click([...view.host.querySelectorAll("button")].find(button => button.textContent === t("dz_undo")) ?? null);
    expect(byId(view, "dz-close")).toBeNull();
    await view.unmount();
  });

  it("keeps the corners inside the picture and stops at twelve", async () => {
    const { calls, view } = await open({ [`GET ${ZONES}`]: { camera_id: "cam-1", zones: [], profiles: {} }, [`PUT ${ZONES}`]: echo });
    await clickAt(view, -50, 300);
    await clickAt(view, 400, -20);
    await clickAt(view, 0, 0);
    await view.click(byId(view, "dz-close"));
    await view.click(byId(view, "dz-save"));
    const body = calls.find(call => call.method === "PUT")?.body as { zones: Array<{ points: number[][] }> };
    expect(body.zones[0].points).toEqual([[0, 1], [1, 0], [0, 0]]);
    for (let i = 0; i < 14; i += 1) await clickAt(view, 10 + i * 5, 10 + (i % 2) * 40);
    expect(view.host.textContent).toContain("(12 ");
    await view.unmount();
  });

  it("shows a viewer the zones and lets nothing be changed or saved", async () => {
    const { calls, view } = await open({ [`GET ${ZONES}`]: { camera_id: "cam-1", zones: [zone("a")], profiles: { home: { watch: ["a"], sensitivity: "low", notify: false } } } }, false);
    expect(byId(view, "dz-zone-a")).not.toBeNull();
    expect(byId(view, "dz-save")).toBeNull();
    expect(view.host.textContent).not.toContain(t("dz_draw"));
    expect([...view.host.querySelectorAll("input, select")].every(field => field.hasAttribute("disabled"))).toBe(true);
    await clickAt(view, 10, 10);
    expect(view.host.textContent).not.toContain("(1 ");
    expect(calls.filter(call => call.method === "PUT" || call.method === "DELETE")).toEqual([]);
    await view.unmount();
  });

  it("takes a removed zone out of every profile and saves the rest", async () => {
    const start = { camera_id: "cam-1", zones: [zone("a"), zone("b", "detection")], profiles: { home: { watch: ["a", "b"], sensitivity: "high", notify: true }, night: { watch: ["a"], sensitivity: "low", notify: false } } };
    const { calls, view } = await open({ [`GET ${ZONES}`]: start, [`PUT ${ZONES}`]: echo });
    const remove = [...(byId(view, "dz-zone-a")?.querySelectorAll("button") ?? [])].find(button => button.textContent === t("dz_remove"));
    await view.click(remove ?? null);
    expect(byId(view, "dz-zone-a")).toBeNull();
    await view.click(byId(view, "dz-save"));
    const body = calls.find(call => call.method === "PUT")?.body as { zones: Array<{ id: string }>; profiles: Record<string, { watch: string[] }> };
    expect(body.zones.map(item => item.id)).toEqual(["b"]);
    expect(body.profiles.home.watch).toEqual(["b"]);
    expect(body.profiles.night.watch).toEqual([]);
    await view.unmount();
  });

  it("clears everything with one button and says so when the server refuses the save", async () => {
    const { view } = await open({ [`GET ${ZONES}`]: { camera_id: "cam-1", zones: [zone("a")], profiles: {} } });
    await view.click([...view.host.querySelectorAll("button")].find(button => button.textContent === t("dz_clear")) ?? null);
    expect(view.host.textContent).toContain(t("dz_none"));
    await view.click(byId(view, "dz-save"));
    expect(view.host.querySelector('[role="alert"]')?.textContent).toBe(t("dz_error"));
    await view.unmount();
  });

  it("starts from no zones when the server cannot say, and draws a zone as many as a camera may have only up to sixteen", async () => {
    const { view } = await open({});
    expect(view.host.textContent).toContain(t("dz_none"));
    await view.unmount();
    const sixteen = Array.from({ length: 16 }, (_, index) => zone(`z${index}`));
    const full = await open({ [`GET ${ZONES}`]: { camera_id: "cam-1", zones: sixteen, profiles: {} } });
    await clickAt(full.view, 10, 10);
    expect(full.view.host.textContent).not.toContain("(1 ");
    await full.view.unmount();
  });
});
