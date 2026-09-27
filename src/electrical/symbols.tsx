/**
 * Electrical Designer symbols: a small drawing for every kind of element, in the colour of its group. They are simplified pictures in the spirit of
 * the usual single-line symbols (a switch blade, a battery's cells, a resistor), not the exact ones of a standard.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { ReactNode } from "react";
import { CATEGORY_COLOUR, kindDef } from "./model";

const stroke = (colour: string, width = 2) => ({ fill: "none", stroke: colour, strokeWidth: width, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });
const label = (colour: string, text: string, x = 20, y = 24, size = 11) => <text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight={700} fill={colour} fontFamily='"DM Mono", ui-monospace, Consolas, monospace'>{text}</text>;

/** The picture inside a 40 by 40 box; the caller centres it in the element. */
function glyph(kind: string, colour: string): ReactNode {
  const s = stroke(colour);
  switch (kind) {
    case "grid": return <g {...s}><path d="M20 4 L11 36 M20 4 L29 36 M14 25 H26 M16 15 H24 M8 11 H32" /></g>;
    case "pv-array": return <g {...s}><path d="M5 31 L12 11 H35 L28 31 Z M8.5 21 H31.5 M19 11 L15 31 M27 11 L23 31" /><circle cx="33" cy="6" r="3" /></g>;
    case "generator": return <g {...s}><circle cx="20" cy="20" r="14" />{label(colour, "G", 20, 25, 14)}</g>;
    case "battery": return <g {...s}><rect x="4" y="12" width="28" height="16" rx="2" /><path d="M32 17 H36 V23 H32 M10 16 V24 M16 16 V24 M22 16 V24 M28 16 V24" /></g>;
    case "inverter": return <g>{label(colour, "DC", 9, 17, 10)}{label(colour, "AC", 31, 33, 10)}<path {...s} d="M4 24 H16 M12 20 L16 24 L12 28 M24 16 H36 M32 12 L36 16 L32 20" /><path {...s} d="M22 30 q3 -6 6 0 t6 0" /></g>;
    case "mppt": return <g>{label(colour, "MPPT", 20, 24, 12)}<path {...s} d="M4 33 L10 29 L16 31 L22 25 L30 27 L36 21" /></g>;
    case "charger": return <g>{label(colour, "AC→DC", 20, 24, 11)}<path {...s} d="M6 31 H34" /></g>;
    case "dc-dc": return <g>{label(colour, "DC/DC", 20, 24, 11)}<path {...s} d="M6 31 H34" /></g>;
    case "mcb": case "mcb-dc": return <g {...s}><path d="M4 22 H13 M13 22 L27 11 M27 22 H36 M23 6 L31 14 M31 6 L23 14" /></g>;
    case "rcd": return <g {...s}><circle cx="20" cy="20" r="10" /><path d="M4 20 H10 M30 20 H36 M20 10 V4" />{label(colour, "I∆n", 20, 24, 8)}</g>;
    case "fuse-dc": return <g {...s}><rect x="9" y="14" width="22" height="12" rx="2" /><path d="M3 20 H37 M9 20 H31" /></g>;
    case "spd": return <g {...s}><path d="M20 4 V16 M14 16 H26 L20 27 Z M11 32 H29 M15 36 H25" /></g>;
    case "isolator": return <g {...s}><path d="M4 22 H13 M13 22 L28 12 M28 22 H36 M28 16 V28" /></g>;
    case "contactor": return <g {...s}><rect x="4" y="8" width="14" height="24" rx="2" /><path d="M22 10 V15 M22 20 L34 13 M22 25 V30" />{label(colour, "K", 11, 25, 10)}</g>;
    case "e-breaker": case "e-breaker-dc": return <g {...s}><path d="M4 26 H12 M12 26 L26 15 M26 26 H36" /><path d="M14 6 q6 -5 12 0 M17 10 q3 -3 6 0" /></g>;
    case "relay": return <g {...s}><rect x="4" y="10" width="12" height="20" rx="2" />{label(colour, "R", 10, 25, 10)}<path d="M22 12 V16 M22 24 L34 16 M22 28 V32" /></g>;
    case "diverter": return <g {...s}><path d="M4 20 H14 M14 20 L30 8 M14 20 L30 32 M30 8 H37 M30 32 H37" />{label(colour, "%", 24, 24, 11)}</g>;
    case "plc": return <g {...s}><rect x="6" y="8" width="28" height="24" rx="3" />{label(colour, "PLC", 20, 25, 11)}<path d="M12 32 V36 M20 32 V36 M28 32 V36" /></g>;
    case "transfer": return <g {...s}><path d="M4 12 H14 M4 28 H14 M14 12 L28 20 H36 M14 28 V28" /><circle cx="14" cy="12" r="2" /><circle cx="14" cy="28" r="2" /></g>;
    case "junction-ac": case "junction-dc": return <circle cx="20" cy="20" r="7" fill={colour} />;
    case "meter-ac": return <g>{label(colour, "kWh", 20, 24, 12)}<path {...s} d="M6 30 H34" /></g>;
    case "meter-dc": return <g>{label(colour, "A·V", 20, 24, 12)}<path {...s} d="M6 30 H34" /></g>;
    case "node": return <g {...s}><rect x="8" y="10" width="24" height="20" rx="3" /><path d="M13 10 V5 M20 10 V5 M27 10 V5 M13 30 V35 M20 30 V35 M27 30 V35" /><circle cx="20" cy="20" r="3" fill={colour} /></g>;
    case "load": return <g {...s}><path d="M3 20 H9 L12 11 L18 29 L24 11 L30 29 L33 20 H37" /></g>;
    case "water-heater": return <g {...s}><rect x="10" y="4" width="20" height="32" rx="6" /><path d="M14 18 q3 -3 6 0 t6 0 M14 25 q3 -3 6 0 t6 0" /></g>;
    case "socket": return <g {...s}><circle cx="20" cy="20" r="14" /><path d="M14 16 V22 M26 16 V22 M20 28 V24" /></g>;
    case "lighting": return <g {...s}><circle cx="20" cy="17" r="9" /><path d="M16 28 H24 M17 32 H23 M20 4 V2 M6 17 H3 M37 17 H34 M10 7 L8 5 M30 7 L32 5" /></g>;
    case "ev-charger": return <g {...s}><rect x="10" y="4" width="18" height="30" rx="3" />{label(colour, "EV", 19, 23, 12)}<path d="M28 14 H34 V26 q0 5 -5 5" /></g>;
    case "hvac": return <g {...s}><path d="M20 4 V36 M6 12 L34 28 M6 28 L34 12" /></g>;
    case "load-dc": return <g>{label(colour, "DC", 20, 14, 10)}<path {...stroke(colour)} d="M3 27 H9 L12 20 L18 34 L24 20 L30 34 L33 27 H37" /></g>;
    default: return null;
  }
}

