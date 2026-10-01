/**
 * Who is signed in, shared with every panel that needs it (the one answer Studio keeps up to date, see useSessionUser), so a panel never
 * has to ask the server on its own and take one failed answer for "you are not an administrator".
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { createContext } from "react";
import type { SessionUser } from "./hooks";

export const SessionUserContext = createContext<SessionUser | null>(null);
