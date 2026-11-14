/**
 * The service worker of the wall-panel mode: registered only when the panel is shown, taken away (with its copies) when the person leaves the panel.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */

/** Registers /sw.js; false when the browser has no service workers or refuses (the panel works without it, only not offline). */
export async function registerKioskWorker(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  try { await navigator.serviceWorker.register("/sw.js", { scope: "/" }); return true; } catch { return false; }
}

/** Leaving the panel: the worker is removed and so are the copies it kept. */
export async function removeKioskWorker(): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    if (typeof caches !== "undefined") for (const name of await caches.keys()) if (name.startsWith("armor-studio-shell-")) await caches.delete(name);
  } catch { /* nothing to remove */ }
}
