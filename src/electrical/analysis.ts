/**
 * Electrical Designer checks: what the drawing says that a person drawing it would want to be told. The rules are the ordinary ones (a breaker is
 * chosen for the current that flows behind it, a cable for the breaker in front of it, two sources never feed the same line without a transfer
 * switch, a load has protection and a supply) and they are a guide to review the drawing with, not a substitute for the regulations or for an installer.
 * The figures for cable sections are the usual maximum protection ratings of copper cables in a typical installation; they can be wrong for a real one.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { currentOf, dcVoltageOf, kindDef, numberProp, type Design, type Element, type PortRef, type Wire } from "./model";

export type Level = "error" | "warn" | "info";
export type Issue = { level: Level; code: string; element?: string; wire?: string; args: Array<string | number> };
export type Totals = { pv_wp: number; battery_kwh: number; inverter_w: number; load_w: number; loads: number; elements: number; wires: number };

/** The most a breaker or fuse in front of a copper cable of this section (mm2) should be rated for, in amperes: the usual figures for a cable in a conduit. */
const AMPACITY: ReadonlyArray<readonly [number, number]> = [[1.5, 10], [2.5, 16], [4, 25], [6, 32], [10, 50], [16, 63], [25, 80], [35, 100], [50, 125], [70, 160], [95, 200]];
export function ampacity(section: number): number {
  let found = 0;
  for (const [size, amps] of AMPACITY) if (section >= size) found = amps;
  return found;
}

const SERIES = new Set(["mcb", "mcb-dc", "rcd", "fuse-dc", "isolator", "contactor", "e-breaker", "e-breaker-dc", "dc-dc", "meter-ac", "meter-dc", "relay", "diverter"]);
const BREAKERS = new Set(["mcb", "rcd", "e-breaker", "isolator", "contactor"]);
const DC_BREAKERS = new Set(["mcb-dc", "fuse-dc", "e-breaker-dc"]);
const OVERCURRENT = new Set(["mcb", "e-breaker"]);
const BUSES = new Set(["busbar-ac", "busbar-dc", "junction-ac", "junction-dc"]);
const CAN_OPEN = new Set([...SERIES, "transfer"]);
const AC_LOADS = new Set(["load", "water-heater", "socket", "lighting", "ev-charger", "hvac"]);

const isOpen = (element: Element): boolean => element.state === "open" && CAN_OPEN.has(element.kind);

/** Where the current can go on from an element it came into by `entry`. An open element goes nowhere. */
function exitsOf(element: Element, entry: string): string[] {
  if (isOpen(element)) return [];
  if (SERIES.has(element.kind)) return [entry === "in" ? "out" : entry === "out" ? "in" : ""].filter(Boolean);
  if (BUSES.has(element.kind)) return (kindDef(element.kind)?.ports ?? []).filter(port => port.id !== entry && port.domain !== "signal").map(port => port.id);
  if (element.kind === "transfer") return entry === "a" || entry === "b" ? ["out"] : [];
  return [];
}

/** What an element draws from the line it is fed by: a load, or an inverter or charger taking its AC in. */
function drawOf(element: Element, entry: string): number {
  if (AC_LOADS.has(element.kind)) return numberProp(element, "power_w");
  if ((element.kind === "charger" && entry === "in")) return numberProp(element, "rated_w");
  if (element.kind === "inverter" && entry === "acin") return numberProp(element, "acin_max_w");
  return 0;
}

type Link = { wire: Wire; other: PortRef };
const isSame = (a: PortRef, b: PortRef): boolean => a.element === b.element && a.port === b.port;

