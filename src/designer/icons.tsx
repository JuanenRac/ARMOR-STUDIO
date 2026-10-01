/**
 * Line icons of the site designer: one 24 x 24 drawing per tool and per control, in the console's cyan.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { ReactNode } from "react";
import type { Tool } from "./model";

const frame = (children: ReactNode) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>;

const TOOL_ICONS: Record<Tool, ReactNode> = {
  select: frame(<><path d="M5 3l14 7-6 2-2 6z" fill="currentColor" fillOpacity=".18" /><path d="M13 12l5 6" /></>),
  move: frame(<><path d="M12 3v18M3 12h18" /><path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" /></>),
  elevate: frame(<><path d="M12 20V5M7 10l5-5 5 5" /><path d="M5 20h14" strokeDasharray="2 2.4" /></>),
  "terrain-rect": frame(<><path d="M4 7h16v10H4z" strokeDasharray="3 2.2" /><path d="M4 4v6M2 7h6M20 14v6M18 17h4" strokeWidth="1.3" /></>),
  "terrain-poly": frame(<><path d="M4 8l6-4 9 3 2 9-8 4-8-3z" strokeDasharray="3 2.2" /><circle cx="4" cy="8" r="1.4" fill="currentColor" /><circle cx="10" cy="4" r="1.4" fill="currentColor" /><circle cx="19" cy="7" r="1.4" fill="currentColor" /><circle cx="21" cy="16" r="1.4" fill="currentColor" /><circle cx="13" cy="20" r="1.4" fill="currentColor" /><circle cx="5" cy="17" r="1.4" fill="currentColor" /></>),
  "building-rect": frame(<><path d="M4 8h16v12H4z" fill="currentColor" fillOpacity=".14" /><path d="M2 8l10-5 10 5" /><path d="M9 20v-6h6v6" strokeWidth="1.3" /></>),
  "building-poly": frame(<><path d="M4 6h9v5h7v9H4z" fill="currentColor" fillOpacity=".14" /><circle cx="4" cy="6" r="1.3" fill="currentColor" /><circle cx="13" cy="6" r="1.3" fill="currentColor" /><circle cx="20" cy="11" r="1.3" fill="currentColor" /><circle cx="20" cy="20" r="1.3" fill="currentColor" /><circle cx="4" cy="20" r="1.3" fill="currentColor" /></>),
  door: frame(<><path d="M5 20V4h9v16" /><path d="M14 20a9 9 0 0 0-9-9" strokeWidth="1.2" strokeDasharray="1.5 2" /><path d="M3 20h18" /></>),
  window: frame(<><rect x="4" y="5" width="16" height="14" rx="1" /><path d="M12 5v14M4 12h16" /></>),
  "wall-lamp": frame(<><path d="M3 4v16" /><path d="M3 9h5" /><path d="M8 7l5 1.5-1 5H8z" fill="currentColor" fillOpacity=".2" /><path d="M14 16l4 3M15 12l5 1M13 19l2 3" strokeWidth="1.2" /></>),
  chimney: frame(<><path d="M3 20l9-9 9 9" /><path d="M14 8V4h4v9" /><path d="M13 3h6" /><path d="M16 2c1-1.4-1-2.2 0-3" strokeWidth="1.1" /></>),
  "roof-solar": frame(<><path d="M2 20l10-10 10 10" /><path d="M8 13l4-4 4 4-4 4z" fill="currentColor" fillOpacity=".25" /><path d="M10 11l4 4M14 11l-4 4" strokeWidth="1" /></>),
  antenna: frame(<><path d="M12 22V8" /><path d="M8 22h8" /><circle cx="12" cy="6" r="1.8" fill="currentColor" /><path d="M7.5 4.5a6 6 0 0 0 0 3M16.5 4.5a6 6 0 0 1 0 3M5 3a10 10 0 0 0 0 6M19 3a10 10 0 0 1 0 6" strokeWidth="1.3" /></>),
  pillar: frame(<><rect x="9" y="4" width="6" height="14" rx="1" /><path d="M6 20h12M7.5 4h9" /></>),
  lamp: frame(<><path d="M12 22V9" /><path d="M9 22h6" /><path d="M7 9h10l-2-4H9z" fill="currentColor" fillOpacity=".22" /><path d="M9 12l-2 3M15 12l2 3M12 12v3" strokeWidth="1.2" /></>),
  mast: frame(<><path d="M12 22L9 4M12 22l3-18" /><path d="M10 15h4M10.6 11h2.8M9.7 7h4.6" strokeWidth="1.2" /><path d="M9 4l3-2 3 2" /></>),
  solar: frame(<><path d="M4 8l2-3h12l2 3v9H4z" /><path d="M4 12.5h16M9.3 5L8 17M14.7 5L16 17" strokeWidth="1.2" /></>),
  canopy: frame(<><path d="M3 9h18l-2 4H5z" fill="currentColor" fillOpacity=".18" /><path d="M6 13v7M18 13v7" /></>),
  entrance: frame(<><path d="M4 18h16M6 14h12M8 10h8" /><path d="M12 4v3M10.5 5.5L12 4l1.5 1.5" /></>),
  path: frame(<><path d="M5 20c0-6 6-4 6-9s6-2 8-7" strokeDasharray="2 2.6" /></>),
  road: frame(<><path d="M8 3L5 21M16 3l3 18" /><path d="M12 5v3M12 11v3M12 17v3" strokeWidth="1.4" /></>),
  sidewalk: frame(<><path d="M3 9h18v6H3z" fill="currentColor" fillOpacity=".15" /><path d="M8 9v6M13 9v6M18 9v6" strokeWidth="1.2" /><path d="M2 5h20M2 19h20" strokeDasharray="2 2.4" strokeWidth="1.2" /></>),
  tree: frame(<><circle cx="12" cy="9" r="6" fill="currentColor" fillOpacity=".2" /><path d="M12 15v6M9 21h6" /><path d="M9 8l3-3 3 3" strokeWidth="1.2" /></>),
  kennel: frame(<><path d="M4 20V11l8-6 8 6v9z" fill="currentColor" fillOpacity=".15" /><path d="M9 20v-5a3 3 0 0 1 6 0v5" /><path d="M2 20h20" /></>),
  fence: frame(<><path d="M3 8v12M9 8v12M15 8v12M21 8v12" /><path d="M3 12h18M3 17h18" strokeWidth="1.3" /><path d="M3 8l0-2M9 8l0-2M15 8l0-2M21 8l0-2" strokeWidth="1.3" /></>),
  fountain: frame(<><path d="M4 18h16v2H4zM6 18v-3h12v3" /><path d="M12 15V8" /><path d="M8 7c1-2 3-3 4-3s3 1 4 3M9 9c0-1 1-2 3-2s3 1 3 2" strokeWidth="1.2" /></>),
  coop: frame(<><path d="M5 20V11l6-5 6 5v9z" fill="currentColor" fillOpacity=".15" /><path d="M9 20v-4h4v4" /><path d="M17 20l4-3M4 20v2M18 20v2" strokeWidth="1.2" /></>),
  gate: frame(<><path d="M3 21V7h3v14M18 21V7h3v14" /><path d="M6 11c2-3 10-3 12 0" strokeWidth="1.3" /><path d="M8 21V12M12 21V10M16 21V12" strokeWidth="1.1" /></>),
  garage: frame(<><path d="M3 21V9l9-5 9 5v12" /><path d="M6 21v-9h12v9" fill="currentColor" fillOpacity=".15" /><path d="M6 14h12M6 17h12" strokeWidth="1.2" /></>),
  arch: frame(<><path d="M6 21V12a6 6 0 0 1 12 0v9" fill="currentColor" fillOpacity=".12" /><path d="M3 21h18" /></>),
  pool: frame(<><path d="M3 9h18v10H3z" fill="currentColor" fillOpacity=".15" /><path d="M5 14c2-2 3 2 5 0s3 2 5 0 2 1 4 0" strokeWidth="1.3" /><path d="M8 9V5a2 2 0 0 1 4 0M13 9V5a2 2 0 0 1 4 0" strokeWidth="1.2" /></>),
  planter: frame(<><path d="M5 12h14l-2 8H7z" fill="currentColor" fillOpacity=".18" /><path d="M12 12V6M12 9c-3 0-4-2-4-4 3 0 4 2 4 4zM12 8c2 0 4-1 4-4-3 0-4 2-4 4z" strokeWidth="1.2" /></>),
  terrace: frame(<><path d="M3 14h18v3H3z" fill="currentColor" fillOpacity=".18" /><path d="M5 14V9M9 14V9M13 14V9M17 14V9M3 9h18" strokeWidth="1.2" /><path d="M6 17v4M18 17v4" /></>),
  device: frame(<><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" strokeWidth="1.3" /><path d="M8 3h8M8 21h8" strokeWidth="1.2" /></>),
  camera: frame(<><rect x="3" y="7" width="13" height="10" rx="2" /><path d="M16 11l5-3v8l-5-3" /><circle cx="9.5" cy="12" r="2.2" /></>),
  sensor: frame(<><circle cx="6" cy="18" r="1.8" fill="currentColor" /><path d="M9 14a6 6 0 0 1 6-6M9 10a10 10 0 0 1 10-6" /><path d="M12 18a6 6 0 0 0 6-6" /></>),
};

export const toolIcon = (tool: Tool): ReactNode => TOOL_ICONS[tool];

export const ICON = {
  grip: frame(<><circle cx="9" cy="6" r="1.2" fill="currentColor" /><circle cx="15" cy="6" r="1.2" fill="currentColor" /><circle cx="9" cy="12" r="1.2" fill="currentColor" /><circle cx="15" cy="12" r="1.2" fill="currentColor" /><circle cx="9" cy="18" r="1.2" fill="currentColor" /><circle cx="15" cy="18" r="1.2" fill="currentColor" /></>),
  collapse: frame(<path d="M6 10l6 6 6-6" />),
  expand: frame(<path d="M6 14l6-6 6 6" />),
  snap: frame(<><path d="M5 5v14h14" /><circle cx="12" cy="12" r="2" fill="currentColor" /><path d="M12 5v3M5 12h3" strokeWidth="1.2" /></>),
  grid: frame(<><path d="M4 4h16v16H4zM4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16" strokeWidth="1.2" /></>),
  fit: frame(<><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></>),
  zoomIn: frame(<path d="M12 5v14M5 12h14" />),
  zoomOut: frame(<path d="M5 12h14" />),
  top: frame(<><rect x="5" y="5" width="14" height="14" rx="1" /><path d="M5 5l14 14M19 5L5 19" strokeWidth="1" /></>),
  iso: frame(<><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" strokeWidth="1.2" /></>),
  front: frame(<><rect x="4" y="8" width="16" height="11" rx="1" /><path d="M2 8l10-5 10 5" strokeWidth="1.3" /></>),
  shadow: frame(<><circle cx="9" cy="9" r="4" /><path d="M13 16h8M11 19h10" strokeWidth="1.4" /></>),
  undo: frame(<><path d="M9 7L4 12l5 5" /><path d="M4 12h10a6 6 0 0 1 0 12" transform="translate(0 -6)" /></>),
  redo: frame(<><path d="M15 7l5 5-5 5" /><path d="M20 12H10a6 6 0 0 0 0 12" transform="translate(0 -6)" /></>),
  trash: frame(<><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" strokeWidth="1.3" /></>),
  layers: frame(<><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 12.5l9 5 9-5M3 17l9 5 9-5" strokeWidth="1.3" /></>),
  xray: frame(<><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" strokeDasharray="2.4 2.4" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" strokeWidth="1.1" /></>),
  turntable: frame(<><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v4h-4" /></>),
  focus: frame(<><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></>),
  floors: frame(<><path d="M3 6h18v4H3zM3 14h18v4H3z" /><path d="M6 10v4M18 10v4" strokeWidth="1.2" /></>),
  eye: frame(<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  roof: frame(<><path d="M2 13L12 4l10 9" /><path d="M5 11v9h14v-9" /></>),
  yawLeft: frame(<><path d="M20 12a8 8 0 1 0-2.3 5.6" /><path d="M20 5v5h-5" /></>),
  yawRight: frame(<><path d="M4 12a8 8 0 1 1 2.3 5.6" /><path d="M4 5v5h5" /></>),
  pitchUp: frame(<><path d="M4 18h16" /><path d="M6 15l12-6" /><path d="M14 6l4 3-1 4" strokeWidth="1.3" /></>),
  pitchDown: frame(<><path d="M4 18h16" /><path d="M6 9l12 6" /><path d="M14 18l4-3-1-4" strokeWidth="1.3" /></>),
  rollLeft: frame(<><rect x="6" y="8" width="12" height="9" rx="1.5" transform="rotate(-18 12 12)" /><path d="M4 20h16" strokeWidth="1.2" /></>),
  rollRight: frame(<><rect x="6" y="8" width="12" height="9" rx="1.5" transform="rotate(18 12 12)" /><path d="M4 20h16" strokeWidth="1.2" /></>),
  ruler: frame(<><path d="M3 15l12-12 6 6-12 12z" /><path d="M7 11l2 2M10 8l2 2M13 5l2 2" strokeWidth="1.2" /></>),
  radar: frame(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="M12 12L18 6" /></>),
};
