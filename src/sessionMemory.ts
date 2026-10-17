/**
 * What a menu keeps in memory while the tab lives (the output of the root console, the state of a firmware update, ...) belongs to the person who was signed in. Signing out does not
 * reload the page, so the next person to sign in on the same tab would find it. Each of those memories registers here how to forget itself, and signing out calls them all.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
const forgetters = new Set<() => void>();

/** A memory of a menu that must not outlive the session: `forget` empties it. */
export function onSessionCleared(forget: () => void): void { forgetters.add(forget); }

/** The session ended: every registered memory is emptied (one that fails does not keep the others). */
export function clearSessionMemory(): void {
  for (const forget of forgetters) { try { forget(); } catch { /* the others still go */ } }
}
