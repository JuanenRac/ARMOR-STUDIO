/**
 * Gives what it draws the current time, and draws only that again each second: the menus that say "3 minutes ago" tick by themselves instead of making the whole console draw anew every second.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { ReactNode } from "react";
import { useNow } from "../hooks";

export function Ticking({ children }: { children: (now: number) => ReactNode }) {
  return <>{children(useNow())}</>;
}
