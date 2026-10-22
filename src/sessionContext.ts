/**
 * Who is signed in, shared with every panel that needs it (the one answer Studio keeps up to date, see useSessionUser), so a panel never
 * has to ask the server on its own and take one failed answer for "you are not an administrator".
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { createContext, useContext, useMemo } from "react";
import { resolveCapabilities, type Capabilities } from "./capabilities";
import type { SessionUser } from "./hooks";

export const SessionUserContext = createContext<SessionUser | null>(null);

/** What the person may do and what the server offers (see capabilities.ts); nothing is allowed while nobody is known. */
export function useCapabilities(): Capabilities {
  const session = useContext(SessionUserContext);
  const role = session?.user?.role, announced = session?.capabilities;
  return useMemo(() => resolveCapabilities(role, announced), [role, announced]);
}
