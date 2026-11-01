/**
 * Closing or reloading the tab while a drawing has not reached the server (still saving, or the server not answering) asks the browser to confirm. The statuses that count are in
 * ux.config.json. The browser shows its own words; Studio does not write them.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect } from "react";
import { UX } from "./config";

/** Whether any of the drawings has changes the server does not have yet. */
export const hasUnsavedWork = (statuses: readonly (string | undefined)[]): boolean => statuses.some(status => status !== undefined && UX.unloadGuard.statuses.includes(status));

export function useUnloadGuard(active: boolean): void {
  useEffect(() => {
    if (!active) return undefined;
    const listener = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [active]);
}
