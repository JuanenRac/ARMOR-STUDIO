import type { MastPart } from "../../domain";
import { clamp, round2 } from "./shared";
import type { SiteModel } from "./shared";
// ---- what a mast carries -------------------------------------------------------------------------------------------------------------

export const MAST_PART_DEFAULTS: Record<MastPart["kind"], Omit<MastPart, "kind">> = {
  tv: { z: 0.9, rotation: 0, size: 1.0 }, satellite: { z: 0.7, rotation: 0, size: 0.8 }, wifi: { z: 0.5, rotation: 0, size: 0.4 },
};
const MAX_MAST_PARTS = 12;
/** A television antenna, a satellite dish or a Wi-Fi dish on a mast, near its top and a bit below the one put on before it. */
export function addMastPart(model: SiteModel, mastId: string, kind: MastPart["kind"]): SiteModel {
  return { ...model, features: model.features.map(item => {
    if (item.id !== mastId || item.kind !== "mast") return item;
    const parts = item.parts ?? [];
    if (parts.length >= MAX_MAST_PARTS) return item;
    const lowest = parts.length ? Math.min(...parts.map(part => part.z)) : item.height + 0.3;
    const z = round2(clamp(lowest - 0.9, 0.5, item.height));
    return { ...item, parts: [...parts, { kind, ...MAST_PART_DEFAULTS[kind], z, rotation: parts.length * 60 % 360 }] };
  }) };
}
export function updateMastPart(model: SiteModel, mastId: string, index: number, patch: Partial<MastPart>): SiteModel {
  return { ...model, features: model.features.map(item => item.id !== mastId || !item.parts ? item : { ...item, parts: item.parts.map((part, i) => i === index ? { ...part, ...patch } : part) }) };
}
export function removeMastPart(model: SiteModel, mastId: string, index: number): SiteModel {
  return { ...model, features: model.features.map(item => {
    if (item.id !== mastId || !item.parts) return item;
    const parts = item.parts.filter((_, i) => i !== index);
    const { parts: _dropped, ...rest } = item;
    return parts.length ? { ...rest, parts } : rest;
  }) };
}
