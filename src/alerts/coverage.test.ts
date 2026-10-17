import { describe, expect, it } from "vitest";
import type { Camera, Sensor } from "../domain";
import { cameraCoveringNode, cameraSees } from "./coverage";

const camera = (fields: Partial<Camera>): Camera => ({ id: "cam", name: "cam", host: "h", snapshotUrl: "", enabled: true, x: 0, y: 0, ...fields });
const radar = (fields: Partial<Sensor>): Sensor => ({ id: "r", name: "r", x: 5, y: 0, kind: "LD2450", node: "nodo-radar-1", ...fields });
const middle = { x: 10, y: 0 };

describe("which camera sees a radar", () => {
  it("sees what is in front of it, inside its angle and its reach", () => {
    expect(cameraSees(camera({ heading: 0 }), { x: 5, y: 0 }, middle)).toBe(true);
    expect(cameraSees(camera({ heading: 0 }), { x: 5, y: -3 }, middle)).toBe(true);    // up on the plan is north: 31 degrees off the axis
    expect(cameraSees(camera({ heading: 0 }), { x: 0, y: 5 }, middle)).toBe(false);     // 90 degrees to the side of a 90-degree lens
    expect(cameraSees(camera({ heading: 0 }), { x: 30, y: 0 }, middle)).toBe(false);    // beyond 12 m
    expect(cameraSees(camera({ heading: 180 }), { x: 5, y: 0 }, middle)).toBe(false);   // looks the other way
  });
  it("faces the middle of the site when it has no heading, and a motorised camera covers its sweep", () => {
    expect(cameraSees(camera({}), { x: 5, y: 0 }, middle)).toBe(true);
    expect(cameraSees(camera({ heading: 180, kind: "ptz", pan: 360 }), { x: 5, y: 0 }, middle)).toBe(true);
  });
  it("answers with the nearest switched-on camera that sees the radar of the node", () => {
    const cameras = [camera({ id: "far", x: -4, heading: 0 }), camera({ id: "near", x: 2, heading: 0 }), camera({ id: "off", x: 3, heading: 0, enabled: false })];
    expect(cameraCoveringNode("nodo-radar-1", [radar({})], cameras, middle)).toBe("near");
    expect(cameraCoveringNode("another-node", [radar({})], cameras, middle)).toBeUndefined();
    expect(cameraCoveringNode("nodo-radar-1", [radar({})], [], middle)).toBeUndefined();
  });
});
