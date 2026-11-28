/**
 * What an element of the electrical drawing says about the solar device it is tied to, besides its figures: who made it (saying when that was deduced) and, for a battery, the worst
 * thing it says of itself in the three levels of the Batteries screen: a fault of its electronics, a protection or alarm, or a notice.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { makerText, stateLevel, type SolarDeviceView } from "../solarModel";

export type MarkLevel = "bms_fault" | "bms_protect" | "bms_notice";
export type SolarMark = { maker: string; level: MarkLevel | null };

export function solarMark(device: SolarDeviceView, deducedWord: string): SolarMark {
  const reading = device.reading;
  if (reading.kind === "inverter") return { maker: makerText(reading, deducedWord), level: null };
  const modules = reading.stack.filter(module => module.present);
  const maker = makerText(reading.manufacturer ? reading : (modules.find(module => module.manufacturer) ?? {}), deducedWord);
  let worst = 0;
  for (const module of modules) {
    if (module.cells_unread?.length || module.state === "SysError") worst = 3;
    for (const state of module.flags ?? []) worst = Math.max(worst, stateLevel(state));
  }
  if (reading.protecting === true) worst = Math.max(worst, 2);
  return { maker, level: worst === 3 ? "bms_fault" : worst === 2 ? "bms_protect" : worst === 1 ? "bms_notice" : null };
}
