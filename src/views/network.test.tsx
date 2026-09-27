import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NetworkDesigner } from "../NetworkDesigner";
import { locales, text, type Locale } from "../i18n";
import { emptyDesign, housePreset } from "../network/presets";
import type { NetworkDevice, NetworkOverview } from "../networkModel";
import { NetworkView } from "./NetworkView";

const NOW = 1_790_000_060_000;
const device = (patch: Partial<NetworkDevice> & { id: string; ip: string }): NetworkDevice => ({ online: true, first_seen_ms: NOW - 5000, last_seen_ms: NOW, ...patch });
const devices: NetworkDevice[] = [
  device({ id: "14:2e:5e:86:d9:62", ip: "192.168.0.1", mac: "14:2e:5e:86:d9:62", vendor: "Sercomm", hostname: "WFADevice", kind: "router", ports: [{ port: 80, proto: "tcp", service: "http" }], note: { trusted: true, name: "Main router", updated_at: "" } }),
  device({ id: "96:b3:ed:0b:1c:18", ip: "192.168.0.12", mac: "96:b3:ed:0b:1c:18", randomized_mac: true, kind: "phone" }),
  device({ id: "00:bc:99:aa:bb:01", ip: "192.168.0.203", mac: "00:bc:99:aa:bb:01", vendor: "Hikvision", kind: "camera", online: false, ports: [{ port: 554, proto: "tcp", service: "rtsp" }, { port: 23, proto: "tcp", service: "telnet", banner: "login:" }] }),
];
const overview = (state: "up" | "down" | "lan_down" | "degraded" = "up"): NetworkOverview => ({
  nodes: [{ node_id: "network-1", received_at: "2026-09-27T10:00:00.000Z", stale: false, interface: { name: "Wi-Fi", ip: "192.168.0.10", cidr: "192.168.0.0/24", gateway: "192.168.0.1", rx_bps: 1_200_000, tx_bps: 300_000 },
    internet: { state, since_ms: NOW - 60_000, gateway_ok: state !== "lan_down", latency_ms: 24.5, loss_percent: 0, outages_24h: 1, downtime_24h_s: 300, probes: [{ target: "1.1.1.1:443", kind: "tcp", ok: true, latency_ms: 24 }, { target: "8.8.8.8", kind: "dns", ok: false }] },
    devices, scan: { last_ms: NOW, hosts: 254 } }],
  totals: { nodes: 1, stale: 0, devices: 3, online: 2, unknown: 2, internet: state },
  events: [{ id: "e1", kind: "new_device", at_ms: NOW - 5000, device_id: "96:b3:ed:0b:1c:18", node_id: "network-1" }, { id: "e2", kind: "internet_up", at_ms: NOW - 2000, outage_s: 240, node_id: "network-1" }],
  outages: [{ node_id: "network-1", kind: "internet", started_ms: NOW - 600_000, ended_ms: NOW - 360_000, duration_s: 240 }],
});
const view = (language: Locale, data: NetworkOverview | null, isAdmin = true): string => renderToStaticMarkup(createElement(NetworkView, { t: (key: string) => text(language, key), origin: "http://x", isAdmin, overview: data, reload: () => undefined, now: NOW + 3000 }));
const designer = (language: Locale, data: NetworkOverview | null, design = housePreset(key => text(language, key))): string =>
  renderToStaticMarkup(createElement(NetworkDesigner, { t: (key: string) => text(language, key), design, setDesign: () => undefined, status: "saved", overview: data }));

describe("the Network menu", () => {
  it("shows the internet, the devices and what is new", () => {
    const html = view("en", overview());
    for (const word of ["The internet is up", "Main router", "Hikvision", "Sercomm", "192.168.0.203", "Devices", "Traffic", "not known", "2 not marked as known", "Outages, 24 h", "24.5 ms"]) expect(html, word).toContain(word);
    expect(html).toContain("2/3");
    expect(html).toMatch(/net-hero good/);
  });
  it("says whose fault it is when the internet fails", () => {
    const down = view("en", overview("down"));
    expect(down).toContain("No internet: the router answers and nothing beyond it does");
    expect(down).toContain("The fault is beyond the router");
    expect(down).toMatch(/net-hero bad/);
    const lan = view("en", overview("lan_down"));
    expect(lan).toContain("The local network is down: the router does not answer");
    expect(lan).toContain("The fault is on this side");
    expect(view("en", overview("degraded"))).toMatch(/net-hero warn/);
  });
  it("tells that no node has reported, and a node that stopped", () => {
    expect(view("en", null)).toContain("No ARMOR-NETWORK node has reported yet");
    expect(view("en", { ...overview(), nodes: [] })).toContain("armor-network watch");
    const stale = overview();
    stale.nodes[0].stale = true;
    expect(view("en", stale)).toContain("has stopped reporting");
  });
  it("is worded in every language, with no phrase left as its key", () => {
    for (const language of locales) {
      for (const data of [overview(), overview("down"), overview("lan_down"), null]) {
        const html = view(language, data);
        expect(html, language).not.toMatch(/\bnet_[a-z0-9_]+\b|\bnetstate_|\bnetkind_|\bnetev_/);
        expect(html, language).not.toContain("navNetwork");
      }
    }
    expect(view("es", overview())).toContain("LA RED LOCAL");
    expect(view("ja", overview("down"))).toContain("インターネット不通");
    expect(view("de", overview())).toContain("Das Internet ist erreichbar");
  });
  it("is in the sidebar of every language", () => {
    for (const language of locales) for (const key of ["network", "networkDesigner", "navNetwork"]) expect(text(language, key), `${language}:${key}`).not.toBe(key);
  });
});

describe("the Network Designer screen", () => {
  it("shows the palette, the drawing and its totals", () => {
    const html = designer("en", overview());
    for (const word of ["The outside", "The core of the network", "Router", "Access point", "A.R.M.O.R. server", "Home network", "Draw what was found", "Typical house", "Totals", "0 errors · 0 warnings"]) expect(html, word).toContain(word);
    expect(html).toContain("Saved on the server");
  });
  it("marks an element tied to a device that is there, and one that is not", () => {
    let design = emptyDesign();
    design = { ...design, elements: [{ id: "router-01", kind: "router", x: 0, y: 0, name: "R", props: {}, bind: { device: devices[0].id } }, { id: "camera-01", kind: "camera", x: 300, y: 0, name: "C", props: {}, bind: { device: devices[2].id } }, { id: "phone-01", kind: "phone", x: 600, y: 0, name: "P", props: {}, bind: { device: "aa:aa:aa:aa:aa:aa" } }] };
    const html = designer("en", overview(), design);
    expect(html).toContain("#5df0c4");         // the router is there
    expect(html).toContain("#ff6f79");         // the camera is offline
    expect(html).toContain("#64748b");         // the phone is not reported
  });
  it("is worded in every language, with no phrase left as its key", () => {
    for (const language of locales) {
      for (const design of [housePreset(key => text(language, key)), emptyDesign()]) {
        const html = designer(language, overview(), design);
        expect(html, language).not.toMatch(/\bnd[a-z]*_[A-Za-z0-9-]+\b|\bndc_|\bndk_|\bndp_|\bndi_|\bnderr_|\bndx_/);
        expect(html, language).not.toContain("networkDesigner");
      }
    }
    expect(designer("es", overview())).toContain("Diseñador de red");
    expect(designer("zh", overview())).toContain("网络设计器");
  });
});
