// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import type { BatteryCatalog, BatteryOperation } from "./api/battery";
import { BatteryCharts } from "./BatteryCharts";
import { BatteryMaintenance } from "./BatteryMaintenance";
import { text } from "./i18n";
import { SOLAR_THRESHOLDS } from "./solarThresholds";
import type { BatteryView } from "./solarTotals";
import { fakeServer, mount, pokeAll } from "./testLive";

const O = "http://armor.local:18080/";
const t = (key: string) => text("en", key);
// The table the server hands out: the real one when ARMOR-COMMON is next to this repository, as in the other tests of this screen.
const shared = path.resolve(import.meta.dirname, "..", "..", "ARMOR-COMMON", "src", "armor_common", "battery_ops.json");
const have = fs.existsSync(shared);
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ""; });

const done: BatteryOperation = { id: "op-1", node: "solar-1", port: 1, op: "set_clock", params: {}, actor: "admin", created_at: "2030-01-01T10:00:00.000Z", updated_at: "2030-01-01T10:00:05.000Z", stage: "done", outcome: "ok" } as unknown as BatteryOperation;

describe("the battery maintenance screen, mounted whole", () => {
  it.skipIf(!have)("is refused to anybody who is not an administrator", async () => {
    fakeServer({});
    const view = await mount(createElement(BatteryMaintenance, { t, origin: O, isAdmin: false }));
    expect(view.host.textContent).toContain(t("bm_admin_only"));
    expect(view.host.querySelector("button")).toBeNull();
    await view.unmount();
  });

  it.skipIf(!have)("offers the operations of the table for the batteries the server lists, and every control can be used once", async () => {
    const catalog = JSON.parse(fs.readFileSync(shared, "utf8")) as BatteryCatalog;
    const calls = fakeServer({
      "GET /api/v1/solar/battery-ops/catalog": { enabled: true, catalog },
      "GET /api/v1/solar/battery-ops": { operations: [done] },
      "GET /api/v1/solar": { devices: [{ node_id: "solar-1", kind: "battery", port: 1 }, { node_id: "solar-1", kind: "inverter" }] },
    });
    const view = await mount(createElement(BatteryMaintenance, { t, origin: O, isAdmin: true }));
    await view.settle();
    expect(calls.some(call => call.path === "/api/v1/solar/battery-ops/catalog")).toBe(true);
    expect(view.host.textContent?.length).toBeGreaterThan(80);
    expect(await pokeAll(view.host)).toBeGreaterThan(5);
    await view.unmount();
  });

  it.skipIf(!have)("says in words that writing is off when the server says so, and when it cannot be asked", async () => {
    const catalog = JSON.parse(fs.readFileSync(shared, "utf8")) as BatteryCatalog;
    fakeServer({ "GET /api/v1/solar/battery-ops/catalog": { enabled: false, catalog }, "GET /api/v1/solar/battery-ops": { operations: [] }, "GET /api/v1/solar": { devices: [] } });
    const off = await mount(createElement(BatteryMaintenance, { t, origin: O, isAdmin: true }));
    await off.settle();
    expect(off.host.textContent?.length).toBeGreaterThan(20);
    await off.unmount();
    fakeServer({});
    const down = await mount(createElement(BatteryMaintenance, { t, origin: O, isAdmin: true }));
    await down.settle();
    expect(down.host.textContent?.length).toBeGreaterThan(5);
    await down.unmount();
  });
});

describe("the charts by battery and cell", () => {
  const current: BatteryView = {
    node_id: "solar-1", device: "pack", kind: "battery", received_at: "2026-01-01T12:00:00.000Z", stale: false,
    reading: { kind: "battery", node_id: "solar-1", device: "pack", timestamp_ms: 0, modules: 1, stack: [{ n: 2, present: true, voltage_v: 50, cells_v: [3.3, 3.31] }] },
  };
  const open = async (answer: Record<string, unknown>) => {
    const calls = fakeServer({ "GET /api/v1/solar/history": answer });
    const view = await mount(createElement(BatteryCharts, { t, origin: O, stacks: [current], current, now: Date.parse("2026-01-01T12:00:00Z"), history: [], minutes: 60, setMinutes: () => undefined, levels: SOLAR_THRESHOLDS.levels }));
    await view.click([...view.host.querySelectorAll("button")].find(button => button.textContent === t("solx_scope_battery")) ?? null);
    await view.settle();
    return { calls, view };
  };
  const base = { node_id: "solar-1", device: "pack", minutes: 60, samples: [] };

  it("asks the server for the battery and says what it records", async () => {
    const { calls, view } = await open({ ...base, module: 2, every_s: 60, retention_days: 30 });
    expect(calls.filter(call => call.path === "/api/v1/solar/history").length).toBeGreaterThan(0);
    expect(view.host.querySelector("[data-testid=battery-history-note]")?.textContent).toBe(t("solx_recorded_note").replace("{0}", "60").replace("{1}", "30"));
    await view.unmount();
  });

  it("says when the server is from before this history", async () => {
    const { view } = await open(base);
    expect(view.host.querySelector("[data-testid=battery-history-note]")?.textContent).toBe(t("solx_history_old"));
    await view.unmount();
  });
});

describe("the small chart of each cell", () => {
  const current: BatteryView = {
    node_id: "solar-1", device: "pack", kind: "battery", received_at: "2026-01-01T12:00:00.000Z", stale: false,
    reading: { kind: "battery", node_id: "solar-1", device: "pack", timestamp_ms: 0, modules: 1, stack: [{ n: 1, present: true, model: "US2000C", cells_v: [3.3, 3.72] }] },
  };
  const at = Date.parse("2026-01-01T12:00:00Z");
  const answer = { node_id: "solar-1", device: "pack", minutes: 60, module: 1, every_s: 60, retention_days: 30, samples: [{ t: at - 120_000, cell1: 3.29, cell2: 3.4 }, { t: at - 60_000, cell1: 3.3, cell2: 3.7 }] };
  const open = async () => {
    fakeServer({ "GET /api/v1/solar/history": answer });
    const view = await mount(createElement(BatteryCharts, { t, origin: O, stacks: [current], current, now: at, history: [], minutes: 60, setMinutes: () => undefined, levels: SOLAR_THRESHOLDS.levels }));
    await view.click([...view.host.querySelectorAll("button")].find(button => button.textContent === t("solx_scope_cells")) ?? null);
    await view.settle();
    return view;
  };
  afterEach(() => { window.localStorage.clear(); });

  it("is not drawn until asked for, then draws one per cell, blinks the faulty one and is remembered", async () => {
    const view = await open();
    expect(view.host.querySelector("[data-testid=cell-multiples]")).toBeNull();
    await view.click(view.host.querySelector("input[type='checkbox']"));
    await view.settle();
    const charts = [...view.host.querySelectorAll(".sl-multiple")];
    expect(charts.length).toBe(2);
    expect(charts[0].classList.contains("sl-blink-fault")).toBe(false);
    expect(charts[1].classList.contains("sl-blink-fault")).toBe(true);
    expect(charts[1].textContent).toContain(t("solx_fault_cell_over"));
    await view.unmount();
    const again = await open();
    expect(again.host.querySelectorAll(".sl-multiple").length).toBe(2);
    await again.unmount();
  });
});
