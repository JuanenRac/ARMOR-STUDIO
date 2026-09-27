/**
 * The electrical drawing kept in this browser as well as on the server, so it is there when the server is not (and the first time, before anything
 * has been saved there). What comes back is checked like a stored or imported document; anything else is ignored.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Design } from "./model";
import { buildElectricalDoc, parseElectricalDoc } from "./sync";

export const ELECTRICAL_LOCAL_KEY = "armor-studio-electrical-v1";

export function loadLocalElectrical(): Design | undefined {
  try {
    const raw = window.localStorage.getItem(ELECTRICAL_LOCAL_KEY);
    return raw ? parseElectricalDoc(JSON.parse(raw)) : undefined;
  } catch { return undefined; }   // storage may be blocked, or hold something else
}

export function saveLocalElectrical(design: Design): void {
  try { window.localStorage.setItem(ELECTRICAL_LOCAL_KEY, JSON.stringify(buildElectricalDoc(design))); } catch { /* storage may be full or blocked */ }
}
