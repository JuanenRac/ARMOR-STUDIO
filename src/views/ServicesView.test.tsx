// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { text } from "../i18n";
import { SessionUserContext } from "../sessionContext";
import { fakeServer, mount, pokeAll } from "../testLive";
import { actionsFor, agentIdOf, familyKey, isActive, ServicesView, toneOf } from "./ServicesView";

const O = "http://armor.local:18080/";
const t = (key: string) => text("en", key);
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ""; });

const service = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: id, family: "Core", description: `${id} program`, kind: "systemd", state: "running", unit: `armor-${id}.service`, enabled: true, pid: 12, since_ms: Date.now() - 90_000, memory_bytes: 5e6, restarts: 2, port: 18080, version: "0.5.2", ...extra });
const overview = (extra: Record<string, unknown> = {}) => ({ time_ms: Date.now(), systemd: true, services: [service("server"), service("voice", { state: "stopped", family: "Voice" }), service("vision", { state: "failed", family: "Voice" }), { ...service("radar-1", { kind: "field-node", state: "online", family: "Field nodes", unit: undefined, memory_bytes: null }), since_ms: Date.now() }], ...extra });
const agent = { services: [{ id: "voice", unit: "armor-voice", description: "", installed: true, active: "inactive", sub: "dead", enabled: "enabled", pid: 0, since: "" }, { id: "server", unit: "armor-server", description: "", installed: true, active: "active", sub: "running", enabled: "enabled", pid: 1, since: "" }] };
const admin = { user: { role: "admin", name: "root" }, known: true, reason: "" } as never;

describe("the rules of the Services menu", () => {
  it("colours each state and tells the ones that work", () => {
    expect(["running", "online"].map(state => toneOf(state as never))).toEqual(["green", "green"]);
    expect(["stopped", "offline"].map(state => toneOf(state as never))).toEqual(["red", "red"]);
    expect(["failed", "starting", "paused"].map(state => toneOf(state as never))).toEqual(["amber", "amber", "amber"]);
    expect(["not_installed", "unknown"].map(state => toneOf(state as never))).toEqual(["slate", "slate"]);
    expect([isActive("running"), isActive("online"), isActive("paused"), isActive("failed")]).toEqual([true, true, false, false]);
  });

  it("offers each state only the buttons that make sense, and never pauses the console itself", () => {
    expect(actionsFor("running", "voice")).toEqual(["stop", "restart", "pause"]);
    expect(actionsFor("running", "server")).toEqual(["stop", "restart"]);
    expect(actionsFor("running", "studio")).toEqual(["stop", "restart"]);
    expect(actionsFor("paused", "voice")).toEqual(["resume", "stop", "restart"]);
    expect(actionsFor("starting", "voice")).toEqual(["stop", "restart"]);
    expect(actionsFor("stopped", "voice")).toEqual(["start"]);
    expect(actionsFor("failed", "voice")).toEqual(["start"]);
    expect(actionsFor("not_installed", "voice")).toEqual([]);
  });

  it("matches a unit of the catalogue to a program of the agent and makes a key for a family", () => {
    expect(agentIdOf("armor-voice.service", agent.services)).toBe("voice");
    expect(agentIdOf("armor-other.service", agent.services)).toBeUndefined();
    expect(agentIdOf(undefined, agent.services)).toBeUndefined();
    expect(familyKey("Field nodes / Radar")).toBe("svcFamily_Field_nodes_Radar");
  });
});

describe("the Services menu", () => {
  it("counts the programs, groups them by family and filters by search, state and family", async () => {
    fakeServer({ "GET /api/v1/system/services": overview() });
    const view = await mount(createElement(ServicesView, { t, origin: O }));
    expect(view.host.querySelectorAll(".svc-card")).toHaveLength(4);
    expect(view.host.querySelector(".svc-stats")?.textContent).toContain("4");
    const search = view.host.querySelector<HTMLInputElement>(".svc-filters input");
    expect(search).not.toBeNull();
    const chips = [...view.host.querySelectorAll<HTMLButtonElement>(".svc-chips button")];
    await view.click(chips.find(button => button.textContent === t("svcActive")) ?? null);
    expect(view.host.querySelectorAll(".svc-card")).toHaveLength(2);
    await view.click(chips.find(button => button.textContent === t("svcInactive")) ?? null);
    expect(view.host.querySelectorAll(".svc-card")).toHaveLength(2);
    await view.click(chips.find(button => button.textContent === t("svcShowAll")) ?? null);
    await view.click([...view.host.querySelectorAll<HTMLButtonElement>(".svc-chips button")].find(button => button.textContent === "Voice") ?? null);
    expect(view.host.querySelectorAll(".svc-card")).toHaveLength(2);
    await view.unmount();
  });

  it("says when nothing matches the filters, when systemd is missing and when the list cannot be read", async () => {
    fakeServer({ "GET /api/v1/system/services": overview({ systemd: false }) });
    let view = await mount(createElement(ServicesView, { t, origin: O }));
    expect(view.host.textContent).toContain(t("svcNoSystemd"));
    expect(await pokeAll(view.host)).toBeGreaterThan(3);
    await view.unmount();
    vi.unstubAllGlobals();
    fakeServer({});
    view = await mount(createElement(ServicesView, { t, origin: O }));
    expect(view.host.textContent).toContain(t("svcLoadError"));
    await view.unmount();
  });

  it("asks before stopping a program of the console and does not stop it until the question is answered yes", async () => {
    const calls = fakeServer({ "GET /api/v1/system/services": overview(), "GET /api/v1/admin/services": agent, "POST /api/v1/admin/services/server/stop": { ok: true } });
    const view = await mount(createElement(SessionUserContext.Provider, { value: admin }, createElement(ServicesView, { t, origin: O })));
    await view.click(view.host.querySelector(".svc-act.stop"));
    expect(calls.some(call => call.path === "/api/v1/admin/services/server/stop")).toBe(false);
    expect(document.body.textContent).toContain(t("svcAsk_stop_console"));
    await view.unmount();
  });

  it("starts a stopped program of the agent without asking and says it was done", async () => {
    const calls = fakeServer({ "GET /api/v1/system/services": overview(), "GET /api/v1/admin/services": agent, "POST /api/v1/admin/services/voice/start": { ok: true } });
    const view = await mount(createElement(SessionUserContext.Provider, { value: admin }, createElement(ServicesView, { t, origin: O })));
    await view.click(view.host.querySelector(".svc-act.start"));
    expect(calls.some(call => call.method === "POST" && call.path === "/api/v1/admin/services/voice/start")).toBe(true);
    expect(view.host.querySelector("p.svc-banner[role=status]")?.textContent).toContain(t("svcDone_start"));
    await view.unmount();
  });

  it("shows no buttons to a person who is not an administrator", async () => {
    fakeServer({ "GET /api/v1/system/services": overview(), "GET /api/v1/admin/services": agent });
    const view = await mount(createElement(ServicesView, { t, origin: O }));
    expect(view.host.querySelector(".svc-act")).toBeNull();
    await view.unmount();
  });
});
