/**
 * Network Designer checks: what a reader of the drawing would notice (two elements with one address, one outside the network of the router, one with no link, a switch with more
 * cables than ports, a camera that draws more power than the switch gives) and, when the nodes have reported, how the drawing compares with what is really on the network (a
 * device that is drawn and not there, one that is there and not drawn). A guide for reviewing the drawing, not a proof of anything about the network.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { NetworkDevice } from "../networkModel";
import { kindDef, portOf, numberProp, textProp, type Design, type Element } from "./model";

export type Level = "error" | "warn" | "info";
export type Issue = { level: Level; code: string; args: Array<string | number>; element?: string; wire?: string };
/** What the nodes report, when they do: the devices found, and the network and router they see. */
export type Live = { devices: readonly NetworkDevice[]; cidr?: string; gateway?: string };
export type Totals = { elements: number; links: number; wired: number; wireless: number; poe_w: number; bound: number };

const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const CIDR = /^((?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))\/(\d|[12]\d|3[0-2])$/;
const toInt = (ip: string): number => ip.split(".").reduce((sum, part) => sum * 256 + Number(part), 0);

/** Is the address inside the network (both as text)? false when either is not valid. */
export function inNetwork(ip: string, cidr: string): boolean {
  const match = CIDR.exec(cidr);
  if (!match || !IPV4.test(ip)) return false;
  const bits = Number(match[2]), mask = bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits)) >>> 0;
  return ((toInt(ip) & mask) >>> 0) === ((toInt(match[1]) & mask) >>> 0);
}
export const isIp = (text: string): boolean => IPV4.test(text);
export const isCidr = (text: string): boolean => CIDR.test(text);

const nameOf = (element: Element): string => element.name || element.id;

