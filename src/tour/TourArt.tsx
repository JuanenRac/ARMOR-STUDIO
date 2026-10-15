/**
 * The small animated pictures of the guided tours and of the rich hover hints: drawn in the page (no image files), with the colours of the theme, and still when the person
 * asked for less motion. Each one explains with a movement what the words say: a radar that sweeps, a camera that looks, a blueprint that draws itself.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { ReactNode } from "react";
import type { View } from "../domain";

export const ART_IDS = ["welcome", "menu", "monitor", "alarm", "camera", "radar", "energy", "house", "design", "admin", "update", "bell", "settings", "tips", "shield", "network", "terminal"] as const;
export type ArtId = (typeof ART_IDS)[number];

const PICTURES: Record<ArtId, ReactNode> = {
  welcome: <>
    <circle className="art-ring art-ring-1" cx="60" cy="40" r="30" /><circle className="art-ring art-ring-2" cx="60" cy="40" r="20" />
    <path className="art-draw" d="M60 18 L74 56 H66 L60 40 L54 56 H46 Z" />
    <circle className="art-pulse" cx="60" cy="40" r="3" />
  </>,
  menu: <>
    <rect className="art-frame" x="14" y="10" width="26" height="60" rx="4" />
    {[0, 1, 2, 3].map(i => <rect key={i} className="art-item" style={{ animationDelay: `${i * 0.25}s` }} x="19" y={16 + i * 13} width="16" height="8" rx="2" />)}
    <rect className="art-frame" x="46" y="10" width="62" height="60" rx="4" /><path className="art-draw" d="M54 56 L66 42 L78 50 L92 28" />
  </>,
  monitor: <>
    <rect className="art-frame" x="18" y="12" width="84" height="48" rx="5" />
    <path className="art-draw art-trace" d="M24 44 L38 44 L44 24 L52 52 L60 36 L66 44 L96 44" />
    <path className="art-frame" d="M48 68 H72 M60 60 V68" />
  </>,
  alarm: <>
    <path className="art-frame" d="M60 12 L100 26 V44 C100 60 82 70 60 74 C38 70 20 60 20 44 V26 Z" />
    <path className="art-draw" d="M42 42 L55 55 L80 30" />
    <circle className="art-ring art-ring-1" cx="60" cy="42" r="30" />
  </>,
  camera: <>
    <rect className="art-frame" x="18" y="22" width="64" height="40" rx="6" /><path className="art-frame" d="M82 36 L104 24 V60 L82 48" />
    <circle className="art-look" cx="50" cy="42" r="10" /><circle className="art-pulse" cx="50" cy="42" r="3" />
    <circle className="art-rec" cx="28" cy="30" r="3" />
  </>,
  radar: <>
    <circle className="art-frame" cx="60" cy="42" r="32" /><circle className="art-frame" cx="60" cy="42" r="20" /><circle className="art-frame" cx="60" cy="42" r="8" />
    <path className="art-sweep" d="M60 42 L60 10 A32 32 0 0 1 88 26 Z" />
    <circle className="art-blip" cx="78" cy="30" r="3" /><circle className="art-blip art-blip-2" cx="44" cy="54" r="3" />
  </>,
  energy: <>
    <circle className="art-sun" cx="30" cy="22" r="9" />{[0, 1, 2, 3, 4, 5].map(i => <path key={i} className="art-ray" d={`M30 ${6 - 0} V2`} transform={`rotate(${i * 60} 30 22)`} />)}
    <rect className="art-frame" x="58" y="30" width="44" height="30" rx="4" /><rect className="art-charge" x="62" y="34" width="36" height="22" rx="2" />
    <path className="art-draw" d="M40 30 L52 40 L66 40" />
  </>,
  house: <>
    <path className="art-frame" d="M20 40 L60 12 L100 40 V68 H20 Z" /><rect className="art-frame" x="52" y="46" width="16" height="22" />
    <rect className="art-light" x="28" y="44" width="14" height="12" /><rect className="art-light art-light-2" x="78" y="44" width="14" height="12" />
  </>,
  design: <>
    <path className="art-grid" d="M14 20 H106 M14 40 H106 M14 60 H106 M34 10 V70 M60 10 V70 M86 10 V70" />
    <path className="art-draw art-trace" d="M26 56 V32 L60 16 L94 32 V56 Z" /><path className="art-draw art-trace" d="M50 56 V42 H70 V56" />
  </>,
  admin: <>
    <circle className="art-gear" cx="60" cy="40" r="14" /><path className="art-gear-teeth" d="M60 18 V26 M60 54 V62 M38 40 H46 M74 40 H82 M44 24 L50 30 M70 50 L76 56 M76 24 L70 30 M50 50 L44 56" />
    <circle className="art-pulse" cx="60" cy="40" r="4" />
  </>,
  update: <>
    <path className="art-frame" d="M30 54 A26 26 0 0 1 60 14" /><path className="art-spin" d="M90 26 A26 26 0 0 1 60 66" />
    <path className="art-draw" d="M60 6 L66 14 L56 18 M60 74 L54 66 L64 62" />
    <path className="art-draw" d="M60 28 V52 M50 42 L60 52 L70 42" />
  </>,
  bell: <>
    <path className="art-bell" d="M60 14 C44 14 40 28 40 40 L34 54 H86 L80 40 C80 28 76 14 60 14 Z" /><path className="art-frame" d="M54 60 A6 6 0 0 0 66 60" />
    <path className="art-ring art-ring-1" d="M30 30 A34 34 0 0 1 36 18 M90 30 A34 34 0 0 0 84 18" />
  </>,
  settings: <>
    <path className="art-frame" d="M20 20 H100 M20 40 H100 M20 60 H100" />
    <circle className="art-knob" style={{ animationDelay: "0s" }} cx="40" cy="20" r="6" /><circle className="art-knob" style={{ animationDelay: ".6s" }} cx="74" cy="40" r="6" /><circle className="art-knob" style={{ animationDelay: "1.2s" }} cx="52" cy="60" r="6" />
  </>,
  tips: <>
    <path className="art-frame" d="M60 10 C44 10 36 24 42 36 C46 44 50 46 50 54 H70 C70 46 74 44 78 36 C84 24 76 10 60 10 Z" /><path className="art-frame" d="M52 60 H68 M54 66 H66" />
    <path className="art-ray art-spark" d="M60 2 V6 M92 40 H96 M24 40 H28 M84 14 L87 11 M36 14 L33 11" />
  </>,
  shield: <>
    <path className="art-frame" d="M60 10 L96 22 V42 C96 58 80 66 60 72 C40 66 24 58 24 42 V22 Z" /><rect className="art-frame" x="48" y="36" width="24" height="18" rx="3" />
    <path className="art-draw" d="M52 36 V30 A8 8 0 0 1 68 30 V36" />
  </>,
  network: <>
    <circle className="art-node" cx="60" cy="40" r="9" />{[[24, 18], [96, 18], [24, 62], [96, 62]].map(([x, y], i) => <g key={i}><path className="art-link" d={`M60 40 L${x} ${y}`} style={{ animationDelay: `${i * 0.3}s` }} /><circle className="art-node art-node-small" cx={x} cy={y} r="5" /></g>)}
  </>,
  terminal: <>
    <rect className="art-frame" x="14" y="12" width="92" height="56" rx="5" /><path className="art-draw" d="M26 28 L38 38 L26 48" /><path className="art-cursor" d="M46 50 H64" />
  </>,
};

/** The picture of a tour step or of a hint. It is decoration: the words next to it say everything. */
export function TourArt({ art, size = 120 }: { art: ArtId; size?: number }) {
  return <svg className={`tour-art art-${art}`} viewBox="0 0 120 80" width={size} height={size * 80 / 120} aria-hidden="true" focusable="false">{PICTURES[art]}</svg>;
}

/** Which picture goes with each menu: the one shown in its rich hint and in the tour that visits it. */
export const ART_OF_VIEW: Record<View, ArtId> = {
  overview: "monitor", weather: "energy", alarms: "bell", alarmPanels: "alarm", cameras: "camera", radar: "radar", record: "camera", history: "monitor", inverters: "energy", batteries: "energy",
  electrical: "energy", devices: "house", automations: "settings", network: "network", siteDesigner: "design", alarmDesigner: "design", electricalDesigner: "design", networkDesigner: "design",
  system: "admin", services: "admin", configuration: "settings",
};
