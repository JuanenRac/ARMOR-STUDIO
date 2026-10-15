/**
 * The crossing of the Site Designer with the Electrical Designer: what the site has that takes power - the motor of a gate, of a garage door and of a roller shutter, the electric water heater,
 * the pump of a solar circuit and the solar water heater of a roof - becomes loads of the diagram. Each load remembers the object it came from (`site_ref`), so drawing again adds only what is new
 * and an element the person already drew by hand or edited is never touched. Nothing is wired: the person (or the preset) joins the loads to their breakers.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Opening, RoofItem, SiteFeature } from "../domain";
import { addElement, setProp } from "./ops";
import { snap, type Design } from "./model";

export type SiteLoad = { ref: string; kind: "motor" | "pump" | "water-heater" | "solar-heater"; name: string; props: Record<string, number | string> };
type Site = { openings: readonly Opening[]; features: readonly SiteFeature[]; roofItems: readonly RoofItem[] };
type Words = { gate: string; garage: string; shutter: string; waterHeater: string; solarPump: string; solarHeater: string };

/** The power a motor usually takes, by what it moves: a sliding gate needs more than a roller shutter. */
const MOTOR_W = { gate: 300, slidingGate: 450, garage: 250, shutter: 150 } as const;

export function siteLoads(site: Site, words: Words): SiteLoad[] {
  const loads: SiteLoad[] = [];
  const named = (label: string | undefined, fallback: string, id: string) => `${label?.trim() || fallback} (${id})`;
  for (const feature of site.features) {
    if (feature.kind === "gate" && feature.automatic) {
      const sliding = feature.style === "slide" || feature.style === "cantilever";
      loads.push({ ref: `feature:${feature.id}`, kind: "motor", name: named(feature.label, words.gate, feature.id), props: { power_w: sliding ? MOTOR_W.slidingGate : MOTOR_W.gate } });
    } else if (feature.kind === "water-heater") loads.push({ ref: `feature:${feature.id}`, kind: "water-heater", name: named(feature.label, words.waterHeater, feature.id), props: { power_w: 1500, volume_l: 80 } });
    else if (feature.kind === "solar-tank") loads.push({ ref: `feature:${feature.id}`, kind: "pump", name: named(feature.label, words.solarPump, feature.id), props: { power_w: 80 } });
  }
  for (const opening of site.openings) {
    if (!opening.motor) continue;
    if (opening.kind === "garage") loads.push({ ref: `opening:${opening.id}`, kind: "motor", name: `${words.garage} (${opening.id})`, props: { power_w: MOTOR_W.garage } });
    else if (opening.kind === "window" && opening.shutter) loads.push({ ref: `opening:${opening.id}`, kind: "motor", name: `${words.shutter} (${opening.id})`, props: { power_w: MOTOR_W.shutter } });
  }
  for (const item of site.roofItems) if (item.kind === "solar-heater") loads.push({ ref: `roof:${item.id}`, kind: "solar-heater", name: `${words.solarHeater} (${item.id})`, props: { power_w: 0, collector_m2: Math.max(0.5, Math.round(item.width * item.depth * 10) / 10) } });
  return loads;
}

/** Draw the loads the diagram does not have yet, in a column to the right of everything, and say how many were added. */
export function addSiteLoads(design: Design, loads: readonly SiteLoad[]): { design: Design; added: number } {
  const have = new Set(design.elements.map(element => String(element.props.site_ref ?? "")).filter(Boolean));
  const right = design.elements.reduce((most, element) => Math.max(most, element.x + 120), 0);
  let next = design, added = 0;
  for (const load of loads) {
    if (have.has(load.ref)) continue;
    const made = addElement(next, load.kind, snap(right + 40), snap(40 + added * 100), load.name);
    if (!made) break;
    next = setProp(made.design, made.id, "site_ref", load.ref);
    for (const [key, value] of Object.entries(load.props)) next = setProp(next, made.id, key, value);
    added += 1;
  }
  return { design: next, added };
}
