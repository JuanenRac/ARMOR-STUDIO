// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { AlarmDesigner } from "./AlarmDesigner";
import { ElectricalDesigner } from "./ElectricalDesigner";
import { NetworkDesigner } from "./NetworkDesigner";
import { housePreset as alarmHouse } from "./alarm/presets";
import { housePreset as electricalHouse } from "./electrical/presets";
import { text } from "./i18n";
import { housePreset as networkHouse } from "./network/presets";
import type { NetworkDevice, NetworkOverview } from "./networkModel";
import { fakeServer, mount, pokeAll } from "./testLive";
import { NetworkView } from "./views/NetworkView";

const O = "http://armor.local:18080/";
const t = (key: string) => text("en", key);
const NOW = 1_790_000_060_000;

beforeEach(() => { vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }); });
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ""; });

describe("the three designers, mounted whole, with every control used once", () => {
  it("the alarm designer takes every tool, button and field without breaking and reports each change to the screen", async () => {
    const changes: unknown[] = [];
    const view = await mount(createElement(AlarmDesigner, { t, design: alarmHouse(t), setDesign: next => { changes.push(next); }, status: "saved", panels: null }));
    expect(await pokeAll(view.host)).toBeGreaterThan(15);
    expect(changes.length).toBeGreaterThan(0);
    await view.unmount();
  });

  it("the electrical designer does the same, with no node and no inverter known", async () => {
    const changes: unknown[] = [];
    const view = await mount(createElement(ElectricalDesigner, { t, design: electricalHouse(t), setDesign: (next: unknown) => { changes.push(next); }, status: "saved", nodeIds: [], solarDevices: [] } as never));
    expect(await pokeAll(view.host)).toBeGreaterThan(15);
    await view.unmount();
  });

  it("the network designer does the same, without and with a network the nodes have seen", async () => {
    const without = await mount(createElement(NetworkDesigner, { t, design: networkHouse(t), setDesign: () => undefined, status: "saved", overview: null }));
    expect(await pokeAll(without.host)).toBeGreaterThan(10);
    await without.unmount();
    const device = (patch: Partial<NetworkDevice> & { id: string; ip: string }): NetworkDevice => ({ online: true, first_seen_ms: NOW - 5000, last_seen_ms: NOW, ...patch });
    const overview: NetworkOverview = {
      nodes: [{ node_id: "network-1", received_at: "2030-01-01T10:00:00.000Z", stale: false, interface: { name: "eth0", ip: "192.168.0.10", cidr: "192.168.0.0/24", gateway: "192.168.0.1" }, internet: { state: "up" },
        devices: [device({ id: "aa", ip: "192.168.0.1", kind: "router" }), device({ id: "bb", ip: "192.168.0.50", kind: "camera", online: false })] }],
      totals: { nodes: 1, stale: 0, devices: 2, online: 1, unknown: 2, internet: "up" }, events: [], outages: [],
    };
    const seen = await mount(createElement(NetworkDesigner, { t, design: networkHouse(t), setDesign: () => undefined, status: "saved", overview }));
    expect(await pokeAll(seen.host)).toBeGreaterThan(10);
    await seen.unmount();
  });
});

describe("the Network menu, mounted whole", () => {
  const device = (patch: Partial<NetworkDevice> & { id: string; ip: string }): NetworkDevice => ({ online: true, first_seen_ms: NOW - 5000, last_seen_ms: NOW, ...patch });
  const overview = (state: "up" | "down" | "lan_down" | "degraded" = "up"): NetworkOverview => ({
    nodes: [{ node_id: "network-1", received_at: "2030-01-01T10:00:00.000Z", stale: false, interface: { name: "eth0", ip: "192.168.0.10", cidr: "192.168.0.0/24", gateway: "192.168.0.1", rx_bps: 1_200_000, tx_bps: 300_000 },
      internet: { state, since_ms: NOW - 60_000, gateway_ok: state !== "lan_down", latency_ms: 24.5, loss_percent: 1, outages_24h: 1, downtime_24h_s: 300, probes: [{ target: "1.1.1.1:443", kind: "tcp", ok: true, latency_ms: 24 }, { target: "8.8.8.8", kind: "dns", ok: false }] },
      devices: [
        device({ id: "14:2e:5e:86:d9:62", ip: "192.168.0.1", mac: "14:2e:5e:86:d9:62", vendor: "Sercomm", kind: "router", ports: [{ port: 80, proto: "tcp", service: "http" }], note: { trusted: true, name: "Main router", updated_ms: NOW } as never }),
        device({ id: "96:b3:ed:0b:1c:18", ip: "192.168.0.12", mac: "96:b3:ed:0b:1c:18", randomized_mac: true, kind: "phone" }),
        device({ id: "00:bc:99:aa:bb:01", ip: "192.168.0.203", mac: "00:bc:99:aa:bb:01", vendor: "Hikvision", kind: "camera", online: false, ports: [{ port: 554, proto: "tcp", service: "rtsp" }, { port: 23, proto: "tcp", service: "telnet" }] }),
      ], scan: { last_ms: NOW, hosts: 254 } }],
    totals: { nodes: 1, stale: 0, devices: 3, online: 2, unknown: 2, internet: state },
    events: [{ id: "e1", kind: "new_device", at_ms: NOW - 5000, device_id: "96:b3:ed:0b:1c:18", node_id: "network-1" }, { id: "e2", kind: "internet_up", at_ms: NOW - 2000, outage_s: 240, node_id: "network-1" }, { id: "e3", kind: "port_opened", at_ms: NOW - 1000, device_id: "00:bc:99:aa:bb:01", port: 23, node_id: "network-1" }],
    outages: [{ node_id: "network-1", kind: "internet", started_ms: NOW - 600_000, ended_ms: NOW - 360_000, duration_s: 240 }],
  });

  it("goes through every tab and every control for an administrator, whatever state the internet is in", async () => {
    for (const state of ["up", "down", "lan_down", "degraded"] as const) {
      fakeServer({ "GET /api/v1/network/history": { samples: [] } });
      const view = await mount(createElement(NetworkView, { t, origin: O, isAdmin: true, overview: overview(state), reload: () => undefined, now: NOW }));
      expect(view.host.textContent?.length).toBeGreaterThan(100);
      expect(await pokeAll(view.host)).toBeGreaterThan(8);
      await view.unmount();
    }
  });

  it("offers fewer controls to a person who is not an administrator, and says when no node has reported", async () => {
    fakeServer({});
    const admin = await mount(createElement(NetworkView, { t, origin: O, isAdmin: true, overview: overview(), reload: () => undefined, now: NOW }));
    const asAdmin = admin.host.querySelectorAll("button").length;
    await admin.unmount();
    const viewer = await mount(createElement(NetworkView, { t, origin: O, isAdmin: false, overview: overview(), reload: () => undefined, now: NOW }));
    expect(viewer.host.querySelectorAll("button").length).toBeLessThanOrEqual(asAdmin);
    await viewer.unmount();
    const none = await mount(createElement(NetworkView, { t, origin: O, isAdmin: true, overview: null, reload: () => undefined, now: NOW }));
    expect(none.host.textContent).toContain(t("net_no_nodes"));
    await none.unmount();
  });
});
