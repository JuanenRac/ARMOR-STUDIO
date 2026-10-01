import { describe, expect, it } from "vitest";
import { electricalCatalogues } from "../electricalText";
import { ampacity, analyse, type Issue } from "./analysis";
import { CATEGORY_ORDER, EMPTY_DESIGN, KINDS, designBounds, kindDef, portPosition, wirePath, type Design, type PortRef } from "./model";
import { addElement, addFrame, canConnect, cleanProp, connect, duplicateElement, removeElement, setBinding, setProp, setState, updateWire } from "./ops";
import { emptyDesign, housePreset } from "./presets";
import { applyElectricalDoc, buildElectricalDoc, electricalKey, parseElectricalDoc } from "./sync";

const t = (key: string): string => electricalCatalogues.en[key] ?? key;

/** A design built from a list of [kind, props] and the wires between their ports, for the checks. */
function build(elements: Array<[string, Record<string, number | string>?]>, wires: Array<[number, string, number, string, number?]>, state: Record<number, "open"> = {}): Design {
  let design: Design = emptyDesign();
  const ids: string[] = [];
  elements.forEach(([kind, props], index) => {
    const added = addElement(design, kind, index * 200, 0)!;
    design = added.design;
    for (const [key, value] of Object.entries(props ?? {})) design = setProp(design, added.id, key, value);
    if (state[index]) design = setState(design, added.id, "open");
    ids.push(added.id);
  });
  for (const [a, pa, b, pb, section] of wires) {
    const made = connect(design, { element: ids[a], port: pa }, { element: ids[b], port: pb });
    if (!made.ok) throw new Error(`${a}.${pa} -> ${b}.${pb}: ${made.error}`);
    design = section === undefined ? made.design : updateWire(made.design, made.id, { section_mm2: section });
  }
  return design;
}
const codes = (issues: Issue[], level?: string): string[] => issues.filter(issue => !level || issue.level === level).map(issue => issue.code);

describe("the catalogue", () => {
  it("has unique kinds, ports and defaults that the properties accept", () => {
    expect(new Set(KINDS.map(def => def.kind)).size).toBe(KINDS.length);
    for (const def of KINDS) {
      expect(new Set(def.ports.map(port => port.id)).size, def.kind).toBe(def.ports.length);
      for (const port of def.ports) expect(port.at >= 0 && port.at <= 1, `${def.kind}.${port.id}`).toBe(true);
      for (const prop of def.props) expect(cleanProp(prop, def.defaults[prop.key]), `${def.kind}.${prop.key}`).toBeDefined();
      expect(Object.keys(def.defaults).sort(), def.kind).toEqual(def.props.map(prop => prop.key).sort());
    }
  });
  it("is worded in the seven languages: every kind, category, property and message", () => {
    const wanted = [...KINDS.map(def => `el_${def.kind}`), ...CATEGORY_ORDER.map(category => `elc_${category}`), ...new Set(KINDS.flatMap(def => def.props.map(prop => `elp_${prop.key}`)))];
    for (const language of ["en", "es", "de", "fr", "it", "ja", "zh"] as const) for (const key of wanted) expect(electricalCatalogues[language][key], `${language} ${key}`).toBeTruthy();
    for (const language of ["es", "de", "fr", "it", "ja", "zh"] as const) expect(electricalCatalogues[language].el_grid).not.toBe(electricalCatalogues.en.el_grid);
  });
  it("puts every port on its box's edge", () => {
    const element = addElement(emptyDesign(), "mcb", 100, 60)!.design.elements[0];
    expect(portPosition(element, "in")).toEqual({ x: 100, y: 60 + kindDef("mcb")!.h / 2 });
    expect(portPosition(element, "out")!.x).toBe(100 + kindDef("mcb")!.w);
    expect(portPosition(element, "nope")).toBeUndefined();
  });
});

