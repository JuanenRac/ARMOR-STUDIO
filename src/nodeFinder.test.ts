import { describe, expect, it } from "vitest";
import { findNodeCandidates } from "./NodeFinder";
import type { NetworkOverview } from "./networkModel";

const device = (ip: string, extra: Record<string, unknown>) => ({ id: ip, ip, online: true, ...extra });
const withTitle = (ip: string, hostname: string, title: string) => device(ip, { hostname, ports: [{ port: 80, banner: `; ${title}` }] });
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
  it("reads what a node's panel says it is, and a wanted kind leaves out a node that clearly says another one", () => {
    const mixed = { nodes: [{ stale: false, devices: [
      withTitle("192.168.0.60", "armor-radar-1", "A.R.M.O.R. radar"),
      withTitle("192.168.0.61", "armor-solar-1", "A.R.M.O.R. solar"),
      withTitle("192.168.0.62", "armor-elec-1", "A.R.M.O.R. electrical"),
      device("192.168.0.63", { hostname: "armor-unknown-1" }),   // has not answered yet, or its panel said nothing readable
    ] }] } as unknown as NetworkOverview;
    expect(findNodeCandidates(mixed, []).map(item => [item.ip, item.kind])).toEqual([
      ["192.168.0.60", "radar"], ["192.168.0.61", "solar"], ["192.168.0.62", "electrical"], ["192.168.0.63", undefined],
    ]);
    const onlyRadar = findNodeCandidates(mixed, [], [], "radar").map(item => item.ip);
    expect(onlyRadar).toContain("192.168.0.60");
    expect(onlyRadar).toContain("192.168.0.63");   // unknown kind: kept, it might really be a radar node whose panel has not answered yet
    expect(onlyRadar).not.toContain("192.168.0.61");
    expect(onlyRadar).not.toContain("192.168.0.62");
  });
});
