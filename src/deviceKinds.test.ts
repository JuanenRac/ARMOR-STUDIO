import { describe, expect, it } from "vitest";
import type { StudioDevice } from "./api";
import { ACTUATOR_KINDS, ALL_KINDS, applyPreset, deviceProblem, mapToText, PRESETS, SENSOR_KINDS, slug, textToMap } from "./deviceKinds";

const device = (patch: Partial<StudioDevice>): StudioDevice => ({
  id: "d", name: "D", kind: "smoke", protocol: "zigbee", location: "", category: "sensor", source: { type: "push" }, commands: {}, can_command: false,
  expected_interval_s: 0, risk: "low", state: {}, online: true, last_seen: null, created_at: "", ...patch,
});

describe("device kinds", () => {
  it("has no kind that is both a sensor and an actuator, and lists them all once", () => {
    expect(SENSOR_KINDS.filter(kind => ACTUATOR_KINDS.includes(kind))).toEqual([]);
    expect(new Set(ALL_KINDS).size).toBe(ALL_KINDS.length);
  });
  it("calls a device in trouble when it is triggered, tampered with, low on battery or silent", () => {
    expect(deviceProblem(device({ state: { triggered: true } }))).toBe("triggered");
    expect(deviceProblem(device({ kind: "door", state: { open: true } }))).toBe("triggered");
    expect(deviceProblem(device({ kind: "climate", state: { temperature: 21 } }))).toBeNull();
    expect(deviceProblem(device({ state: { tamper: true } }))).toBe("tamper");
    expect(deviceProblem(device({ state: { battery: 9 } }))).toBe("battery");
    expect(deviceProblem(device({ online: false, expected_interval_s: 300 }))).toBe("offline");
    expect(deviceProblem(device({ online: false, expected_interval_s: 0 }))).toBeNull();
  });
});

describe("connection presets", () => {
  it("keeps every preset under the broker prefix the server is allowed to listen on", () => {
    for (const preset of PRESETS) for (const kind of ALL_KINDS) {
      const result = applyPreset(preset, kind, "thing", "192.168.0.9");
      if (result.source.type === "mqtt") expect(result.source.topic.startsWith("armor/device/")).toBe(true);
      if (result.commands.mqtt) expect(result.commands.mqtt.topic.startsWith("armor/device/")).toBe(true);
    }
  });
  it("only gives a command to something that can be commanded", () => {
    expect(applyPreset("zigbee2mqtt", "smoke", "s", "").commands).toEqual({});
    expect(applyPreset("zigbee2mqtt", "smart_plug", "p", "").commands.mqtt?.topic).toBe("armor/device/p/set");
    expect(applyPreset("tasmota", "smart_plug", "t", "").commands.mqtt?.topic).toBe("armor/device/t/cmnd/POWER");
    expect(applyPreset("http", "smart_plug", "x", "192.168.0.7").commands.http?.on).toBe("http://192.168.0.7/relay/0?turn=on");
  });
  it("maps a Zigbee2MQTT contact sensor with the door's inverted contact", () => {
    const source = applyPreset("zigbee2mqtt", "door", "front", "").source;
    expect(source.type === "mqtt" && source.map).toContainEqual({ field: "open", path: "contact", invert: true });
  });
});

describe("mapping text", () => {
  it("round-trips a mapping with an inverted entry", () => {
    const map = [{ field: "open", path: "contact", invert: true }, { field: "battery", path: "battery" }];
    expect(textToMap(mapToText(map))).toEqual(map);
  });
  it("skips lines without a field name", () => {
    expect(textToMap("=x\nnothing\n  on = POWER \n")).toEqual([{ field: "on", path: "POWER" }]);
  });
  it("makes a network name from what the operator typed", () => {
    expect(slug("  Salón / Luz 1  ")).toBe("sal-n-luz-1");
    expect(slug("Kitchen smoke")).toBe("kitchen-smoke");
  });
});
