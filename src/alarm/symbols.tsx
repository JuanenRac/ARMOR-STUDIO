/**
 * Alarm Designer symbols: a small drawing for every kind of element, in the colour of its group (the panels in violet, the sensors in green, what sounds in red, what people use in cyan,
 * the supply in amber). Simplified pictures, not the exact ones of any standard.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { ReactNode } from "react";
import { CATEGORY_COLOUR, kindDef } from "./model";

const stroke = (colour: string, width = 2) => ({ fill: "none", stroke: colour, strokeWidth: width, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });
const label = (colour: string, text: string, x = 20, y = 24, size = 11) => <text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight={700} fill={colour} fontFamily='"DM Mono", ui-monospace, Consolas, monospace' stroke="none">{text}</text>;

/** The picture inside a 40 by 40 box; the caller centres it in the element. */
function glyph(kind: string, colour: string): ReactNode {
  const s = stroke(colour);
  switch (kind) {
    case "central": return <g {...s}><rect x="6" y="6" width="28" height="28" rx="3" /><path d="M11 13 h6 M11 19 h6 M11 25 h6" /><circle cx="26" cy="16" r="2" /><circle cx="26" cy="24" r="2" /></g>;
    case "expander": return <g {...s}><rect x="5" y="12" width="30" height="16" rx="2" /><path d="M10 28 v5 M16 28 v5 M22 28 v5 M28 28 v5 M10 12 V7 H30 V12" /></g>;
    case "communicator": return <g {...s}><rect x="12" y="4" width="16" height="30" rx="3" /><path d="M17 30 h6 M6 14 a14 14 0 0 1 0 10 M34 14 a14 14 0 0 0 0 10" /></g>;
    case "door-contact": return <g {...s}><path d="M9 6 H24 V34 H9 Z" /><path d="M24 6 l8 3 V31 l-8 3" /><circle cx="20" cy="21" r="1.4" fill={colour} /></g>;
    case "window-contact": return <g {...s}><rect x="8" y="7" width="24" height="26" rx="2" /><path d="M20 7 V33 M8 20 H32" /></g>;
    case "motion-pir": return <g {...s}><path d="M8 28 q12 -26 24 0 Z" /><path d="M20 28 v4 M14 32 h12" /></g>;
    case "motion-dual": return <g {...s}><path d="M7 27 q13 -26 26 0 Z" /><path d="M13 22 q7 -10 14 0" /><path d="M20 27 v5 M14 33 h12" /></g>;
    case "outdoor-beam": return <g {...s}><rect x="5" y="9" width="6" height="22" rx="2" /><rect x="29" y="9" width="6" height="22" rx="2" /><path d="M13 15 H27 M13 20 H27 M13 25 H27" strokeDasharray="2 3" /></g>;
    case "glass-break": return <g {...s}><rect x="7" y="7" width="26" height="26" rx="2" /><path d="M20 20 L10 10 M20 20 L31 12 M20 20 L28 32 M20 20 L12 30" /></g>;
    case "vibration": return <g {...s}><rect x="12" y="10" width="16" height="20" rx="2" /><path d="M6 14 v12 M3 17 v6 M34 14 v12 M37 17 v6" /></g>;
    case "smoke": return <g {...s}><circle cx="20" cy="22" r="12" /><circle cx="20" cy="22" r="5" /><path d="M20 10 V6" /></g>;
    case "heat": return <g {...s}><path d="M17 8 a3 3 0 0 1 6 0 V22 a7 7 0 1 1 -6 0 Z" /><path d="M20 14 V26" /></g>;
    case "co": return <g {...s}><circle cx="20" cy="20" r="14" />{label(colour, "CO", 20, 25, 12)}</g>;
    case "gas": return <g {...s}><path d="M20 5 C26 14 31 18 31 25 a11 11 0 0 1 -22 0 C9 18 14 14 20 5 Z" /><path d="M15 26 a5 5 0 0 0 5 5" /></g>;
    case "water-leak": return <g {...s}><path d="M20 6 C26 15 30 19 30 25 a10 10 0 0 1 -20 0 C10 19 14 15 20 6 Z" /><path d="M5 35 q5 -4 10 0 t10 0 t10 0" /></g>;
    case "panic-button": return <g {...s}><circle cx="20" cy="20" r="14" /><circle cx="20" cy="20" r="7" fill={colour} fillOpacity={0.35} />{label(colour, "!", 20, 25, 12)}</g>;
    case "tamper-switch": return <g {...s}><rect x="7" y="22" width="26" height="10" rx="2" /><path d="M20 22 V10 M14 12 L20 8 L26 12" /></g>;
    case "siren-indoor": return <g {...s}><path d="M9 16 H15 L25 8 V32 L15 24 H9 Z" /><path d="M29 14 a8 8 0 0 1 0 12 M33 10 a14 14 0 0 1 0 20" /></g>;
    case "siren-outdoor": return <g {...s}><path d="M8 17 H14 L23 9 V31 L14 23 H8 Z" /><path d="M27 14 a8 8 0 0 1 0 12" /><path d="M30 5 l3 -3 M34 11 l4 -1 M30 35 l3 3" /></g>;
    case "strobe": return <g {...s}><circle cx="20" cy="20" r="8" /><path d="M20 4 v6 M20 30 v6 M4 20 h6 M30 20 h6 M9 9 l4 4 M27 27 l4 4 M31 9 l-4 4 M13 27 l-4 4" /></g>;
    case "relay-output": return <g {...s}><rect x="6" y="9" width="28" height="22" rx="3" /><path d="M12 20 H17 M23 20 H28 M17 20 L23 14" /></g>;
    case "keypad": return <g {...s}><rect x="9" y="4" width="22" height="32" rx="3" /><path d="M14 12 h12" /><circle cx="15" cy="19" r="1.3" fill={colour} /><circle cx="20" cy="19" r="1.3" fill={colour} /><circle cx="25" cy="19" r="1.3" fill={colour} /><circle cx="15" cy="25" r="1.3" fill={colour} /><circle cx="20" cy="25" r="1.3" fill={colour} /><circle cx="25" cy="25" r="1.3" fill={colour} /><circle cx="20" cy="31" r="1.3" fill={colour} /></g>;
    case "card-reader": return <g {...s}><rect x="9" y="4" width="22" height="32" rx="3" /><path d="M14 14 a8 8 0 0 1 12 0 M16 18 a5 5 0 0 1 8 0" /><circle cx="20" cy="24" r="1.4" fill={colour} /></g>;
    case "key-fob": return <g {...s}><rect x="11" y="9" width="18" height="26" rx="8" /><circle cx="20" cy="4" r="2.5" /><circle cx="20" cy="17" r="2.5" /><circle cx="20" cy="26" r="2.5" /></g>;
    case "touch-panel": return <g {...s}><rect x="5" y="8" width="30" height="22" rx="3" /><path d="M12 15 h16 M12 21 h10" /><path d="M16 34 H24" /></g>;
    case "power-supply": return <g {...s}><rect x="6" y="9" width="28" height="22" rx="3" /><path d="M21 12 L14 22 H20 L19 29 L26 18 H20 Z" /></g>;
    case "battery": return <g {...s}><rect x="5" y="12" width="26" height="16" rx="2" /><path d="M31 17 h4 v6 h-4 M10 20 h10 M15 15 v10" /></g>;
    default: return null;
  }
}

