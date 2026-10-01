/**
 * The network design as one document the server keeps for every browser: what goes into it, and how one that came back (or was imported from a file) is checked and cleaned
 * before it replaces what is on the screen. Nothing here trusts what it is given: unknown kinds, ports that do not exist, numbers outside what a property allows and links between
 * different media are dropped. Kept apart from React so it is unit-tested.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { FRAME_COLOURS, type FrameColour } from "../electrical/model";
import { kindDef, portOf, type Design, type Element, type Frame, type PortRef, type Props, type Wire } from "./model";
import { cleanProp, LIMITS } from "./ops";

export const NETWORK_SCHEMA = "armor-studio/network/1";
const ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const DEVICE_ID = /^[a-z0-9][a-z0-9:._-]{0,63}$/;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const coordinate = (value: unknown): number | undefined => finite(value) ? Math.min(100000, Math.max(-100000, Math.round(value * 100) / 100)) : undefined;

export const buildNetworkDoc = (design: Design): Record<string, unknown> => ({ schema: NETWORK_SCHEMA, elements: design.elements, wires: design.wires, frames: design.frames });

/** A stable text of the design, to tell whether it changed since it was last saved. */
export const networkKey = (design: Design): string => JSON.stringify(buildNetworkDoc(design), (_key, value: unknown) =>
  isRecord(value) ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)) : value);

function cleanElement(value: unknown): Element | undefined {
  if (!isRecord(value) || typeof value.id !== "string" || !ID.test(value.id) || typeof value.kind !== "string") return undefined;
  const def = kindDef(value.kind), x = coordinate(value.x), y = coordinate(value.y);
  if (!def || x === undefined || y === undefined) return undefined;
  const given = isRecord(value.props) ? value.props : {};
  const props: Props = { ...def.defaults };
  for (const prop of def.props) { const clean = cleanProp(prop, given[prop.key]); if (clean !== undefined) props[prop.key] = clean; }
  const element: Element = { id: value.id, kind: value.kind, x, y, name: typeof value.name === "string" ? value.name.slice(0, 60) : "", props };
  if (value.rot === 90 || value.rot === 180 || value.rot === 270) element.rot = value.rot;
  if (isRecord(value.bind) && typeof value.bind.device === "string" && DEVICE_ID.test(value.bind.device)) element.bind = { device: value.bind.device };
  return element;
}

/** A design from a stored or imported document; undefined when it is not one at all. */
export function parseNetworkDoc(document: unknown): Design | undefined {
  if (!isRecord(document) || !Array.isArray(document.elements) || !Array.isArray(document.wires)) return undefined;
  const elements: Element[] = [], known = new Set<string>(), bound = new Set<string>();
  for (const raw of document.elements.slice(0, LIMITS.elements)) {
    const element = cleanElement(raw);
    if (!element || known.has(element.id)) continue;
    if (element.bind?.device) { if (bound.has(element.bind.device)) delete element.bind; else bound.add(element.bind.device); }   // one device, one element
    elements.push(element); known.add(element.id);
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
    if (portOf(byId.get(from.element)!, from.port)!.medium !== portOf(byId.get(to.element)!, to.port)!.medium) continue;
    const wire: Wire = { id: raw.id, from, to };
    if (finite(raw.speed_mbps) && raw.speed_mbps >= 1 && raw.speed_mbps <= 400000) wire.speed_mbps = Math.round(raw.speed_mbps);
    if (finite(raw.length_m) && raw.length_m >= 0 && raw.length_m <= 5000) wire.length_m = raw.length_m;
    if (finite(raw.vlan) && raw.vlan >= 1 && raw.vlan <= 4094) wire.vlan = Math.round(raw.vlan);
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
export function applyNetworkDoc(document: unknown, current: Design): Design {
  return parseNetworkDoc(document) ?? current;
}

export const NETWORK_LOCAL_KEY = "armor-studio-network-v1";
export function loadLocalNetwork(): Design | undefined {
  try {
    const raw = window.localStorage.getItem(NETWORK_LOCAL_KEY);
    return raw ? parseNetworkDoc(JSON.parse(raw)) : undefined;
  } catch { return undefined; }   // storage may be blocked, or hold something else
}
export function saveLocalNetwork(design: Design): void {
  try { window.localStorage.setItem(NETWORK_LOCAL_KEY, JSON.stringify(buildNetworkDoc(design))); } catch { /* storage may be full or blocked */ }
}
