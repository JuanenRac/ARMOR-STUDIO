/**
 * Network Designer operations: every edit the designer makes, as a pure function from one design to the next, so they are testable and the undo history is simply the list of
 * designs.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { nextId } from "../designer/ops";
import type { FrameColour } from "../electrical/model";
import { GRID, isKind, kindDef, portOf, snap, type Binding, type Design, type Element, type Frame, type PortRef, type PropDef, type PropValue, type Wire } from "./model";

const MAX_ELEMENTS = 400, MAX_WIRES = 800, MAX_FRAMES = 60;
export const LIMITS = { elements: MAX_ELEMENTS, wires: MAX_WIRES, frames: MAX_FRAMES } as const;
const clampNumber = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** A value for a property, kept inside what the property allows; undefined when it cannot be one. */
export function cleanProp(def: PropDef, value: unknown): PropValue | undefined {
  if (def.type === "number") return typeof value === "number" && Number.isFinite(value) ? clampNumber(Math.round(value * 1000) / 1000, def.min, def.max) : undefined;
  if (def.type === "text") return typeof value === "string" ? value.slice(0, def.max) : undefined;
  return typeof value === "string" && def.choices.includes(value) ? value : undefined;
}

export function addElement(design: Design, kind: string, x: number, y: number, name = "", props: Record<string, PropValue> = {}, bind?: Binding): { design: Design; id: string } | undefined {
  const def = kindDef(kind);
  if (!def || design.elements.length >= MAX_ELEMENTS) return undefined;
  const id = nextId(kind, design.elements.map(element => element.id));
  const clean: Record<string, PropValue> = { ...def.defaults };
  for (const prop of def.props) { const value = cleanProp(prop, props[prop.key]); if (value !== undefined) clean[prop.key] = value; }
  const element: Element = { id, kind, x: snap(x), y: snap(y), name: name.slice(0, 60), props: clean, ...(bind?.device ? { bind } : {}) };
  return { design: { ...design, elements: [...design.elements, element] }, id };
}

export function moveElement(design: Design, id: string, x: number, y: number): Design {
  return { ...design, elements: design.elements.map(element => element.id === id ? { ...element, x: snap(x), y: snap(y) } : element) };
}

export function nudgeElements(design: Design, ids: readonly string[], dx: number, dy: number): Design {
  return { ...design, elements: design.elements.map(element => ids.includes(element.id) ? { ...element, x: element.x + dx, y: element.y + dy } : element) };
}

export function renameElement(design: Design, id: string, name: string): Design {
  return { ...design, elements: design.elements.map(element => element.id === id ? { ...element, name: name.slice(0, 60) } : element) };
}

/** Set one property of an element; a value the property does not allow leaves it as it was. */
export function setProp(design: Design, id: string, key: string, value: unknown): Design {
  const element = design.elements.find(item => item.id === id), def = element && kindDef(element.kind)?.props.find(prop => prop.key === key);
  if (!element || !def) return design;
  const clean = cleanProp(def, value);
  if (clean === undefined) return design;
  return { ...design, elements: design.elements.map(item => item.id === id ? { ...item, props: { ...item.props, [key]: clean } } : item) };
}

const DEVICE_ID = /^[a-z0-9][a-z0-9:._-]{0,63}$/;
/** Tie an element to a device the nodes found (or untie it): one device belongs to one element at most. */
export function setBinding(design: Design, id: string, device: string | undefined): Design {
  const clean = device && DEVICE_ID.test(device) ? device : undefined;
  return { ...design, elements: design.elements.map(element => {
    if (element.id === id) { const { bind: _dropped, ...rest } = element; return clean ? { ...rest, bind: { device: clean } } : rest; }
    if (clean && element.bind?.device === clean) { const { bind: _taken, ...rest } = element; return rest; }
    return element;
  }) };
}

export function removeElement(design: Design, id: string): Design {
  return { ...design, elements: design.elements.filter(element => element.id !== id), wires: design.wires.filter(wire => wire.from.element !== id && wire.to.element !== id) };
}

export function duplicateElement(design: Design, id: string): { design: Design; id: string } | undefined {
  const source = design.elements.find(element => element.id === id);
  if (!source || design.elements.length >= MAX_ELEMENTS) return undefined;
  const copyId = nextId(source.kind, design.elements.map(element => element.id));
  const copy: Element = { ...source, id: copyId, x: source.x + GRID * 2, y: source.y + GRID * 2, props: { ...source.props } };
  delete copy.bind;
  if (typeof copy.props.ip === "string") copy.props.ip = "";     // a second element with the same address would be a mistake
  return { design: { ...design, elements: [...design.elements, copy] }, id: copyId };
}

// ---- links --------------------------------------------------------------------------------------------------------------------------