describe("editing", () => {
  it("places on the grid, numbers the ids and keeps a property inside its limits", () => {
    let design = addElement(emptyDesign(), "mcb", 33, 47)!.design;
    design = addElement(design, "mcb", 0, 0)!.design;
    expect(design.elements.map(element => [element.id, element.x, element.y])).toEqual([["mcb-01", 40, 40], ["mcb-02", 0, 0]]);
    design = setProp(design, "mcb-01", "rating_a", 100000);
    expect(design.elements[0].props.rating_a).toBe(4000);
    expect(setProp(design, "mcb-01", "rating_a", "many")).toBe(design);
    expect(setProp(design, "mcb-01", "curve", "Z")).toBe(design);
    expect(setProp(design, "mcb-01", "nothing", 1)).toBe(design);
    expect(addElement(design, "warp-drive", 0, 0)).toBeUndefined();
  });
  it("joins only what can be joined, and says why not", () => {
    const design = build([["grid"], ["mcb"], ["battery"], ["node"], ["busbar-ac"], ["load"], ["load"]], []);
    const at = (index: number, port: string): PortRef => ({ element: design.elements[index].id, port });
    expect(canConnect(design, at(0, "out"), at(1, "in"))).toBeUndefined();
    expect(canConnect(design, at(0, "out"), at(0, "out"))).toBe("same_element");
    expect(canConnect(design, at(0, "out"), at(2, "dc"))).toBe("domain");
    expect(canConnect(design, at(0, "out"), { element: "ghost", port: "in" })).toBe("unknown_port");
    expect(canConnect(design, at(0, "out"), at(2, "sig"))).toBe("domain");
    expect(canConnect(design, at(0, "out"), at(1, "sig"))).toBe("unknown_port");   // a plain breaker has nothing to measure or switch it by
    expect(canConnect(design, at(3, "s1"), at(2, "sig"))).toBeUndefined();
    expect(canConnect(design, at(2, "sig"), at(2, "sig"))).toBe("same_element");
    // an automation controller gathers signals like a node does, and two hubs are not joined
    const plc = addElement(design, "plc", 0, 200)!.design;
    const hub = { element: "plc-01", port: "s1" };
    expect(canConnect(plc, hub, at(2, "sig"))).toBeUndefined();
    expect(canConnect(plc, hub, at(3, "s1"))).toBe("signal_pair");
    const first = connect(design, at(0, "out"), at(1, "in"));
    if (!first.ok) throw new Error("expected a wire");
    expect(canConnect(first.design, at(0, "out"), at(1, "in"))).toBe("exists");
    expect(canConnect(first.design, at(1, "in"), at(0, "out"))).toBe("exists");
    expect(canConnect(first.design, at(0, "out"), at(5, "in"))).toBe("busy");   // the grid's only port already has its wire
    // a busbar takes several
    const many = connect(connect(design, at(5, "in"), at(4, "o1")).ok ? (connect(design, at(5, "in"), at(4, "o1")) as { design: Design }).design : design, at(6, "in"), at(4, "o1"));
    expect(many.ok).toBe(true);
  });
  it("takes a wire away with its element, and a section is kept inside what a cable can be", () => {
    const design = build([["grid"], ["mcb"], ["load"]], [[0, "out", 1, "in", 2.5], [1, "out", 2, "in"]]);
    expect(design.wires[0].section_mm2).toBe(2.5);
    const without = removeElement(design, design.elements[1].id);
    expect([without.elements.length, without.wires.length]).toEqual([2, 0]);
    expect(updateWire(design, design.wires[0].id, { section_mm2: 9999 }).wires[0].section_mm2).toBe(400);
    expect(updateWire(design, design.wires[0].id, { section_mm2: null }).wires[0].section_mm2).toBeUndefined();
    const copy = duplicateElement(design, design.elements[1].id)!;
    expect(copy.design.elements.length).toBe(4);
    expect(copy.design.wires.length).toBe(2);   // the copy has no wires
    expect(addFrame(design, 0, 0, 10, 10)!.design.frames[0]).toMatchObject({ w: 80, h: 60 });
  });
  it("ties an element to a node and one of its channels, and to nothing that makes no sense", () => {
    const base = addElement(emptyDesign(), "meter-ac", 0, 0)!.design;
    const id = base.elements[0].id;
    expect(setBinding(base, id, { node: "electrical-1", channel: "grid" }).elements[0].bind).toEqual({ node: "electrical-1", channel: "grid" });
    expect(setBinding(base, id, { channel: "grid" }).elements[0].bind).toBeUndefined();          // a channel belongs to a node
    expect(setBinding(base, id, { node: "Bad Node", channel: "grid" }).elements[0].bind).toBeUndefined();
    expect(setBinding(base, id, { node: "electrical-1", channel: "Bad" }).elements[0].bind).toEqual({ node: "electrical-1" });
    const tied = setBinding(base, id, { node: "electrical-1", channel: "grid" });
    expect(parseElectricalDoc(JSON.parse(JSON.stringify(buildElectricalDoc(tied))))!.elements[0].bind).toEqual({ node: "electrical-1", channel: "grid" });
    expect(setBinding(tied, id, undefined).elements[0].bind).toBeUndefined();
  });
  it("draws wires at right angles", () => {
    const design = build([["grid"], ["mcb"]], [[0, "out", 1, "in"]]);
    const points = wirePath(design, design.wires[0]);
    expect(points.length).toBeGreaterThanOrEqual(2);
    for (let index = 1; index < points.length; index += 1) expect(points[index].x === points[index - 1].x || points[index].y === points[index - 1].y).toBe(true);
    expect(designBounds(design)!.minX).toBe(0);
    expect(designBounds(emptyDesign())).toBeUndefined();
  });
});

