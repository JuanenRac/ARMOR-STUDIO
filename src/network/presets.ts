/**
 * Network Designer starting points: an empty drawing, a typical house (the line, the modem, the router, a switch, an access point and what hangs from them), and the way to draw
 * what the nodes found on the network: every device that is not yet in the drawing is added, tied to the device it is, and joined to the router, a switch or an access point.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { NetworkDevice } from "../networkModel";
import { kindOf } from "../networkModel";
import { EMPTY_DESIGN, kindDef, kindForFound, textProp, type Design, type Element, type Wire } from "./model";
import { addElement, addFrame, connect, setBinding, setProp, updateFrame } from "./ops";

export const emptyDesign = (): Design => ({ ...EMPTY_DESIGN, elements: [], wires: [], frames: [] });

function must<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("a preset is inside the limits of the designer");
  return value;
}

/** Put an element at a place and give it properties, tied to a device when one is given. */
function put(design: Design, kind: string, x: number, y: number, props: Record<string, string | number> = {}, name = "", device?: string): { design: Design; id: string } {
  const added = must(addElement(design, kind, x, y, name, props, device ? { device } : undefined));
  return added;
}
function link(design: Design, a: string, portA: string, b: string, portB: string, patch: Partial<Wire> = {}): Design {
  const result = connect(design, { element: a, port: portA }, { element: b, port: portB });
  if (!result.ok) return design;
  return patch.speed_mbps || patch.label ? { ...result.design, wires: result.design.wires.map(wire => wire.id === result.id ? { ...wire, ...patch } : wire) } : result.design;
}

/** A typical house: the line, the modem, the router, a switch with a server, a NAS and two cameras, an access point with a few clients. `t` names the frame. */
export function housePreset(t: (key: string) => string): Design {
  let design = emptyDesign();
  const place = (kind: string, x: number, y: number, props: Record<string, string | number> = {}, name = ""): string => { const r = put(design, kind, x, y, props, name); design = r.design; return r.id; };
  const internet = place("internet", 0, 160, { provider: "", down_mbps: 600, up_mbps: 600 });
  const modem = place("modem", 180, 170);
  const router = place("router", 340, 140, { ip: "192.168.0.1", subnet: "192.168.0.0/24" });
  const sw = place("switch", 560, 60, { ports: 8, ip: "192.168.0.2", poe_budget_w: 60 });
  const ap = place("access-point", 560, 260, { ssid: "home", ip: "192.168.0.3" });
  const server = place("armor-server", 800, -20, { ip: "192.168.0.180" });
  const nas = place("nas", 800, 60, { ip: "192.168.0.60" });
  const cam1 = place("camera", 800, 140, { ip: "192.168.0.203", poe_w: 6 });
  const cam2 = place("camera", 800, 220, { ip: "192.168.0.204", poe_w: 6 });
  const phone = place("phone", 800, 300, { ip: "192.168.0.12" });
  const tv = place("tv", 800, 380, { ip: "192.168.0.50" });
  design = link(design, internet, "wan", modem, "wan");
  design = link(design, modem, "eth", router, "wan");
  design = link(design, router, "lan1", sw, "up", { speed_mbps: 1000 });
  design = link(design, router, "lan2", ap, "eth", { speed_mbps: 1000 });
  design = link(design, sw, "p1", server, "eth"); design = link(design, sw, "p2", nas, "eth"); design = link(design, sw, "p3", cam1, "eth"); design = link(design, sw, "p4", cam2, "eth");
  design = link(design, ap, "wifi", phone, "wifi"); design = link(design, ap, "wifi", tv, "wifi");
  const frame = must(addFrame(design, 320, -60, 660, 520, t("ndx_lan")));
  return updateFrame(frame.design, frame.id, { colour: "cyan" });
}

const WIRELESS_KINDS = new Set(["phone", "iot"]);
/** Does this device most probably reach the network over the air? A guess: phones and smart devices, and any address that is random on purpose. */
export const isWireless = (device: NetworkDevice): boolean => WIRELESS_KINDS.has(kindOf(device)) || device.randomized_mac === true;

export type DrawFound = { design: Design; added: number };

/**
 * Draw the devices the nodes found that are not in the drawing yet. The router is the device at the gateway (drawn, and tied to it, when the drawing has none); the others
 * are drawn as what they were guessed to be, tied to the device they are, and joined: the ones that reach the network over the air to the router's wifi (or an access point's), the
 * others to a free LAN port of the router or to a switch (one is added when there are more cables than the router has ports). The links are a guess about how they connect: the
 * drawing is where an operator corrects them.
 */
