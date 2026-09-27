/**
 * Network Designer symbols: a small drawing for every kind of element, in the colour of its group (the line and the modem in amber, the core equipment in cyan, what hangs from it in
 * green, the A.R.M.O.R. side in violet). Simplified pictures, not the exact ones of any standard.
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
    case "internet": return <g {...s}><path d="M11 29 a7 7 0 0 1 1 -14 a9 9 0 0 1 17 -2 a7 7 0 0 1 1 16 Z" /></g>;
    case "modem": return <g {...s}><rect x="6" y="18" width="28" height="12" rx="3" /><path d="M13 18 V8 M27 18 V8 M13 24 h1 M18 24 h1" /></g>;
    case "router": return <g {...s}><rect x="5" y="20" width="30" height="12" rx="3" /><path d="M12 20 V10 M28 20 V10 M14 26 h1 M19 26 h1 M24 26 h1" /><path d="M8 7 q4 -4 8 0 M24 7 q4 -4 8 0" /></g>;
    case "firewall": return <g {...s}><rect x="6" y="8" width="28" height="24" rx="2" /><path d="M6 16 H34 M6 24 H34 M16 8 V16 M26 16 V24 M16 24 V32" /></g>;
    case "switch": return <g {...s}><rect x="4" y="14" width="32" height="14" rx="2" /><path d="M9 28 v-8 M15 28 v-8 M21 28 v-8 M27 28 v-8 M33 28 v-8" /><path d="M12 10 h16" /></g>;
    case "access-point": return <g {...s}><circle cx="20" cy="26" r="6" /><path d="M9 20 a15 15 0 0 1 22 0 M13 23 a9 9 0 0 1 14 0" /></g>;
    case "powerline": return <g {...s}><rect x="10" y="8" width="20" height="24" rx="3" /><path d="M16 8 V4 M24 8 V4 M16 20 h8" /></g>;
    case "server": return <g {...s}><rect x="8" y="6" width="24" height="9" rx="2" /><rect x="8" y="17" width="24" height="9" rx="2" /><path d="M13 10.5 h1 M13 21.5 h1 M8 32 H32" /></g>;
    case "nas": return <g {...s}><rect x="9" y="6" width="22" height="28" rx="3" /><path d="M13 14 H27 M13 20 H27 M13 26 H27" /><circle cx="27" cy="30" r="1.2" fill={colour} /></g>;
    case "computer": return <g {...s}><rect x="6" y="8" width="28" height="18" rx="2" /><path d="M14 33 H26 M20 26 V33" /></g>;
    case "phone": return <g {...s}><rect x="12" y="4" width="16" height="32" rx="3" /><path d="M18 31 h4" /></g>;
    case "tv": return <g {...s}><rect x="4" y="9" width="32" height="20" rx="2" /><path d="M14 34 H26 M20 29 V34" /></g>;
    case "printer": return <g {...s}><rect x="6" y="15" width="28" height="13" rx="2" /><path d="M12 15 V7 H28 V15 M12 25 H28 V33 H12 Z" /></g>;
    case "camera": return <g {...s}><rect x="5" y="12" width="24" height="16" rx="3" /><path d="M29 18 l8 -4 v12 l-8 -4" /><circle cx="17" cy="20" r="4" /></g>;
    case "iot": return <g {...s}><circle cx="20" cy="20" r="6" /><path d="M20 6 v5 M20 29 v5 M6 20 h5 M29 20 h5 M10 10 l3.5 3.5 M26.5 26.5 L30 30 M30 10 l-3.5 3.5 M13.5 26.5 L10 30" /></g>;
    case "sbc": return <g {...s}><rect x="6" y="9" width="28" height="22" rx="2" /><rect x="13" y="15" width="10" height="10" rx="1" /><path d="M9 9 V5 M15 9 V5 M21 9 V5 M27 9 V5" /></g>;
    case "hub": return <g {...s}><circle cx="20" cy="20" r="5" /><circle cx="8" cy="10" r="2.5" /><circle cx="32" cy="10" r="2.5" /><circle cx="8" cy="30" r="2.5" /><circle cx="32" cy="30" r="2.5" /><path d="M16 17 L10 12 M24 17 L30 12 M16 23 L10 28 M24 23 L30 28" /></g>;
    case "armor-server": return <g {...s}><path d="M20 4 L33 9 V20 C33 28 27 33 20 36 C13 33 7 28 7 20 V9 Z" />{label(colour, "SRV", 20, 24, 9)}</g>;
    case "armor-node": return <g {...s}><path d="M20 4 L33 9 V20 C33 28 27 33 20 36 C13 33 7 28 7 20 V9 Z" /><circle cx="20" cy="19" r="4" /><path d="M20 15 V11" /></g>;
    default: return null;
  }
}

/** The body of an element (its box and picture), drawn at the origin. `tone` colours the edge; `live` says whether the device it is tied to is there. */
export function ElementBody({ kind, selected, tone, live }: { kind: string; selected: boolean; tone?: "ok" | "warn" | "bad"; live?: "on" | "off" | "missing" }) {
  const def = kindDef(kind);
  if (!def) return null;
  const colour = CATEGORY_COLOUR[def.category];
  const edge = tone === "bad" ? "#f87171" : tone === "warn" ? "#fbbf24" : colour;
  return <g>
    <rect width={def.w} height={def.h} rx={8} fill={colour} fillOpacity={0.12} stroke={selected ? "#00e5ff" : edge} strokeWidth={selected ? 2.4 : 1.6} />
    <g transform={`translate(${def.w / 2 - 20} ${def.h / 2 - 20})`}>{glyph(kind, colour)}</g>
    {live && <circle cx={def.w - 8} cy={8} r={4} fill={live === "on" ? "#5df0c4" : live === "off" ? "#ff6f79" : "#64748b"} stroke="#060d13" strokeWidth={1.5} />}
  </g>;
}

/** The little swatch of a kind, for the palette. */
export function KindSwatch({ kind, size = 34 }: { kind: string; size?: number }) {
  const def = kindDef(kind);
  if (!def) return null;
  return <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">{glyph(kind, CATEGORY_COLOUR[def.category])}</svg>;
}
