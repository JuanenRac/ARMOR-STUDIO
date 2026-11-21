import { describe, expect, it } from "vitest";
import * as alarmModel from "./alarm/model";
import * as alarmOps from "./alarm/ops";
import { alarmKey, buildAlarmDoc, parseAlarmDoc } from "./alarm/sync";
import { analyse } from "./electrical/analysis";
import { electricalCatalogues } from "./electricalText";
import * as electricalModel from "./electrical/model";
import * as electricalOps from "./electrical/ops";
import { housePreset } from "./electrical/presets";
import { buildElectricalDoc, electricalKey, parseElectricalDoc } from "./electrical/sync";
import * as networkModel from "./network/model";
import * as networkOps from "./network/ops";
import { buildNetworkDoc, networkKey, parseNetworkDoc } from "./network/sync";

/** The three designers (electrical, network, alarm) share one shape of document; these tests drive each through the same checks. */
type PortRef = { element: string; port: string };
type Doc = { elements: Array<{ id: string; kind: string; x: number; y: number }>; wires: Array<{ id: string; from: PortRef; to: PortRef }>; frames: Array<{ id: string; w: number; h: number }> };
type Connected = { ok: true; design: Doc; id: string } | { ok: false; error: string };
type Kit = {
  name: string;
  kinds: ReadonlyArray<{ kind: string; ports: ReadonlyArray<{ id: string }> }>;
  limits: { elements: number; wires: number; frames: number };
  add: (design: Doc, kind: string, x: number, y: number) => { design: Doc; id: string } | undefined;
  can: (design: Doc, from: PortRef, to: PortRef) => string | undefined;
  connect: (design: Doc, from: PortRef, to: PortRef) => Connected;
  remove: (design: Doc, id: string) => Doc;
  addFrame: (design: Doc, x: number, y: number) => { design: Doc; id: string } | undefined;
  parse: (document: unknown) => Doc | undefined;
  build: (design: Doc) => Record<string, unknown>;
  key: (design: Doc) => string;
};

const as = <T>(value: unknown): T => value as T;
const kits: Kit[] = [
  {
    name: "electrical", kinds: electricalModel.KINDS, limits: electricalOps.LIMITS,
    add: (d, k, x, y) => as(electricalOps.addElement(as(d), k, x, y)),
    can: (d, a, b) => electricalOps.canConnect(as(d), a, b),
    connect: (d, a, b) => as<Connected>(electricalOps.connect(as(d), a, b)),
    remove: (d, id) => as(electricalOps.removeElement(as(d), id)),
    addFrame: (d, x, y) => as(electricalOps.addFrame(as(d), x, y)),
    parse: document => as(parseElectricalDoc(document)), build: d => buildElectricalDoc(as(d)), key: d => electricalKey(as(d)),
  },
  {
    name: "network", kinds: networkModel.KINDS, limits: networkOps.LIMITS,
    add: (d, k, x, y) => as(networkOps.addElement(as(d), k, x, y)),
    can: (d, a, b) => networkOps.canConnect(as(d), a, b),
    connect: (d, a, b) => as<Connected>(networkOps.connect(as(d), a, b)),
    remove: (d, id) => as(networkOps.removeElement(as(d), id)),
    addFrame: (d, x, y) => as(networkOps.addFrame(as(d), x, y)),
    parse: document => as(parseNetworkDoc(document)), build: d => buildNetworkDoc(as(d)), key: d => networkKey(as(d)),
  },
  {
    name: "alarm", kinds: alarmModel.KINDS, limits: alarmOps.LIMITS,
    add: (d, k, x, y) => as(alarmOps.addElement(as(d), k, x, y)),
    can: (d, a, b) => alarmOps.canConnect(as(d), a, b),
    connect: (d, a, b) => as<Connected>(alarmOps.connect(as(d), a, b)),
    remove: (d, id) => as(alarmOps.removeElement(as(d), id)),
    addFrame: (d, x, y) => as(alarmOps.addFrame(as(d), x, y)),
    parse: document => as(parseAlarmDoc(document)), build: d => buildAlarmDoc(as(d)), key: d => alarmKey(as(d)),
  },
];