export function drawFound(current: Design, devices: readonly NetworkDevice[], network: { gateway?: string; cidr?: string }): DrawFound {
  let design = current;
  const drawn = new Set(design.elements.map(element => element.bind?.device).filter(Boolean));
  const missing = devices.filter(device => !drawn.has(device.id));
  if (missing.length === 0) return { design, added: 0 };
  const bottom = design.elements.reduce((low, element) => Math.max(low, element.y + (kindDef(element.kind)?.h ?? 60) + 60), 0);
  let routerElement: Element | undefined = design.elements.find(element => element.kind === "router" && (element.bind?.device ? devices.some(d => d.id === element.bind?.device && d.ip === network.gateway) : true));
  let added = 0;
  const gatewayDevice = missing.find(device => device.ip === network.gateway);
  if (!routerElement) {
    const line = put(design, "internet", 0, bottom + 20);
    const modem = put(line.design, "modem", 170, bottom + 20);
    const r = put(modem.design, "router", 340, bottom, { ip: network.gateway ?? "192.168.0.1", subnet: network.cidr ?? "192.168.0.0/24" }, "", gatewayDevice?.id);
    design = link(link(r.design, line.id, "wan", modem.id, "wan"), modem.id, "eth", r.id, "wan");
    routerElement = design.elements.find(element => element.id === r.id); added += gatewayDevice ? 1 : 0;
  } else if (gatewayDevice && !routerElement.bind?.device) {
    design = setBinding(design, routerElement.id, gatewayDevice.id); added += 1;
  }
  const others = missing.filter(device => device !== gatewayDevice && device.ip !== network.gateway);
  const wired = others.filter(device => !isWireless(device)), wireless = others.filter(isWireless);
  const routerId = routerElement!.id;
  const usedLan = new Set(design.wires.flatMap(wire => [wire.from, wire.to]).filter(ref => ref.element === routerId && ref.port.startsWith("lan")).map(ref => ref.port));
  const freeLan = ["lan1", "lan2", "lan3", "lan4"].filter(port => !usedLan.has(port));
  let switchElement = design.elements.find(element => element.kind === "switch");
  if (wired.length > freeLan.length && !switchElement && freeLan.length > 0) {
    const r = put(design, "switch", (routerElement!.x + 260), routerElement!.y, { ports: 24 });
    design = r.design; switchElement = design.elements.find(element => element.id === r.id);
    design = link(design, routerId, freeLan.shift()!, r.id, "up");
  }
  const accessPoint = design.elements.find(element => element.kind === "access-point");
  const column = (index: number): { x: number; y: number } => ({ x: routerElement!.x + 320 + (index % 3) * 130, y: Math.max(bottom, routerElement!.y) + Math.floor(index / 3) * 90 });
  let index = 0, switchPort = 0;
  for (const device of [...wired, ...wireless]) {
    const kind = kindForFound(kindOf(device));
    const at = column(index);
    const props: Record<string, string | number> = { ip: device.ip };
    if (device.hostname && kindDef(kind)?.props.some(prop => prop.key === "role")) props.role = "";
    const r = put(design, kind, at.x, at.y, props, device.note?.name || device.hostname || device.vendor || "", device.id);
    design = r.design; added += 1; index += 1;
    const wireless = isWireless(device);
    const element = design.elements.find(item => item.id === r.id)!;
    const hasEth = kindDef(element.kind)?.ports.some(port => port.id === "eth");
    if (wireless || !hasEth) {
      design = link(design, accessPoint ? accessPoint.id : routerId, "wifi", r.id, "wifi");
    } else if (switchElement) {
      switchPort += 1;
      design = link(design, switchElement.id, `p${((switchPort - 1) % 8) + 1}`, r.id, "eth");
    } else if (freeLan.length > 0) {
      design = link(design, routerId, freeLan.shift()!, r.id, "eth");
    } else {
      design = link(design, accessPoint ? accessPoint.id : routerId, "wifi", r.id, "wifi");
    }
  }
  if (added > 0 && textProp(routerElement!, "subnet") === "" && network.cidr) design = setProp(design, routerId, "subnet", network.cidr);
  return { design, added };
}
