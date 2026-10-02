/**
 * The colour of designer objects: a colour is stored as "#rrggbb" or not at all (then the object keeps its own look), and the
 * colours the objects wear by default are kept here so the colour picker can start from what is on screen.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { SiteFeatureKind } from "../domain";

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isColour = (value: unknown): value is string => typeof value === "string" && HEX.test(value);
/** A stored colour, lowercase, or undefined when it is not one. */
export const readColour = (value: unknown): string | undefined => isColour(value) ? value.toLowerCase() : undefined;

const channel = (hex: string, index: number) => parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
/** Lighter (positive `amount`, up to 1) or darker (negative) by mixing with white or black; used for the second tone of a tree, a post... */
export function shade(hex: string, amount: number): string {
  if (!isColour(hex)) return hex;
  const target = amount >= 0 ? 255 : 0, k = Math.min(1, Math.abs(amount));
  return "#" + [0, 1, 2].map(i => Math.round(channel(hex, i) + (target - channel(hex, i)) * k).toString(16).padStart(2, "0")).join("");
}

export const DEFAULT_TERRAIN_COLOUR = "#17414d";
export const DEFAULT_WALL_COLOUR = "#d9e3e6", DEFAULT_ROOF_COLOUR = "#9a4d3f";
export const DEFAULT_DOOR_COLOUR = "#6f8f9a", DEFAULT_WINDOW_FRAME_COLOUR = "#eef6f8";
export const DEFAULT_LIGHT_COLOUR = "#ffe9a8";
export const DEFAULT_ROOF_ITEM_COLOUR = { chimney: "#8a5a4a", solar: "#173f7a", antenna: "#c3d0d4", vent: "#7d8b93", gutter: "#8d9aa1", downpipe: "#8d9aa1" } as const;
/** The colour a kind of ground object shows by default (its main body). */
export const DEFAULT_FEATURE_COLOUR: Record<SiteFeatureKind, string> = {
  pillar: "#a8b4b8", lamp: "#59666d", mast: "#c3d0d4", solar: "#173f7a", canopy: "#4b6f7a", entrance: "#9fb1b7", path: "#6f8b93", road: "#1c252b",
  tree: "#2f7d45", kennel: "#a6763f", fence: "#8a9296", fountain: "#b3b8b3", coop: "#c9583b", gate: "#20272b", sidewalk: "#b8bcbd",
  pool: "#3fa7d6", planter: "#8a5a3c", terrace: "#a49a8c",
  bench: "#9a6b3d", table: "#a2784a", barbecue: "#8a5a4a", pergola: "#9a7448", shed: "#8a6a4a", hedge: "#2f6b3a", mailbox: "#b8392f", bins: "#2f6b4a", tank: "#cfd8dc", "ac-unit": "#e7ecee", "electrical-box": "#9aa6ab", car: "#b5332e",
};
export const featureColourOf = (kind: SiteFeatureKind, style: string | undefined): string =>
  kind === "gate" ? (style === "wood" ? "#8a6234" : style === "modern" ? "#2d3438" : style === "stone" ? "#9a8f82" : "#20272b")
  : kind === "fence" ? (style === "wall" ? "#9ea8ab" : style === "wire" ? "#7d8b93" : style === "rail" ? "#8b6a44" : style === "picket" ? "#c9b48f" : "#8a9296")
  : kind === "sidewalk" ? (style === "brick" ? "#a9583f" : style === "gravel" ? "#a39d93" : "#b8bcbd")
  : DEFAULT_FEATURE_COLOUR[kind];
