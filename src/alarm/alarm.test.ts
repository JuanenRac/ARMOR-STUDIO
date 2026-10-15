import { describe, expect, it } from "vitest";
import { ALARM_DESIGNER_KEYS } from "../alarmDesignerText";
import type { AlarmNodeView } from "../api";
import { analyse } from "./analysis";
import { KINDS, LOOPS, kindDef, portOf } from "./model";
import { addElement, canConnect, connect, removeElement, replaceKind, setBinding, setProp } from "./ops";
import { drawPanels, emptyDesign, guessSensorKind, housePreset } from "./presets";
import { buildAlarmDoc, parseAlarmDoc } from "./sync";

const t = (key: string) => key;
const node = (id: string, zones: Array<{ id: string; name?: string; kind: "instant" | "entry" | "interior" | "always" }>): AlarmNodeView => ({
  node_id: id, received_at: "x", stale: false,
  state: { kind: "alarm", node_id: id, timestamp_ms: 1, phase: "armed", mode: "away", siren: false, locked_out: false, commands_enabled: false, open_zones: [], events: [], zones: zones.map(zone => ({ ...zone, state: "normal" as const, bypassed: false })) },
});

describe("the alarm designer's catalogue", () => {
  it("has a name for every kind, a label for every property and a phrase for every check", () => {
    const keys = new Set(ALARM_DESIGNER_KEYS);
    for (const def of KINDS) {
      expect(keys.has("adk_" + def.kind.replace(/-/g, "_")), def.kind).toBe(true);
      for (const prop of def.props) expect(keys.has("adp_" + prop.key), def.kind + "." + prop.key).toBe(true);
      expect(keys.has("adc_" + def.category)).toBe(true);
    }
    // every code the checks can give (kept here so a new check cannot go without its sentence)
    const codes = ["no_central", "sensor_unlinked", "unlinked", "no_power", "no_bus", "sensor_two_links", "radio_no_battery", "wired_with_battery", "danger_not_always", "loops_over", "no_siren", "no_keypad", "no_battery", "central_not_tied", "only_motion", "panel_missing", "zone_missing", "panel_not_drawn", "zones_not_drawn"];
    for (const code of codes) expect(keys.has("adi_" + code), code).toBe(true);
  });
  it("gives every sensor a wired and a radio port, and a panel one port for each loop", () => {
    for (const def of KINDS.filter(item => item.category === "sensor")) expect(def.ports.map(item => item.medium).sort()).toEqual(["loop", "radio"]);
    expect(kindDef("central")!.ports.filter(item => item.id.startsWith("loop"))).toHaveLength(LOOPS);
  });
});

describe("operations", () => {
  it("joins only ports that carry the same thing, and a loop to one sensor", () => {
    let design = emptyDesign();
    const central = addElement(design, "central", 0, 0)!; design = central.design;
    const door = addElement(design, "door-contact", -200, 0)!; design = door.design;
    const siren = addElement(design, "siren-indoor", 300, 0)!; design = siren.design;
    expect(canConnect(design, { element: door.id, port: "loop" }, { element: central.id, port: "siren" })).toBe("medium");
    const joined = connect(design, { element: door.id, port: "loop" }, { element: central.id, port: "loop1" });
    expect(joined.ok).toBe(true);
    design = joined.ok ? joined.design : design;
    const second = addElement(design, "window-contact", -200, 100)!;
    expect(canConnect(second.design, { element: second.id, port: "loop" }, { element: central.id, port: "loop1" })).toBe("busy");
    expect(canConnect(second.design, { element: siren.id, port: "out" }, { element: central.id, port: "siren" })).toBeUndefined();
    expect(removeElement(design, door.id).wires).toHaveLength(0);
  });
  it("keeps a property inside what it allows, and a link only when the new kind still has the port", () => {
    let design = emptyDesign();
    const central = addElement(design, "central", 0, 0)!; design = central.design;
    design = setProp(design, central.id, "zones", 99);
    expect(design.elements[0].props.zones).toBe(LOOPS);
    const door = addElement(design, "door-contact", -200, 0)!; design = door.design;
    const joined = connect(design, { element: door.id, port: "loop" }, { element: central.id, port: "loop1" });
    design = joined.ok ? joined.design : design;
    expect(replaceKind(design, door.id, "motion-pir").wires).toHaveLength(1);
    expect(portOf(replaceKind(design, door.id, "smoke").elements[1], "loop")?.medium).toBe("loop");
  });
  it("ties a panel and a zone to one element each", () => {
    let design = emptyDesign();
    const a = addElement(design, "door-contact", 0, 0)!; design = a.design;
    const b = addElement(design, "door-contact", 0, 100)!; design = b.design;
    design = setBinding(design, a.id, "casa", "front");
    design = setBinding(design, b.id, "casa", "front");
    expect(design.elements.find(element => element.id === a.id)?.bind).toBeUndefined();
    expect(design.elements.find(element => element.id === b.id)?.bind).toEqual({ node: "casa", zone: "front" });
    expect(setBinding(design, b.id, "Bad Id!").elements.find(element => element.id === b.id)?.bind).toBeUndefined();
  });
});

