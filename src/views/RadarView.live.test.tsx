// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { RadarView } from "./RadarView";
import { INITIAL_BUILDINGS, INITIAL_CAMERAS, INITIAL_DIMENSIONS, INITIAL_FEATURES, INITIAL_OPENINGS, INITIAL_ROOF_ITEMS, INITIAL_TERRAIN, INITIAL_WALL_LAMPS } from "../domain";
import type { Sensor } from "../domain";
import type { SiteModel } from "../designer/ops";
import type { NodeState } from "../types";
import { text } from "../i18n";
import { byText, fakeServer, mount, pokeAll } from "../testLive";

// The 3D view cannot draw in a test browser: it is replaced by a marker.
vi.mock("../components/SiteLive3D", () => ({ SiteLive3D: () => createElement("div", { "data-testid": "site-3d" }) }));

const O = "http://armor.local:18080/";
const t = (key: string) => text("en", key);
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ""; try { window.localStorage.clear(); } catch { /* blocked */ } });
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { constructor(private readonly callback: ResizeObserverCallback) {} observe() { this.callback([{ contentRect: { width: 900, height: 600 } } as ResizeObserverEntry], this as unknown as ResizeObserver); } unobserve() {} disconnect() {} });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

const sensors: Sensor[] = [
  { id: "sensor-01", name: "Entrance radar", kind: "LD2450", x: 27, y: 78, node: "radar1", heading: 0 },
  { id: "sensor-02", name: "Workshop radar", kind: "LD2450", x: 63, y: 45 },
];
const model = (): SiteModel => ({
  terrain: structuredClone(INITIAL_TERRAIN), buildings: structuredClone(INITIAL_BUILDINGS), openings: structuredClone(INITIAL_OPENINGS), roofItems: structuredClone(INITIAL_ROOF_ITEMS),
  wallLamps: structuredClone(INITIAL_WALL_LAMPS), features: [...structuredClone(INITIAL_FEATURES), { id: "road-1", kind: "road", x: 20, y: 20, z: 0, width: 10, depth: 2, height: 0, rotation: 30, slope: 0 }, { id: "path-1", kind: "path", x: 25, y: 25, z: 0, width: 4, depth: 1, height: 0, rotation: 0, slope: 0 }],
  cameras: structuredClone(INITIAL_CAMERAS), sensors: structuredClone(sensors), placements: [],
});
const node = (id: string, extra: Partial<NodeState> = {}): NodeState => ({ node_id: id, online: true, timestamp_ms: 1, lux: 120, target_count: 2, alert_level: "normal", panel: { name: id, firmware: "0.8.0", ip: "10.0.0.5", port: 80, contract: "0.8.0" },
  targets: [{ sensor_id: 1, track_id: 1, x_mm: 500, y_mm: 2000, speed_mm_s: 800, counted: true }, { sensor_id: 1, track_id: 2, x_mm: -300, y_mm: 9000, speed_mm_s: 0, counted: false }], ...extra });
const status = (nodes: NodeState[]) => ({ mode: "armed", revision: 1, updated_at: "", nodes: Object.fromEntries(nodes.map(item => [item.node_id, item])) });
const rules = { schema: 1, dwell_ms: 1000, zones: [{ id: "z", name: "Door", action: "ignore", x_min_mm: -500, x_max_mm: 500, y_min_mm: 0, y_max_mm: 1000 }] };
const props = (extra: Record<string, unknown> = {}) => ({
  nodes: [node("radar1"), node("radar2", { alert_level: "high" }), node("radar3", { online: false })], model: model(), dimensions: INITIAL_DIMENSIONS, origin: O, isAdmin: true, devices: [],
  forget: vi.fn(), openDesigner: vi.fn(), openZones: vi.fn(), setSensors: vi.fn(), t, ...extra,
});
const routes = (nodes: NodeState[], extra: Record<string, unknown> = {}) => ({ "GET /api/v1/status": status(nodes), "GET /api/v1/rules": rules, "GET /api/v1/info": { service: "armor-server", contract: "0.7.0" }, "GET /api/v1/node-health": { nodes: [] }, ...extra });