describe("the checks", () => {
  it("knows how much a cable can be protected with", () => {
    expect([ampacity(1), ampacity(1.5), ampacity(2.5), ampacity(6), ampacity(16), ampacity(300)]).toEqual([0, 10, 16, 32, 63, 200]);
  });
  it("sees two sources on one line, and lets a transfer switch separate them", () => {
    const bad = build([["grid"], ["generator"], ["busbar-ac"], ["load"]], [[0, "out", 2, "in"], [1, "out", 2, "o1"], [2, "o2", 3, "in"]]);
    expect(codes(analyse(bad).issues, "error")).toContain("backfeed");
    const good = build([["grid"], ["generator"], ["transfer"], ["mcb"], ["load"]], [[0, "out", 2, "a"], [1, "out", 2, "b"], [2, "out", 3, "in"], [3, "out", 4, "in"]]);
    expect(codes(analyse(good).issues, "error")).toEqual([]);
  });
  it("compares a breaker with what is behind it and a cable with the breaker in front of it", () => {
    const small = build([["grid"], ["mcb", { rating_a: 10 }], ["load", { power_w: 3000 }]], [[0, "out", 1, "in"], [1, "out", 2, "in"]]);
    expect(codes(analyse(small).issues)).toContain("breaker_small");
    const fine = build([["grid"], ["mcb", { rating_a: 16 }], ["load", { power_w: 3000 }]], [[0, "out", 1, "in"], [1, "out", 2, "in"]]);
    expect(codes(analyse(fine).issues)).not.toContain("breaker_small");
    const thin = build([["grid"], ["mcb", { rating_a: 32 }], ["load", { power_w: 3000 }]], [[0, "out", 1, "in"], [1, "out", 2, "in", 2.5]]);
    expect(codes(analyse(thin).issues, "error")).toContain("cable_small");
    const thick = build([["grid"], ["mcb", { rating_a: 32 }], ["load", { power_w: 3000 }]], [[0, "out", 1, "in"], [1, "out", 2, "in", 6]]);
    expect(codes(analyse(thick).issues, "error")).toEqual([]);
  });
  it("asks for protection, a residual-current device and a supply", () => {
    const bare = build([["grid"], ["socket"]], [[0, "out", 1, "in"]]);
    expect(codes(analyse(bare).issues)).toEqual(expect.arrayContaining(["no_breaker", "no_rcd"]));
    const guarded = build([["grid"], ["rcd"], ["mcb"], ["socket"]], [[0, "out", 1, "in"], [1, "out", 2, "in"], [2, "out", 3, "in"]]);
    expect(codes(analyse(guarded).issues)).toEqual([]);
    const cut = build([["grid"], ["mcb"], ["load"]], [[0, "out", 1, "in"], [1, "out", 2, "in"]], { 1: "open" });
    expect(codes(analyse(cut).issues)).toContain("no_supply");
  });
  it("compares the loads on a supply with what it can give", () => {
    const inverter = build([["inverter", { rated_w: 1000 }], ["mcb"], ["load", { power_w: 2500 }]], [[0, "acout", 1, "in"], [1, "out", 2, "in"]]);
    expect(codes(analyse(inverter).issues)).toContain("inverter_overload");
    const grid = build([["grid", { contracted_kw: 2 }], ["mcb", { rating_a: 32 }], ["load", { power_w: 3000 }]], [[0, "out", 1, "in"], [1, "out", 2, "in"]]);
    expect(codes(analyse(grid).issues)).toContain("grid_overload");
  });
  it("compares the voltages of a DC wire, and points out open ports and lone elements", () => {
    const mismatch = build([["battery", { nominal_v: 24 }], ["inverter", { nominal_dc_v: 48 }]], [[0, "dc", 1, "bat"]]);
    expect(codes(analyse(mismatch).issues)).toContain("dc_voltage");
    const same = build([["battery", { nominal_v: 48 }], ["inverter", { nominal_dc_v: 48 }]], [[0, "dc", 1, "bat"]]);
    expect(codes(analyse(same).issues)).not.toContain("dc_voltage");
    const lone = build([["mcb"], ["battery"], ["grid"]], [[0, "in", 2, "out"]]);
    const issues = analyse(lone).issues;
    expect(codes(issues)).toEqual(expect.arrayContaining(["orphan", "port_open"]));
  });
  it("adds up what is drawn", () => {
    const design = build([["pv-array", { peak_wp: 4000 }], ["battery", { nominal_v: 48, capacity_ah: 100 }], ["inverter", { rated_w: 5000 }], ["load", { power_w: 700 }], ["socket", { power_w: 300 }]], []);
    expect(analyse(design).totals).toMatchObject({ pv_wp: 4000, battery_kwh: 4.8, inverter_w: 5000, load_w: 1000, loads: 2, elements: 5 });
  });
});

