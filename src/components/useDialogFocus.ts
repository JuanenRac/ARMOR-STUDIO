/**
 * Keeps the keyboard inside a dialog while it is open: focus moves into it when it opens, Tab and Shift+Tab go round its controls instead of out to the page behind it, and focus goes
 * back to the control that opened it when it closes. (A modal dialog that lets Tab wander off to the hidden page is a trap of its own for someone who does not use a mouse.)
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex='-1'])";

/** What can take the focus and is on screen (not hidden, not display:none, not visibility:hidden). */
const focusables = (root: HTMLElement): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(element => {
  if (element.closest("[hidden]")) return false;
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
});

export function useDialogFocus<T extends HTMLElement>(onEscape?: () => void): { ref: RefObject<T | null>; onKeyDown: (event: KeyboardEvent) => void } {
  const ref = useRef<T | null>(null);
  // Taken while the dialog is being drawn for the first time: by the time the effect runs, a control with autoFocus has already taken the focus.
  const [before] = useState<HTMLElement | null>(() => (typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null));
  useEffect(() => {
    const root = ref.current;
    if (root && !root.contains(document.activeElement)) (focusables(root)[0] ?? root).focus?.();
    return () => { if (before && before.isConnected) before.focus?.(); };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && onEscape) { onEscape(); return; }
    if (event.key !== "Tab" || !ref.current) return;
    const items = focusables(ref.current);
    if (items.length === 0) { event.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1], now = document.activeElement;
    if (event.shiftKey && (now === first || !ref.current.contains(now))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (now === last || !ref.current.contains(now))) { event.preventDefault(); first.focus(); }
  };
  return { ref, onKeyDown };
}
