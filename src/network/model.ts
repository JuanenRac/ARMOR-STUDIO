/**
 * Network Designer: the model of the house's network drawing (elements with ports, the links between them, and the frames that group them into a network or a room) and the
 * catalogue of what can be drawn: the provider's line, the modem, the router, switches and access points, and every kind of device that hangs from them. Plain data and pure
 * functions. It is a drawing and a set of checks: nothing here configures a router or a device; what the nodes find on the network can be compared with it and drawn into it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { GRID, snap, type Frame, type PortRef } from "../electrical/model";

export { GRID, snap };
export type { Frame, PortRef };
/** The medium of a link: the provider's line, a cable, or the air. Two ports join only when they are the same medium. */
export type Medium = "wan" | "eth" | "wifi";
export type Side = "left" | "right" | "top" | "bottom";
export type Category = "wan" | "core" | "endpoint" | "service";

export type PortDef = { id: string; medium: Medium; side: Side; at: number; multi?: boolean; required?: boolean };
export type PropDef =
  | { key: string; type: "number"; unit?: string; min: number; max: number; step?: number }
  | { key: string; type: "text"; max: number; secret?: boolean }
  | { key: string; type: "choice"; choices: readonly string[] };
export type PropValue = number | string;
export type Props = Record<string, PropValue>;

export type KindDef = {
  kind: string; category: Category; w: number; h: number; ports: readonly PortDef[]; props: readonly PropDef[]; defaults: Props;
  /** The kind the discovery calls it (a device found as this kind is drawn as this element). */
  found?: string;
  /** Draws power over the cable (PoE): the switch's budget has to cover it. */
  poe?: boolean;
};

export const CATEGORY_COLOUR: Record<Category, string> = { wan: "#fbbf24", core: "#22d3ee", endpoint: "#34d399", service: "#a78bfa" };
export const CATEGORY_ORDER: readonly Category[] = ["wan", "core", "endpoint", "service"];
export const MEDIUM_COLOUR: Record<Medium, string> = { wan: "#fbbf24", eth: "#22d3ee", wifi: "#a78bfa" };

const port = (id: string, medium: Medium, side: Side, at = 0.5, extra: Partial<PortDef> = {}): PortDef => ({ id, medium, side, at, ...extra });
const num = (key: string, unit: string, min: number, max: number, step = 1): PropDef => ({ key, type: "number", unit, min, max, step });
const text = (key: string, max: number): PropDef => ({ key, type: "text", max });
const secret = (key: string, max: number): PropDef => ({ key, type: "text", max, secret: true });
const choice = (key: string, choices: readonly string[]): PropDef => ({ key, type: "choice", choices });
const ip = (): PropDef => text("ip", 15);
const wired = (): PortDef => port("eth", "eth", "left", 0.5);
const air = (): PortDef => port("wifi", "wifi", "top", 0.5);

