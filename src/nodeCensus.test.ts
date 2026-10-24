import { describe, expect, it } from "vitest";
import { nodeCensus } from "./nodeCensus";
import type { NodeHealthList } from "./api/nodeHealth";

const item = (node_id: string, family: string, stale = false) => ({ node_id, family, stale, status: stale ? "stale" : "ok" });
const health = (...nodes: ReturnType<typeof item>[]) => ({ nodes, waiting: [], totals: { nodes: nodes.length, stale: 0, with_warnings: 0 }, levels: {} }) as unknown as NodeHealthList;

describe("the census of the nodes", () => {
  it("counts only the radar nodes of the stream when the health is not known yet", () => {
    const census = nodeCensus([{ node_id: "r1", online: true, stale: false }, { node_id: "r2", online: false, stale: false }], null);
    expect([census.online, census.total]).toEqual([1, 2]);
    expect(census.families).toEqual([{ family: "radar", online: 1, total: 2 }]);
    expect(census.silent.map(node => node.node_id)).toEqual(["r2"]);
  });

  it("counts every kind of node that reports its health, not only the radars", () => {
    const census = nodeCensus([{ node_id: "r1", online: true, stale: false }], health(item("r1", "radar"), item("s1", "solar"), item("e1", "electrical"), item("a1", "alarm"), item("h1", "hmi", true)));
    expect([census.online, census.total]).toEqual([4, 5]);
    expect(census.families.map(entry => entry.family)).toEqual(["radar", "solar", "electrical", "alarm", "hmi"]);
    expect(census.silent).toEqual([{ node_id: "h1", family: "hmi" }]);
  });

  it("counts a node that is in both lists once, online when either says so", () => {
    const census = nodeCensus([{ node_id: "r1", online: false, stale: true }], health(item("r1", "radar", false)));
    expect([census.online, census.total]).toEqual([1, 1]);
    const other = nodeCensus([{ node_id: "r1", online: true, stale: false }], health(item("r1", "radar", true)));
    expect([other.online, other.total]).toEqual([1, 1]);
  });

  it("is empty with nothing", () => {
    expect(nodeCensus([], undefined)).toEqual({ online: 0, total: 0, families: [], silent: [] });
  });
});