/** A small generator with a fixed seed, so a failure can be repeated. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const empty = (): Doc => ({ elements: [], wires: [], frames: [] });

/** What must hold of any design the designer holds, whatever was done to it. */
function expectSound(kit: Kit, design: Doc, label: string): void {
  const ids = design.elements.map(element => element.id);
  expect(new Set(ids).size, `${label}: element ids are unique`).toBe(ids.length);
  expect(new Set(design.wires.map(wire => wire.id)).size, `${label}: wire ids are unique`).toBe(design.wires.length);
  expect(design.elements.length, `${label}: elements within the limit`).toBeLessThanOrEqual(kit.limits.elements);
  expect(design.wires.length, `${label}: wires within the limit`).toBeLessThanOrEqual(kit.limits.wires);
  expect(design.frames.length, `${label}: frames within the limit`).toBeLessThanOrEqual(kit.limits.frames);
  const byId = new Map(design.elements.map(element => [element.id, element]));
  for (const wire of design.wires) {
    for (const end of [wire.from, wire.to]) {
      const element = byId.get(end.element);
      expect(element, `${label}: ${wire.id} ends on an element that exists`).toBeDefined();
      const def = kit.kinds.find(candidate => candidate.kind === element!.kind);
      expect(def?.ports.some(port => port.id === end.port), `${label}: ${wire.id} ends on a port that exists`).toBe(true);
    }
    expect(wire.from.element, `${label}: ${wire.id} joins two different elements`).not.toBe(wire.to.element);
  }
}

