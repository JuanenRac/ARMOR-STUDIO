import { describe, expect, it } from "vitest";
import type { Sensor } from "../domain";
import type { NodeState } from "../types";
import { placeTargets, sensorFor, updateTrails, zonePolygons, type Trails } from "./radarMap";

const site = { width: 60, depth: 40, height: 3 };
// at (10, 10) m facing east (0 degrees)
const sensor = (extra: Partial<Sensor> = {}): Sensor => ({ id: "s1", name: "Gate", kind: "LD2450", x: 10 / 60 * 100, y: 75, heading: 0, node: "gate", ...extra });
const node = (extra: Partial<NodeState> = {}): NodeState => ({ node_id: "gate", online: true, stale: false, timestamp_ms: 1, lux: 5, target_count: 1, alert_level: "review", targets: [{ sensor_id: 1, track_id: 4, x_mm: 0, y_mm: 3000, speed_mm_s: 250, counted: true }], ...extra });

describe("wiring radars to nodes", () => {
  it("picks the radar wired to the node, preferring the one that names the radar number", () => {
    const any = sensor({ id: "any" }), second = sensor({ id: "second", channel: 2 });
    expect(sensorFor([any, second], "gate", 2)?.id).toBe("second");
    expect(sensorFor([any, second], "gate", 1)?.id).toBe("any");
    expect(sensorFor([any], "other", 1)).toBeUndefined();
    expect(sensorFor([sensor({ node: undefined })], "gate", 1)).toBeUndefined();
  });
});

describe("placing targets on the site", () => {
  it("puts a target ahead of a radar that faces east three metres east of it", () => {
    const { placed, unmapped } = placeTargets([node()], [sensor()], site);
    expect(unmapped).toEqual([]);
    expect(placed).toHaveLength(1);
    expect(placed[0].point.x).toBeCloseTo(13, 1);
    expect(placed[0].point.y).toBeCloseTo(10, 1);
    expect(placed[0].inRated).toBe(true);
    expect(placed[0].alert).toBe("review");
  });
  it("mirrors the sideways axis when the radar says so", () => {
    const right = placeTargets([node({ targets: [{ sensor_id: 1, track_id: 1, x_mm: 1000, y_mm: 2000, speed_mm_s: 0, counted: true }] })], [sensor()], site).placed[0].point;
    const left = placeTargets([node({ targets: [{ sensor_id: 1, track_id: 1, x_mm: 1000, y_mm: 2000, speed_mm_s: 0, counted: true }] })], [sensor({ mirror: true })], site).placed[0].point;
    expect(right.y).toBeCloseTo(9, 1);
    expect(left.y).toBeCloseTo(11, 1);
  });
  it("flags a target outside the rated 6 m sector, and keeps ignored targets", () => {
    const { placed } = placeTargets([node({ targets: [{ sensor_id: 1, track_id: 1, x_mm: 0, y_mm: 7000, speed_mm_s: 0, counted: false }] })], [sensor()], site);
    expect(placed[0].inRated).toBe(false);
    expect(placed[0].counted).toBe(false);
  });
  it("reports nodes whose targets no radar of the design is wired to, and ignores silent nodes", () => {
    expect(placeTargets([node({ node_id: "north" })], [sensor()], site)).toMatchObject({ placed: [], unmapped: [{ node: "north", count: 1 }] });
    expect(placeTargets([node({ stale: true })], [sensor()], site).placed).toEqual([]);
    expect(placeTargets([node({ online: false })], [sensor()], site).placed).toEqual([]);
    expect(placeTargets([node({ targets: undefined })], [sensor()], site)).toEqual({ placed: [], unmapped: [] });
  });
});

describe("ignore zones on the site", () => {
  it("draws a zone once for each radar it applies to, in site coordinates", () => {
    const zone = { id: "road", name: "Road", action: "ignore" as const, x_min_mm: 0, x_max_mm: 1000, y_min_mm: 1000, y_max_mm: 2000 };
    const shapes = zonePolygons([zone], [sensor(), sensor({ id: "s2", node: "north" }), sensor({ id: "s3", node: undefined })], site);
    expect(shapes).toHaveLength(2);
    expect(shapes[0].points[0].x).toBeCloseTo(11, 1);       // 1 m ahead of a radar facing east
    expect(zonePolygons([{ ...zone, node_id: "gate" }], [sensor(), sensor({ id: "s2", node: "north" })], site)).toHaveLength(1);
    expect(zonePolygons([{ ...zone, sensor_id: 2 }], [sensor({ channel: 1 })], site)).toHaveLength(0);
  });
});

describe("trails", () => {
  it("remember where a track has been and forget old ones", () => {
    const at = (x: number) => placeTargets([node({ targets: [{ sensor_id: 1, track_id: 4, x_mm: 0, y_mm: x, speed_mm_s: 0, counted: true }] })], [sensor()], site).placed;
    let trails: Trails = new Map();
    trails = updateTrails(trails, at(2000), 1000);
    trails = updateTrails(trails, at(2000), 1500);                       // did not move: nothing added
    trails = updateTrails(trails, at(3000), 2000);
    expect([...trails.values()][0]).toHaveLength(2);
    trails = updateTrails(trails, at(4000), 20_000);
    expect([...trails.values()][0]).toHaveLength(1);
    expect(updateTrails(trails, [], 21_000).size).toBe(0);
  });
});
