/**
 * Electrical Designer: the model of the house's electrical diagram (elements with ports, the wires between them, and the frames that group them into
 * panels) and the catalogue of what can be drawn: sources, storage, converters, protections, switches, distribution, measurement and loads, for the
 * 230 V AC side and the DC side of the solar system. Everything here is plain data and pure functions.
 * Nothing in the diagram switches anything: it is a drawing and a set of checks; the nodes that will read and switch real equipment are a separate step.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */

export type Domain = "ac" | "dc" | "signal";
export type Side = "left" | "right" | "top" | "bottom";
export type Category = "source" | "storage" | "conversion" | "protection" | "switching" | "distribution" | "measure" | "load";

export type PortDef = {
  id: string; domain: Domain; side: Side;
  /** Where along its side: 0 to 1. */
  at: number;
  /** A port that takes several wires (a busbar, a junction, a node's signal inputs). */
  multi?: boolean;
  /** A port the design is incomplete without. */
  required?: boolean;
};

export type PropDef =
  | { key: string; type: "number"; unit?: string; min: number; max: number; step?: number }
  | { key: string; type: "text"; max: number }
  | { key: string; type: "choice"; choices: readonly string[] };
export type PropValue = number | string;
export type Props = Record<string, PropValue>;

export type KindDef = {
  kind: string; category: Category; w: number; h: number; ports: readonly PortDef[];
  props: readonly PropDef[]; defaults: Props;
  /** The solar device (inverter or battery) a diagram element can be tied to, to show its live readings. */
  solar?: "inverter" | "battery";
  /** Can be switched from a node one day (it is only drawn as such today). */
  controllable?: boolean;
};

export const CATEGORY_COLOUR: Record<Category, string> = {
  source: "#fbbf24", storage: "#34d399", conversion: "#a78bfa", protection: "#f87171", switching: "#fb923c", distribution: "#94a3b8", measure: "#22d3ee", load: "#60a5fa",
};
export const CATEGORY_ORDER: readonly Category[] = ["source", "storage", "conversion", "protection", "switching", "distribution", "measure", "load"];
export const DOMAIN_COLOUR: Record<Domain, string> = { ac: "#ffb020", dc: "#ff5c7a", signal: "#22d3ee" };

const port = (id: string, domain: Domain, side: Side, at = 0.5, extra: Partial<PortDef> = {}): PortDef => ({ id, domain, side, at, ...extra });
const series = (domain: "ac" | "dc"): PortDef[] => [port("in", domain, "left", 0.5, { required: true }), port("out", domain, "right", 0.5, { required: true })];
const sig = (): PortDef => port("sig", "signal", "top", 0.5);
const num = (key: string, unit: string, min: number, max: number, step = 1): PropDef => ({ key, type: "number", unit, min, max, step });
const choice = (key: string, choices: readonly string[]): PropDef => ({ key, type: "choice", choices });
const rating = (): PropDef => num("rating_a", "A", 1, 4000);
const CURVES = ["B", "C", "D"] as const;

