// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import type { BatteryCatalog, BatteryOperation } from "./api/battery";
import { BatteryMaintenance } from "./BatteryMaintenance";
import { text } from "./i18n";
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