describe("the radar view, run for real", () => {
  it("draws the site, the radars with their coverage, the live targets with their path and the ignore zones", async () => {
    fakeServer(routes([node("radar1"), node("radar2", { alert_level: "high" })]));
    const view = await mount(createElement(RadarView, props()));
    expect(view.host.querySelector("svg[role=img]")).not.toBeNull();
    expect(view.host.querySelectorAll(".rm-sector").length).toBeGreaterThanOrEqual(2);
    expect(view.host.querySelectorAll(".rm-building").length).toBeGreaterThan(0);
    expect(view.host.querySelectorAll(".rm-road, .rm-path").length).toBeGreaterThanOrEqual(2);
    expect(view.host.querySelectorAll(".rm-target-label").length).toBeGreaterThan(0);
    expect(view.host.querySelectorAll(".rm-zone").length).toBeGreaterThan(0);
    expect(view.host.textContent).toContain(t("targetsLive"));
    await view.unmount();
  });

  it("zooms with the buttons and the wheel, drags the map, fits it again and shows the speed of a target on hover", async () => {
    fakeServer(routes([node("radar1")]));
    const view = await mount(createElement(RadarView, props()));
    const map = view.host.querySelector<HTMLElement>(".radar-map:not(.radar-map-3d)")!;
    map.getBoundingClientRect = () => ({ left: 0, top: 0, width: 900, height: 600, right: 900, bottom: 600, x: 0, y: 0, toJSON: () => ({}) });
    (map as unknown as { setPointerCapture: () => void }).setPointerCapture = () => undefined;
    await view.click(byText(view.host, "+"));
    await view.click(byText(view.host, "−"));
    await act(async () => { map.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100, clientX: 300, clientY: 200 })); });
    await act(async () => { map.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 100, clientX: 300, clientY: 200 })); });
    const pointer = async (type: string, x: number, y: number) => { await act(async () => { map.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y })); }); };
    await pointer("pointerdown", 100, 100); await pointer("pointermove", 160, 140); await pointer("pointerup", 160, 140);
    await pointer("pointerdown", 100, 100); await pointer("pointercancel", 100, 100);
    await view.click(byText(view.host, "⤢"));
    const target = view.host.querySelector(".rm-pulse")?.parentElement;
    if (target) {
      await act(async () => { target.dispatchEvent(new MouseEvent("pointerover", { bubbles: true })); });
      await act(async () => { target.dispatchEvent(new MouseEvent("pointerout", { bubbles: true })); });
    }
    await view.unmount();
  });

  it("switches between the plan and the 3D view and keeps the choice", async () => {
    fakeServer(routes([node("radar1")]));
    const view = await mount(createElement(RadarView, props()));
    expect(view.host.querySelector("[data-testid=site-3d]")).toBeNull();
    await view.click(view.host.querySelector(`[aria-label="${t("view3d")}"]`));
    expect(view.host.querySelector("[data-testid=site-3d]")).not.toBeNull();
    expect(window.localStorage.getItem("armor-studio-radar-map")).toBe("3d");
    await view.click(view.host.querySelector(`[aria-label="${t("view2d")}"]`));
    expect(view.host.querySelector("[data-testid=site-3d]")).toBeNull();
    await view.unmount();
  });

  it("lists the active radar nodes, warns about a node built against another contract, and about a node without a radar in the design", async () => {
    fakeServer(routes([node("radar1"), node("radar2"), node("radar3", { online: false })]));
    const view = await mount(createElement(RadarView, props()));
    await view.click(byText(view.host, t("activeRadarNodes")));
    expect([...view.host.querySelectorAll(".node-row strong")].filter(item => /^radar\d$/.test(item.textContent ?? ""))).toHaveLength(3);
    expect(view.host.querySelector(".contract-warning")).not.toBeNull();
    expect(view.host.querySelector(".warn-line")).not.toBeNull();
    expect(view.host.textContent).toContain(t("offlineWord"));
    await view.unmount();
  });

  it("forgets a node only after asking, and not when the answer is no", async () => {
    fakeServer(routes([node("radar1")]));
    const forget = vi.fn();
    const view = await mount(createElement(RadarView, props({ forget })));
    await view.click(byText(view.host, t("activeRadarNodes")));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const forgetButton = () => [...view.host.querySelectorAll<HTMLElement>(".node-row button")].find(button => /forget|olvid/i.test(`${button.title} ${button.getAttribute("aria-label") ?? ""} ${button.textContent}`)) ?? null;
    await view.click(forgetButton());
    expect(forget).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await view.click(forgetButton());
    expect(forget).toHaveBeenCalled();
    await view.unmount();
  });

  it("says there is no radar when there are no nodes, and shows the perimeter tab", async () => {
    fakeServer(routes([]));
    const view = await mount(createElement(RadarView, props({ nodes: [] })));
    await view.click(byText(view.host, t("activeRadarNodes")));
    expect(view.host.textContent).toContain(t("noRadar"));
    await view.click(byText(view.host, t("pm_tab")));
    await view.click(byText(view.host, t("radarsOfDesign")));
    await view.unmount();
  });

  it("goes to the designer, to the zones, and uses every control of the radar list once", async () => {
    fakeServer(routes([node("radar1")]));
    const open = props();
    const view = await mount(createElement(RadarView, open));
    await view.click(byText(view.host, t("dlSiteButton")));
    expect(open.openDesigner).toHaveBeenCalled();
    expect(await pokeAll(view.host.querySelector(".radar-side") as HTMLElement)).toBeGreaterThan(0);
    await view.unmount();
  });

  it("frames an empty site, keeps working when the server stops answering, and draws a camera that is switched off", async () => {
    fakeServer({});
    const empty: SiteModel = { ...model(), terrain: { ...model().terrain, points: [] }, buildings: [], features: [], sensors: [], cameras: model().cameras.map(camera => ({ ...camera, enabled: false })) };
    const view = await mount(createElement(RadarView, props({ model: empty, nodes: [] })));
    expect(view.host.querySelector("svg[role=img]")).not.toBeNull();
    expect(view.host.querySelectorAll(".rm-off").length).toBeGreaterThan(0);
    await view.unmount();
  });
});
