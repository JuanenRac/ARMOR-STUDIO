/**
 * A menu keeps what the person was doing in it. Going to another menu (by hand, or because an alarm took the person there) used to close the one being left and everything
 * unsaved in it was gone from the screen: a form half filled, a tab, a selection, a filter, a message. The menus where that matters stay open once they have been visited, hidden
 * while another one is shown, and they come back exactly as they were. Their own refreshing pauses while they are hidden (see useViewActive) and the heavy ones - live video, the
 * 3D plan, the weather map - are not kept: they are rebuilt when opened, as they always were.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { createContext, useContext, type ReactNode } from "react";
import type { View } from "./domain";

/** The menus that stay open once visited: the ones with forms, tabs, selections and settings. */
export const KEPT_VIEWS: ReadonlySet<View> = new Set<View>(["alarms", "alarmPanels", "electrical", "inverters", "batteries", "devices", "automations", "record", "history", "network", "services", "system", "configuration", "alarmDesigner", "electricalDesigner", "networkDesigner"]);

/** False inside a menu that is open but hidden. */
const ViewActiveContext = createContext(true);
export const useViewActive = (): boolean => useContext(ViewActiveContext);

/** Which menus are drawn: the one shown, and the kept ones already visited. The visited set only grows. */
export function viewsToDraw(order: readonly View[], shown: View, visited: Set<View>): View[] {
  visited.add(shown);
  return order.filter(view => view === shown || (KEPT_VIEWS.has(view) && visited.has(view)));
}

/** The menu in its place. `display: contents` keeps the layout exactly as if the menu were a direct child of the stage. */
export function ViewSlot({ active, children }: { active: boolean; children: ReactNode }) {
  return <div className="view-slot" hidden={!active}><ViewActiveContext.Provider value={active}>{children}</ViewActiveContext.Provider></div>;
}