describe("the example house", () => {
  const house = housePreset(t);
  it("is a whole drawing with nothing wrong in it", () => {
    expect(house.elements.length).toBeGreaterThan(25);
    expect(house.frames.length).toBe(3);
    const issues = analyse(house).issues;
    expect(codes(issues, "error")).toEqual([]);
    expect(codes(issues, "warn")).toEqual([]);
    expect(analyse(house).totals.inverter_w).toBe(16000);
  });
  it("survives being stored and read back", () => {
    const back = parseElectricalDoc(JSON.parse(JSON.stringify(buildElectricalDoc(house))))!;
    expect(back).toEqual(house);
    expect(electricalKey(back)).toBe(electricalKey(house));
  });
});

describe("storing the drawing", () => {
  it("does not trust what it reads", () => {
    const messy = {
      elements: [
        { id: "mcb-01", kind: "mcb", x: 20, y: 20, name: "ok", props: { rating_a: 99999, curve: "Z", extra: 1 } },
        { id: "mcb-01", kind: "mcb", x: 0, y: 0, name: "again", props: {} },
        { id: "ufo-01", kind: "ufo", x: 0, y: 0, name: "", props: {} },
        { id: "load-01", kind: "load", x: 200, y: 20, name: "", props: { power_w: 500 } },
        { id: "battery-01", kind: "battery", x: "far", y: 0, name: "", props: {} },
      ],
      wires: [
        { id: "wire-01", from: { element: "mcb-01", port: "out" }, to: { element: "load-01", port: "in" }, section_mm2: 2.5 },
        { id: "wire-02", from: { element: "mcb-01", port: "nope" }, to: { element: "load-01", port: "in" } },
        { id: "wire-03", from: { element: "mcb-01", port: "sig" }, to: { element: "load-01", port: "in" } },
        { id: "wire-04", from: { element: "mcb-01", port: "in" }, to: { element: "mcb-01", port: "out" } },
      ],
      frames: [{ id: "frame-01", name: "x", x: 0, y: 0, w: 200, h: 100, colour: "pink" }, { id: "frame-02", x: 0, y: 0, w: 5, h: 5 }],
    };
    const design = parseElectricalDoc(messy)!;
    expect(design.elements.map(element => element.id)).toEqual(["mcb-01", "load-01"]);
    expect(design.elements[0].props).toEqual({ manufacturer: "", model: "", rating_a: 4000, curve: "C", poles: "1P+N" });
    expect(design.wires.map(wire => wire.id)).toEqual(["wire-01"]);
    expect(design.frames.map(frame => [frame.id, frame.colour])).toEqual([["frame-01", "cyan"]]);
  });
  it("leaves the current drawing alone when a stored one is not a drawing", () => {
    const current = housePreset(t);
    for (const bad of [null, 5, "text", [], {}, { elements: 1, wires: [] }]) expect(applyElectricalDoc(bad, current)).toBe(current);
    expect(applyElectricalDoc({ elements: [], wires: [], frames: [] }, current)).toEqual(EMPTY_DESIGN);
  });
  it("gives the same key however the keys were ordered", () => {
    const a = parseElectricalDoc({ elements: [{ id: "load-01", kind: "load", x: 0, y: 0, name: "", props: { power_w: 1 } }], wires: [], frames: [] })!;
    const b = parseElectricalDoc({ frames: [], wires: [], elements: [{ props: { power_w: 1 }, name: "", y: 0, x: 0, kind: "load", id: "load-01" }] })!;
    expect(electricalKey(a)).toBe(electricalKey(b));
  });
});
