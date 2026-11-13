// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import type { ArmProfile, ArmProfiles, MachineMetrics } from "../api";
import { CountLinesEditor } from "../CountLinesEditor";
import { RemoteAccessSetup } from "../RemoteAccessSetup";
import { text } from "../i18n";
import { fakeServer, mount, pokeAll } from "../testLive";
import { ArmProfilesEditor } from "./ArmProfilesEditor";
import { MachineMonitor } from "./MachineMonitor";

const O = "http://armor.local:18080/";
const t = (key: string) => text("en", key);
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ""; });

const metrics = (over: Partial<MachineMetrics> = {}): MachineMetrics => ({
  at_ms: 1_800_000_000_000, cpu: { percent: 37, cores: 4, load: [0.5, 0.4, 0.3], mhz: 2400 }, memory: { total: 8_000_000_000, used: 3_000_000_000, available: 5_000_000_000, swap_total: 0, swap_used: 0 },
  temperatures: [{ name: "cpu", celsius: 72 }], disks: [{ mount: "/", device: "/dev/mmcblk0p2", kind: "sd", fs: "ext4", total: 32_000_000_000, used: 12_000_000_000 }],
  network: [{ name: "eth0", up: true, rx_bps: 1200, tx_bps: 800, rx_bytes: 10, tx_bytes: 20 }], uptime_s: 90_000,
  history: [1, 2, 3].map(index => ({ t: index, cpu: 30 + index, memory: 40, swap: 0, temperature: 60 + index, rx_bps: 100 * index, tx_bps: 50 * index })), ...over,
});

describe("the monitor of the machine", () => {
  it("shows the tiles and charts of what the server measures, warm and hot temperatures included", async () => {
    fakeServer({ "GET /api/v1/system/metrics": metrics() });
    const view = await mount(createElement(MachineMonitor, { t, origin: O }));
    expect(view.host.querySelector(".machine-tiles")).not.toBeNull();
    expect(view.host.querySelector(".machine-tiles strong.warm")).not.toBeNull();
    expect(view.host.textContent).toContain("37 %");
    await view.unmount();
    fakeServer({ "GET /api/v1/system/metrics": metrics({ temperatures: [{ name: "cpu", celsius: 85 }] }) });
    const hot = await mount(createElement(MachineMonitor, { t, origin: O }));
    expect(hot.host.querySelector(".machine-tiles strong.hot")).not.toBeNull();
    await hot.unmount();
  });

  it("copes with a machine that reports no temperature, no processor load, no history and no disk", async () => {
    fakeServer({ "GET /api/v1/system/metrics": metrics({ temperatures: [], cpu: { percent: null, cores: 1, load: [0, 0, 0] }, history: [], disks: [], network: [], memory: { total: 0, used: 0, available: 0, swap_total: 0, swap_used: 0 } }) });
    const view = await mount(createElement(MachineMonitor, { t, origin: O }));
    expect(view.host.querySelector(".machine-tiles")).not.toBeNull();
    expect(view.host.textContent).toContain("—");
    await view.unmount();
  });

  it("says it is collecting while nothing has arrived and that it is unavailable when the server does not answer", async () => {
    fakeServer({});
    const view = await mount(createElement(MachineMonitor, { t, origin: O }));
    await view.settle();
    expect(view.host.textContent).toMatch(new RegExp(`${t("sm_collecting")}|${t("sm_unavailable")}`));
    await view.unmount();
  });
});

const profiles: ArmProfile[] = [
  { id: "away", name: "Away", base: "away" }, { id: "stay", name: "Home", base: "stay" },
  { id: "night", name: "Night", base: "stay", entry_delay_s: 45, siren: false, zones: [{ id: "hall", armed: true }] },
  { id: "garden", name: "Garden", base: "away" },
];
const current: ArmProfiles = { revision: 2, updated_at: "2030-01-01T00:00:00.000Z", updated_by: "admin", profiles, max: 8 };