export const KINDS: readonly KindDef[] = [
  // ---- sources ----
  { kind: "grid", category: "source", w: 96, h: 64, ports: [port("out", "ac", "right", 0.5, { required: true })], props: [num("voltage_v", "V", 100, 480), num("contracted_kw", "kW", 0, 500, 0.01)], defaults: { voltage_v: 230, contracted_kw: 5.75 } },
  { kind: "pv-array", category: "source", w: 96, h: 64, ports: [port("dc", "dc", "right", 0.5, { required: true })], props: [num("peak_wp", "Wp", 0, 500000), num("strings", "", 1, 64), num("voc_v", "V", 0, 1500)], defaults: { peak_wp: 0, strings: 1, voc_v: 0 } },
  { kind: "generator", category: "source", w: 96, h: 64, ports: [port("out", "ac", "right", 0.5, { required: true })], props: [num("rated_w", "W", 0, 500000)], defaults: { rated_w: 3000 } },
  // ---- storage ----
  { kind: "battery", category: "storage", w: 112, h: 72, ports: [port("dc", "dc", "right", 0.5, { required: true }), sig()], props: [num("nominal_v", "V", 6, 1000), num("capacity_ah", "Ah", 0, 100000), choice("chemistry", ["LiFePO4", "NMC", "Lead", "other"]), num("modules", "", 1, 200)], defaults: { nominal_v: 48, capacity_ah: 0, chemistry: "LiFePO4", modules: 1 }, solar: "battery" },
  // ---- conversion ----
  { kind: "inverter", category: "conversion", w: 140, h: 100, ports: [port("acin", "ac", "left", 0.3), port("acout", "ac", "right", 0.5, { required: true }), port("pv", "dc", "bottom", 0.3), port("bat", "dc", "bottom", 0.7, { required: true }), sig()],
    props: [num("rated_w", "W", 0, 500000), num("nominal_dc_v", "V", 6, 1000), num("acin_max_w", "W", 0, 500000)], defaults: { rated_w: 5000, nominal_dc_v: 48, acin_max_w: 2000 }, solar: "inverter" },
  { kind: "mppt", category: "conversion", w: 112, h: 64, ports: [port("pv", "dc", "left", 0.5, { required: true }), port("out", "dc", "right", 0.5, { required: true }), sig()], props: [num("rated_w", "W", 0, 500000), num("nominal_dc_v", "V", 6, 1000)], defaults: { rated_w: 3000, nominal_dc_v: 48 } },
  { kind: "charger", category: "conversion", w: 112, h: 64, ports: [port("in", "ac", "left", 0.5, { required: true }), port("out", "dc", "right", 0.5, { required: true }), sig()], props: [num("rated_w", "W", 0, 500000), num("nominal_dc_v", "V", 6, 1000)], defaults: { rated_w: 1500, nominal_dc_v: 48 } },
  { kind: "dc-dc", category: "conversion", w: 112, h: 64, ports: series("dc"), props: [num("rated_w", "W", 0, 100000), num("nominal_dc_v", "V", 3, 1000)], defaults: { rated_w: 300, nominal_dc_v: 12 } },
  // ---- protection ----
  { kind: "mcb", category: "protection", w: 80, h: 56, ports: series("ac"), props: [rating(), choice("curve", CURVES), choice("poles", ["1P+N", "2P", "1P"])], defaults: { rating_a: 16, curve: "C", poles: "1P+N" } },
  { kind: "mcb-dc", category: "protection", w: 80, h: 56, ports: series("dc"), props: [rating(), num("voltage_v", "V", 6, 1500)], defaults: { rating_a: 63, voltage_v: 48 } },
  { kind: "rcd", category: "protection", w: 80, h: 56, ports: series("ac"), props: [rating(), num("sensitivity_ma", "mA", 10, 1000), choice("type", ["AC", "A", "F", "B"])], defaults: { rating_a: 40, sensitivity_ma: 30, type: "A" } },
  { kind: "fuse-dc", category: "protection", w: 80, h: 56, ports: series("dc"), props: [rating(), num("voltage_v", "V", 6, 1500)], defaults: { rating_a: 100, voltage_v: 48 } },
  { kind: "spd", category: "protection", w: 72, h: 56, ports: [port("in", "ac", "left", 0.5, { required: true })], props: [choice("type", ["T1", "T2", "T1+T2"])], defaults: { type: "T2" } },
  { kind: "isolator", category: "protection", w: 80, h: 56, ports: series("ac"), props: [rating()], defaults: { rating_a: 63 } },
  // ---- switching ----
  { kind: "contactor", category: "switching", w: 80, h: 56, ports: [...series("ac"), sig()], props: [rating(), choice("coil", ["230V", "24V", "12V"])], defaults: { rating_a: 25, coil: "230V" }, controllable: true },
  { kind: "e-breaker", category: "switching", w: 88, h: 60, ports: [...series("ac"), sig()], props: [rating(), choice("curve", CURVES)], defaults: { rating_a: 16, curve: "C" }, controllable: true },
  { kind: "e-breaker-dc", category: "switching", w: 88, h: 60, ports: [...series("dc"), sig()], props: [rating(), num("voltage_v", "V", 6, 1500)], defaults: { rating_a: 63, voltage_v: 48 }, controllable: true },
  { kind: "relay", category: "switching", w: 80, h: 56, ports: [...series("ac"), sig()], props: [rating(), choice("coil", ["230V", "24V", "12V", "5V"])], defaults: { rating_a: 10, coil: "12V" }, controllable: true },
  { kind: "diverter", category: "switching", w: 104, h: 64, ports: [...series("ac"), sig()], props: [num("rated_w", "W", 0, 50000)], defaults: { rated_w: 3000 }, controllable: true },
  { kind: "transfer", category: "switching", w: 104, h: 80, ports: [port("a", "ac", "left", 0.3, { required: true }), port("b", "ac", "left", 0.7), port("out", "ac", "right", 0.5, { required: true }), sig()], props: [rating(), choice("mode", ["manual", "automatic"])], defaults: { rating_a: 40, mode: "manual" }, controllable: true },
  // ---- distribution ----
  { kind: "busbar-ac", category: "distribution", w: 36, h: 480, ports: [port("in", "ac", "left", 0.5, { multi: true, required: true }), port("o1", "ac", "right", 1 / 12, { multi: true }), port("o2", "ac", "right", 0.25, { multi: true }), port("o3", "ac", "right", 5 / 12, { multi: true }), port("o4", "ac", "right", 7 / 12, { multi: true }), port("o5", "ac", "right", 0.75, { multi: true }), port("o6", "ac", "right", 11 / 12, { multi: true })], props: [rating()], defaults: { rating_a: 63 } },
  { kind: "busbar-dc", category: "distribution", w: 36, h: 480, ports: [port("in", "dc", "left", 0.5, { multi: true, required: true }), port("o1", "dc", "right", 1 / 12, { multi: true }), port("o2", "dc", "right", 0.25, { multi: true }), port("o3", "dc", "right", 5 / 12, { multi: true }), port("o4", "dc", "right", 7 / 12, { multi: true }), port("o5", "dc", "right", 0.75, { multi: true }), port("o6", "dc", "right", 11 / 12, { multi: true })], props: [num("nominal_v", "V", 6, 1000)], defaults: { nominal_v: 48 } },
  { kind: "junction-ac", category: "distribution", w: 40, h: 40, ports: [port("l", "ac", "left", 0.5, { multi: true }), port("r", "ac", "right", 0.5, { multi: true }), port("t", "ac", "top", 0.5, { multi: true }), port("b", "ac", "bottom", 0.5, { multi: true })], props: [], defaults: {} },
  { kind: "junction-dc", category: "distribution", w: 40, h: 40, ports: [port("l", "dc", "left", 0.5, { multi: true }), port("r", "dc", "right", 0.5, { multi: true }), port("t", "dc", "top", 0.5, { multi: true }), port("b", "dc", "bottom", 0.5, { multi: true })], props: [], defaults: {} },
  // ---- measurement ----
  { kind: "meter-ac", category: "measure", w: 88, h: 60, ports: [...series("ac"), sig()], props: [rating(), choice("kind", ["direct", "CT"])], defaults: { rating_a: 63, kind: "direct" } },
  { kind: "meter-dc", category: "measure", w: 88, h: 60, ports: [...series("dc"), sig()], props: [num("shunt_a", "A", 1, 4000)], defaults: { shunt_a: 200 } },
  { kind: "plc", category: "measure", w: 128, h: 56, ports: [port("s1", "signal", "bottom", 1 / 12, { multi: true }), port("s2", "signal", "bottom", 3 / 12, { multi: true }), port("s3", "signal", "bottom", 5 / 12, { multi: true }), port("s4", "signal", "bottom", 7 / 12, { multi: true }), port("s5", "signal", "bottom", 9 / 12, { multi: true }), port("s6", "signal", "bottom", 11 / 12, { multi: true })], props: [num("channels", "", 1, 64)], defaults: { channels: 8 } },
  { kind: "node", category: "measure", w: 128, h: 56, ports: [port("s1", "signal", "bottom", 0.2, { multi: true }), port("s2", "signal", "bottom", 0.4, { multi: true }), port("s3", "signal", "bottom", 0.6, { multi: true }), port("s4", "signal", "bottom", 0.8, { multi: true })], props: [{ key: "node_id", type: "text", max: 64 }, num("channels", "", 1, 16)], defaults: { node_id: "", channels: 4 } },
  // ---- loads ----
  { kind: "load", category: "load", w: 88, h: 60, ports: [port("in", "ac", "left", 0.5, { required: true })], props: [num("power_w", "W", 0, 500000)], defaults: { power_w: 500 } },
  { kind: "water-heater", category: "load", w: 96, h: 64, ports: [port("in", "ac", "left", 0.5, { required: true }), sig()], props: [num("power_w", "W", 0, 20000), num("volume_l", "L", 10, 1000)], defaults: { power_w: 2000, volume_l: 80 }, controllable: true },
  { kind: "socket", category: "load", w: 88, h: 60, ports: [port("in", "ac", "left", 0.5, { required: true }), sig()], props: [num("power_w", "W", 0, 20000)], defaults: { power_w: 3680 }, controllable: true },
  { kind: "lighting", category: "load", w: 88, h: 60, ports: [port("in", "ac", "left", 0.5, { required: true })], props: [num("power_w", "W", 0, 50000)], defaults: { power_w: 300 } },
  { kind: "ev-charger", category: "load", w: 96, h: 64, ports: [port("in", "ac", "left", 0.5, { required: true }), sig()], props: [num("power_w", "W", 0, 50000)], defaults: { power_w: 7400 }, controllable: true },
  { kind: "hvac", category: "load", w: 88, h: 60, ports: [port("in", "ac", "left", 0.5, { required: true })], props: [num("power_w", "W", 0, 50000)], defaults: { power_w: 2500 } },
  { kind: "load-dc", category: "load", w: 88, h: 60, ports: [port("in", "dc", "left", 0.5, { required: true })], props: [num("power_w", "W", 0, 100000), num("voltage_v", "V", 3, 1000)], defaults: { power_w: 100, voltage_v: 12 } },
];

