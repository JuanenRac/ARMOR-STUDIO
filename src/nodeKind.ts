/**
 * The kind of an A.R.M.O.R. node, from what it says about itself: the title of its own web panel ("A.R.M.O.R. radar", "...solar", "...electrical", "...alarm", "...HMI") that the network node
 * reads when it probes port 80 or 443, and failing that its host name ("armor-nodo-radar-1" is a radar node) - a node that is switched off has no banner. The firmware screen and the
 * search for new nodes both ask this, so they can no longer disagree.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { FirmwareKind } from "./api";

/** The kind a piece of text names (already lower case), if it names one. */
export function nodeKindIn(text: string): FirmwareKind | undefined {
  if (text.includes("radar")) return "radar";
  if (text.includes("solar")) return "solar";
  if (text.includes("electric") || text.includes("elec-")) return "electrical";
  if (text.includes("alarm")) return "alarm";
  if (/\bhmi\b|armor-hmi|-hmi/.test(text)) return "hmi";
  return undefined;
}

/** The kind of a device of the network: its panel's banner first, then its name. */
export function nodeKindOf(device: { hostname?: string; ports?: readonly { banner?: string }[] }): FirmwareKind | undefined {
  return nodeKindIn((device.ports ?? []).map(port => port.banner ?? "").join(" ").toLowerCase()) ?? nodeKindIn((device.hostname ?? "").toLowerCase());
}