export function analyse(design: Design): { issues: Issue[]; totals: Totals } {
  const issues: Issue[] = [];
  const byId = new Map(design.elements.map(element => [element.id, element]));
  const name = (element: Element): string => element.name || element.id;
  const linksAt = (ref: PortRef): Link[] => design.wires.filter(wire => isSame(wire.from, ref) || isSame(wire.to, ref)).map(wire => ({ wire, other: isSame(wire.from, ref) ? wire.to : wire.from }));
  const wired = new Set<string>();
  for (const wire of design.wires) { wired.add(`${wire.from.element}/${wire.from.port}`); wired.add(`${wire.to.element}/${wire.to.port}`); }

  // ---- totals ----
  const totals: Totals = { pv_wp: 0, battery_kwh: 0, inverter_w: 0, load_w: 0, loads: 0, elements: design.elements.length, wires: design.wires.length };
  for (const element of design.elements) {
    if (element.kind === "pv-array") totals.pv_wp += numberProp(element, "peak_wp");
    if (element.kind === "battery") totals.battery_kwh += numberProp(element, "nominal_v") * numberProp(element, "capacity_ah") / 1000;
    if (element.kind === "inverter") totals.inverter_w += numberProp(element, "rated_w");
    if (AC_LOADS.has(element.kind)) { totals.load_w += numberProp(element, "power_w"); totals.loads += 1; }
  }

  // ---- open ports and lone elements ----
  for (const element of design.elements) {
    const def = kindDef(element.kind);
    if (!def) continue;
    const mine = def.ports.filter(port => wired.has(`${element.id}/${port.id}`));
    if (mine.length === 0) { issues.push({ level: "info", code: "orphan", element: element.id, args: [name(element)] }); continue; }
    for (const port of def.ports) if (port.required && !wired.has(`${element.id}/${port.id}`)) issues.push({ level: "warn", code: "port_open", element: element.id, args: [name(element), port.id] });
    if (element.kind === "node" && !String(element.props.node_id ?? "").trim() && !element.bind?.node) issues.push({ level: "info", code: "node_unbound", element: element.id, args: [name(element)] });
  }

  // ---- DC: the voltages on either side of a wire ----
  for (const wire of design.wires) {
    const a = byId.get(wire.from.element), b = byId.get(wire.to.element);
    if (!a || !b || (kindDef(a.kind)?.ports.find(port => port.id === wire.from.port)?.domain) !== "dc") continue;
    const va = dcVoltageOf(a), vb = dcVoltageOf(b);
    if (va > 0 && vb > 0 && va !== vb) issues.push({ level: "warn", code: "dc_voltage", element: a.id, wire: wire.id, args: [name(a), va, name(b), vb] });
    // a cable next to a DC breaker or fuse
    const guard = DC_BREAKERS.has(a.kind) ? a : DC_BREAKERS.has(b.kind) ? b : undefined;
    if (guard && wire.section_mm2 !== undefined && ampacity(wire.section_mm2) < numberProp(guard, "rating_a")) issues.push({ level: "error", code: "cable_small", element: guard.id, wire: wire.id, args: [wire.section_mm2, numberProp(guard, "rating_a"), ampacity(wire.section_mm2)] });
  }

  // ---- AC: who feeds what ----
  type State = { at: PortRef; source: string; last: number | null; protectedPath: boolean; rcd: boolean };
  const reached = new Map<string, Set<string>>();       // element -> the sources that reach it
  const entryOf = new Map<string, string>();            // element -> the port a source first came in by
  const firstReach = new Map<string, string>();         // signature of a set of sources -> the first element reached by all of them
  const loadInfo = new Map<string, { protectedPath: boolean; unprotected: boolean; rcd: boolean; unRcd: boolean }>();
  const wireRating = new Map<string, number>();         // wire -> the highest breaker rating in front of it
  const seen = new Set<string>();

  const start = (sourceElement: Element, port: string, source: string) => {
    const queue: State[] = linksAt({ element: sourceElement.id, port }).map(link => ({ at: link.other, source, last: null, protectedPath: false, rcd: false }));
    // the wire it left by counts too: no breaker in front of it
    for (const link of linksAt({ element: sourceElement.id, port })) wireRating.set(link.wire.id, Math.max(wireRating.get(link.wire.id) ?? 0, 0));
    while (queue.length) {
      const state = queue.shift()!;
      const element = byId.get(state.at.element);
      if (!element) continue;
      const domain = kindDef(element.kind)?.ports.find(port => port.id === state.at.port)?.domain;
      if (domain !== "ac") continue;
      const key = `${element.id}|${state.at.port}|${state.source}|${state.protectedPath}|${state.rcd}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!reached.has(element.id)) reached.set(element.id, new Set());
      reached.get(element.id)!.add(state.source);
      if (!entryOf.has(element.id)) entryOf.set(element.id, state.at.port);
      if (AC_LOADS.has(element.kind)) {
        const info = loadInfo.get(element.id) ?? { protectedPath: false, unprotected: false, rcd: false, unRcd: false };
        if (state.protectedPath) info.protectedPath = true; else info.unprotected = true;
        if (state.rcd) info.rcd = true; else info.unRcd = true;
        loadInfo.set(element.id, info);
      }
      let last = state.last, protectedPath = state.protectedPath, rcd = state.rcd, source = state.source;
      if (!isOpen(element)) {
        if (OVERCURRENT.has(element.kind)) { last = numberProp(element, "rating_a"); protectedPath = true; }   // only these protect a cable and what is behind it
        if (element.kind === "rcd") rcd = true;
      }
      if (element.kind === "transfer") source = `sel:${element.id}`;
      for (const exit of exitsOf(element, state.at.port)) {
        for (const link of linksAt({ element: element.id, port: exit })) {
          if (isSame(link.other, state.at)) continue;
          if (last !== null) wireRating.set(link.wire.id, Math.max(wireRating.get(link.wire.id) ?? 0, last));
          queue.push({ at: link.other, source, last, protectedPath, rcd });
        }
      }
    }
  };
  for (const element of design.elements) {
    if (element.kind === "grid" || element.kind === "generator") start(element, "out", `${element.kind}:${element.id}`);
    if (element.kind === "inverter") start(element, "acout", `inverter:${element.id}`);
  }
  const hasSource = design.elements.some(element => element.kind === "grid" || element.kind === "generator" || element.kind === "inverter");

  // two sources on one line
  for (const [id, sources] of reached) {
    if (sources.size < 2 || byId.get(id)?.kind === "transfer") continue;   // a transfer switch is where two sources are meant to meet
    const signature = [...sources].sort().join("+");
    if (firstReach.has(signature)) continue;
    firstReach.set(signature, id);
    const element = byId.get(id)!;
    issues.push({ level: "error", code: "backfeed", element: id, args: [name(element), [...sources].map(source => (byId.get(source.split(":")[1] ?? "") ? name(byId.get(source.split(":")[1]!)!) : source)).join(" / ")] });
  }

  // what is drawn from the line behind a set of ports, and whether the breaker in front of it is enough
  const sumFrom = (starts: PortRef[]): number => {
    let total = 0;
    const visited = new Set<string>();
    const queue: PortRef[] = [...starts];
    while (queue.length) {
      const at = queue.shift()!, next = byId.get(at.element);
      if (!next) continue;
      const key = `${next.id}|${at.port}`;
      if (visited.has(key)) continue;
      visited.add(key);
      total += drawOf(next, at.port);
      for (const exit of exitsOf(next, at.port)) for (const link of linksAt({ element: next.id, port: exit })) if (!isSame(link.other, at)) queue.push(link.other);
    }
    return total;
  };
  const below = (element: Element, entry: string): number => sumFrom(exitsOf(element, entry).flatMap(exit => linksAt({ element: element.id, port: exit }).map(link => link.other)));
  for (const element of design.elements) {
    if (!BREAKERS.has(element.kind) || isOpen(element)) continue;
    const entry = entryOf.get(element.id);
    if (!entry) continue;
    const amps = currentOf(below(element, entry));
    const limit = numberProp(element, "rating_a");
    if (amps > limit && limit > 0) issues.push({ level: "warn", code: "breaker_small", element: element.id, args: [name(element), limit, Math.round(amps * 10) / 10] });
  }
  for (const element of design.elements) {
    if (element.kind !== "inverter" && element.kind !== "grid") continue;
    const port = element.kind === "inverter" ? "acout" : "out";
    const total = sumFrom(linksAt({ element: element.id, port }).map(link => link.other));
    if (element.kind === "inverter" && total > numberProp(element, "rated_w") && numberProp(element, "rated_w") > 0) issues.push({ level: "warn", code: "inverter_overload", element: element.id, args: [name(element), total, numberProp(element, "rated_w")] });
    if (element.kind === "grid" && total > numberProp(element, "contracted_kw") * 1000 && numberProp(element, "contracted_kw") > 0) issues.push({ level: "warn", code: "grid_overload", element: element.id, args: [name(element), total, numberProp(element, "contracted_kw") * 1000] });
  }

  // cables behind a breaker
  for (const wire of design.wires) {
    const rating = wireRating.get(wire.id);
    if (wire.section_mm2 === undefined || rating === undefined || rating <= 0) continue;
    if (ampacity(wire.section_mm2) < rating) issues.push({ level: "error", code: "cable_small", wire: wire.id, args: [wire.section_mm2, rating, ampacity(wire.section_mm2)] });
  }

  // loads: supply, protection, residual-current protection
  for (const element of design.elements) {
    if (!AC_LOADS.has(element.kind) || !wired.has(`${element.id}/in`)) continue;
    const info = loadInfo.get(element.id);
    if (!info) { if (hasSource) issues.push({ level: "warn", code: "no_supply", element: element.id, args: [name(element)] }); continue; }
    if (info.unprotected) issues.push({ level: "warn", code: "no_breaker", element: element.id, args: [name(element)] });
    if (info.unRcd) issues.push({ level: element.kind === "socket" ? "warn" : "info", code: "no_rcd", element: element.id, args: [name(element)] });
  }

  const rank: Record<Level, number> = { error: 0, warn: 1, info: 2 };
  issues.sort((a, b) => rank[a.level] - rank[b.level]);
  return { issues, totals };
}
