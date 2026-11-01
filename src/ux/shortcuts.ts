/**
 * Keyboard shortcuts of one key without a modifier ("?" opens the Help, "b" folds or opens the menu). They never act while a field, a list, a button or a dialog has the keyboard, they
 * are ignored with Ctrl, Alt or the system key held, and they can be switched off in Preferences (a single-key shortcut must be able to be turned off).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect } from "react";
import { UX } from "./config";

export type ShortcutAction = "help" | "sidebar";
type KeyLike = { key: string; ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean; defaultPrevented?: boolean; target?: unknown };

/** Whether the element that has the keyboard is one where typing is meant for it. */
export function takesTyping(target: unknown): boolean {
  const element = target as { tagName?: string; isContentEditable?: boolean; closest?: (selector: string) => unknown } | null;
  if (!element || typeof element.tagName !== "string") return false;
  if (element.isContentEditable) return true;
  if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(element.tagName)) return true;
  return typeof element.closest === "function" && Boolean(element.closest('[role="dialog"], [role="textbox"], [role="listbox"], [role="menu"], [contenteditable="true"]'));
}

export function shortcutFor(event: KeyLike): ShortcutAction | null {
  if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return null;
  if (takesTyping(event.target)) return null;
  if (event.key === UX.shortcuts.help) return "help";
  if (event.key.toLowerCase() === UX.shortcuts.sidebar) return "sidebar";
  return null;
}

export function useShortcuts(enabled: boolean, run: (action: ShortcutAction) => void): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const listener = (event: KeyboardEvent) => { const action = shortcutFor(event); if (action) { event.preventDefault(); run(action); } };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [enabled, run]);
}
