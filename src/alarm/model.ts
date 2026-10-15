/**
 * Alarm Designer: the model of the house's alarm drawing - the panels, the sensors of the doors and windows, the motion detectors, the smoke and flood sensors, the sirens, the keypads
 * and the power that feeds them, the links between them (a wired loop, a radio link, the siren output, the data bus, the supply) and the frames that group them into a room or a floor.
 * Plain data and pure functions. It is a drawing and a set of checks: nothing here arms, disarms or sounds anything; a drawn panel or sensor can be tied to a real panel and zone of the
 * Alarm panels menu, and then it shows what that panel says.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { GRID, snap, type Frame, type PortRef } from "../electrical/model";

export { GRID, snap };
export type { Frame, PortRef };
/** What a link carries: a wired zone loop, the radio, the siren output, the data bus of keypads and expanders, or the supply. Two ports join only when they carry the same. */
export type Medium = "loop" | "radio" | "output" | "bus" | "power";
export type Side = "left" | "right" | "top" | "bottom";
export type Category = "central" | "sensor" | "output" | "control" | "power";

export type PortDef = { id: string; medium: Medium; side: Side; at: number; multi?: boolean; required?: boolean };
export type PropDef =
  | { key: string; type: "number"; unit?: string; min: number; max: number; step?: number }
  | { key: string; type: "text"; max: number }
  | { key: string; type: "choice"; choices: readonly string[] };
export type PropValue = number | string;
export type Props = Record<string, PropValue>;

export type KindDef = {
  kind: string; category: Category; w: number; h: number; ports: readonly PortDef[]; props: readonly PropDef[]; defaults: Props;
  /** What the sensor watches, for the checks: the opening it guards, the room it sees or the danger it smells. */
  guards?: "opening" | "room" | "danger" | "person";
  /** A sensor that is an alarm at any time, armed or not (smoke, flood, panic). */
  always?: boolean;
};

export const CATEGORY_COLOUR: Record<Category, string> = { central: "#a78bfa", sensor: "#34d399", output: "#fb7185", control: "#22d3ee", power: "#fbbf24" };
export const CATEGORY_ORDER: readonly Category[] = ["central", "sensor", "output", "control", "power"];
export const MEDIUM_COLOUR: Record<Medium, string> = { loop: "#34d399", radio: "#a78bfa", output: "#fb7185", bus: "#22d3ee", power: "#fbbf24" };
/** How many wired loops a panel offers. */
export const LOOPS = 8;

const port = (id: string, medium: Medium, side: Side, at = 0.5, extra: Partial<PortDef> = {}): PortDef => ({ id, medium, side, at, ...extra });
const num = (key: string, unit: string, min: number, max: number, step = 1): PropDef => ({ key, type: "number", unit, min, max, step });
const text = (key: string, max: number): PropDef => ({ key, type: "text", max });
const choice = (key: string, choices: readonly string[]): PropDef => ({ key, type: "choice", choices });

/** The two ways a sensor can reach the panel: its wire, or the air. A sensor is joined by one of them. */
const sensorPorts = (): PortDef[] => [port("loop", "loop", "left", 0.5), port("radio", "radio", "top", 0.5)];
const ZONE_KINDS = ["instant", "entry", "interior", "always"] as const;
const SENSOR_PROPS: readonly PropDef[] = [choice("zone_kind", ZONE_KINDS), text("location", 40), choice("battery", ["none", "CR2032", "CR123", "AA", "AAA", "9V"]), choice("tamper", ["no", "yes"])];
const sensor = (kind: string, guards: KindDef["guards"], zone_kind: string, extra: Partial<KindDef> = {}, props: readonly PropDef[] = [], defaults: Props = {}): KindDef => ({
  kind, category: "sensor", w: 96, h: 60, ports: sensorPorts(), props: [...props, ...SENSOR_PROPS], defaults: { zone_kind, location: "", battery: "none", tamper: "no", ...defaults }, guards, ...extra,
});

