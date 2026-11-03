/**
 * Arrow keys across the tabs of every tab list of the console: Left and Right move to the previous and the next tab, Home and End to the first and the last, and the tab that
 * receives the keyboard is opened (a tab list is a single place to stop with the keyboard, and the arrows move inside it). Tabs that are off (disabled) are skipped. One listener
 * serves every `role="tablist"`, so the tab lists need nothing of their own.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect } from "react";

/** The position the key leads to among `count` tabs from `current`, wrapping round at the ends; null for a key that is not for the tabs. `enabled` says which tabs can be reached. */
export function tabTarget(key: string, current: number, enabled: readonly boolean[]): number | null {
  const count = enabled.length;
  if (count === 0 || current < 0 || current >= count) return null;
  const reachable = (index: number) => enabled[index] === true;
  if (key === "Home") return [...enabled.keys()].find(reachable) ?? null;
  if (key === "End") return [...enabled.keys()].reverse().find(reachable) ?? null;
  const step = key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
  if (step === 0) return null;
  for (let tried = 1; tried <= count; tried += 1) {
    const index = (current + step * tried + count * tried) % count;
    if (reachable(index)) return index;
  }
  return null;
}

type KeyLike = { key: string; ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean; shiftKey?: boolean; defaultPrevented?: boolean; target?: unknown; preventDefault?: () => void };

/** Moves the keyboard to the tab the key leads to and opens it. True when the key was for the tabs. */
export function handleTabKey(event: KeyLike): boolean {
  if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return false;
  const tab = event.target as { getAttribute?: (name: string) => string | null; closest?: (selector: string) => Element | null } | null;
  if (!tab || typeof tab.getAttribute !== "function" || tab.getAttribute("role") !== "tab" || typeof tab.closest !== "function") return false;
  const list = tab.closest('[role="tablist"]');
  if (!list) return false;
  const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]')];
  const target = tabTarget(event.key, tabs.indexOf(tab as unknown as HTMLElement), tabs.map(item => !(item as HTMLButtonElement).disabled));
  if (target === null) return false;
  event.preventDefault?.();
  tabs[target]!.focus();
  tabs[target]!.click();
  return true;
}

export function useTabKeys(): void {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { handleTabKey(event); };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);
}
