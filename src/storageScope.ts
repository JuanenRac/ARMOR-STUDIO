/**
 * What this browser keeps for the person who is signed in. A second person who signs in on the same browser must not find the drawings the first one left (an unsent edit of the
 * site, a copy of a design), so those keys carry the id of the user: `armor-studio-electrical-copy:http://house:8080#u:ab12`. The id is known only after the server has said who is
 * signed in, so the screens that read or write those copies wait for it (see App.tsx); until then nothing is read and nothing is written.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
let current: string | null = null;

/** Who is signed in (the id the server gave the user), or null when nobody is. */
export function setStorageUser(id: string | null): void { current = id && /^[A-Za-z0-9_.-]{1,64}$/.test(id) ? id : null; }
export function storageUser(): string | null { return current; }

const MARK = "#u:";

/** The key as this person keeps it. With nobody signed in it is the shared key of old. */
export function forUser(key: string, user: string | null = current): string { return user ? `${key}${MARK}${user}` : key; }

const LAST_USER = "armor-studio-last-user:";

/** Remembers who was signed in to this server, so that the copy that person kept can be shown while the server (and with it the answer to "who is signed in") is not there. */
export function rememberUser(origin: string, id: string): void {
  try {
    if (window.localStorage.getItem(`${LAST_USER}${origin}`) !== id) window.localStorage.setItem(`${LAST_USER}${origin}`, id);
  } catch { /* storage may be blocked */ }
}
/** Who was signed in to this server the last time, when the person of now is not known yet. */
export function lastUser(origin: string): string | null {
  try {
    const id = window.localStorage.getItem(`${LAST_USER}${origin}`);
    return id && /^[A-Za-z0-9_.-]{1,64}$/.test(id) ? id : null;
  } catch { return null; }
}

/** The keys of the person who is signed in that start with `prefix` (a storage that cannot be walked gives none). */
export function ownKeys(prefix: string): string[] {
  const found: string[] = [];
  if (!current) return found;
  try {
    const storage = window.localStorage;
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && key.startsWith(prefix) && key.endsWith(`${MARK}${current}`)) found.push(key);
    }
  } catch { /* storage may be blocked */ }
  return found;
}