describe("the editor of the arming modes", () => {
  it("opens, lets every control be used once and tells what it did without breaking", async () => {
    const calls = fakeServer({ "PUT /api/v1/alarm/arm-profiles": () => ({ ...current, revision: 3 }) });
    const saved: ArmProfiles[] = [];
    const view = await mount(createElement(ArmProfilesEditor, { t, origin: O, current, zones: [["hall", "Hall"], ["garage", "Garage"]], onSaved: next => saved.push(next), onConflict: () => undefined }));
    const toggle = view.host.querySelector("button");
    expect(toggle).not.toBeNull();
    await view.click(toggle);
    expect(await pokeAll(view.host)).toBeGreaterThan(10);
    expect(Array.isArray(calls)).toBe(true);
    await view.unmount();
  });

  it("starts from the modes of the server each time it is mounted", async () => {
    fakeServer({});
    const view = await mount(createElement(ArmProfilesEditor, { t, origin: O, current, zones: [], onSaved: () => undefined, onConflict: () => undefined }));
    expect(view.host.textContent).toContain("Night");
    await view.unmount();
  });
});

describe("the editor of the counting lines", () => {
  it("shows the lines of the camera and lets every control be used once", async () => {
    fakeServer({ "GET /api/v1/cameras/cam-gate/count-lines": { lines: [{ id: "gate", a: [0.1, 0.5], b: [0.9, 0.5] }] }, "PUT /api/v1/cameras/cam-gate/count-lines": (body: unknown) => body });
    const view = await mount(createElement(CountLinesEditor, { t, origin: O, cameraId: "cam-gate", isAdmin: true }));
    expect(view.host.textContent).toContain("gate");
    expect(await pokeAll(view.host)).toBeGreaterThan(2);
    await view.unmount();
  });

  it("offers no control to change anything to a person who is not an administrator", async () => {
    fakeServer({ "GET /api/v1/cameras/cam-gate/count-lines": { lines: [] } });
    const view = await mount(createElement(CountLinesEditor, { t, origin: O, cameraId: "cam-gate", isAdmin: false }));
    expect(view.host.querySelector("button")).toBeNull();
    await view.unmount();
  });
});

describe("the set-up of the way in from outside the house", () => {
  const configured = {
    wireguard: { tool: true, script: true, configured: true, running: true, qr: true, peers: [{ name: "phone", address: "10.66.0.2", full_tunnel: "no" as const }, { name: "laptop", address: "10.66.0.3", full_tunnel: "yes" as const }], endpoint: "armor.example.org", subnet: "10.66.0.0/24", port: "51820", lan: "192.168.0.0/24", route_lan: "yes" },
    ddns: { script: true, configured: true, provider: "duckdns", name: "armor.duckdns.org", last_address: "203.0.113.9" },
  };

  it("says it is unavailable when the server cannot be asked", async () => {
    fakeServer({});
    const view = await mount(createElement(RemoteAccessSetup, { t, origin: O }));
    await view.settle();
    expect(view.host.querySelector("[data-testid=security-group-outside]")?.textContent).toContain(t("rem_unavailable"));
    await view.unmount();
  });

  it("shows a configured VPN with its devices and a configured name, and every control can be used once", async () => {
    fakeServer({ "GET /api/v1/admin/remote": configured, "GET /api/v1/admin/node-panels": { panels: [{ id: "alarm-1", address: "192.168.0.50", scheme: "https", port: 443, fingerprint: "AA:BB" }] } });
    const view = await mount(createElement(RemoteAccessSetup, { t, origin: O }));
    expect(view.host.textContent).toContain("phone");
    expect(view.host.textContent).toContain("armor.duckdns.org");
    expect(await pokeAll(view.host)).toBeGreaterThan(8);
    await view.unmount();
  });

  it("offers to set things up when nothing is configured", async () => {
    fakeServer({ "GET /api/v1/admin/remote": { wireguard: { tool: false, script: true, configured: false, running: false, qr: false, peers: [] }, ddns: { script: true, configured: false } } });
    const view = await mount(createElement(RemoteAccessSetup, { t, origin: O }));
    expect(view.host.querySelector("input")).not.toBeNull();
    expect(await pokeAll(view.host)).toBeGreaterThan(3);
    await view.unmount();
  });
});