const BASE_KINDS: readonly KindDef[] = [
  // ---- the panels ----
  { kind: "central", category: "central", w: 150, h: 130,
    ports: [
      ...Array.from({ length: LOOPS }, (_unused, index) => port(`loop${index + 1}`, "loop", "left", (index + 1) / (LOOPS + 1))),
      port("radio", "radio", "top", 0.5, { multi: true }), port("siren", "output", "right", 0.25, { multi: true }), port("bus", "bus", "right", 0.65, { multi: true }), port("power", "power", "bottom", 0.5, { required: true }),
    ],
    props: [text("node_id", 64), num("zones", "", 1, LOOPS), num("exit_delay_s", "s", 0, 255), num("entry_delay_s", "s", 0, 255), num("siren_s", "s", 5, 3600), text("location", 40)],
    defaults: { node_id: "", zones: LOOPS, exit_delay_s: 30, entry_delay_s: 30, siren_s: 180, location: "" } },
  { kind: "expander", category: "central", w: 120, h: 90,
    ports: [port("bus", "bus", "right", 0.5, { required: true }), ...[1, 2, 3, 4].map(n => port(`loop${n}`, "loop", "left", n / 5)), port("power", "power", "bottom", 0.5, { required: true })],
    props: [num("address", "", 1, 32), text("location", 40)], defaults: { address: 1, location: "" } },
  { kind: "communicator", category: "central", w: 112, h: 70, ports: [port("bus", "bus", "right", 0.5, { required: true }), port("power", "power", "bottom", 0.5, { required: true })],
    props: [choice("channel", ["GSM", "IP", "GSM + IP"]), text("recipient", 40)], defaults: { channel: "IP", recipient: "" } },
  // ---- what watches ----
  sensor("door-contact", "opening", "entry", {}, [choice("mounting", ["surface", "recessed", "roller shutter"])], { mounting: "surface" }),
  sensor("window-contact", "opening", "instant", {}, [choice("mounting", ["surface", "recessed"])], { mounting: "surface" }),
  sensor("motion-pir", "room", "interior", {}, [num("range_m", "m", 2, 25), choice("pet_immune", ["no", "yes"])], { range_m: 12, pet_immune: "no" }),
  sensor("motion-dual", "room", "interior", {}, [num("range_m", "m", 2, 25), choice("pet_immune", ["no", "yes"])], { range_m: 12, pet_immune: "yes" }),
  sensor("outdoor-beam", "person", "instant", {}, [num("range_m", "m", 2, 100)], { range_m: 20 }),
  sensor("glass-break", "opening", "instant"),
  sensor("vibration", "opening", "instant", {}, [num("sensitivity", "", 1, 10)], { sensitivity: 5 }),
  sensor("smoke", "danger", "always", { always: true }),
  sensor("heat", "danger", "always", { always: true }),
  sensor("co", "danger", "always", { always: true }),
  sensor("gas", "danger", "always", { always: true }),
  sensor("water-leak", "danger", "always", { always: true }),
  sensor("panic-button", "person", "always", { always: true }),
  sensor("tamper-switch", "opening", "always", { always: true }),
  // ---- what sounds and acts ----
  { kind: "siren-indoor", category: "output", w: 100, h: 62, ports: [port("out", "output", "left", 0.5), port("radio", "radio", "top", 0.5), port("power", "power", "bottom", 0.5)],
    props: [num("level_db", "dB", 60, 130), text("location", 40)], defaults: { level_db: 100, location: "" } },
  { kind: "siren-outdoor", category: "output", w: 100, h: 62, ports: [port("out", "output", "left", 0.5), port("radio", "radio", "top", 0.5), port("power", "power", "bottom", 0.5)],
    props: [num("level_db", "dB", 80, 130), choice("strobe", ["yes", "no"]), text("location", 40)], defaults: { level_db: 110, strobe: "yes", location: "" } },
  { kind: "strobe", category: "output", w: 90, h: 56, ports: [port("out", "output", "left", 0.5), port("power", "power", "bottom", 0.5)], props: [text("location", 40)], defaults: { location: "" } },
  { kind: "relay-output", category: "output", w: 100, h: 62, ports: [port("out", "output", "left", 0.5), port("power", "power", "bottom", 0.5)],
    props: [choice("does", ["lights", "gate", "door lock", "camera recording", "other"]), text("location", 40)], defaults: { does: "lights", location: "" } },
  // ---- what the people use ----
  { kind: "keypad", category: "control", w: 96, h: 64, ports: [port("bus", "bus", "left", 0.5, { required: true }), port("power", "power", "bottom", 0.5)], props: [num("address", "", 1, 32), text("location", 40)], defaults: { address: 1, location: "" } },
  { kind: "card-reader", category: "control", w: 96, h: 60, ports: [port("bus", "bus", "left", 0.5, { required: true }), port("power", "power", "bottom", 0.5)], props: [num("address", "", 1, 32), text("location", 40)], defaults: { address: 2, location: "" } },
  { kind: "key-fob", category: "control", w: 88, h: 56, ports: [port("radio", "radio", "top", 0.5)], props: [text("owner", 40)], defaults: { owner: "" } },
  { kind: "touch-panel", category: "control", w: 104, h: 66, ports: [port("bus", "bus", "left", 0.5)], props: [text("location", 40)], defaults: { location: "" } },
  // ---- what feeds them ----
  { kind: "power-supply", category: "power", w: 108, h: 62, ports: [port("out", "power", "top", 0.5, { multi: true })], props: [num("volts", "V", 5, 48), num("amps", "A", 0.5, 20, 0.1)], defaults: { volts: 12, amps: 2 } },
  { kind: "battery", category: "power", w: 96, h: 56, ports: [port("out", "power", "top", 0.5, { multi: true })], props: [num("volts", "V", 3, 48), num("amp_hours", "Ah", 0.5, 200, 0.5)], defaults: { volts: 12, amp_hours: 7 } },
];

