import { describe, expect, it } from "vitest";
import type { Alarm } from "../api";
import type { SiteModel } from "../designer/ops";
import { alarmPlaces } from "./alarmPlaces";

const dimensions = { width: 20, depth: 10, height: 3 };
const model = {
  cameras: [{ id: "cam-1", name: "Gate", x: 50, y: 50 }],
  sensors: [{ id: "s1", name: "Radar", x: 10, y: 90, kind: "LD2450", node: "radar-1" }],
  placements: [{ device_id: "smoke-1", x: 5, y: 2, z: 1, rotation: 0 }],
} as unknown as SiteModel;
const alarm = (patch: Partial<Alarm>): Alarm => ({ id: "a", key: "k", source: { type: "camera", id: "cam-1" }, severity: "critical", code: "camera_motion", raised_at: "2000-01-01T00:00:00Z", ...patch });

describe("alarms on the site map", () => {
  it("places an alarm where its camera, its device or its radar is", () => {
    const places = alarmPlaces([alarm({}), alarm({ id: "b", source: { type: "device", id: "smoke-1" } }), alarm({ id: "c", source: { type: "node", id: "radar-1" } })], model, dimensions);
    expect(places.map(place => place.id)).toEqual(["a", "b", "c"]);
    expect(places[0].point).toEqual({ x: 10, y: 5 });          // the middle of a 20 x 10 site
    expect(places[1].point).toEqual({ x: 5, y: 2 });
    expect(places[2].point.x).toBeCloseTo(2); expect(places[2].point.y).toBeCloseTo(1);
  });
  it("leaves out acknowledged alarms and the ones whose source is not drawn", () => {
    const places = alarmPlaces([alarm({ acknowledged_at: "x" }), alarm({ id: "n", source: { type: "network", id: "lan" } }), alarm({ id: "u", source: { type: "device", id: "never-placed" } }), alarm({ id: "k", source: { type: "camera", id: "gone" } })], model, dimensions);
    expect(places).toEqual([]);
  });
});