export type ConnectError = "unknown_port" | "same_element" | "medium" | "busy" | "exists" | "too_many";
const samePort = (a: PortRef, b: PortRef): boolean => a.element === b.element && a.port === b.port;

/** Can these two ports be joined? The reason when they cannot. */
export function canConnect(design: Design, from: PortRef, to: PortRef): ConnectError | undefined {
  const a = design.elements.find(element => element.id === from.element), b = design.elements.find(element => element.id === to.element);
  const pa = a && portOf(a, from.port), pb = b && portOf(b, to.port);
  if (!a || !b || !pa || !pb) return "unknown_port";
  if (a.id === b.id) return "same_element";
  if (pa.medium !== pb.medium) return "medium";
  if (design.wires.some(wire => (samePort(wire.from, from) && samePort(wire.to, to)) || (samePort(wire.from, to) && samePort(wire.to, from)))) return "exists";
  const used = (ref: PortRef) => design.wires.some(wire => samePort(wire.from, ref) || samePort(wire.to, ref));
  if ((!pa.multi && used(from)) || (!pb.multi && used(to))) return "busy";
  if (design.wires.length >= MAX_WIRES) return "too_many";
  return undefined;
}

export function connect(design: Design, from: PortRef, to: PortRef): { ok: true; design: Design; id: string } | { ok: false; error: ConnectError } {
  const error = canConnect(design, from, to);
  if (error) return { ok: false, error };
  const id = nextId("link", design.wires.map(wire => wire.id));
  const wire: Wire = { id, from, to };
  return { ok: true, design: { ...design, wires: [...design.wires, wire] }, id };
}

export function removeWire(design: Design, id: string): Design { return { ...design, wires: design.wires.filter(wire => wire.id !== id) }; }

export function updateWire(design: Design, id: string, patch: { speed_mbps?: number | null; length_m?: number | null; vlan?: number | null; label?: string }): Design {
  return { ...design, wires: design.wires.map(wire => {
    if (wire.id !== id) return wire;
    const next: Wire = { ...wire };
    if (patch.speed_mbps !== undefined) { if (patch.speed_mbps === null) delete next.speed_mbps; else next.speed_mbps = clampNumber(Math.round(patch.speed_mbps), 1, 400000); }
    if (patch.length_m !== undefined) { if (patch.length_m === null) delete next.length_m; else next.length_m = clampNumber(patch.length_m, 0, 5000); }
    if (patch.vlan !== undefined) { if (patch.vlan === null) delete next.vlan; else next.vlan = clampNumber(Math.round(patch.vlan), 1, 4094); }
    if (patch.label !== undefined) { if (patch.label === "") delete next.label; else next.label = patch.label.slice(0, 40); }
    return next;
  }) };
}

// ---- frames --------------------------------------------------------------------------------------------------------------------------

export function addFrame(design: Design, x: number, y: number, w = 360, h = 240, name = ""): { design: Design; id: string } | undefined {
  if (design.frames.length >= MAX_FRAMES) return undefined;
  const id = nextId("frame", design.frames.map(frame => frame.id));
  const frame: Frame = { id, name: name.slice(0, 60), x: snap(x), y: snap(y), w: Math.max(80, snap(w)), h: Math.max(60, snap(h)), colour: "cyan" };
  return { design: { ...design, frames: [...design.frames, frame] }, id };
}
export function updateFrame(design: Design, id: string, patch: Partial<Pick<Frame, "name" | "x" | "y" | "w" | "h" | "colour">>): Design {
  return { ...design, frames: design.frames.map(frame => {
    if (frame.id !== id) return frame;
    const next: Frame = { ...frame };
    if (patch.name !== undefined) next.name = patch.name.slice(0, 60);
    if (patch.x !== undefined) next.x = snap(patch.x);
    if (patch.y !== undefined) next.y = snap(patch.y);
    if (patch.w !== undefined) next.w = Math.max(80, snap(patch.w));
    if (patch.h !== undefined) next.h = Math.max(60, snap(patch.h));
    if (patch.colour !== undefined) next.colour = patch.colour as FrameColour;
    return next;
  }) };
}
export function removeFrame(design: Design, id: string): Design { return { ...design, frames: design.frames.filter(frame => frame.id !== id) }; }

/** The elements whose box lies inside a frame (so moving the frame can carry them along). */
export function elementsInFrame(design: Design, frame: Frame): string[] {
  return design.elements.filter(element => { const def = kindDef(element.kind); return def && element.x >= frame.x && element.y >= frame.y && element.x + def.w <= frame.x + frame.w && element.y + def.h <= frame.y + frame.h; }).map(element => element.id);
}

export const isPlaceable = (kind: string): boolean => isKind(kind);
