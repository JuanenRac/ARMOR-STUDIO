/**
 * Every node the system already knows, of ANY kind (radar, solar, electrical): the search for nodes in the network of each menu leaves all of them out, so a radar node that is
 * already added never shows up again in the solar or electrical menu, whichever menu is looking.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { createContext } from "react";

export type KnownNodes = { ids: readonly string[]; ips: readonly string[] };
export const KnownNodesContext = createContext<KnownNodes>({ ids: [], ips: [] });
