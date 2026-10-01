/**
 * The animated logos of Studio: the A.R.M.O.R. shield of the sidebar and one small drawing per menu (a bell that swings, a lens that blinks, a radar that
 * sweeps, a rack whose lights run...). Plain SVG moved by CSS (anim.css); every movement stops under prefers-reduced-motion.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useId } from "react";
import "./anim.css";

export type LogoKind = "overview" | "alarms" | "cameras" | "radar" | "devices" | "automations" | "record" | "history" | "network" | "system" | "services" | "configuration";
const CYAN = "#00E5FF", AMBER = "#FFB020", GREEN = "#5DF0C4", RED = "#FF6F79";

/** The shield of the sidebar: a radar sweep turns inside it and a ring of light leaves it now and then. */
export function ArmorMark({ size = 40 }: { size?: number }) {
  const id = useId();
  return <svg className="am-mark" width={size} height={size} viewBox="-50 -50 100 100" role="img" aria-hidden="true">
    <defs>
      <clipPath id={`${id}-shield`}><path d="M0,-42 L33,-29 V2 C33,24 17,36 0,44 C-17,36 -33,24 -33,2 V-29 Z" /></clipPath>
      <radialGradient id={`${id}-sweep`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(40)"><stop offset="0" stopColor={CYAN} stopOpacity=".7" /><stop offset="1" stopColor={CYAN} stopOpacity="0" /></radialGradient>
    </defs>
    <path className="am-ring" d="M0,-42 L33,-29 V2 C33,24 17,36 0,44 C-17,36 -33,24 -33,2 V-29 Z" fill="none" stroke={CYAN} strokeWidth="2" />
    <path d="M0,-42 L33,-29 V2 C33,24 17,36 0,44 C-17,36 -33,24 -33,2 V-29 Z" fill="#06202a" stroke={CYAN} strokeWidth="4" strokeLinejoin="round" className="am-shield" />
    <g clipPath={`url(#${id}-shield)`}>
      <circle r="23" fill="none" stroke={CYAN} strokeWidth="1.5" opacity=".5" /><circle r="13" fill="none" stroke={CYAN} strokeWidth="1.5" opacity=".5" />
      <g className="am-sweep"><path d="M0,0 L0,-40 A40,40 0 0 1 28,-28 Z" fill={`url(#${id}-sweep)`} /><path d="M0,0 L0,-40" stroke={CYAN} strokeWidth="2.4" strokeLinecap="round" /></g>
      <circle className="am-blip" cx="14" cy="-12" r="3" fill={AMBER} />
    </g>
    <circle r="3" fill={CYAN} />
  </svg>;
}

/** One small animated drawing per menu, 44 by 44 by default. */
export function MenuLogo({ kind, size = 44 }: { kind: LogoKind; size?: number }) {
  return <svg className={`ml ml-${kind}`} width={size} height={size} viewBox="0 0 64 64" role="img" aria-hidden="true" fill="none" stroke={CYAN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    {DRAWINGS[kind]}
  </svg>;
}

const DRAWINGS: Record<LogoKind, React.ReactNode> = {
  overview: <>
    <path d="M32 6 L52 14 V32 C52 45 43 53 32 58 C21 53 12 45 12 32 V14 Z" className="ml-pulse" />
    <path d="M22 33 l7 7 l14 -16" stroke={GREEN} className="ml-draw" />
  </>,
  alarms: <>
    <circle className="ml-wave" cx="32" cy="34" r="14" stroke={RED} strokeWidth="2" />
    <circle className="ml-wave late" cx="32" cy="34" r="14" stroke={RED} strokeWidth="2" />
    <g className="ml-swing"><path d="M18 42 c4 -4 4 -8 4 -14 a10 10 0 0 1 20 0 c0 6 0 10 4 14 z" /><path d="M28 48 a4 4 0 0 0 8 0" /><path d="M32 14 v-4" /></g>
  </>,
  cameras: <>
    <rect x="6" y="18" width="40" height="28" rx="6" />
    <path d="M46 28 l12 -7 v22 l-12 -7" />
    <circle className="ml-iris" cx="26" cy="32" r="8" stroke={AMBER} /><circle cx="26" cy="32" r="2.5" fill={AMBER} stroke="none" />
    <circle className="ml-rec" cx="12" cy="24" r="2.4" fill={RED} stroke="none" />
  </>,
  radar: <>
    <circle cx="32" cy="32" r="24" /><circle cx="32" cy="32" r="15" opacity=".6" /><circle cx="32" cy="32" r="6" opacity=".6" />
    <g className="ml-turn"><path d="M32 32 L32 8" /><path d="M32 32 L49 15" stroke={AMBER} opacity=".0" /></g>
    <circle className="ml-blip" cx="44" cy="22" r="3" fill={AMBER} stroke="none" /><circle className="ml-blip late" cx="20" cy="42" r="2.6" fill={GREEN} stroke="none" />
  </>,
  devices: <>
    <rect x="22" y="22" width="20" height="20" rx="4" className="ml-pulse" />
    <path d="M28 22 v-8 M36 22 v-8 M28 42 v8 M36 42 v8 M22 28 h-8 M22 36 h-8 M42 28 h8 M42 36 h8" opacity=".8" />
    <circle className="ml-orbit" cx="32" cy="32" r="0" /><circle className="ml-dot a" cx="14" cy="14" r="3" fill={AMBER} stroke="none" /><circle className="ml-dot b" cx="50" cy="50" r="3" fill={GREEN} stroke="none" />
  </>,
  automations: <>
    <path className="ml-bolt" d="M36 6 L18 34 h12 l-4 24 L46 28 H33 z" stroke={AMBER} fill="#3a2a06" />
    <g className="ml-gear-small"><circle cx="48" cy="16" r="5" /><path d="M48 8 v3 M48 21 v3 M40 16 h3 M53 16 h3" /></g>
  </>,
  record: <>
    <rect x="8" y="12" width="48" height="34" rx="6" />
    <path className="ml-play" d="M27 21 v16 l14 -8 z" fill={CYAN} stroke="none" />
    <path d="M8 54 h48" opacity=".35" /><path className="ml-progress" d="M8 54 h48" stroke={AMBER} />
  </>,
  history: <>
    <circle cx="32" cy="32" r="24" />
    <path d="M32 12 v3 M32 49 v3 M12 32 h3 M49 32 h3" opacity=".7" />
    <path className="ml-hand slow" d="M32 32 v-12" stroke={AMBER} /><path className="ml-hand" d="M32 32 l12 0" />
    <circle cx="32" cy="32" r="2.6" fill={CYAN} stroke="none" />
  </>,
  network: <>
    <circle cx="32" cy="14" r="6" className="ml-pulse" /><circle cx="12" cy="48" r="5" /><circle cx="52" cy="48" r="5" /><circle cx="32" cy="50" r="4" opacity=".7" />
    <path d="M32 20 L14 43 M32 20 L50 43 M32 20 V46" opacity=".8" />
    <circle className="ml-ping a" cx="32" cy="14" r="6" stroke={GREEN} strokeWidth="2" /><circle className="ml-ping b" cx="32" cy="14" r="6" stroke={GREEN} strokeWidth="2" />
    <circle className="ml-dot a" cx="12" cy="48" r="2.4" fill={AMBER} stroke="none" /><circle className="ml-dot b" cx="52" cy="48" r="2.4" fill={GREEN} stroke="none" />
  </>,
  system: <>
    <rect x="12" y="8" width="40" height="14" rx="4" /><rect x="12" y="25" width="40" height="14" rx="4" /><rect x="12" y="42" width="40" height="14" rx="4" />
    <circle className="ml-led a" cx="20" cy="15" r="2.4" fill={GREEN} stroke="none" /><circle className="ml-led b" cx="20" cy="32" r="2.4" fill={AMBER} stroke="none" /><circle className="ml-led c" cx="20" cy="49" r="2.4" fill={GREEN} stroke="none" />
    <path className="ml-beat" d="M28 15 h4 l2 -4 l3 8 l2 -4 h5 M28 32 h4 l2 -4 l3 8 l2 -4 h5 M28 49 h4 l2 -4 l3 8 l2 -4 h5" strokeWidth="2" opacity=".8" />
  </>,
  services: <>
    <rect x="9" y="9" width="21" height="21" rx="4" /><rect x="34" y="9" width="21" height="21" rx="4" /><rect x="9" y="34" width="21" height="21" rx="4" /><rect x="34" y="34" width="21" height="21" rx="4" />
    <circle className="ml-led a" cx="19.5" cy="19.5" r="3.2" fill={GREEN} stroke="none" /><circle className="ml-led b" cx="44.5" cy="19.5" r="3.2" fill={GREEN} stroke="none" /><circle className="ml-led c" cx="19.5" cy="44.5" r="3.2" fill={AMBER} stroke="none" /><circle className="ml-led a" cx="44.5" cy="44.5" r="3.2" fill={RED} stroke="none" />
    <path d="M15 26 h9 M40 26 h9 M15 51 h9 M40 51 h9" strokeWidth="2" opacity=".6" />
  </>,
  configuration: <>
    <g className="ml-gear"><circle cx="32" cy="32" r="9" /><path d="M32 8 v9 M32 47 v9 M8 32 h9 M47 32 h9 M15 15 l6 6 M43 43 l6 6 M49 15 l-6 6 M21 43 l-6 6" strokeWidth="5" /></g>
    <circle cx="32" cy="32" r="3" fill={AMBER} stroke="none" />
  </>,
};

/** A menu's title with its logo beside it. */
export function MenuTitle({ kind, children }: { kind: LogoKind; children: React.ReactNode }) {
  return <div className="menu-title"><MenuLogo kind={kind} /><div className="menu-title-text">{children}</div></div>;
}
