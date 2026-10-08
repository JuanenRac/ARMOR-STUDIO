/**
 * The hover hints of the whole console, in the seven languages, keyed by the key of the label they explain (see hoverHints.ts).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D)
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { hintsA, type Hint } from "./hintsA";
import { hintsB } from "./hintsB";
import { hintsC } from "./hintsC";
import { hintsD } from "./hintsD";
import { hintsE } from "./hintsE";

export type { Hint };
export const hintCatalogue: Record<string, Hint> = { ...hintsA, ...hintsB, ...hintsC, ...hintsD, ...hintsE };