const BY_KIND = new Map(KINDS.map(def => [def.kind, def]));
export const kindDef = (kind: string): KindDef | undefined => BY_KIND.get(kind);
/** The elements that gather signals: an ARMOR-ELECTRICAL node, and an automation controller (a PLC). A signal wire joins one of them to what it measures or switches. */
export const isHub = (kind: string): boolean => kind === "node" || kind === "plc";
export const isKind = (kind: unknown): kind is string => typeof kind === "string" && BY_KIND.has(kind);
export const kindsIn = (category: Category): KindDef[] => KINDS.filter(def => def.category === category);

// ---- the document -----------------------------------------------------------------------------------------------------------------

/** What an element is tied to outside the drawing: a solar device the server reads (`node/device`), or an ARMOR-ELECTRICAL node and the id of one of its channels. */
export type Binding = { solar?: string; node?: string; channel?: string };
export type ElementState = "closed" | "open";
export type Element = { id: string; kind: string; x: number; y: number; name: string; props: Props; bind?: Binding; state?: ElementState };
export type PortRef = { element: string; port: string };
export type Wire = { id: string; from: PortRef; to: PortRef; section_mm2?: number; length_m?: number; label?: string };
export type FrameColour = "cyan" | "amber" | "green" | "violet" | "rose" | "slate";
export const FRAME_COLOURS: Record<FrameColour, string> = { cyan: "#22d3ee", amber: "#fbbf24", green: "#34d399", violet: "#a78bfa", rose: "#fb7185", slate: "#94a3b8" };
/** A panel, a room or any group drawn behind the elements. */
export type Frame = { id: string; name: string; x: number; y: number; w: number; h: number; colour: FrameColour };
export type Design = { elements: Element[]; wires: Wire[]; frames: Frame[] };
export const EMPTY_DESIGN: Design = { elements: [], wires: [], frames: [] };

