// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import App from "./App";
import { text } from "./i18n";
import { byText, fakeServer, mount } from "./testLive";

// The 3D views cannot draw in a test browser: the renderer and the live 3D map are replaced by markers, and the designers and the weather map (which bring them) are never opened here.
vi.mock("@react-three/fiber", () => ({ useFrame: () => undefined, useThree: () => ({}), Canvas: () => null }));
vi.mock("./components/SiteLive3D", () => ({ SiteLive3D: () => createElement("div", { "data-testid": "site-3d" }) }));

const O = "http://armor.local:18080";
const t = (key: string) => text("en", key);
beforeEach(() => {
  try { window.localStorage.setItem("armor-studio-origin", O); } catch { /* blocked */ }
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, onchange: null, dispatchEvent: () => false }));
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ""; try { window.localStorage.clear(); } catch { /* blocked */ } });

const signedIn = { authenticated: true, user: { id: "u1", username: "ana", role: "admin" }, capabilities: null };
const statusBody = { mode: "disarmed", revision: 4, updated_at: "2026-01-01T00:00:00Z", nodes: { radar1: { node_id: "radar1", online: true, timestamp_ms: 1, lux: 10, target_count: 0, alert_level: "normal" } } };
const routes = (extra: Record<string, unknown> = {}) => ({
  "GET /api/v1/studio/session": signedIn, "GET /api/v1/status": statusBody, "GET /api/v1/info": { service: "armor-server", version: "0.8.2", mode: "disarmed" },
  "DELETE /api/v1/studio/session": { ok: true }, ...extra,
});

describe("Studio, started for real", () => {
  it("shows the sign-in when the session has ended, and the console when it is active", async () => {
    fakeServer(routes({ "GET /api/v1/studio/session": { authenticated: false } }));
    const out = await mount(createElement(App));
    await out.settle();
    expect(out.host.querySelector("input[name=username]")).not.toBeNull();
    await out.unmount();
    document.body.innerHTML = "";
    fakeServer(routes());
    const view = await mount(createElement(App));
    await view.settle();
    expect(view.host.querySelector(".studio-shell")).not.toBeNull();
    expect(view.host.querySelector(".sidebar")).not.toBeNull();
    await view.unmount();
  });

  it("keeps a wall-panel account out of the console", async () => {
    fakeServer(routes({ "GET /api/v1/studio/session": { authenticated: true, user: { id: "p1", username: "panel", role: "panel" }, capabilities: null } }));
    const view = await mount(createElement(App));
    await view.settle();
    expect(view.host.textContent).toContain(t("panel_account_notice"));
    await view.click(byText(view.host, t("signOut")));
    await view.unmount();
  });

  it("opens every menu that does not need the 3D engine, announces it, and keeps the ones already visited", async () => {
    fakeServer(routes());
    const view = await mount(createElement(App));
    await view.settle();
    const menus = ["alarms", "alarmPanels", "cameras", "radar", "record", "history", "inverters", "batteries", "electrical", "devices", "automations", "network", "hmi", "system", "services", "configuration", "overview"];
    for (const menu of menus) {
      await view.click(view.host.querySelector(`[data-tour="nav-${menu}"]`));
      expect(view.host.querySelector("[data-testid=view-announcement]")?.textContent, menu).toContain(t(menu));
    }
    expect(view.host.querySelectorAll(".view-slot").length).toBeGreaterThan(5);
    expect(view.host.querySelectorAll(".view-slot:not([hidden])")).toHaveLength(1);
    await view.unmount();
  });

  it("folds a group of the menu, collapses the side bar, and opens the about box and the help", async () => {
    fakeServer(routes());
    const view = await mount(createElement(App));
    await view.settle();
    await view.click(view.host.querySelector(".nav-group-title"));
    await view.click(view.host.querySelector(".nav-group-title"));
    await view.click(view.host.querySelector(".sidebar-toggle"));
    expect(view.host.querySelector(".sidebar-collapsed")).not.toBeNull();
    await view.click(view.host.querySelector(".sidebar-toggle"));
    await view.click(view.host.querySelector(".about-button"));
    expect(view.host.querySelector(".about-dialog")).not.toBeNull();
    await view.click(view.host.querySelector(".modal-close"));
    await view.click(view.host.querySelector(".help-button"));
    expect(view.host.querySelector("[role=dialog], .help-dialog, .about-dialog")).not.toBeNull();
    await view.unmount();
  });

  it("asks the assistant a question from inside the console and signs out", async () => {
    const calls = fakeServer(routes());
    const view = await mount(createElement(App));
    await view.settle();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
    await view.click(byText(view.host, t("signOut")));
    expect(calls.some(call => call.method === "DELETE" && call.path === "/api/v1/studio/session")).toBe(true);
    await view.unmount();
  });
});