/** The body of an element (its box and picture), drawn at the origin. `live` is a short text shown above it when the element shows a solar device's readings. */
export function ElementBody({ kind, selected, tone }: { kind: string; selected: boolean; tone?: "ok" | "warn" | "bad" }) {
  const def = kindDef(kind);
  if (!def) return null;
  const colour = CATEGORY_COLOUR[def.category];
  const edge = tone === "bad" ? "#f87171" : tone === "warn" ? "#fbbf24" : colour;
  if (kind === "busbar-ac" || kind === "busbar-dc") return <rect x={def.w / 2 - 5} y={0} width={10} height={def.h} rx={4} fill={colour} opacity={selected ? 1 : 0.85} stroke={selected ? "#00e5ff" : "none"} strokeWidth={2} />;
  if (kind === "junction-ac" || kind === "junction-dc") return <g transform={`translate(0 0)`}><rect width={def.w} height={def.h} rx={20} fill="transparent" stroke={selected ? "#00e5ff" : "none"} strokeWidth={2} />{glyph(kind, colour)}</g>;
  return <g>
    <rect width={def.w} height={def.h} rx={8} fill={colour} fillOpacity={0.12} stroke={selected ? "#00e5ff" : edge} strokeWidth={selected ? 2.4 : 1.6} />
    <g transform={`translate(${def.w / 2 - 20} ${def.h / 2 - 20})`}>{glyph(kind, colour)}</g>
  </g>;
}

/** The little swatch of a kind, for the palette. */
export function KindSwatch({ kind, size = 34 }: { kind: string; size?: number }) {
  const def = kindDef(kind);
  if (!def) return null;
  const colour = CATEGORY_COLOUR[def.category];
  return <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">{kind === "busbar-ac" || kind === "busbar-dc" ? <rect x="15" y="2" width="10" height="36" rx="4" fill={colour} /> : glyph(kind, colour)}</svg>;
}