export const GRID = 20;
export const snap = (value: number, step = GRID): number => Math.round(value / step) * step;

export const portOf = (element: Element, portId: string): PortDef | undefined => kindDef(element.kind)?.ports.find(candidate => candidate.id === portId);

/** Where a port is, in the drawing's own units. */
export function portPosition(element: Element, portId: string): { x: number; y: number } | undefined {
  const def = kindDef(element.kind), found = def?.ports.find(candidate => candidate.id === portId);
  if (!def || !found) return undefined;
  switch (found.side) {
    case "left": return { x: element.x, y: element.y + def.h * found.at };
    case "right": return { x: element.x + def.w, y: element.y + def.h * found.at };
    case "top": return { x: element.x + def.w * found.at, y: element.y };
    case "bottom": return { x: element.x + def.w * found.at, y: element.y + def.h };
  }
}

/** The wire's route: straight out of each port, then across (right angles only). */
export function wirePath(design: Design, wire: Wire): Array<{ x: number; y: number }> {
  const a = design.elements.find(element => element.id === wire.from.element), b = design.elements.find(element => element.id === wire.to.element);
  if (!a || !b) return [];
  const pa = portPosition(a, wire.from.port), pb = portPosition(b, wire.to.port), sa = portOf(a, wire.from.port)?.side, sb = portOf(b, wire.to.port)?.side;
  if (!pa || !pb || !sa || !sb) return [];
  const stub = 16, out = (p: { x: number; y: number }, side: Side) => side === "left" ? { x: p.x - stub, y: p.y } : side === "right" ? { x: p.x + stub, y: p.y } : side === "top" ? { x: p.x, y: p.y - stub } : { x: p.x, y: p.y + stub };
  const oa = out(pa, sa), ob = out(pb, sb), horizontal = (side: Side) => side === "left" || side === "right";
  const points: Array<{ x: number; y: number }> = [pa, oa];
  if (horizontal(sa) && horizontal(sb)) { const mx = snap((oa.x + ob.x) / 2, 10); points.push({ x: mx, y: oa.y }, { x: mx, y: ob.y }); }
  else if (!horizontal(sa) && !horizontal(sb)) { const my = snap((oa.y + ob.y) / 2, 10); points.push({ x: oa.x, y: my }, { x: ob.x, y: my }); }
  else if (horizontal(sa)) points.push({ x: ob.x, y: oa.y });
  else points.push({ x: oa.x, y: ob.y });
  points.push(ob, pb);
  return points.filter((point, index) => index === 0 || point.x !== points[index - 1].x || point.y !== points[index - 1].y);
}