const BASE_KINDS: readonly KindDef[] = [
  // ---- the outside ----
  { kind: "internet", category: "wan", w: 104, h: 64, ports: [port("wan", "wan", "right", 0.5, { required: true })], props: [text("provider", 40), num("down_mbps", "Mbit/s", 0, 100000), num("up_mbps", "Mbit/s", 0, 100000)], defaults: { provider: "", down_mbps: 300, up_mbps: 300 } },
  { kind: "modem", category: "wan", w: 96, h: 60, ports: [port("wan", "wan", "left", 0.5, { required: true }), port("eth", "eth", "right", 0.5, { required: true }), port("wifi", "wifi", "top", 0.5, { multi: true })], props: [choice("type", ["fibre ONT", "cable", "DSL", "4G/5G", "modem + router"]), ip(), text("ssid", 32), text("ssid_5", 32), choice("wifi_band", ["off", "2.4 GHz", "5 GHz", "2.4 + 5 GHz"])], defaults: { type: "fibre ONT", ip: "", ssid: "", ssid_5: "", wifi_band: "off" } },
  // ---- the core ----
  { kind: "router", category: "core", w: 132, h: 96, ports: [port("wan", "eth", "left", 0.5, { required: true }), port("lan1", "eth", "right", 0.2), port("lan2", "eth", "right", 0.4), port("lan3", "eth", "right", 0.6), port("lan4", "eth", "right", 0.8), port("wifi", "wifi", "top", 0.5, { multi: true })],
    props: [ip(), text("subnet", 18), choice("dhcp", ["on", "off"]), text("ssid", 32), text("ssid_5", 32), choice("wifi_band", ["2.4 GHz", "5 GHz", "2.4 + 5 GHz", "off"])], defaults: { ip: "192.168.0.1", subnet: "192.168.0.0/24", dhcp: "on", ssid: "", ssid_5: "", wifi_band: "2.4 + 5 GHz" }, found: "router" },
  { kind: "firewall", category: "core", w: 104, h: 60, ports: [port("in", "eth", "left", 0.5, { required: true }), port("out", "eth", "right", 0.5, { required: true })], props: [ip(), choice("mode", ["router", "bridge"])], defaults: { ip: "", mode: "bridge" } },
  { kind: "switch", category: "core", w: 132, h: 96, ports: [port("up", "eth", "left", 0.5, { required: true }), ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => port(`p${n}`, "eth", n <= 4 ? "right" : "bottom", n <= 4 ? n / 5 : (n - 4) / 5, { multi: true }))],
    props: [num("ports", "", 4, 48), choice("managed", ["no", "yes"]), num("poe_budget_w", "W", 0, 1000), ip()], defaults: { ports: 8, managed: "no", poe_budget_w: 0, ip: "" }, found: "network" },
  { kind: "access-point", category: "core", w: 112, h: 72, ports: [port("eth", "eth", "left", 0.5, { required: true }), port("wifi", "wifi", "top", 0.5, { multi: true })], props: [choice("mode", ["access point", "client", "bridge", "repeater"]), text("ssid", 32), text("ssid_5", 32), choice("band", ["2.4 GHz", "5 GHz", "2.4 + 5 GHz"]), num("poe_w", "W", 0, 60, 0.1), ip()], defaults: { mode: "access point", ssid: "", ssid_5: "", band: "2.4 + 5 GHz", poe_w: 8, ip: "" }, poe: true },
  { kind: "powerline", category: "core", w: 96, h: 56, ports: [port("eth", "eth", "left", 0.5, { required: true }), port("line", "eth", "right", 0.5)], props: [num("speed_mbps", "Mbit/s", 10, 2000)], defaults: { speed_mbps: 500 } },
  // ---- what hangs from it ----
  { kind: "server", category: "endpoint", w: 104, h: 64, ports: [wired(), air()], props: [ip(), text("role", 32), text("os", 24)], defaults: { ip: "", role: "", os: "" }, found: "server" },
  { kind: "nas", category: "endpoint", w: 104, h: 64, ports: [wired(), air()], props: [ip(), num("capacity_tb", "TB", 0, 1000, 0.1)], defaults: { ip: "", capacity_tb: 0 }, found: "nas" },
  { kind: "computer", category: "endpoint", w: 104, h: 64, ports: [wired(), air()], props: [ip(), text("os", 24)], defaults: { ip: "", os: "" }, found: "computer" },
  { kind: "phone", category: "endpoint", w: 88, h: 56, ports: [air()], props: [ip()], defaults: { ip: "" }, found: "phone" },
  { kind: "tv", category: "endpoint", w: 96, h: 60, ports: [wired(), air()], props: [ip()], defaults: { ip: "" }, found: "tv" },
  { kind: "printer", category: "endpoint", w: 96, h: 60, ports: [wired(), air()], props: [ip()], defaults: { ip: "" }, found: "printer" },
  { kind: "camera", category: "endpoint", w: 96, h: 60, ports: [wired(), air()], props: [choice("link", ["ethernet", "wifi"]), ip(), text("camera_id", 40), num("onvif_port", "", 1, 65535), num("rtsp_port", "", 1, 65535), text("rtsp", 60), num("poe_w", "W", 0, 60, 0.1)], defaults: { link: "ethernet", ip: "", camera_id: "", onvif_port: 80, rtsp_port: 554, rtsp: "", poe_w: 5 }, found: "camera", poe: true },
  { kind: "iot", category: "endpoint", w: 88, h: 56, ports: [air(), wired()], props: [ip(), text("protocol", 24)], defaults: { ip: "", protocol: "" }, found: "iot" },
  { kind: "sbc", category: "endpoint", w: 104, h: 64, ports: [wired(), air()], props: [ip(), text("role", 32)], defaults: { ip: "", role: "" } },
  { kind: "hub", category: "endpoint", w: 96, h: 60, ports: [wired(), air()], props: [ip(), choice("protocol", ["Zigbee", "Z-Wave", "Thread", "Bluetooth", "other"])], defaults: { ip: "", protocol: "Zigbee" } },
  // ---- the A.R.M.O.R. side ----
  { kind: "camera-server", category: "service", w: 120, h: 68, ports: [wired(), air()], props: [ip(), choice("software", ["ARMOR", "Frigate", "NVR", "other"]), num("channels", "", 0, 256), num("storage_tb", "TB", 0, 1000, 0.1), num("port", "", 1, 65535)], defaults: { ip: "", software: "ARMOR", channels: 4, storage_tb: 0, port: 18080 } },
  { kind: "armor-server", category: "service", w: 120, h: 68, ports: [wired(), air()], props: [ip(), num("port", "", 1, 65535)], defaults: { ip: "", port: 18080 } },
  { kind: "armor-node", category: "service", w: 112, h: 64, ports: [wired(), air()], props: [ip(), choice("family", ["radar", "solar", "electrical", "network"]), text("node_id", 64)], defaults: { ip: "", family: "radar", node_id: "" } },
];

