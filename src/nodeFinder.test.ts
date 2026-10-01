import { describe, expect, it } from "vitest";
import { findNodeCandidates } from "./NodeFinder";
import type { NetworkOverview } from "./networkModel";

const device = (ip: string, extra: Record<string, unknown>) => ({ id: ip, ip, online: true, ...extra });
const network = { nodes: [{ stale: false, devices: [
  device("192.168.0.50", { hostname: "armor-solar-1", vendor: "Espressif Inc.", mac: "aa:bb:cc:00:00:01" }),
  device("192.168.0.51", { hostname: "armor-radar-1" }),
  device("192.168.0.52", { vendor: "Espressif Inc." }),
  device("192.168.0.53", { hostname: "printer", vendor: "HP" }),
  device("192.168.0.54", { hostname: "armor-solar-2.local", online: false }),
] }] } as unknown as NetworkOverview;

describe("finding nodes on the network", () => {
  it("lists what looks like an ARMOR node and is not known yet", () => {
    const found = findNodeCandidates(network, ["radar-1"]);
    expect(found.map(item => [item.ip, item.nodeId])).toEqual([["192.168.0.50", "solar-1"], ["192.168.0.52", undefined], ["192.168.0.54", "solar-2"]]);
  });
  it("leaves out a node known by its address, and handles no network", () => {
    expect(findNodeCandidates(network, [], ["192.168.0.50"]).map(item => item.ip)).not.toContain("192.168.0.50");
    expect(findNodeCandidates(null, [])).toEqual([]);
  });
});