/** The rectangle that holds everything drawn, or undefined for an empty design. */
export function designBounds(design: Design): { minX: number; minY: number; maxX: number; maxY: number } | undefined {
  const xs: number[] = [], ys: number[] = [];
  for (const element of design.elements) { const def = kindDef(element.kind); if (def) { xs.push(element.x, element.x + def.w); ys.push(element.y, element.y + def.h + 28); } }
  for (const frame of design.frames) { xs.push(frame.x, frame.x + frame.w); ys.push(frame.y, frame.y + frame.h); }
  return xs.length ? { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) } : undefined;
}

/** The AC current a power draws at the given voltage. */
export const currentOf = (powerW: number, voltage = 230): number => voltage > 0 ? powerW / voltage : 0;
export const numberProp = (element: Element, key: string, fallback = 0): number => { const value = element.props[key]; return typeof value === "number" && Number.isFinite(value) ? value : fallback; };
export const textProp = (element: Element, key: string): string => { const value = element.props[key]; return typeof value === "string" ? value : ""; };

/** The DC voltage an element works at, when it says so. */
export function dcVoltageOf(element: Element): number {
  for (const key of ["nominal_v", "nominal_dc_v", "voltage_v"]) { const value = numberProp(element, key); if (value > 0) return value; }
  return 0;
}

/** A short line of the element's main figures, drawn under its name. */
export function summaryOf(element: Element): string {
  const parts: string[] = [];
  const add = (key: string, unit: string) => { const value = element.props[key]; if (value !== undefined && value !== "" && value !== 0) parts.push(`${value}${unit ? " " + unit : ""}`); };
  switch (element.kind) {
    case "pv-array": add("peak_wp", "Wp"); break;
    case "battery": add("nominal_v", "V"); add("capacity_ah", "Ah"); break;
    case "inverter": add("rated_w", "W"); add("nominal_dc_v", "V"); break;
    case "grid": add("contracted_kw", "kW"); break;
    case "mcb": case "e-breaker": add("rating_a", "A"); add("curve", ""); break;
    case "rcd": add("rating_a", "A"); add("sensitivity_ma", "mA"); break;
    case "node": add("node_id", ""); break;
    default: if (element.props.power_w !== undefined) add("power_w", "W"); else if (element.props.rating_a !== undefined) add("rating_a", "A"); else if (element.props.rated_w !== undefined) add("rated_w", "W");
  }
  return parts.join(" · ");
}
