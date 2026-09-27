/**
 * The electrical design as one document the server keeps for every browser: what goes into it, and how one that came back (or was imported from a
 * file) is checked and cleaned before it replaces what is on the screen. Nothing here trusts what it is given: unknown kinds, ports that do not exist,
 * numbers outside what a property allows and wires between different kinds of line are dropped. Kept apart from React so it is unit-tested.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { FRAME_COLOURS, kindDef, portOf, type Binding, type Design, type Element, type Frame, type FrameColour, type PortRef, type Props, type Wire } from "./model";
import { cleanProp, LIMITS } from "./ops";

export const ELECTRICAL_SCHEMA = "armor-studio/electrical/1";
const ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const coordinate = (value: unknown): number | undefined => finite(value) ? Math.min(100000, Math.max(-100000, Math.round(value * 100) / 100)) : undefined;

export const buildElectricalDoc = (design: Design): Record<string, unknown> => ({ schema: ELECTRICAL_SCHEMA, elements: design.elements, wires: design.wires, frames: design.frames });

/** A stable text of the design, to tell whether it changed since it was last saved. */
export const electricalKey = (design: Design): string => JSON.stringify(buildElectricalDoc(design), (_key, value: unknown) =>
  isRecord(value) ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)) : value);

function cleanBinding(value: unknown): Binding | undefined {
  if (!isRecord(value)) return undefined;
  const bind: Binding = {};
  if (typeof value.solar === "string" && /^[a-z0-9][a-z0-9_-]{0,63}\/[a-z0-9][a-z0-9_-]{0,31}$/.test(value.solar)) bind.solar = value.solar;
  if (typeof value.node === "string" && ID.test(value.node)) bind.node = value.node;
  if (bind.node && typeof value.channel === "string" && /^[a-z0-9][a-z0-9_-]{0,31}$/.test(value.channel)) bind.channel = value.channel;
  return Object.keys(bind).length ? bind : undefined;
}

function cleanElement(value: unknown): Element | undefined {
  if (!isRecord(value) || typeof value.id !== "string" || !ID.test(value.id) || typeof value.kind !== "string") return undefined;
  const def = kindDef(value.kind), x = coordinate(value.x), y = coordinate(value.y);
  if (!def || x === undefined || y === undefined) return undefined;
  const given = isRecord(value.props) ? value.props : {};
  const props: Props = { ...def.defaults };
  for (const prop of def.props) { const clean = cleanProp(prop, given[prop.key]); if (clean !== undefined) props[prop.key] = clean; }
  const element: Element = { id: value.id, kind: value.kind, x, y, name: typeof value.name === "string" ? value.name.slice(0, 60) : "", props };
  const bind = cleanBinding(value.bind);
  if (bind) element.bind = bind;
  if (value.state === "open" || value.state === "closed") element.state = value.state;
  return element;
}

/** A design from a stored or imported document; undefined when it is not one at all. */
export function parseElectricalDoc(document: unknown): Design | undefined {
  if (!isRecord(document) || !Array.isArray(document.elements) || !Array.isArray(document.wires)) return undefined;
  const elements: Element[] = [], known = new Set<string>();
  for (const raw of document.elements.slice(0, LIMITS.elements)) {
    const element = cleanElement(raw);
    if (element && !known.has(element.id)) { elements.push(element); known.add(element.id); }
  }
  const byId = new Map(elements.map(element => [element.id, element]));
  const wires: Wire[] = [], wireIds = new Set<string>();
  const ref = (value: unknown): PortRef | undefined => {
    if (!isRecord(value) || typeof value.element !== "string" || typeof value.port !== "string") return undefined;
    const element = byId.get(value.element);
    return element && portOf(element, value.port) ? { element: value.element, port: value.port } : undefined;
  };
  for (const raw of document.wires.slice(0, LIMITS.wires)) {
    if (!isRecord(raw) || typeof raw.id !== "string" || !ID.test(raw.id) || wireIds.has(raw.id)) continue;
    const from = ref(raw.from), to = ref(raw.to);
    if (!from || !to || from.element === to.element) continue;
    if (portOf(byId.get(from.element)!, from.port)!.domain !== portOf(byId.get(to.element)!, to.port)!.domain) continue;
    const wire: Wire = { id: raw.id, from, to };
    if (finite(raw.section_mm2) && raw.section_mm2 >= 0.5 && raw.section_mm2 <= 400) wire.section_mm2 = raw.section_mm2;
    if (finite(raw.length_m) && raw.length_m >= 0 && raw.length_m <= 5000) wire.length_m = raw.length_m;
    if (typeof raw.label === "string" && raw.label) wire.label = raw.label.slice(0, 40);
    wires.push(wire); wireIds.add(raw.id);
  }
  const frames: Frame[] = [], frameIds = new Set<string>();
  for (const raw of Array.isArray(document.frames) ? document.frames.slice(0, LIMITS.frames) : []) {
    if (!isRecord(raw) || typeof raw.id !== "string" || !ID.test(raw.id) || frameIds.has(raw.id)) continue;
    const x = coordinate(raw.x), y = coordinate(raw.y), w = coordinate(raw.w), h = coordinate(raw.h);
    if (x === undefined || y === undefined || w === undefined || h === undefined || w < 40 || h < 40 || w > 20000 || h > 20000) continue;
    const colour = typeof raw.colour === "string" && raw.colour in FRAME_COLOURS ? raw.colour as FrameColour : "cyan";
    frames.push({ id: raw.id, name: typeof raw.name === "string" ? raw.name.slice(0, 60) : "", x, y, w, h, colour }); frameIds.add(raw.id);
  }
  return { elements, wires, frames };
}

/** A stored document over the current design: it replaces it when it is a design, and leaves it alone otherwise. */
export function applyElectricalDoc(document: unknown, current: Design): Design {
  return parseElectricalDoc(document) ?? current;
}
