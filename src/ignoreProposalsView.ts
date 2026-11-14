/**
 * What the card of the proposed areas to ignore shows, made from the answer of the server: one entry per camera with its rectangles (fractions of the picture), and the rectangles
 * scaled to a small drawing. A rectangle that is not inside the picture, and a camera without any, are left out.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { IgnoreProposals } from "./api/contract/armor-rest";

export type ProposalRect = { x: number; y: number; w: number; h: number };
export type ProposalShown = { cameraId: string; cameraName: string; rects: ProposalRect[] };

const inside = (rect: ProposalRect): boolean =>
  [rect.x, rect.y, rect.w, rect.h].every(value => typeof value === "number" && Number.isFinite(value)) && rect.x >= 0 && rect.y >= 0 && rect.w > 0 && rect.h > 0 && rect.x + rect.w <= 1.0001 && rect.y + rect.h <= 1.0001;

/** The cameras with something proposed, by name. */
export function proposalsShown(answer: IgnoreProposals): ProposalShown[] {
  return (Array.isArray(answer.proposals) ? answer.proposals : [])
    .filter(item => typeof item.camera_id === "string" && item.camera_id !== "")
    .map(item => ({ cameraId: item.camera_id, cameraName: typeof item.camera_name === "string" && item.camera_name ? item.camera_name : item.camera_id, rects: (Array.isArray(item.zones) ? item.zones : []).filter(inside) }))
    .filter(item => item.rects.length > 0)
    .sort((a, b) => a.cameraName.localeCompare(b.cameraName));
}

/** The rectangles of a proposal on a drawing of `width` by `height`. */
export function proposalRects(rects: ProposalRect[], width: number, height: number): ProposalRect[] {
  return rects.map(rect => ({ x: round(rect.x * width), y: round(rect.y * height), w: round(rect.w * width), h: round(rect.h * height) }));
}

const round = (value: number): number => Math.round(value * 100) / 100;