/** What every device has: who made it, which model, and the login of its own administration page (kept in the drawing, so the same person who drew it can find it). */
const COMMON_PROPS: readonly PropDef[] = [text("manufacturer", 40), text("model", 40), text("admin_user", 40), secret("admin_password", 60)];
const COMMON_DEFAULTS: Props = { manufacturer: "", model: "", admin_user: "", admin_password: "" };
export const KINDS: readonly KindDef[] = BASE_KINDS.map(def => ({ ...def, props: [...def.props, ...COMMON_PROPS.filter(common => !def.props.some(prop => prop.key === common.key))], defaults: { ...COMMON_DEFAULTS, ...def.defaults } }));

const BY_KIND = new Map(KINDS.map(def => [def.kind, def]));
export const kindDef = (kind: string): KindDef | undefined => BY_KIND.get(kind);
export const isKind = (kind: unknown): kind is string => typeof kind === "string" && BY_KIND.has(kind);
export const kindsIn = (category: Category): KindDef[] => KINDS.filter(def => def.category === category);
/** The kind of element a discovered device is drawn as. */
export const kindForFound = (found: string): string => KINDS.find(def => def.found === found)?.kind ?? "iot";

// ---- the document ---------------------------------------------------------------------------------------------------------------------

/** What an element is tied to outside the drawing: a device the nodes found (by its id, a MAC or `ip-...`). */
export type Binding = { device?: string };
/** `rot` turns the element clockwise by a quarter turn each: 0, 90, 180 or 270 degrees. */
export type Element = { id: string; kind: string; x: number; y: number; name: string; props: Props; bind?: Binding; rot?: number };
export type Wire = { id: string; from: PortRef; to: PortRef; speed_mbps?: number; length_m?: number; vlan?: number; label?: string };
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

/** The ports an element has: a switch has as many as its "ports" says (up to 24 are drawn), and the sides turn with the element. */
export function portsOf(element: Element): PortDef[] {
  const def = kindDef(element.kind);
  if (!def) return [];
  let ports: readonly PortDef[] = def.ports;
  if (element.kind === "switch") {
    const count = Math.max(1, Math.min(24, Math.round(typeof element.props.ports === "number" ? element.props.ports : 8)));
    const right = Math.ceil(count / 2), bottom = count - right;
    ports = [def.ports[0], ...Array.from({ length: count }, (_unused, index) => index < right
      ? port(`p${index + 1}`, "eth", "right", (index + 1) / (right + 1), { multi: true })
      : port(`p${index + 1}`, "eth", "bottom", (index - right + 1) / (bottom + 1), { multi: true }))];
  }
  const turns = rotationOf(element) / 90;
  if (turns === 0) return [...ports];
  return ports.map(found => { let side = found.side, at = found.at; for (let step = 0; step < turns; step += 1) { at = side === "left" || side === "right" ? (side === "left" ? 1 - at : at) : (side === "top" ? at : 1 - at); side = TURN[side]; } return { ...found, side, at }; });
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
  const ip = textProp(element, "ip");
  switch (element.kind) {
    case "internet": return [textProp(element, "provider"), element.props.down_mbps ? `${element.props.down_mbps}↓` : ""].filter(Boolean).join(" · ");
    case "switch": return [ip, `${element.props.ports} ports`].filter(Boolean).join(" · ");
    case "router": return [ip, textProp(element, "ssid")].filter(Boolean).join(" · ");
    case "access-point": return [ip, textProp(element, "ssid")].filter(Boolean).join(" · ");
    default: return ip;
  }
}

/** The devices the drawing is missing, the ones it has that are not on the network, and so on, are in analysis.ts. */
export const ELEMENT_LIMIT = 400;
