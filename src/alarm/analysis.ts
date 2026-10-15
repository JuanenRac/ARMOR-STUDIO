/**
 * Alarm Designer checks: what a reader of the drawing would notice (a sensor nobody listens to, a panel with more loops joined than it has zones, a panel with no siren or no supply, a wireless
 * sensor without a battery, two elements tied to the same zone) and, when the panels have reported, how the drawing compares with what they really have (a zone that is drawn and not on the
 * panel, one that is on the panel and not drawn). A guide for reviewing the drawing, not a proof that the house is protected.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { AlarmNodeView } from "../api";
import { kindDef, numberProp, portOf, textProp, type Design, type Element } from "./model";

export type Level = "error" | "warn" | "info";
export type Issue = { level: Level; code: string; args: Array<string | number>; element?: string; wire?: string };
/** What the panels report, when they do. */
export type Live = { nodes: readonly AlarmNodeView[] };
export type Totals = { elements: number; centrals: number; sensors: number; outputs: number; controls: number; links: number; wired: number; wireless: number; bound: number };

const nameOf = (element: Element): string => element.name || element.id;

export function analyse(design: Design, live?: Live): { issues: Issue[]; totals: Totals } {
  const issues: Issue[] = [];
  const byId = new Map(design.elements.map(element => [element.id, element]));
  const linksOf = new Map<string, number>();
  const mediaOf = new Map<string, Set<string>>();
  for (const wire of design.wires) {
    for (const end of [wire.from, wire.to]) {
      linksOf.set(end.element, (linksOf.get(end.element) ?? 0) + 1);
      const element = byId.get(end.element), medium = element && portOf(element, end.port)?.medium;
      if (medium) { const set = mediaOf.get(end.element) ?? new Set<string>(); set.add(medium); mediaOf.set(end.element, set); }
    }
  }
  const category = (element: Element) => kindDef(element.kind)?.category;
  const centrals = design.elements.filter(element => category(element) === "central" && element.kind === "central");
  const sensors = design.elements.filter(element => category(element) === "sensor");

  if (design.elements.length > 0 && centrals.length === 0) issues.push({ level: "warn", code: "no_central", args: [] });

  for (const element of design.elements) {
    const def = kindDef(element.kind);
    if (!def) continue;
    const links = linksOf.get(element.id) ?? 0;
    if (links === 0) issues.push({ level: "warn", code: def.category === "sensor" ? "sensor_unlinked" : "unlinked", args: [nameOf(element)], element: element.id });
    // a required port (a supply, a bus) that nothing is joined to
    for (const required of def.ports.filter(candidate => candidate.required)) {
      const joined = design.wires.some(wire => (wire.from.element === element.id && wire.from.port === required.id) || (wire.to.element === element.id && wire.to.port === required.id));
      if (!joined && links > 0) issues.push({ level: "warn", code: required.medium === "power" ? "no_power" : "no_bus", args: [nameOf(element)], element: element.id });
    }
    if (def.category === "sensor") {
      const media = mediaOf.get(element.id);
      if (media?.has("loop") && media.has("radio")) issues.push({ level: "warn", code: "sensor_two_links", args: [nameOf(element)], element: element.id });
      if (media?.has("radio") && !media.has("loop") && textProp(element, "battery") === "none") issues.push({ level: "warn", code: "radio_no_battery", args: [nameOf(element)], element: element.id });
      if (media?.has("loop") && textProp(element, "battery") !== "none") issues.push({ level: "info", code: "wired_with_battery", args: [nameOf(element)], element: element.id });
      if (def.always && textProp(element, "zone_kind") !== "always") issues.push({ level: "warn", code: "danger_not_always", args: [nameOf(element)], element: element.id });
    }
  }

  for (const central of centrals) {
    const zones = numberProp(central, "zones", 8);
    const joinedLoops = design.wires.filter(wire => [wire.from, wire.to].some(end => end.element === central.id && end.port.startsWith("loop"))).length;
    const loopNumbers = design.wires.flatMap(wire => [wire.from, wire.to]).filter(end => end.element === central.id && end.port.startsWith("loop")).map(end => Number(end.port.slice(4)));
    if (loopNumbers.some(number => number > zones)) issues.push({ level: "error", code: "loops_over", args: [nameOf(central), zones, joinedLoops], element: central.id });
    const siren = design.wires.some(wire => [wire.from, wire.to].some(end => end.element === central.id && end.port === "siren"));
    if (!siren) issues.push({ level: "warn", code: "no_siren", args: [nameOf(central)], element: central.id });
    const control = design.wires.some(wire => [wire.from, wire.to].some(end => end.element === central.id && end.port === "bus"));
    if (!control) issues.push({ level: "info", code: "no_keypad", args: [nameOf(central)], element: central.id });
    const backup = design.elements.some(element => element.kind === "battery" && design.wires.some(wire => [wire.from, wire.to].some(end => end.element === element.id)));
    if (!backup) issues.push({ level: "info", code: "no_battery", args: [nameOf(central)], element: central.id });
    if (!textProp(central, "node_id") && !central.bind?.node) issues.push({ level: "info", code: "central_not_tied", args: [nameOf(central)], element: central.id });
  }

  // the openings: a door or a window with no sensor of its own cannot be known from the drawing, but a room with motion and no opening sensor can be mentioned
  const doors = sensors.filter(element => element.kind === "door-contact").length, windows = sensors.filter(element => element.kind === "window-contact").length;
  const motion = sensors.filter(element => element.kind === "motion-pir" || element.kind === "motion-dual").length;
  if (design.elements.length > 0 && doors + windows === 0 && motion > 0) issues.push({ level: "info", code: "only_motion", args: [motion] });

  // the panels against the drawing
  let bound = 0;
  for (const element of design.elements) {
    if (!element.bind?.node) continue;
    bound += 1;
    if (!live) continue;
    const node = live.nodes.find(candidate => candidate.node_id === element.bind?.node);
    if (!node) { issues.push({ level: "warn", code: "panel_missing", args: [nameOf(element), element.bind.node], element: element.id }); continue; }
    if (element.bind.zone && !node.state.zones.some(zone => zone.id === element.bind?.zone)) issues.push({ level: "warn", code: "zone_missing", args: [nameOf(element), element.bind.zone, element.bind.node], element: element.id });
  }
  if (live) {
    for (const node of live.nodes) {
      const drawn = design.elements.some(element => element.bind?.node === node.node_id && !element.bind.zone);
      if (!drawn) issues.push({ level: "info", code: "panel_not_drawn", args: [node.node_id] });
      else {
        const missing = node.state.zones.filter(zone => !design.elements.some(element => element.bind?.node === node.node_id && element.bind.zone === zone.id));
        if (missing.length > 0) issues.push({ level: "info", code: "zones_not_drawn", args: [node.node_id, missing.length] });
      }
    }
  }

  const wired = design.wires.filter(wire => { const element = byId.get(wire.from.element); return element && portOf(element, wire.from.port)?.medium === "loop"; }).length;
  const wireless = design.wires.filter(wire => { const element = byId.get(wire.from.element); return element && portOf(element, wire.from.port)?.medium === "radio"; }).length;
  return {
    issues,
    totals: {
      elements: design.elements.length, centrals: design.elements.filter(element => category(element) === "central").length, sensors: sensors.length,
      outputs: design.elements.filter(element => category(element) === "output").length, controls: design.elements.filter(element => category(element) === "control").length,
      links: design.wires.length, wired, wireless, bound,
    },
  };
}