export const KINDS: readonly KindDef[] = BASE_KINDS;
const BY_KIND = new Map(KINDS.map(def => [def.kind, def]));
export const kindDef = (kind: string): KindDef | undefined => BY_KIND.get(kind);
export const isKind = (kind: unknown): kind is string => typeof kind === "string" && BY_KIND.has(kind);
export const kindsIn = (category: Category): KindDef[] => KINDS.filter(def => def.category === category);

// ---- the document ---------------------------------------------------------------------------------------------------------------------

/** What an element is tied to outside the drawing: a panel (its node id) and, for a sensor, the zone of that panel it is. */
export type Binding = { node?: string; zone?: string };
/** `rot` turns the element clockwise by a quarter turn each: 0, 90, 180 or 270 degrees. */
export type Element = { id: string; kind: string; x: number; y: number; name: string; props: Props; bind?: Binding; rot?: number };
export type Wire = { id: string; from: PortRef; to: PortRef; length_m?: number; label?: string };
export type Design = { elements: Element[]; wires: Wire[]; frames: Frame[] };
export const EMPTY_DESIGN: Design = { elements: [], wires: [], frames: [] };

export const rotationOf = (element: Element): 0 | 90 | 180 | 270 => (element.rot === 90 || element.rot === 180 || element.rot === 270 ? element.rot : 0);
const TURN: Record<Side, Side> = { left: "top", top: "right", right: "bottom", bottom: "left" };

/** The size an element takes on the drawing, turned as it is. */
export function sizeOf(element: Element): { w: number; h: number } {
  const def = kindDef(element.kind);
  if (!def) return { w: 0, h: 0 };
  return rotationOf(element) % 180 === 0 ? { w: def.w, h: def.h } : { w: def.h, h: def.w };
}

/** The ports an element has, their sides turned with the element. */
export function portsOf(element: Element): PortDef[] {
  const def = kindDef(element.kind);
  if (!def) return [];
  const turns = rotationOf(element) / 90;
  if (turns === 0) return [...def.ports];
  return def.ports.map(found => {
    let side = found.side, at = found.at;
    for (let step = 0; step < turns; step += 1) { at = side === "left" || side === "right" ? (side === "left" ? 1 - at : at) : (side === "top" ? at : 1 - at); side = TURN[side]; }
    return { ...found, side, at };
  });
}

export const portOf = (element: Element, portId: string): PortDef | undefined => portsOf(element).find(candidate => candidate.id === portId);

/** Where a port is, in the drawing's own units. */
export function portPosition(element: Element, portId: string): { x: number; y: number } | undefined {
  const found = portOf(element, portId), { w, h } = sizeOf(element);
  if (!found) return undefined;
  switch (found.side) {
    case "left": return { x: element.x, y: element.y + h * found.at };
    case "right": return { x: element.x + w, y: element.y + h * found.at };
    case "top": return { x: element.x + w * found.at, y: element.y };
    case "bottom": return { x: element.x + w * found.at, y: element.y + h };
  }
}

/** The link's route: straight out of each port, then across (right angles only). */
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
  for (const element of design.elements) { const { w, h } = sizeOf(element); if (w) { xs.push(element.x, element.x + w); ys.push(element.y, element.y + h + 28); } }
  for (const frame of design.frames) { xs.push(frame.x, frame.x + frame.w); ys.push(frame.y, frame.y + frame.h); }
  return xs.length ? { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) } : undefined;
}

export const textProp = (element: Element, key: string): string => { const value = element.props[key]; return typeof value === "string" ? value : ""; };
export const numberProp = (element: Element, key: string, fallback = 0): number => { const value = element.props[key]; return typeof value === "number" && Number.isFinite(value) ? value : fallback; };

/** A short line of the element's main figures, drawn under its name. */
export function summaryOf(element: Element): string {
  const where = textProp(element, "location");
  switch (element.kind) {
    case "central": return [textProp(element, "node_id"), `${numberProp(element, "zones", LOOPS)} zones`].filter(Boolean).join(" · ");
    case "power-supply": case "battery": return `${numberProp(element, "volts")} V`;
    default: return where;
  }
}

export const ELEMENT_LIMIT = 400;
