/**
 * Alarm Designer starting points: an empty drawing, a typical house (a panel with its supply and battery, a siren, a keypad and the sensors of the doors, the windows and the hall), and
 * the way to draw what the panels already have: every panel that is not in the drawing is added, tied to its node, and every zone it reports is added as a sensor tied to that zone and
 * joined to the next free loop of the panel.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { AlarmNodeView, AlarmZoneReading } from "../api";
import { EMPTY_DESIGN, LOOPS, kindDef, type Design } from "./model";
import { addElement, addFrame, connect, setBinding, updateFrame } from "./ops";

export const emptyDesign = (): Design => ({ ...EMPTY_DESIGN, elements: [], wires: [], frames: [] });

function must<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("a preset is inside the limits of the designer");
  return value;
}
function put(design: Design, kind: string, x: number, y: number, props: Record<string, string | number> = {}, name = "", bind?: { node?: string; zone?: string }): { design: Design; id: string } {
  return must(addElement(design, kind, x, y, name, props, bind));
}
function link(design: Design, a: string, portA: string, b: string, portB: string): Design {
  const result = connect(design, { element: a, port: portA }, { element: b, port: portB });
  return result.ok ? result.design : design;
}

/** A typical house: the panel with a supply and a battery, a siren and a keypad, two doors and a window on wired loops, a hall detector, and a smoke sensor on the radio. */
export function housePreset(t: (key: string) => string): Design {
  let design = emptyDesign();
  const place = (kind: string, x: number, y: number, props: Record<string, string | number> = {}, name = ""): string => { const r = put(design, kind, x, y, props, name); design = r.design; return r.id; };
  const central = place("central", 360, 120, { zones: 8 }, t("adx_central"));
  const front = place("door-contact", 100, 60, { zone_kind: "entry", location: t("adx_hall") }, t("adx_front_door"));
  const back = place("door-contact", 100, 140, { zone_kind: "entry", location: t("adx_kitchen") }, t("adx_back_door"));
  const window = place("window-contact", 100, 220, { zone_kind: "instant", location: t("adx_living") }, t("adx_living_window"));
  const hall = place("motion-pir", 100, 300, { zone_kind: "interior", location: t("adx_hall") }, t("adx_hall_motion"));
  const smoke = place("smoke", 360, -60, { zone_kind: "always", battery: "CR123", location: t("adx_corridor") }, t("adx_smoke"));
  const siren = place("siren-indoor", 640, 100, { location: t("adx_corridor") }, t("adx_siren"));
  const keypad = place("keypad", 640, 220, { location: t("adx_hall") }, t("adx_keypad"));
  const supply = place("power-supply", 330, 380);
  const battery = place("battery", 500, 380);
  design = link(design, front, "loop", central, "loop1");
  design = link(design, back, "loop", central, "loop2");
  design = link(design, window, "loop", central, "loop3");
  design = link(design, hall, "loop", central, "loop4");
  design = link(design, smoke, "radio", central, "radio");
  design = link(design, siren, "out", central, "siren");
  design = link(design, keypad, "bus", central, "bus");
  design = link(design, supply, "out", central, "power");
  design = link(design, battery, "out", central, "power");
  design = link(design, siren, "power", supply, "out");
  const frame = must(addFrame(design, 60, -100, 840, 560, t("adx_house")));
  return updateFrame(frame.design, frame.id, { colour: "violet" });
}

/** The kind of sensor a zone most probably is, from the words in its name and the kind the panel gives it. A guess: the drawing is where an operator corrects it. */
export function guessSensorKind(zone: Pick<AlarmZoneReading, "id" | "name" | "kind">): string {
  const words = `${zone.id} ${zone.name ?? ""}`.toLowerCase();
  const has = (pattern: RegExp) => pattern.test(words);
  if (has(/smoke|humo|rauch|fum[ée]e|fumo|煙|烟/)) return "smoke";
  if (has(/\bco\b|carbon|monox/)) return "co";
  if (has(/gas/)) return "gas";
  if (has(/leak|flood|water|agua|wasser|fuite|perdita|漏水/)) return "water-leak";
  if (has(/panic|sos|p[aá]nico/)) return "panic-button";
  if (has(/tamper|sabotaje|manipul/)) return "tamper-switch";
  if (has(/glass|cristal|vidrio|glas|vitre/)) return "glass-break";
  if (has(/window|ventana|fenster|fen[êe]tre|finestra|窗/)) return "window-contact";
  if (has(/door|puerta|t[üu]r|porte|porta|門|门/)) return "door-contact";
  if (has(/motion|pir|movimiento|bewegung|mouvement|movimento|人感|移动/)) return "motion-pir";
  switch (zone.kind) {
    case "entry": return "door-contact";
    case "interior": return "motion-pir";
    case "always": return "tamper-switch";
    default: return "window-contact";
  }
}

const ZONE_KIND_OF: Record<AlarmZoneReading["kind"], string> = { instant: "instant", entry: "entry", interior: "interior", always: "always" };
export type DrawPanels = { design: Design; added: number };

/**
 * Draw what the panels have that the drawing does not: a panel not tied to any element is drawn (and tied), a zone not tied to any sensor is drawn as the sensor it seems to be (and
 * tied), and joined to the panel's next free loop (or its radio when the loops are used). The links are a guess about how the sensors are connected.
 */
export function drawPanels(current: Design, nodes: readonly AlarmNodeView[]): DrawPanels {
  let design = current, added = 0;
  const bottom = design.elements.reduce((low, element) => Math.max(low, element.y + (kindDef(element.kind)?.h ?? 60) + 60), 0);
  let row = 0;
  for (const node of nodes) {
    let central = design.elements.find(element => element.bind?.node === node.node_id && !element.bind.zone);
    if (!central) {
      const y = bottom + row * 360;
      const r = put(design, "central", 360, y, { node_id: node.node_id, zones: Math.min(LOOPS, Math.max(1, node.state.zones.length)) }, node.node_id);
      design = setBinding(r.design, r.id, node.node_id);
      central = design.elements.find(element => element.id === r.id)!;
      added += 1;
    }
    row += 1;
    const centralId = central.id;
    const used = new Set(design.wires.flatMap(wire => [wire.from, wire.to]).filter(end => end.element === centralId && end.port.startsWith("loop")).map(end => end.port));
    const free = Array.from({ length: LOOPS }, (_unused, index) => `loop${index + 1}`).filter(portId => !used.has(portId));
    let index = 0;
    for (const zone of node.state.zones) {
      if (design.elements.some(element => element.bind?.node === node.node_id && element.bind.zone === zone.id)) continue;
      const kind = guessSensorKind(zone);
      const at = { x: central.x - 260, y: central.y + index * 80 };
      const props: Record<string, string | number> = { zone_kind: ZONE_KIND_OF[zone.kind] };
      const r = put(design, kind, at.x, at.y, props, zone.name || zone.id, { node: node.node_id, zone: zone.id });
      design = r.design; added += 1; index += 1;
      const loop = free.shift();
      design = loop ? link(design, r.id, "loop", centralId, loop) : link(design, r.id, "radio", centralId, "radio");
    }
  }
  return { design, added };
}