/** The body of an element (its box and picture), drawn at the origin. `tone` colours the edge; `live` says what the panel it is tied to reports. */
export function ElementBody({ kind, selected, tone, live, rot = 0 }: { kind: string; selected: boolean; tone?: "ok" | "warn" | "bad"; live?: "on" | "off" | "missing" | "alarm"; rot?: number }) {
  const def = kindDef(kind);
  if (!def) return null;
  const colour = CATEGORY_COLOUR[def.category];
  const edge = tone === "bad" ? "#f87171" : tone === "warn" ? "#fbbf24" : colour;
  const turned = rot % 180 !== 0, boxW = turned ? def.h : def.w, boxH = turned ? def.w : def.h;
  const dot = live === "on" ? "#5df0c4" : live === "alarm" ? "#ff4d5e" : live === "off" ? "#ff6f79" : "#64748b";
  return <g transform={rot ? `translate(${boxW / 2} ${boxH / 2}) rotate(${rot}) translate(${-def.w / 2} ${-def.h / 2})` : undefined}>
    <rect width={def.w} height={def.h} rx={8} fill={live === "alarm" ? "#ff4d5e" : colour} fillOpacity={live === "alarm" ? 0.28 : 0.12} stroke={selected ? "#00e5ff" : live === "alarm" ? "#ff4d5e" : edge} strokeWidth={selected ? 2.4 : 1.6} />
    <g transform={`translate(${def.w / 2 - 20} ${def.h / 2 - 20})`}>{glyph(kind, colour)}</g>
    {live && <circle cx={def.w - 8} cy={8} r={4} fill={dot} stroke="#060d13" strokeWidth={1.5} />}
  </g>;
}

/** The little swatch of a kind, for the palette. */
export function KindSwatch({ kind, size = 34 }: { kind: string; size?: number }) {
  const def = kindDef(kind);
  if (!def) return null;
  return <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">{glyph(kind, CATEGORY_COLOUR[def.category])}</svg>;
}
