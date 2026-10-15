/**
 * A small button with a copy icon for every window that shows a log: it puts the text on the clipboard (so it can be pasted into a message or a report) and says "copied" for a moment.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useRef, useState } from "react";

type Translate = (key: string) => string;

/** Copy text to the clipboard: the browser's own way first, and a hidden text area when that is not allowed (a page over plain HTTP, an older browser). */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall back below */ }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;left:-1000px;top:0;opacity:0";
    document.body.appendChild(area);
    area.select();
    const done = document.execCommand("copy");
    area.remove();
    return done;
  } catch { return false; }
}

export function CopyIcon({ size = 16 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </svg>;
}

/** `text` is what is copied (a function, to read it at the moment of the click); `label` names it for a screen reader ("Copy the log" by default). */
export function CopyButton({ t, text, label, className = "" }: { t: Translate; text: string | (() => string); label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "ok" | "bad">("idle");
  const timer = useRef<number | undefined>(undefined);
  const name = label ?? t("copyLog");
  const click = async () => {
    const ok = await copyToClipboard(typeof text === "function" ? text() : text);
    setState(ok ? "ok" : "bad");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1800);
  };
  return <button type="button" className={`copy-button ${state} ${className}`} onClick={() => void click()} title={state === "ok" ? t("copied") : state === "bad" ? t("copyFailed") : name} aria-label={name}>
    <CopyIcon /><span className="copy-note" role="status">{state === "ok" ? t("copied") : state === "bad" ? t("copyFailed") : ""}</span>
  </button>;
}