describe.each(kits)("the $name designer: any series of edits", kit => {
  it("keeps the design sound while elements are added, joined and removed (fixed seed)", () => {
    const random = seeded(0xa11ce + kit.name.length);
    let design = empty();
    let joined = 0, refused = 0;
    for (let step = 0; step < 400; step += 1) {
      const pick = random();
      if (pick < 0.4 || design.elements.length < 2) {
        const def = kit.kinds[Math.floor(random() * kit.kinds.length)];
        const added = kit.add(design, def.kind, Math.round(random() * 2000), Math.round(random() * 1000));
        if (added) design = added.design;
      } else if (pick < 0.85) {
        const a = design.elements[Math.floor(random() * design.elements.length)], b = design.elements[Math.floor(random() * design.elements.length)];
        const defA = kit.kinds.find(def => def.kind === a.kind)!, defB = kit.kinds.find(def => def.kind === b.kind)!;
        const from = { element: a.id, port: defA.ports[Math.floor(random() * defA.ports.length)].id }, to = { element: b.id, port: defB.ports[Math.floor(random() * defB.ports.length)].id };
        const reason = kit.can(design, from, to);
        const made = kit.connect(design, from, to);
        expect(made.ok, `${from.element}.${from.port} -> ${to.element}.${to.port}`).toBe(reason === undefined);
        if (made.ok) { design = made.design; joined += 1; } else { expect(made.error).toBe(reason); refused += 1; }
      } else {
        design = kit.remove(design, design.elements[Math.floor(random() * design.elements.length)].id);
      }
      if (step % 20 === 0) expectSound(kit, design, `step ${step}`);
    }
    expectSound(kit, design, "end");
    expect(joined).toBeGreaterThan(0);
    expect(refused).toBeGreaterThan(0);
  });

  it("gives every kind a place, a distinct id, and its own copy of the defaults", () => {
    let design = empty();
    for (const def of kit.kinds) {
      const added = kit.add(design, def.kind, 20, 40)!;
      expect(added, def.kind).toBeDefined();
      design = added.design;
    }
    expect(design.elements.length).toBe(kit.kinds.length);
    expectSound(kit, design, "one of each");
    expect(kit.add(design, "no-such-kind", 0, 0)).toBeUndefined();
    expect(kit.add(design, "", 0, 0)).toBeUndefined();
  });

  it("refuses a wire between an element and itself, to a port that is not there and twice", () => {
    let design = empty();
    const a = kit.add(design, kit.kinds[0].kind, 0, 0)!;
    design = a.design;
    const own = kit.kinds[0].ports[0].id;
    expect(kit.can(design, { element: a.id, port: own }, { element: a.id, port: own })).toBeDefined();
    expect(kit.can(design, { element: a.id, port: own }, { element: "ghost", port: "x" })).toBe("unknown_port");
    expect(kit.can(design, { element: a.id, port: "no-port" }, { element: a.id, port: own })).toBe("unknown_port");
    expect(kit.can(empty(), { element: "a", port: "b" }, { element: "c", port: "d" })).toBe("unknown_port");
    expect(kit.connect(design, { element: a.id, port: own }, { element: a.id, port: own }).ok).toBe(false);
  });

  it("stops adding at the limit of elements and of frames", () => {
    let design = empty();
    const kind = kit.kinds[0].kind;
    for (let index = 0; index < kit.limits.elements; index += 1) design = kit.add(design, kind, index, 0)!.design;
    expect(design.elements.length).toBe(kit.limits.elements);
    expect(kit.add(design, kind, 0, 0)).toBeUndefined();
    expectSound(kit, design, "full");
    let framed = empty();
    for (let index = 0; index < kit.limits.frames; index += 1) framed = kit.addFrame(framed, index * 20, 0)!.design;
    expect(kit.addFrame(framed, 0, 0)).toBeUndefined();
    expect(new Set(framed.frames.map(frame => frame.id)).size).toBe(kit.limits.frames);
  });

  it("writes a document that reads back to the same design, and reading it twice changes nothing (fixed seed)", () => {
    const random = seeded(0xd0c + kit.name.length);
    let design = empty();
    for (let step = 0; step < 150; step += 1) {
      const def = kit.kinds[Math.floor(random() * kit.kinds.length)];
      const added = kit.add(design, def.kind, Math.round(random() * 3000), Math.round(random() * 2000));
      if (added) design = added.design;
      if (design.elements.length >= 2 && random() < 0.7) {
        const a = design.elements[Math.floor(random() * design.elements.length)], b = design.elements[Math.floor(random() * design.elements.length)];
        const defA = kit.kinds.find(candidate => candidate.kind === a.kind)!, defB = kit.kinds.find(candidate => candidate.kind === b.kind)!;
        const made = kit.connect(design, { element: a.id, port: defA.ports[Math.floor(random() * defA.ports.length)].id }, { element: b.id, port: defB.ports[Math.floor(random() * defB.ports.length)].id });
        if (made.ok) design = made.design;
      }
    }
    const once = kit.parse(JSON.parse(JSON.stringify(kit.build(design))))!;
    expect(once).toBeDefined();
    expect(once.elements.map(element => element.id)).toEqual(design.elements.map(element => element.id));
    expect(once.wires.map(wire => wire.id)).toEqual(design.wires.map(wire => wire.id));
    const twice = kit.parse(JSON.parse(JSON.stringify(kit.build(once))))!;
    expect(kit.key(twice)).toBe(kit.key(once));
    expect(kit.key(design)).toBe(kit.key(design));
    expectSound(kit, once, "read back");
  });

  it("reads a hostile document without throwing and keeps only what is sound (fixed seed)", () => {
    for (const hostile of [undefined, null, 0, 1, "text", true, [], [1, 2, 3], {}, { elements: 1, wires: [] }, { elements: [], wires: "x" }, { elements: null, wires: null }]) {
      expect(kit.parse(hostile), JSON.stringify(hostile)).toBeUndefined();
    }
    expect(kit.parse({ elements: [], wires: [] })).toEqual({ elements: [], wires: [], frames: [] });
    const random = seeded(0xbad + kit.name.length);
    const junk = (): unknown => {
      const options: unknown[] = [null, 0, -1, 1e308, Number.NaN, "", "x", "a".repeat(500), true, [], {}, "__proto__", { __proto__: { polluted: true } }];
      return options[Math.floor(random() * options.length)];
    };
    const kinds = kit.kinds.map(def => def.kind);
    for (let round = 0; round < 300; round += 1) {
      const elements: unknown[] = [], wires: unknown[] = [];
      for (let index = 0; index < Math.floor(random() * 12); index += 1) {
        elements.push(random() < 0.3 ? junk() : { id: random() < 0.2 ? junk() : `e${Math.floor(random() * 6)}`, kind: random() < 0.2 ? junk() : kinds[Math.floor(random() * kinds.length)], x: random() < 0.2 ? junk() : Math.floor(random() * 500), y: random() < 0.2 ? junk() : Math.floor(random() * 500), name: junk(), props: random() < 0.5 ? { power_w: junk(), rating_a: junk(), ip: junk() } : junk(), bind: junk(), state: junk() });
      }
      for (let index = 0; index < Math.floor(random() * 12); index += 1) {
        const end = (): unknown => (random() < 0.3 ? junk() : { element: `e${Math.floor(random() * 6)}`, port: random() < 0.5 ? "in" : random() < 0.5 ? "out" : "wan" });
        wires.push(random() < 0.2 ? junk() : { id: random() < 0.2 ? junk() : `w${Math.floor(random() * 8)}`, from: end(), to: end(), section_mm2: junk(), length_m: junk(), label: junk() });
      }
      const parsed = kit.parse({ elements, wires, frames: random() < 0.5 ? [junk(), { id: "f1", x: 0, y: 0, w: 100, h: 100 }, { id: "f1", x: 0, y: 0, w: 100, h: 100 }] : junk() });
      expect(parsed, "a document with lists is a design").toBeDefined();
      expectSound(kit, parsed!, `round ${round}`);
      for (const frame of parsed!.frames) expect(frame.w >= 40 && frame.h >= 40, "a frame keeps a size").toBe(true);
      expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    }
  });

  it("keeps only as many items as the limits allow from a document that is far too big", () => {
    const kind = kit.kinds[0].kind;
    const elements = Array.from({ length: kit.limits.elements * 3 }, (_, index) => ({ id: `e${index}`, kind, x: 0, y: 0 }));
    const parsed = kit.parse({ elements, wires: [], frames: Array.from({ length: kit.limits.frames * 3 }, (_, index) => ({ id: `f${index}`, x: 0, y: 0, w: 100, h: 100 })) })!;
    expect(parsed.elements.length).toBeLessThanOrEqual(kit.limits.elements);
    expect(parsed.frames.length).toBeLessThanOrEqual(kit.limits.frames);
    const twice = kit.parse({ elements: [elements[0], elements[0], { ...elements[0], x: 40 }], wires: [] })!;
    expect(twice.elements.length).toBe(1);
  });
});

