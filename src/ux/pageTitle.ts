/**
 * The title of the browser tab says which menu is open ("Alarms · A.R.M.O.R. Studio"), so a tab bar, the history and a screen reader's window list tell the tabs apart. While the alarm
 * announcer blinks a "(2) ⚠ " in front of the title, that prefix is kept.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect } from "react";
import { UX } from "./config";

const BLINK_PREFIX = /^\(\d+\) ⚠ /;

export function titleFor(current: string, label: string): string {
  const prefix = current.match(BLINK_PREFIX)?.[0] ?? "";
  const clean = label.trim();
  return `${prefix}${clean ? `${clean}${UX.pageTitle.separator}` : ""}${UX.pageTitle.suffix}`;
}

export function usePageTitle(label: string): void {
  useEffect(() => { document.title = titleFor(document.title, label); }, [label]);
}