describe("the document and the checks", () => {
  it("comes back from its own text, and drops what is not valid", () => {
    const design = housePreset(t);
    expect(parseAlarmDoc(JSON.parse(JSON.stringify(buildAlarmDoc(design))))).toEqual(design);
    const dirty = { elements: [{ id: "a", kind: "nothing", x: 0, y: 0 }, { id: "b", kind: "central", x: 0, y: 0, name: "ok", props: { zones: 500 }, bind: { node: "BAD ID" } }], wires: [{ id: "w", from: { element: "b", port: "siren" }, to: { element: "b", port: "radio" } }], frames: [] };
    const clean = parseAlarmDoc(dirty)!;
    expect(clean.elements).toHaveLength(1);
    expect(clean.elements[0].props.zones).toBe(LOOPS);
    expect(clean.elements[0].bind).toBeUndefined();
    expect(clean.wires).toHaveLength(0);
    expect(parseAlarmDoc("text")).toBeUndefined();
  });
  it("reads the example as sound and a bare sensor as a problem", () => {
    const example = analyse(housePreset(t));
    expect(example.issues.filter(issue => issue.level === "error")).toEqual([]);
    expect(example.totals).toMatchObject({ centrals: 1, wired: 4, wireless: 1 });
    const bare = addElement(emptyDesign(), "smoke", 0, 0)!.design;
    const codes = analyse(bare).issues.map(issue => issue.code);
    expect(codes).toContain("no_central");
    expect(codes).toContain("sensor_unlinked");
  });
  it("tells a loop beyond the zones in use, a wireless sensor with no battery and a danger sensor that is not always on", () => {
    let design = emptyDesign();
    const central = addElement(design, "central", 0, 0, "", { zones: 2 })!; design = central.design;
    const door = addElement(design, "door-contact", -200, 0)!; design = door.design;
    const joined = connect(design, { element: door.id, port: "loop" }, { element: central.id, port: "loop5" });
    design = joined.ok ? joined.design : design;
    const smoke = addElement(design, "smoke", -200, 100, "", { zone_kind: "interior" })!; design = smoke.design;
    const radio = connect(design, { element: smoke.id, port: "radio" }, { element: central.id, port: "radio" });
    design = radio.ok ? radio.design : design;
    const codes = analyse(design).issues.map(issue => issue.code);
    expect(codes).toContain("loops_over");
    expect(codes).toContain("radio_no_battery");
    expect(codes).toContain("danger_not_always");
  });
  it("compares the drawing with what the panels report", () => {
    const panels = [node("casa", [{ id: "front", name: "Front door", kind: "entry" }, { id: "hall", name: "Hall", kind: "interior" }])];
    const empty = analyse(emptyDesign(), { nodes: panels });
    expect(empty.issues.map(issue => issue.code)).toContain("panel_not_drawn");
    const drawn = drawPanels(emptyDesign(), panels);
    expect(drawn.added).toBe(3);
    expect(analyse(drawn.design, { nodes: panels }).issues.map(issue => issue.code)).not.toContain("zones_not_drawn");
    expect(drawPanels(drawn.design, panels).added).toBe(0);
    const orphan = setBinding(drawn.design, drawn.design.elements.find(element => element.bind?.zone === "front")!.id, "casa", "gone");
    expect(analyse(orphan, { nodes: panels }).issues.map(issue => issue.code)).toContain("zone_missing");
    expect(analyse(drawn.design, { nodes: [] }).issues.map(issue => issue.code)).toContain("panel_missing");
  });
  it("guesses the sensor of a zone from its name and kind", () => {
    expect(guessSensorKind({ id: "z1", name: "Kitchen smoke", kind: "always" })).toBe("smoke");
    expect(guessSensorKind({ id: "z2", name: "Ventana salón", kind: "instant" })).toBe("window-contact");
    expect(guessSensorKind({ id: "z3", kind: "entry" })).toBe("door-contact");
    expect(guessSensorKind({ id: "z4", kind: "interior" })).toBe("motion-pir");
  });
});