export function analyse(design: Design, live?: Live): { issues: Issue[]; totals: Totals } {
  const issues: Issue[] = [];
  const byId = new Map(design.elements.map(element => [element.id, element]));
  const linksOf = new Map<string, number>();
  for (const wire of design.wires) for (const end of [wire.from.element, wire.to.element]) linksOf.set(end, (linksOf.get(end) ?? 0) + 1);

  // two elements with one address, or an address that is not one
  const seen = new Map<string, Element>();
  for (const element of design.elements) {
    const ip = textProp(element, "ip");
    if (!ip) continue;
    if (!isIp(ip)) { issues.push({ level: "error", code: "ip_invalid", args: [nameOf(element), ip], element: element.id }); continue; }
    const other = seen.get(ip);
    if (other) issues.push({ level: "error", code: "ip_duplicate", args: [ip, nameOf(other), nameOf(element)], element: element.id }); else seen.set(ip, element);
  }
  // an address outside the network of the router
  const router = design.elements.find(element => element.kind === "router" && isCidr(textProp(element, "subnet")));
  if (router) {
    const subnet = textProp(router, "subnet");
    for (const element of design.elements) {
      const ip = textProp(element, "ip");
      if (element === router || !ip || !isIp(ip) || element.kind === "internet" || element.kind === "modem") continue;
      if (!inNetwork(ip, subnet)) issues.push({ level: "warn", code: "ip_outside", args: [nameOf(element), ip, subnet], element: element.id });
    }
  }
  // elements nothing is joined to, and elements with no way out to the internet
  for (const element of design.elements) {
    if (element.kind !== "internet" && !linksOf.has(element.id)) issues.push({ level: "warn", code: "unlinked", args: [nameOf(element)], element: element.id });
  }
  const internets = design.elements.filter(element => element.kind === "internet");
  if (internets.length > 0) {
    const reached = new Set<string>(internets.map(element => element.id));
    for (let changed = true; changed;) {
      changed = false;
      for (const wire of design.wires) {
        const a = wire.from.element, b = wire.to.element;
        if (reached.has(a) !== reached.has(b)) { reached.add(a); reached.add(b); changed = true; }
      }
    }
    for (const element of design.elements) {
      if (!reached.has(element.id) && linksOf.has(element.id)) issues.push({ level: "warn", code: "no_internet_path", args: [nameOf(element)], element: element.id });
    }
  }
  for (const element of design.elements) {
    if (element.kind === "router" && !design.wires.some(wire => (wire.from.element === element.id && wire.from.port === "wan") || (wire.to.element === element.id && wire.to.port === "wan"))) {
      issues.push({ level: "error", code: "router_no_wan", args: [nameOf(element)], element: element.id });
    }
  }
  // a switch with more cables than ports, and a switch that gives less power than what is hung from it
  let poeTotal = 0;
  for (const element of design.elements) {
    if (element.kind !== "switch") continue;
    const cables = design.wires.filter(wire => wire.from.element === element.id || wire.to.element === element.id);
    const ports = numberProp(element, "ports", 8);
    if (cables.length > ports) issues.push({ level: "warn", code: "switch_full", args: [nameOf(element), cables.length, ports], element: element.id });
    const budget = numberProp(element, "poe_budget_w", 0);
    let draw = 0;
    for (const wire of cables) {
      const otherId = wire.from.element === element.id ? wire.to.element : wire.from.element;
      const other = byId.get(otherId);
      if (other && kindDef(other.kind)?.poe) draw += numberProp(other, "poe_w", 0);
    }
    if (budget > 0 && draw > budget) issues.push({ level: "warn", code: "poe_over", args: [nameOf(element), Math.round(draw * 10) / 10, budget], element: element.id });
  }
  for (const element of design.elements) {
    if (!kindDef(element.kind)?.poe) continue;
    const connected = design.wires.some(wire => (wire.from.element === element.id || wire.to.element === element.id) && [wire.from.element, wire.to.element].some(id => byId.get(id)?.kind === "switch"));
    if (connected) poeTotal += numberProp(element, "poe_w", 0);
  }
  // a server or storage on the air
  for (const element of design.elements) {
    if (!["server", "nas", "armor-server"].includes(element.kind)) continue;
    const wires = design.wires.filter(wire => wire.from.element === element.id || wire.to.element === element.id);
    const ends = wires.map(wire => (wire.from.element === element.id ? wire.from : wire.to).port);
    if (wires.length > 0 && ends.every(port => port === "wifi")) issues.push({ level: "info", code: "wifi_server", args: [nameOf(element)], element: element.id });
  }
  // the drawing against the network
  let bound = 0;
  if (live) {
    const found = new Map(live.devices.map(device => [device.id, device]));
    for (const element of design.elements) {
      const id = element.bind?.device;
      if (!id) continue;
      bound += 1;
      const device = found.get(id);
      if (!device) { issues.push({ level: "warn", code: "bound_missing", args: [nameOf(element)], element: element.id }); continue; }
      if (!device.online) issues.push({ level: "warn", code: "bound_offline", args: [nameOf(element)], element: element.id });
      const ip = textProp(element, "ip");
      if (ip && device.ip !== ip) issues.push({ level: "warn", code: "ip_differs", args: [nameOf(element), ip, device.ip], element: element.id });
    }
    const drawn = new Set(design.elements.map(element => element.bind?.device).filter(Boolean));
    const undrawn = live.devices.filter(device => !drawn.has(device.id)).length;
    if (undrawn > 0) issues.push({ level: "info", code: "undrawn", args: [undrawn] });
  }
  const order: Record<Level, number> = { error: 0, warn: 1, info: 2 };
  issues.sort((a, b) => order[a.level] - order[b.level]);
  const wired = design.wires.filter(wire => byId.get(wire.from.element) && portMedium(design, wire.from.element, wire.from.port) === "eth").length;
  const wireless = design.wires.filter(wire => portMedium(design, wire.from.element, wire.from.port) === "wifi").length;
  return { issues, totals: { elements: design.elements.length, links: design.wires.length, wired, wireless, poe_w: Math.round(poeTotal * 10) / 10, bound } };
}

function portMedium(design: Design, elementId: string, portId: string): string | undefined {
  const element = design.elements.find(item => item.id === elementId);
  return element ? portOf(element, portId)?.medium : undefined;
}
