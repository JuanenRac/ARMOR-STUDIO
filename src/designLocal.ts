/**
 * The copy of a drawing (electrical, network, alarm) that this browser keeps for ONE server. It is there when the server is not, and it remembers what the server's revision was when the
 * copy was last in step with it and whether there are changes that never reached it - so an edit made while the connection was down is put back and sent when it returns, and the
 * drawing of one installation is never offered to another (the key carries the address of the server) nor the unsent edit of one person to the next who signs in (it carries the user).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { forUser, lastUser, ownKeys, storageUser } from "./storageScope";
import { onSessionCleared } from "./sessionMemory";

export type LocalCopy = { baseRevision: number | null; dirty: boolean; doc: Record<string, unknown> };

const keyFor = (kind: string, origin: string) => `armor-studio-${kind}-copy:${origin}`;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The copy kept for this server. Before the key carried the address, one copy was kept for the whole browser: it is used once, for the server this browser signed in to last (the one it
 * was almost certainly made for), and only when there is no copy of its own yet.
 */
export function readLocalCopy(kind: string, legacyKey: string, origin: string): LocalCopy | null {
  try {
    const shared = keyFor(kind, origin);
    // Whose copy: the person who is signed in, or - before the server has said who that is - the one who was the last time (so the copy is there when the server is not).
    const user = storageUser() ?? lastUser(origin);
    let own = window.localStorage.getItem(forUser(shared, user));
    if (!own && user) {
      // The copy kept before copies were kept per person: the first person to sign in takes it over, and it is no longer offered to anyone else.
      own = window.localStorage.getItem(shared);
      if (own) { window.localStorage.setItem(forUser(shared, user), own); window.localStorage.removeItem(shared); }
    }
    if (own) {
      const raw = JSON.parse(own) as Partial<LocalCopy> | null;
      if (raw && isRecord(raw.doc)) return { baseRevision: typeof raw.baseRevision === "number" ? raw.baseRevision : null, dirty: raw.dirty === true, doc: raw.doc };
      return null;
    }
    if (window.localStorage.getItem("armor-studio-origin") !== origin) return null;
    const legacy = window.localStorage.getItem(legacyKey);
    if (!legacy) return null;
    const doc = JSON.parse(legacy) as unknown;
    return isRecord(doc) ? { baseRevision: null, dirty: false, doc } : null;
  } catch { return null; }   // storage may be blocked, or hold something else
}

export function writeLocalCopy(kind: string, origin: string, copy: LocalCopy): void {
  try { window.localStorage.setItem(forUser(keyFor(kind, origin)), JSON.stringify(copy)); } catch { /* storage may be full or blocked */ }
}

/** Signing out: the copies of this person that are in step with the server are not kept (there is nothing in them the server lacks); the ones with changes that never arrived are. */
export function forgetCleanCopies(): void {
  for (const key of ownKeys("armor-studio-")) {
    if (!key.includes("-copy:")) continue;
    try {
      const raw = JSON.parse(window.localStorage.getItem(key) ?? "null") as { dirty?: unknown } | null;
      if (!raw || raw.dirty !== true) window.localStorage.removeItem(key);
    } catch { /* a copy that cannot be read is left alone */ }
  }
}
onSessionCleared(forgetCleanCopies);