describe("the electrical designer: properties, wires and checks", () => {
  const text = (key: string): string => electricalCatalogues.en[key] ?? key;
  const build = (kinds: string[]): { design: electricalModel.Design; ids: string[] } => {
    let design: electricalModel.Design = { elements: [], wires: [], frames: [] };
    const ids: string[] = [];
    kinds.forEach((kind, index) => { const added = electricalOps.addElement(design, kind, index * 200, 0)!; design = added.design; ids.push(added.id); });
    return { design, ids };
  };

  it("keeps a number inside its limits, rounds it, and ignores what is not a number", () => {
    const { design, ids } = build(["mcb"]);
    for (const [value, expected] of [[1, 1], [0, 1], [-5, 1], [4000, 4000], [99999, 4000], [16.0004, 16], [15.9996, 16], [6.25, 6.25]] as const) {
      expect(electricalOps.setProp(design, ids[0], "rating_a", value).elements[0].props.rating_a, String(value)).toBe(expected);
    }
    for (const bad of [Number.NaN, Infinity, -Infinity, "16", null, undefined, {}, []]) expect(electricalOps.setProp(design, ids[0], "rating_a", bad), String(bad)).toBe(design);
    expect(electricalOps.setProp(design, ids[0], "no-such-property", 5)).toBe(design);
    expect(electricalOps.setProp(design, "no-such-element", "rating_a", 5)).toBe(design);
    expect(electricalOps.setProp(design, ids[0], "curve", "Z")).toBe(design);
    expect(electricalOps.setProp(design, ids[0], "curve", "D").elements[0].props.curve).toBe("D");
    expect(electricalOps.setProp(design, ids[0], "manufacturer", "x".repeat(200)).elements[0].props.manufacturer).toBe("x".repeat(40));
  });

  it("accepts a binding only in the shape the server uses, and a channel only with a node", () => {
    const { design, ids } = build(["meter-ac"]);
    const bound = (bind: electricalModel.Binding | undefined) => electricalOps.setBinding(design, ids[0], bind).elements[0].bind;
    expect(bound({ solar: "house/inverter1" })).toEqual({ solar: "house/inverter1" });
    expect(bound({ node: "node-1", channel: "ch2" })).toEqual({ node: "node-1", channel: "ch2" });
    expect(bound({ channel: "ch2" })).toBeUndefined();
    expect(bound({ solar: "Bad Value" })).toBeUndefined();
    expect(bound({ solar: "no-slash" })).toBeUndefined();
    expect(bound({ node: "../etc" })).toBeUndefined();
    expect(bound({ node: "x".repeat(65) })).toBeUndefined();
    expect(bound({ node: "ok", channel: "A".repeat(3) })).toEqual({ node: "ok" });
    expect(bound(undefined)).toBeUndefined();
    expect("bind" in electricalOps.setBinding(electricalOps.setBinding(design, ids[0], { node: "n" }), ids[0], undefined).elements[0]).toBe(false);
  });

  it("keeps a wire's section and length inside their ranges and lets them be taken off", () => {
    const { design, ids } = build(["mcb", "load"]);
    const made = electricalOps.connect(design, { element: ids[0], port: "out" }, { element: ids[1], port: "in" });
    if (!made.ok) throw new Error(made.error);
    const wireOf = (patch: Parameters<typeof electricalOps.updateWire>[2]) => electricalOps.updateWire(made.design, made.id, patch).wires[0];
    expect(wireOf({ section_mm2: 0 }).section_mm2).toBe(0.5);
    expect(wireOf({ section_mm2: 9999 }).section_mm2).toBe(400);
    expect(wireOf({ length_m: -3 }).length_m).toBe(0);
    expect(wireOf({ length_m: 1e9 }).length_m).toBe(5000);
    expect(wireOf({ label: "L".repeat(100) }).label).toBe("L".repeat(40));
    const full = electricalOps.updateWire(made.design, made.id, { section_mm2: 2.5, length_m: 10, label: "x" });
    expect(electricalOps.updateWire(full, made.id, { section_mm2: null, length_m: null, label: "" }).wires[0]).toEqual({ id: made.id, from: { element: ids[0], port: "out" }, to: { element: ids[1], port: "in" } });
    expect(electricalOps.updateWire(made.design, "no-such-wire", { section_mm2: 4 })).toEqual(made.design);
  });

  it("joins only the same kind of line, and a single-use port only once", () => {
    const { design, ids } = build(["grid", "mcb", "load", "pv-array", "load-dc"]);
    expect(electricalOps.canConnect(design, { element: ids[0], port: "out" }, { element: ids[3], port: "dc" })).toBe("domain");
    expect(electricalOps.canConnect(design, { element: ids[0], port: "out" }, { element: ids[1], port: "in" })).toBeUndefined();
    const first = electricalOps.connect(design, { element: ids[0], port: "out" }, { element: ids[1], port: "in" });
    if (!first.ok) throw new Error(first.error);
    expect(electricalOps.canConnect(first.design, { element: ids[1], port: "in" }, { element: ids[0], port: "out" })).toBe("exists");
    expect(electricalOps.canConnect(first.design, { element: ids[0], port: "out" }, { element: ids[2], port: "in" })).toBe("busy");
    expect(electricalOps.canConnect(first.design, { element: ids[3], port: "dc" }, { element: ids[4], port: "in" })).toBeUndefined();
    expect(electricalOps.removeElement(first.design, ids[1]).wires).toEqual([]);
    expect(electricalOps.removeWire(first.design, first.id).wires).toEqual([]);
  });

  it("moves, nudges and copies elements without sharing their properties or binding", () => {
    const { design, ids } = build(["mcb"]);
    const moved = electricalOps.moveElement(design, ids[0], 47, 33);
    expect([moved.elements[0].x, moved.elements[0].y]).toEqual([40, 40]);
    expect(electricalOps.nudgeElements(moved, [ids[0], "ghost"], -5, 7).elements[0]).toMatchObject({ x: 35, y: 47 });
    expect(electricalOps.nudgeElements(moved, [], 100, 100)).toEqual(moved);
    const bound = electricalOps.setBinding(moved, ids[0], { node: "node-1" });
    const copied = electricalOps.duplicateElement(bound, ids[0])!;
    expect(copied.id).not.toBe(ids[0]);
    expect("bind" in copied.design.elements[1]).toBe(false);
    expect(copied.design.elements[1].props).toEqual(copied.design.elements[0].props);
    expect(copied.design.elements[1].props).not.toBe(copied.design.elements[0].props);
    expect(electricalOps.duplicateElement(bound, "ghost")).toBeUndefined();
    expect(electricalOps.renameElement(bound, ids[0], "n".repeat(100)).elements[0].name.length).toBe(60);
  });

  it("carries the elements inside a frame and keeps its size above the minimum", () => {
    const { design, ids } = build(["mcb", "load"]);
    const framed = electricalOps.addFrame(design, 0, 0, 10, 10)!;
    expect(framed.design.frames[0].w).toBeGreaterThanOrEqual(80);
    expect(framed.design.frames[0].h).toBeGreaterThanOrEqual(60);
    const wide = electricalOps.updateFrame(framed.design, framed.id, { x: -20, y: -20, w: 260, h: 200, name: "n".repeat(90), colour: "rose" });
    expect(wide.frames[0].name.length).toBe(60);
    expect(electricalOps.elementsInFrame(wide, wide.frames[0])).toEqual([ids[0]]);
    const small = electricalOps.updateFrame(wide, framed.id, { w: 4, h: 4 });
    expect(small.frames[0].w).toBe(80);
    expect(electricalOps.elementsInFrame(small, small.frames[0])).toEqual([]);
    expect(electricalOps.removeFrame(wide, framed.id).frames).toEqual([]);
  });

  it("checks the house preset the same way every time, and never fails when any one element is taken away", () => {
    const house = housePreset(text);
    const first = analyse(house), second = analyse(house);
    expect(second).toEqual(first);
    for (const element of house.elements) {
      const less = analyse(electricalOps.removeElement(house, element.id));
      expect(less.totals.elements, element.id).toBe(house.elements.length - 1);
      for (const issue of less.issues) expect(["error", "warn", "info"]).toContain(issue.level);
      for (const value of Object.values(less.totals)) expect(Number.isFinite(value) && value >= 0, `${element.id}: ${JSON.stringify(less.totals)}`).toBe(true);
    }
    expect(analyse({ elements: [], wires: [], frames: [] }).totals).toMatchObject({ elements: 0, wires: 0, pv_wp: 0, load_w: 0 });
  });

  it("rates a cable by the largest section of the table that it reaches, and none below the smallest", async () => {
    const { ampacity } = await import("./electrical/analysis");
    expect([0, 0.5, 1, 1.4].map(ampacity)).toEqual([0, 0, 0, 0]);
    expect([1.5, 2, 2.5, 3, 4, 95, 96, 400].map(ampacity)).toEqual([10, 10, 16, 16, 25, 200, 200, 200]);
    let last = 0;
    for (const section of [0.5, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400]) {
      const rating = ampacity(section);
      expect(rating, String(section)).toBeGreaterThanOrEqual(last);
      last = rating;
    }
  });
});
