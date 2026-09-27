import { describe, expect, it } from "vitest";
import type { Sensor } from "../domain";
import { NODE_SPACING_DEG, node270Sensors, nodeSpacingDeg } from "./node270";
import { RADAR, radarView, sectorPoints } from "./model";

describe("a 270 degree node", () => {
  it("mounts the radars 75 degrees apart, so the two outer edges are 270 degrees apart and neighbours overlap 45", () => {
    expect(NODE_SPACING_DEG).toBe(75);
    expect(2 * RADAR.halfAngleDeg + 2 * NODE_SPACING_DEG).toBe(270);
    expect(2 * RADAR.halfAngleDeg - NODE_SPACING_DEG).toBe(45);
  });
  it("creates three radars in one place, wired to the node as channels 1 to 3, the middle one facing where asked", () => {
    const made = node270Sensors([], { name: "North", node: "perimetro-1", x: 40, y: 60, heading: 90 });
    expect(made.map(sensor => sensor.channel)).toEqual([1, 2, 3]);
    expect(made.map(sensor => sensor.heading)).toEqual([165, 90, 15]);   // the left one anticlockwise of the middle one
    expect(new Set(made.map(sensor => sensor.node))).toEqual(new Set(["perimetro-1"]));
    expect(made.every(sensor => sensor.x === 40 && sensor.y === 60 && sensor.kind === "LD2450")).toBe(true);
    expect(made.map(sensor => sensor.name)).toEqual(["North 1", "North 2", "North 3"]);
  });
  it("wraps the facings into 0 to 359 and never reuses an id", () => {
    const existing: Sensor[] = [{ id: "sensor-01", name: "a", kind: "LD2450", x: 1, y: 1 }, { id: "sensor-03", name: "b", kind: "LD2450", x: 1, y: 1 }];
    const made = node270Sensors(existing, { name: "  ", node: "n-2", x: 0, y: 0, heading: 20 });
    expect(made.map(sensor => sensor.heading)).toEqual([95, 20, 305]);
    const ids = [...existing, ...made].map(sensor => sensor.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(made[0].name).toBe("n-2 1");
  });
  it("covers a point on each side of the middle radar's axis and a point behind the node stays uncovered", () => {
    const [left, middle, right] = node270Sensors([], { name: "N", node: "n", x: 0, y: 0, heading: 90 });
    const covers = (sensor: Sensor, x: number, y: number) => {
      const polygon = sectorPoints({ x: 0, y: 0 }, sensor.heading ?? 0, RADAR.halfAngleDeg, RADAR.rangeM);
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i], b = polygon[j];
        if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
      }
      return inside;
    };
    const anyCovers = (x: number, y: number) => [left, middle, right].some(sensor => covers(sensor, x, y));
    expect(anyCovers(0, 3)).toBe(true);      // straight ahead (north)
    expect(anyCovers(-3, 0.2)).toBe(true);   // to the west, at the left radar's edge region
    expect(anyCovers(3, 0.2)).toBe(true);    // to the east
    expect(anyCovers(0, -3)).toBe(false);    // behind
  });
});

describe("sensor models", () => {
  it("knows what each model is rated for", () => {
    expect(radarView({ kind: "LD2450" })).toEqual({ rangeM: 6, halfAngleDeg: 60 });
    expect(radarView({ kind: "LD2461" })).toEqual({ rangeM: 8, halfAngleDeg: 45 });
  });
  it("mounts three LD2461 ninety degrees apart: their 90 degree fields fill 270 degrees with no overlap", () => {
    expect(nodeSpacingDeg("LD2450")).toBe(NODE_SPACING_DEG);
    expect(nodeSpacingDeg("LD2461")).toBe(90);
    const made = node270Sensors([], { name: "N", node: "n", x: 0, y: 0, heading: 90, kind: "LD2461" });
    expect(made.map(sensor => sensor.kind)).toEqual(["LD2461", "LD2461", "LD2461"]);
    expect(made.map(sensor => sensor.heading)).toEqual([180, 90, 0]);
  });
});
